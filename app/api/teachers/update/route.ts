import { NextResponse } from "next/server";
import { supabaseAdmin } from "../_supabaseAdmin";
import { requireAdmin } from "../../_auth";
import { getViewerSchoolScope, normalizeSchoolIds } from "../../_schoolScope";

export async function POST(req: Request) {
  try {
    const { user, response } = await requireAdmin(req);
    if (response || !user) return response;
    const viewerScope = await getViewerSchoolScope(user);

    const body = await req.json();
    const { id, name, email, birth_day, birth_month, school_ids, class_ids } = body ?? {};

    const teacherId = String(id ?? "").trim();
    if (!teacherId) {
      return NextResponse.json({ error: "Professor inválido." }, { status: 400 });
    }

    const nextName = String(name ?? "").trim();
    if (!nextName) {
      return NextResponse.json({ error: "Informe o nome do professor." }, { status: 400 });
    }

    const day = Number(birth_day || 0);
    const month = Number(birth_month || 0);
    if ((day && (day < 1 || day > 31)) || (month && (month < 1 || month > 12))) {
      return NextResponse.json({ error: "Data de nascimento inválida." }, { status: 400 });
    }

    const nextSchoolIds = Array.isArray(school_ids) ? normalizeSchoolIds(school_ids) : null;
    const nextClassIds = Array.isArray(class_ids)
      ? Array.from(
          new Set(
            class_ids
              .map((value: unknown) => String(value ?? "").trim())
              .filter(Boolean)
          )
        )
      : null;

    const { data: currentTeacher, error: currentTeacherErr } = await supabaseAdmin
      .from("teachers")
      .select("school_ids")
      .eq("id", teacherId)
      .maybeSingle();
    if (currentTeacherErr || !currentTeacher) {
      return NextResponse.json({ error: "Professor não encontrado." }, { status: 404 });
    }
    const currentSchoolIds = normalizeSchoolIds(
      (currentTeacher as { school_ids?: unknown }).school_ids
    );
    const targetSchoolIds = nextSchoolIds ?? currentSchoolIds;

    if (!viewerScope.isSuperAdmin) {
      const canManageTeacher = currentSchoolIds.some((id) => viewerScope.allowedSchoolIds.includes(id));
      if (!canManageTeacher) {
        return NextResponse.json({ error: "Você não pode editar professor de outra escola." }, { status: 403 });
      }
      if (nextSchoolIds) {
        const hasInvalidTargetSchool = nextSchoolIds.some((id) => !viewerScope.allowedSchoolIds.includes(id));
        if (hasInvalidTargetSchool) {
          return NextResponse.json(
            { error: "Você só pode vincular professor à sua escola." },
            { status: 403 }
          );
        }
      }
    }

    if (nextClassIds) {
      const { data: selectedClasses, error: classesErr } = await supabaseAdmin
        .from("classes")
        .select("id,school_id")
        .in("id", nextClassIds);
      if (classesErr) {
        return NextResponse.json({ error: classesErr.message }, { status: 500 });
      }
      const classesRows = (selectedClasses ?? []) as Array<{ id?: string | null; school_id?: string | null }>;
      if (classesRows.length !== nextClassIds.length) {
        return NextResponse.json({ error: "Turmas inválidas selecionadas." }, { status: 400 });
      }
      const invalidClass = classesRows.some((row) => !targetSchoolIds.includes(String(row.school_id ?? "")));
      if (invalidClass) {
        return NextResponse.json(
          { error: "Selecione apenas turmas das escolas vinculadas ao professor." },
          { status: 400 }
        );
      }
    }

    const payload: {
      name: string;
      email: string | null;
      birth_day: number | null;
      birth_month: number | null;
      school_ids?: string[];
    } = {
      name: nextName,
      email: String(email || "").trim() || null,
      birth_day: day || null,
      birth_month: month || null,
    };
    if (nextSchoolIds) {
      if (!nextSchoolIds.length) {
        return NextResponse.json({ error: "Selecione ao menos uma escola." }, { status: 400 });
      }
      payload.school_ids = nextSchoolIds;
    }

    const { error } = await supabaseAdmin
      .from("teachers")
      .update(payload)
      .eq("id", teacherId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (nextClassIds) {
      const { error: deleteLinksErr } = await supabaseAdmin
        .from("teacher_class_assignments")
        .delete()
        .eq("teacher_id", teacherId);
      if (deleteLinksErr) {
        return NextResponse.json(
          { error: "Falha ao atualizar turmas do professor. Verifique a configuração do banco." },
          { status: 500 }
        );
      }
      if (nextClassIds.length) {
        const { error: insertLinksErr } = await supabaseAdmin
          .from("teacher_class_assignments")
          .insert(
            nextClassIds.map((classId) => ({
              teacher_id: teacherId,
              class_id: classId,
            }))
          );
        if (insertLinksErr) {
          return NextResponse.json(
            { error: "Falha ao salvar turmas do professor. Verifique a configuração do banco." },
            { status: 500 }
          );
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Falha ao processar a requisição." }, { status: 400 });
  }
}
