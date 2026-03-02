import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../teachers/_supabaseAdmin";
import { requireAdmin } from "../../_auth";
import { getViewerSchoolScope } from "../../_schoolScope";

export async function POST(req: Request) {
  try {
    const { user, response } = await requireAdmin(req);
    if (response || !user) return response;
    const viewerScope = await getViewerSchoolScope(user);

    const body = await req.json();
    const fromYear = Number(body?.from_year || 0);
    if (!fromYear) {
      return NextResponse.json({ error: "Ano base inválido." }, { status: 400 });
    }

    const start = new Date(fromYear, 0, 1).toISOString();
    const end = new Date(fromYear + 1, 0, 1).toISOString();

    let classesQuery = supabaseAdmin
      .from("classes")
      .select("name,school_id,period,active")
      .gte("created_at", start)
      .lt("created_at", end);
    if (!viewerScope.isSuperAdmin) {
      if (!viewerScope.allowedSchoolIds.length) {
        return NextResponse.json({ ok: true, created: 0 });
      }
      classesQuery = classesQuery.in("school_id", viewerScope.allowedSchoolIds);
    }
    const { data: rows, error } = await classesQuery;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const payload = (rows ?? []).map((r) => ({
      name: r.name,
      school_id: r.school_id,
      period: r.period,
      active: r.active ?? true,
    }));

    if (!payload.length) {
      return NextResponse.json({ ok: true, created: 0 });
    }

    const { error: insErr } = await supabaseAdmin
      .from("classes")
      .insert(payload);

    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, created: payload.length });
  } catch {
    return NextResponse.json({ error: "Falha ao processar a requisição." }, { status: 400 });
  }
}
