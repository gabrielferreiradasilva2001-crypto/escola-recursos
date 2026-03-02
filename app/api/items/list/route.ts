import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../teachers/_supabaseAdmin";
import { requireUser } from "../../_auth";
import { getViewerSchoolScope, hasSchoolAccess } from "../../_schoolScope";
import { getSharedSchoolIdsForSchool } from "../../_resourceGroups";

export async function POST(req: Request) {
  try {
    const { user, response } = await requireUser(req);
    if (response || !user) return response;
    const viewerScope = await getViewerSchoolScope(user);

    const body = await req.json().catch(() => ({}));
    const schoolId = String(body?.school_id ?? "").trim();
    const sharedSchoolIds = schoolId ? await getSharedSchoolIdsForSchool(schoolId) : [];
    if (schoolId && !hasSchoolAccess(viewerScope, schoolId)) {
      return NextResponse.json({ ok: true, data: [] });
    }
    if (!viewerScope.isSuperAdmin && !viewerScope.allowedSchoolIds.length) {
      return NextResponse.json({ ok: true, data: [] });
    }

    let query = supabaseAdmin
      .from("items")
      .select("id,name,category,total_qty,school_id")
      .order("category")
      .order("name");
    if (schoolId) query = query.in("school_id", sharedSchoolIds.length ? sharedSchoolIds : [schoolId]);
    if (!schoolId && !viewerScope.isSuperAdmin) {
      query = query.in("school_id", viewerScope.allowedSchoolIds);
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
