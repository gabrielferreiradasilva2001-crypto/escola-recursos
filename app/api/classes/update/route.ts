import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../teachers/_supabaseAdmin";
import { requireAdmin } from "../../_auth";
import { getViewerSchoolScope, hasSchoolAccess } from "../../_schoolScope";
import { canAccessPeriod, getAdminScope } from "../../_admin";

export async function POST(req: Request) {
  try {
    const { user, response } = await requireAdmin(req);
    if (response || !user) return response;
    const viewerScope = await getViewerSchoolScope(user);
    const adminScope = await getAdminScope(user.id);

    const body = await req.json();
    const id = String(body?.id ?? "").trim();
    const name = String(body?.name ?? "").trim();
    const schoolId = String(body?.school_id ?? "").trim();
    const period = String(body?.period ?? "").trim();
    const active = body?.active;

    if (!id || !name || !schoolId || !period) {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
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
      const currentSchoolId = String((currentClass as { school_id?: string }).school_id ?? "").trim();
      if (!hasSchoolAccess(viewerScope, currentSchoolId) || !hasSchoolAccess(viewerScope, schoolId)) {
        return NextResponse.json({ error: "Você não pode editar turma de outra escola." }, { status: 403 });
      }
    }
    if (adminScope.isAdmin && !adminScope.isSuperAdmin && !canAccessPeriod(adminScope, period)) {
      return NextResponse.json({ error: "Período fora da sua permissão." }, { status: 403 });
    }

    const payload: { name: string; school_id: string; period: string; active?: boolean } = {
      name,
      school_id: schoolId,
      period,
    };
    if (typeof active === "boolean") payload.active = active;

    const { error } = await supabaseAdmin
      .from("classes")
      .update(payload)
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Falha ao processar a requisição." }, { status: 400 });
  }
}
