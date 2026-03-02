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

    if (!id) {
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
      if (!hasSchoolAccess(viewerScope, currentSchoolId)) {
        return NextResponse.json({ error: "Você não pode excluir material de outra escola." }, { status: 403 });
      }
    }

    const { count, error: countErr } = await supabaseAdmin
      .from("reservation_items")
      .select("item_id", { count: "exact", head: true })
      .eq("item_id", id);
    if (countErr) {
      return NextResponse.json({ error: countErr.message }, { status: 500 });
    }
    if ((count ?? 0) > 0) {
      return NextResponse.json(
        { error: "Este material já foi usado em agendamentos e não pode ser excluído." },
        { status: 409 }
      );
    }

    const { error } = await supabaseAdmin.from("items").delete().eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Falha ao processar a requisição." }, { status: 400 });
  }
}
