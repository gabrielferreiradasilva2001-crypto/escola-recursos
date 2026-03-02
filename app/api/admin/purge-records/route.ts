import { NextResponse } from "next/server";
import { requireAdmin } from "../../_auth";
import { supabaseAdmin } from "../../teachers/_supabaseAdmin";

type PrintFileRow = {
  file_path: string | null;
};

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export async function POST(req: Request) {
  try {
    const { response } = await requireAdmin(req);
    if (response) return response;

    const body = await req.json().catch(() => ({}));
    const confirm = String(body?.confirm ?? "").trim();
    if (confirm !== "APAGAR_TUDO") {
      return NextResponse.json({ error: "Confirmação inválida." }, { status: 400 });
    }

    const { data: printRows, error: printReadErr } = await supabaseAdmin
      .from("print_jobs")
      .select("file_path");
    if (printReadErr) {
      return NextResponse.json(
        { error: printReadErr.message ?? "Falha ao listar impressões." },
        { status: 500 }
      );
    }

    const filePaths = (printRows ?? [])
      .map((r: PrintFileRow) => String(r.file_path ?? "").trim())
      .filter(Boolean);

    const chunks = chunkArray(filePaths, 100);
    for (const batch of chunks) {
      const { error: storageErr } = await supabaseAdmin.storage.from("print-jobs").remove(batch);
      if (storageErr) {
        return NextResponse.json(
          { error: storageErr.message ?? "Falha ao remover arquivos de impressão." },
          { status: 500 }
        );
      }
    }

    const { error: riErr } = await supabaseAdmin
      .from("reservation_items")
      .delete()
      .neq("reservation_id", "");
    if (riErr) {
      return NextResponse.json(
        { error: riErr.message ?? "Falha ao apagar itens de reservas." },
        { status: 500 }
      );
    }

    const { error: resErr } = await supabaseAdmin
      .from("reservations")
      .delete()
      .neq("id", "");
    if (resErr) {
      return NextResponse.json({ error: resErr.message ?? "Falha ao apagar reservas." }, { status: 500 });
    }

    const { error: printDelErr } = await supabaseAdmin
      .from("print_jobs")
      .delete()
      .neq("id", "");
    if (printDelErr) {
      return NextResponse.json(
        { error: printDelErr.message ?? "Falha ao apagar impressões." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Falha ao processar a requisição." }, { status: 400 });
  }
}
