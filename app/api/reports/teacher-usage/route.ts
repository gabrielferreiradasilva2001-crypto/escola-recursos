import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../teachers/_supabaseAdmin";
import { requireAdmin } from "../../_auth";
import { getSharedSchoolIdsForSchool } from "../../_resourceGroups";

type ReservationRow = {
  id: string;
  teacher_id: string | null;
  teacher_name: string | null;
};
type TeacherRow = {
  id: string | null;
  name: string | null;
};
type ItemRow = {
  id: string;
  name: string;
  category: string;
};
type ReservationItemRow = {
  reservation_id: string;
  item_id: string;
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

export async function POST(req: Request) {
  try {
    const { response } = await requireAdmin(req);
    if (response) return response;

    const body = await req.json();
    const year = Number(body?.year);
    const month = Number(body?.month);
    const schoolId = typeof body?.school_id === "string" ? body.school_id : "";
    const sharedSchoolIds = schoolId ? await getSharedSchoolIdsForSchool(schoolId) : [];

    if (!year || !month || month < 1 || month > 12) {
      return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400 });
    }

    const { start, end } = buildMonthRange(year, month);

    let itemsQuery = supabaseAdmin
      .from("items")
      .select("id,name,category")
      .order("category")
      .order("name");
    if (schoolId) itemsQuery = itemsQuery.in("school_id", sharedSchoolIds.length ? sharedSchoolIds : [schoolId]);
    const { data: items, error: itemsErr } = await itemsQuery;

    if (itemsErr) {
      return NextResponse.json({ error: itemsErr.message }, { status: 500 });
    }

    const { data: teachers, error: teachersErr } = await supabaseAdmin
      .from("teachers")
      .select("id,name");

    if (teachersErr) {
      return NextResponse.json({ error: teachersErr.message }, { status: 500 });
    }

    const teacherNameMap = new Map<string, string>();
    (teachers ?? []).forEach((t: TeacherRow) => {
      const nameValue = String(t.name ?? "").trim();
      if (t.id && nameValue) teacherNameMap.set(t.id, nameValue);
      const normalized = normalizeName(nameValue);
      if (normalized && !teacherNameMap.has(normalized)) {
        teacherNameMap.set(normalized, nameValue);
      }
    });

    let reservationsQuery = supabaseAdmin
      .from("reservations")
      .select("id,teacher_id,teacher_name")
      .gte("use_date", start)
      .lte("use_date", end)
      .eq("status", "active");
    if (schoolId) {
      reservationsQuery = reservationsQuery.in("school_id", sharedSchoolIds.length ? sharedSchoolIds : [schoolId]);
    }
    const { data: reservations, error: resErr } = await reservationsQuery;

    if (resErr) {
      return NextResponse.json({ error: resErr.message }, { status: 500 });
    }

    const overallMap = new Map<string, { key: string; name: string; count: number }>();
    const resById = new Map<string, ReservationRow>();

    (reservations ?? []).forEach((r: ReservationRow) => {
      resById.set(r.id, r);
      const key = teacherKey(r);
      const name = teacherNameMap.get(key) ?? r.teacher_name?.trim() ?? "Sem nome";
      const current = overallMap.get(key) ?? { key, name, count: 0 };
      current.count += 1;
      overallMap.set(key, current);
    });

    const reservationIds = (reservations ?? []).map((r: ReservationRow) => r.id);
    const itemIds = (items ?? []).map((it: ItemRow) => it.id);
    const perItemMap = new Map<string, Map<string, Set<string>>>();

    if (reservationIds.length && itemIds.length) {
      const { data: ri, error: riErr } = await supabaseAdmin
        .from("reservation_items")
        .select("reservation_id,item_id")
        .in("reservation_id", reservationIds)
        .in("item_id", itemIds);

      if (riErr) {
        return NextResponse.json({ error: riErr.message }, { status: 500 });
      }

      (ri ?? []).forEach((row: ReservationItemRow) => {
        const reservation = resById.get(row.reservation_id);
        if (!reservation) return;

        const key = teacherKey(reservation);
        const itemId = row.item_id as string;

        let itemMap = perItemMap.get(itemId);
        if (!itemMap) {
          itemMap = new Map();
          perItemMap.set(itemId, itemMap);
        }

        let set = itemMap.get(key);
        if (!set) {
          set = new Set();
          itemMap.set(key, set);
        }
        set.add(row.reservation_id);
      });
    }

    const overall = Array.from(overallMap.values()).sort((a, b) => b.count - a.count);
    const perItem: Record<string, { key: string; name: string; count: number }[]> = {};

    for (const [itemId, map] of perItemMap.entries()) {
      const rows: { key: string; name: string; count: number }[] = [];
      for (const [key, set] of map.entries()) {
        const sampleRes = Array.from(set)[0];
        const r = resById.get(sampleRes);
        const name = r
          ? teacherNameMap.get(key) ?? r.teacher_name?.trim() ?? "Sem nome"
          : "Sem nome";
        rows.push({ key, name, count: set.size });
      }
      rows.sort((a, b) => b.count - a.count);
      perItem[itemId] = rows;
    }

    return NextResponse.json({
      ok: true,
      items: items ?? [],
      overall,
      perItem,
    });
  } catch {
    return NextResponse.json({ error: "Falha ao processar a requisição." }, { status: 400 });
  }
}
