import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../teachers/_supabaseAdmin";
import { requireAdmin } from "../../_auth";
import { getViewerSchoolScope, hasSchoolAccess } from "../../_schoolScope";

export async function POST(req: Request) {
  try {
    const { user, response } = await requireAdmin(req);
    if (response || !user) return response;
    const viewerScope = await getViewerSchoolScope(user);

    const body = await req.json();
    const id = String(body?.id ?? "").trim();
    if (!id) {
      return NextResponse.json({ error: "Turma inválida." }, { status: 400 });
    }
    if (!viewerScope.isSuperAdmin) {
      const { data: currentClass, error: currentClassErr } = await supabaseAdmin
        .from("classes")
        .select("school_id")
        .eq("id", id)
        .maybeSingle();
      if (currentClassErr || !currentClass) {
        return NextResponse.json({ error: "Turma não encontrada." }, { status: 404 });
      }
      const schoolId = String((currentClass as { school_id?: string }).school_id ?? "").trim();
      if (!hasSchoolAccess(viewerScope, schoolId)) {
        return NextResponse.json({ error: "Você não pode excluir turma de outra escola." }, { status: 403 });
      }
    }

    const { error } = await supabaseAdmin
      .from("classes")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Falha ao processar a requisição." }, { status: 400 });
  }
}
