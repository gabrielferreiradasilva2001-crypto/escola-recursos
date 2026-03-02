import { NextResponse } from "next/server";
import { supabaseAdmin } from "../teachers/_supabaseAdmin";
import { requireUser } from "../_auth";

const MAX_PRINT_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const ALLOWED_PERIODS = new Set(["matutino", "vespertino", "noturno"]);
const ALLOWED_LOCATIONS = new Set(["Antonio Valadares - SED", "Antonio Valadares - Extensão"]);

function safeName(value: string) {
  return value.replace(/[^a-zA-Z0-9_.-]/g, "_");
}

export async function GET(req: Request) {
  const { user, response } = await requireUser(req);
  if (response || !user) return response;

  const { data, error } = await supabaseAdmin
    .from("print_jobs")
    .select(
      "id,created_at,created_by_name,location,file_name,file_path,title,period,printed,printed_at"
    )
    .eq("created_by", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { searchParams } = new URL(req.url);
  const period = String(searchParams.get("period") ?? "").trim();

  const filtered = period
    ? (data ?? []).filter((row) => row.period === period)
    : data ?? [];

  const rows = await Promise.all(
    filtered.map(async (row) => {
      const { data: signed } = await supabaseAdmin.storage
        .from("print-jobs")
        .createSignedUrl(row.file_path, 60 * 60);
      return { ...row, url: signed?.signedUrl ?? "" };
    })
  );

  return NextResponse.json({ ok: true, data: rows });
}

export async function POST(req: Request) {
  const { user, response } = await requireUser(req);
  if (response || !user) return response;

  const form = await req.formData();
  const file = form.get("file");
  const location = String(form.get("location") ?? "").trim();
  const title = String(form.get("title") ?? "").trim();
  const period = String(form.get("period") ?? "").trim();

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Arquivo inválido." }, { status: 400 });
  }
  if (!file.size || file.size <= 0) {
    return NextResponse.json({ error: "Arquivo vazio." }, { status: 400 });
  }
  if (file.size > MAX_PRINT_FILE_SIZE) {
    return NextResponse.json({ error: "Arquivo excede o limite de 25MB." }, { status: 400 });
  }
  if (!location) {
    return NextResponse.json({ error: "Selecione o destino." }, { status: 400 });
  }
  if (!ALLOWED_LOCATIONS.has(location)) {
    return NextResponse.json({ error: "Destino inválido." }, { status: 400 });
  }
  if (!period) {
    return NextResponse.json({ error: "Informe o período." }, { status: 400 });
  }
  if (!ALLOWED_PERIODS.has(period)) {
    return NextResponse.json({ error: "Período inválido." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const fileName = safeName(file.name || "documento");
  const filePath = `${safeName(location)}/${user.id}/${Date.now()}-${fileName}`;

  const { error: upErr } = await supabaseAdmin.storage
    .from("print-jobs")
    .upload(filePath, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  const createdByName =
    String(user.user_metadata?.name ?? "").trim() || user.email || "Usuário";

  const { error: dbErr } = await supabaseAdmin.from("print_jobs").insert({
    created_by: user.id,
    created_by_name: createdByName,
    location,
    file_name: file.name || fileName,
    file_path: filePath,
    title: title || null,
    period,
    printed: false,
  });
  if (dbErr) {
    return NextResponse.json({ error: dbErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { user, response } = await requireUser(req);
  if (response || !user) return response;

  const body = await req.json().catch(() => ({}));
  const id = String(body?.id ?? "").trim();
  if (!id) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  }

  const { data: row, error: readErr } = await supabaseAdmin
    .from("print_jobs")
    .select("id,created_by,file_path")
    .eq("id", id)
    .limit(1)
    .maybeSingle();

  if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 });
  if (!row) return NextResponse.json({ error: "Registro não encontrado." }, { status: 404 });
  if (row.created_by !== user.id) {
    return NextResponse.json({ error: "Você só pode cancelar seus envios." }, { status: 403 });
  }

  const { error: storageErr } = await supabaseAdmin.storage.from("print-jobs").remove([row.file_path]);
  if (storageErr) {
    return NextResponse.json(
      { error: storageErr.message ?? "Falha ao remover arquivo do storage." },
      { status: 500 }
    );
  }
  const { error } = await supabaseAdmin.from("print_jobs").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
