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
    const { id, active } = body ?? {};
    if (!id) {
      return NextResponse.json({ error: "ID inválido." }, { status: 400 });
    }

    if (!viewerScope.isSuperAdmin) {
      const { data: teacherRow, error: teacherErr } = await supabaseAdmin
        .from("teachers")
        .select("school_ids")
        .eq("id", String(id))
        .maybeSingle();
      if (teacherErr || !teacherRow) {
        return NextResponse.json({ error: "Professor não encontrado." }, { status: 404 });
      }
      const teacherSchoolIds = normalizeSchoolIds((teacherRow as { school_ids?: unknown }).school_ids);
      const canManage = teacherSchoolIds.some((sid) => viewerScope.allowedSchoolIds.includes(sid));
      if (!canManage) {
        return NextResponse.json({ error: "Você não pode alterar professor de outra escola." }, { status: 403 });
      }
    }

    const { error } = await supabaseAdmin
      .from("teachers")
      .update({ active: !!active })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Falha ao processar a requisição." }, { status: 400 });
  }
}
