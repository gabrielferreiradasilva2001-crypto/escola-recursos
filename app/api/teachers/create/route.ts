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
    const { name, email, birth_day, birth_month, school_ids, class_ids } = body ?? {};
    if (!name || !String(name).trim()) {
      return NextResponse.json({ error: "Informe o nome do professor." }, { status: 400 });
    }
    const day = Number(birth_day || 0);
    const month = Number(birth_month || 0);
    if ((day && (day < 1 || day > 31)) || (month && (month < 1 || month > 12))) {
      return NextResponse.json({ error: "Data de nascimento inválida." }, { status: 400 });
    }

    const nextSchoolIds = normalizeSchoolIds(school_ids);
    if (!nextSchoolIds.length) {
      return NextResponse.json({ error: "Selecione ao menos uma escola." }, { status: 400 });
    }
    if (!viewerScope.isSuperAdmin) {
      const invalid = nextSchoolIds.some((id) => !viewerScope.allowedSchoolIds.includes(id));
      if (invalid) {
        return NextResponse.json({ error: "Você só pode cadastrar professor na sua escola." }, { status: 403 });
      }
    }

    const nextClassIds = Array.isArray(class_ids)
      ? Array.from(
          new Set(
            class_ids
              .map((id: unknown) => String(id ?? "").trim())
              .filter(Boolean)
          )
        )
      : [];
    if (nextClassIds.length) {
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
      const invalidClass = classesRows.some((row) => !nextSchoolIds.includes(String(row.school_id ?? "")));
      if (invalidClass) {
        return NextResponse.json(
          { error: "Selecione apenas turmas das escolas vinculadas ao professor." },
          { status: 400 }
        );
      }
    }

    const { data, error } = await supabaseAdmin
      .from("teachers")
      .insert({
        name: String(name).trim(),
        email: String(email || "").trim() || null,
        birth_day: day || null,
        birth_month: month || null,
        school_ids: nextSchoolIds,
        active: true,
      })
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const teacherId = String(data?.id ?? "");
    if (teacherId && nextClassIds.length) {
      const { error: linkErr } = await supabaseAdmin.from("teacher_class_assignments").insert(
        nextClassIds.map((classId) => ({
          teacher_id: teacherId,
          class_id: classId,
        }))
      );
      if (linkErr) {
        await supabaseAdmin.from("teachers").delete().eq("id", teacherId);
        return NextResponse.json(
          { error: "Falha ao vincular turmas do professor. Verifique a configuração do banco." },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ ok: true, id: data?.id ?? null });
  } catch {
    return NextResponse.json({ error: "Falha ao processar a requisição." }, { status: 400 });
  }
}
