import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../teachers/_supabaseAdmin";
import { requireAdmin } from "../../_auth";
import { getSharedSchoolIdsForSchool } from "../../_resourceGroups";

type ReservationRow = {
  id: string;
  teacher_id: string | null;
  teacher_name: string | null;
  teacher_email: string | null;
};
type TeacherRow = {
  id: string | null;
  name: string | null;
};

function buildMonthRange(year: number, month: number) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  const start = startDate.toISOString().slice(0, 10);
  const end = endDate.toISOString().slice(0, 10);
  return { start, end };
}

function normalizeName(name: string | null) {
  return (name ?? "").trim().toLowerCase();
}

function teacherKey(r: ReservationRow) {
  return (r.teacher_id ?? normalizeName(r.teacher_name)) || "sem-nome";
}

function teacherLabel(r: ReservationRow, nameMap: Map<string, string>) {
  const key = teacherKey(r);
  return nameMap.get(key) ?? r.teacher_name?.trim() ?? r.teacher_email ?? "Sem nome";
}

async function getTeacherRankingForMonth(
  year: number,
  month: number,
  nameMap: Map<string, string>,
  schoolIds?: string[]
) {
  const { start, end } = buildMonthRange(year, month);

  let reservationsQuery = supabaseAdmin
    .from("reservations")
    .select("id,teacher_id,teacher_name,teacher_email")
    .gte("use_date", start)
    .lte("use_date", end)
    .eq("status", "active");
  if (schoolIds?.length) reservationsQuery = reservationsQuery.in("school_id", schoolIds);
  const { data: reservations, error: resErr } = await reservationsQuery;

  if (resErr) throw new Error(resErr.message);

  const overallMap = new Map<string, { key: string; name: string; count: number }>();

  (reservations ?? []).forEach((r: ReservationRow) => {
    const key = teacherKey(r);
    const name = teacherLabel(r, nameMap);
    const current = overallMap.get(key) ?? { key, name, count: 0 };
    current.count += 1;
    overallMap.set(key, current);
  });

  return Array.from(overallMap.values()).sort((a, b) => b.count - a.count);
}

export async function POST(req: Request) {
  try {
    const { response } = await requireAdmin(req);
    if (response) return response;

    const body = await req.json();
    const year = Number(body?.year);
    const schoolId = typeof body?.school_id === "string" ? body.school_id : "";
    const sharedSchoolIds = schoolId ? await getSharedSchoolIdsForSchool(schoolId) : [];

    if (!year) {
      return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400 });
    }

    const { data: teachers, error: teachersErr } = await supabaseAdmin
      .from("teachers")
      .select("id,name");

    if (teachersErr) {
      return NextResponse.json({ error: teachersErr.message }, { status: 500 });
    }

    const nameMap = new Map<string, string>();
    (teachers ?? []).forEach((t: TeacherRow) => {
      const nameValue = String(t.name ?? "").trim();
      if (t.id && nameValue) nameMap.set(t.id, nameValue);
      const normalized = normalizeName(nameValue);
      if (normalized && !nameMap.has(normalized)) {
        nameMap.set(normalized, nameValue);
      }
    });

    const out: { month: number; leader_name: string; leader_count: number }[] = [];

    for (let m = 1; m <= 12; m += 1) {
      const ranking = await getTeacherRankingForMonth(
        year,
        m,
        nameMap,
        schoolId ? (sharedSchoolIds.length ? sharedSchoolIds : [schoolId]) : undefined
      );
      const top = ranking[0];
      if (top?.name && top?.count) {
        out.push({ month: m, leader_name: top.name, leader_count: top.count });
      }
    }

    return NextResponse.json({ ok: true, data: out });
  } catch {
    return NextResponse.json({ error: "Erro ao gerar histórico." }, { status: 500 });
  }
}
