import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../teachers/_supabaseAdmin";
import { requireAdmin } from "../../_auth";
import { getViewerSchoolScope, hasSchoolAccess } from "../../_schoolScope";

export async function POST(req: Request) {
  try {
    const { user, response } = await requireAdmin(req);
    if (response || !user) return response;
    const viewerScope = await getViewerSchoolScope(user);

    const body = await req.json().catch(() => ({}));
    const name = String(body?.name ?? "").trim();
    const category = String(body?.category ?? "").trim();
    const schoolId = String(body?.school_id ?? "").trim();
    const totalQty = Number(body?.total_qty);

    if (!name || !category || !schoolId || !Number.isFinite(totalQty) || totalQty < 1) {
      return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400 });
    }
    if (!hasSchoolAccess(viewerScope, schoolId)) {
      return NextResponse.json({ error: "Você não pode cadastrar material em outra escola." }, { status: 403 });
    }

    const { error } = await supabaseAdmin.from("items").insert({
      name,
      category,
      total_qty: Math.floor(totalQty),
      school_id: schoolId,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Falha ao processar a requisição." }, { status: 400 });
  }
}
