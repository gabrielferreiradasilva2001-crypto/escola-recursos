import { NextRequest, NextResponse } from "next/server";

const MAX_PROXY_BYTES = 25 * 1024 * 1024; // 25MB

function normalizeHost(value: string) {
  try {
    return new URL(value).host;
  } catch {
    return "";
  }
}

export async function GET(req: NextRequest) {
  try {
    const rawUrl = (req.nextUrl.searchParams.get("url") || "").trim();
    if (!rawUrl) {
      return NextResponse.json({ error: "URL não informada." }, { status: 400 });
    }

    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      return NextResponse.json({ error: "URL inválida." }, { status: 400 });
    }

    if (parsed.protocol !== "https:") {
      return NextResponse.json({ error: "Somente HTTPS é permitido." }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const allowedHost = normalizeHost(supabaseUrl);
    if (!allowedHost || parsed.host !== allowedHost) {
      return NextResponse.json({ error: "Host não permitido." }, { status: 403 });
    }
    if (!parsed.pathname.startsWith("/storage/v1/object/")) {
      return NextResponse.json({ error: "Somente arquivos de storage são permitidos." }, { status: 403 });
    }

    const upstream = await fetch(parsed.toString(), { cache: "no-store", redirect: "follow" });
    if (!upstream.ok) {
      return NextResponse.json({ error: "Falha ao carregar arquivo." }, { status: upstream.status });
    }
    const contentLength = Number(upstream.headers.get("content-length") || "0");
    if (contentLength && contentLength > MAX_PROXY_BYTES) {
      return NextResponse.json({ error: "Arquivo excede o limite de 25MB." }, { status: 413 });
    }

    const contentType = upstream.headers.get("content-type") || "application/octet-stream";
    const data = await upstream.arrayBuffer();
    if (data.byteLength > MAX_PROXY_BYTES) {
      return NextResponse.json({ error: "Arquivo excede o limite de 25MB." }, { status: 413 });
    }
    return new NextResponse(data, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch {
    return NextResponse.json({ error: "Erro inesperado no proxy." }, { status: 500 });
  }
}
