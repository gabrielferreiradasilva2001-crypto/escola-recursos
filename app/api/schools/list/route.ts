import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../teachers/_supabaseAdmin";
import { requireUser } from "../../_auth";
import { getViewerSchoolScope } from "../../_schoolScope";
import { getSchoolLogoPublicUrl } from "../../../../lib/schoolBranding";
import { getSchoolCalendarPublicUrl } from "../../../../lib/schoolCalendar";

const DEFAULT_SCHOOLS = [
  "Unidade Escolar - Sede",
  "Unidade Escolar - Extensão",
];

export async function POST(req: Request) {
  try {
    const { user, response } = await requireUser(req);
    if (response || !user) return response;
    const viewerScope = await getViewerSchoolScope(user);

    await req.json().catch(() => ({}));

    const { data, error } = await supabaseAdmin
      .from("schools")
      .select("id,name,active,created_at")
      .order("name");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      const { error: insErr } = await supabaseAdmin
        .from("schools")
        .insert(DEFAULT_SCHOOLS.map((name) => ({ name, active: true })));
      if (insErr) {
        return NextResponse.json({ error: insErr.message }, { status: 500 });
      }
      const { data: seeded, error: seedErr } = await supabaseAdmin
        .from("schools")
        .select("id,name,active,created_at")
        .order("name");
      if (seedErr) {
        return NextResponse.json({ error: seedErr.message }, { status: 500 });
      }
      const seededWithLogo = await Promise.all(
        (seeded ?? []).map(async (school) => ({
          ...school,
          logo_url: await getSchoolLogoPublicUrl(String(school.id)),
          calendar_pdf_url: await getSchoolCalendarPublicUrl(String(school.id)),
        }))
      );
      const visibleSeeded = viewerScope.isSuperAdmin
        ? seededWithLogo
        : seededWithLogo.filter((school) => viewerScope.allowedSchoolIds.includes(String(school.id)));
      return NextResponse.json({ ok: true, data: visibleSeeded });
    }

    const visibleSchools = viewerScope.isSuperAdmin
      ? (data ?? [])
      : (data ?? []).filter((school) => viewerScope.allowedSchoolIds.includes(String(school.id)));

    const schoolsWithLogo = await Promise.all(
      visibleSchools.map(async (school) => ({
        ...school,
        logo_url: await getSchoolLogoPublicUrl(String(school.id)),
        calendar_pdf_url: await getSchoolCalendarPublicUrl(String(school.id)),
      }))
    );

    return NextResponse.json({ ok: true, data: schoolsWithLogo });
  } catch {
    return NextResponse.json({ error: "Falha ao processar a requisição." }, { status: 400 });
  }
}
