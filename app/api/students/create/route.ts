import { NextResponse } from "next/server";
import { requireUser } from "../../_auth";
import { getAdminScope } from "../../_admin";
import { getViewerSchoolScope, hasSchoolAccess } from "../../_schoolScope";
import { supabaseAdmin } from "../../teachers/_supabaseAdmin";

function isMissingStudentsTableError(message: string) {
  const text = String(message ?? "").toLowerCase();
  return text.includes("students") && (text.includes("does not exist") || text.includes("relation"));
}

export async function POST(req: Request) {
  const { user, response } = await requireUser(req);
  if (response || !user) return response;

  const adminScope = await getAdminScope(user.id ?? "");
  if (!adminScope.isAdmin) {
    return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });
  }

  const viewerScope = await getViewerSchoolScope(user);
  const body = await req.json().catch(() => ({}));
  const schoolId = String(body?.school_id ?? "").trim();
  const classId = String(body?.class_id ?? "").trim();
  const name = String(body?.name ?? "").trim();

  if (!schoolId || !classId || !name) {
    return NextResponse.json({ error: "Informe escola, turma e nome do aluno." }, { status: 400 });
  }
  if (!hasSchoolAccess(viewerScope, schoolId)) {
    return NextResponse.json({ error: "Você não pode cadastrar aluno em outra escola." }, { status: 403 });
  }

  const { data: classRow, error: classError } = await supabaseAdmin
    .from("classes")
    .select("id,name,school_id")
    .eq("id", classId)
    .maybeSingle();
  if (classError) return NextResponse.json({ error: classError.message }, { status: 500 });
  if (!classRow || String(classRow.school_id) !== schoolId) {
    return NextResponse.json({ error: "Turma inválida para a escola selecionada." }, { status: 400 });
  }

  const insertPayload = {
    school_id: schoolId,
    class_id: classId,
    class_name: String(classRow.name ?? "").trim() || null,
    name,
    active: true,
    created_by: user.id ?? null,
  };
  const { error } = await supabaseAdmin.from("students").insert(insertPayload);
  if (error) {
    if (isMissingStudentsTableError(error.message)) {
      return NextResponse.json(
        { error: "Tabela de alunos não configurada. Execute scripts/sql/students.sql." },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
