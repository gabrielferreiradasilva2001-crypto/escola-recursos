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
    const id = String(body?.id ?? "").trim();
    const name = String(body?.name ?? "").trim();
    const category = String(body?.category ?? "").trim();
    const schoolId = String(body?.school_id ?? "").trim();
    const totalQty = Number(body?.total_qty);

    if (!id || !name || !category || !schoolId || !Number.isFinite(totalQty) || totalQty < 1) {
      return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400 });
    }
    if (!viewerScope.isSuperAdmin) {
      const { data: currentItem, error: currentItemErr } = await supabaseAdmin
        .from("items")
        .select("school_id")
        .eq("id", id)
        .maybeSingle();
      if (currentItemErr || !currentItem) {
        return NextResponse.json({ error: "Material não encontrado." }, { status: 404 });
      }
      const currentSchoolId = String((currentItem as { school_id?: string }).school_id ?? "").trim();
      if (!hasSchoolAccess(viewerScope, currentSchoolId) || !hasSchoolAccess(viewerScope, schoolId)) {
        return NextResponse.json({ error: "Você não pode editar material de outra escola." }, { status: 403 });
      }
    }

    const { error } = await supabaseAdmin
      .from("items")
      .update({
        name,
        category,
        total_qty: Math.floor(totalQty),
        school_id: schoolId,
      })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Falha ao processar a requisição." }, { status: 400 });
  }
}
