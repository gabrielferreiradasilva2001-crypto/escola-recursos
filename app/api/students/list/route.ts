import { NextResponse } from "next/server";
import { requireUser } from "../../_auth";
import { getViewerSchoolScope, hasSchoolAccess } from "../../_schoolScope";
import { supabaseAdmin } from "../../teachers/_supabaseAdmin";

function isMissingStudentsTableError(message: string) {
  const text = String(message ?? "").toLowerCase();
  return text.includes("students") && (text.includes("does not exist") || text.includes("relation"));
}

export async function POST(req: Request) {
  const { user, response } = await requireUser(req);
  if (response || !user) return response;

  const viewerScope = await getViewerSchoolScope(user);
  const body = await req.json().catch(() => ({}));
  const schoolId = String(body?.school_id ?? "").trim();
  const classId = String(body?.class_id ?? "").trim();

  if (!viewerScope.isSuperAdmin && !viewerScope.allowedSchoolIds.length) {
    return NextResponse.json({ ok: true, data: [] });
  }
  if (schoolId && !hasSchoolAccess(viewerScope, schoolId)) {
    return NextResponse.json({ ok: true, data: [] });
  }

  let query = supabaseAdmin
    .from("students")
    .select("id,name,school_id,class_id,class_name,active,created_at")
    .eq("active", true)
    .order("name");

  if (schoolId) query = query.eq("school_id", schoolId);
  if (!schoolId && !viewerScope.isSuperAdmin) {
    query = query.in("school_id", viewerScope.allowedSchoolIds);
  }
  if (classId) query = query.eq("class_id", classId);

  const { data, error } = await query;
  if (error) {
    if (isMissingStudentsTableError(error.message)) {
      return NextResponse.json(
        { error: "Tabela de alunos não configurada. Execute scripts/sql/students.sql." },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data: data ?? [] });
}
