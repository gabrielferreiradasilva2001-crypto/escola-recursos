import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../teachers/_supabaseAdmin";
import { requireUser } from "../../_auth";
import { getViewerSchoolScope, hasSchoolAccess } from "../../_schoolScope";
import { canAccessPeriod, getAdminScope } from "../../_admin";

export async function POST(req: Request) {
  try {
    const { user, response } = await requireUser(req);
    if (response || !user) return response;
    const viewerScope = await getViewerSchoolScope(user);
    const adminScope = await getAdminScope(user.id);

    const body = await req.json().catch(() => ({}));
    const year = Number(body?.year || 0);
    const schoolId = String(body?.school_id ?? "").trim();
    const period = String(body?.period ?? "").trim();

    if (schoolId && !hasSchoolAccess(viewerScope, schoolId)) {
      return NextResponse.json({ ok: true, data: [] });
    }
    if (period && adminScope.isAdmin && !adminScope.isSuperAdmin && !canAccessPeriod(adminScope, period)) {
      return NextResponse.json({ ok: true, data: [] });
    }
    if (!viewerScope.isSuperAdmin && !viewerScope.allowedSchoolIds.length) {
      return NextResponse.json({ ok: true, data: [] });
    }

    let query = supabaseAdmin
      .from("classes")
      .select("id,name,school_id,period,active,created_at,schools(name)")
      .order("name");

    if (schoolId) query = query.eq("school_id", schoolId);
    if (!schoolId && !viewerScope.isSuperAdmin) {
      query = query.in("school_id", viewerScope.allowedSchoolIds);
    }
    if (adminScope.isAdmin && !adminScope.isSuperAdmin && adminScope.allowedPeriods.length) {
      query = query.in("period", adminScope.allowedPeriods);
    }
    if (period) query = query.eq("period", period);

    if (year) {
      const start = new Date(year, 0, 1).toISOString();
      const end = new Date(year + 1, 0, 1).toISOString();
      query = query.gte("created_at", start).lt("created_at", end);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, data: data ?? [] });
  } catch {
    return NextResponse.json({ error: "Falha ao processar a requisição." }, { status: 400 });
  }
}
