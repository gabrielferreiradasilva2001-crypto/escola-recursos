import { NextResponse } from "next/server";
import { requireAdmin } from "../../_auth";
import { getViewerSchoolScope, hasSchoolAccess } from "../../_schoolScope";
import { supabaseAdmin } from "../../teachers/_supabaseAdmin";
import { getSchoolCalendarPublicUrl, saveCalendarPdfFile, setCalendarForSchools } from "../../../../lib/schoolCalendar";

function normalizeSchoolIds(value: FormDataEntryValue | null) {
  if (!value) return [];
  const text = String(value ?? "").trim();
  if (!text) return [];
  try {
    const parsed = JSON.parse(text) as unknown;
    if (!Array.isArray(parsed)) return [];
    return Array.from(
      new Set(parsed.map((v) => String(v ?? "").trim()).filter(Boolean))
    );
  } catch {
    return text
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
}

export async function POST(req: Request) {
  try {
    const { user, response } = await requireAdmin(req);
    if (response || !user) return response;
    const viewerScope = await getViewerSchoolScope(user);

    const form = await req.formData();
    const file = form.get("calendar");
    const schoolIds = normalizeSchoolIds(form.get("school_ids"));

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Arquivo PDF obrigatório." }, { status: 400 });
    }
    if (!schoolIds.length) {
      return NextResponse.json({ error: "Selecione ao menos uma escola." }, { status: 400 });
    }
    if (!file.type.includes("pdf") && !file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Envie um arquivo PDF." }, { status: 400 });
    }
    if (file.size > 18 * 1024 * 1024) {
      return NextResponse.json({ error: "PDF muito grande (máx. 18MB)." }, { status: 400 });
    }
    if (!viewerScope.isSuperAdmin) {
      const invalid = schoolIds.some((id) => !hasSchoolAccess(viewerScope, id));
      if (invalid) {
        return NextResponse.json({ error: "Você não pode alterar calendário de outra escola." }, { status: 403 });
      }
    }

    const arr = new Uint8Array(await file.arrayBuffer());
    const fileName = await saveCalendarPdfFile(Buffer.from(arr), file.name);
    await setCalendarForSchools(schoolIds, fileName);

    return NextResponse.json({ ok: true, url: `/school-calendars/${fileName}` });
  } catch {
    return NextResponse.json({ error: "Falha ao enviar calendário." }, { status: 400 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    let schoolId = String(searchParams.get("school_id") ?? "").trim();
    if (!schoolId) {
      const { data: anySchool } = await supabaseAdmin
        .from("schools")
        .select("id")
        .order("name")
        .limit(1)
        .maybeSingle();
      schoolId = String((anySchool as { id?: unknown } | null)?.id ?? "").trim();
    }

    const url = await getSchoolCalendarPublicUrl(schoolId);
    return NextResponse.redirect(new URL(url, req.url), 302);
  } catch {
    return NextResponse.json({ error: "Falha ao abrir calendário escolar." }, { status: 400 });
  }
}
