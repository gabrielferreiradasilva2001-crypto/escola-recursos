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
    const name = String(body?.name ?? "").trim();
    const schoolId = String(body?.school_id ?? "").trim();
    const period = String(body?.period ?? "").trim();

    if (!name || !schoolId || !period) {
      return NextResponse.json({ error: "Informe turma, escola e período." }, { status: 400 });
    }
    if (!hasSchoolAccess(viewerScope, schoolId)) {
      return NextResponse.json({ error: "Você não pode cadastrar turma em outra escola." }, { status: 403 });
    }
    if (adminScope.isAdmin && !adminScope.isSuperAdmin && !canAccessPeriod(adminScope, period)) {
      return NextResponse.json({ error: "Período fora da sua permissão." }, { status: 403 });
    }

    const { error } = await supabaseAdmin.from("classes").insert({
      name,
      school_id: schoolId,
      period,
      active: true,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Falha ao processar a requisição." }, { status: 400 });
  }
}
