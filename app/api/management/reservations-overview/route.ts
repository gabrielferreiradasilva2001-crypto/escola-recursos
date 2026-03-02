import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../teachers/_supabaseAdmin";
import { requireAdmin } from "../../_auth";
import { getSharedSchoolIdsForSchool } from "../../_resourceGroups";

type ReservationRow = {
  id: string;
  teacher_name: string | null;
  teacher_email: string | null;
  school_class: string | null;
  school_name: string | null;
  use_date: string;
  start_period: number;
  end_period: number;
};
type ReservationIdRow = { id: string };
type ReservationItemUsageRow = { reservation_id: string; item_id: string; qty: number };
type ItemRow = { id: string; name: string; category: string };

export async function GET(req: Request) {
  try {
    const { response } = await requireAdmin(req);
    if (response) return response;

    const url = new URL(req.url);
    const startDate = url.searchParams.get("start_date") ?? "";
    const endDate = url.searchParams.get("end_date") ?? "";
    const schoolId = url.searchParams.get("school_id") ?? "";
    const sharedSchoolIds = schoolId ? await getSharedSchoolIdsForSchool(schoolId) : [];

    if (!startDate || !endDate) {
      return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400 });
    }

    let query = supabaseAdmin
      .from("reservations")
      .select("id,teacher_name,teacher_email,school_class,school_name,use_date,start_period,end_period")
      .gte("use_date", startDate)
      .lte("use_date", endDate)
      .eq("status", "active")
      .order("use_date")
      .order("start_period");
    if (schoolId) query = query.in("school_id", sharedSchoolIds.length ? sharedSchoolIds : [schoolId]);
    const { data: reservations, error: resErr } = await query;
    if (resErr) {
      return NextResponse.json({ error: resErr.message }, { status: 500 });
    }

    const reservationIds = (reservations ?? []).map((r: ReservationIdRow) => r.id);
    let itemsUsed: { reservation_id: string; item_id: string; qty: number }[] = [];

    if (reservationIds.length) {
      const { data: ri, error: riErr } = await supabaseAdmin
        .from("reservation_items")
        .select("reservation_id,item_id,qty")
        .in("reservation_id", reservationIds);
      if (riErr) {
        return NextResponse.json({ error: riErr.message }, { status: 500 });
      }
      itemsUsed = (ri ?? []) as ReservationItemUsageRow[];
    }

    const itemIds = Array.from(new Set(itemsUsed.map((x) => x.item_id)));
    const itemsMap = new Map<string, { name: string; category: string }>();

    if (itemIds.length) {
      let itemsQuery = supabaseAdmin
        .from("items")
        .select("id,name,category")
        .in("id", itemIds);
      if (schoolId) itemsQuery = itemsQuery.in("school_id", sharedSchoolIds.length ? sharedSchoolIds : [schoolId]);
      const { data: items, error: itemsErr } = await itemsQuery;
      if (itemsErr) {
        return NextResponse.json({ error: itemsErr.message }, { status: 500 });
      }
      (items ?? []).forEach((it: ItemRow) => itemsMap.set(it.id, { name: it.name, category: it.category }));
    }

    const itemsByReservation = new Map<string, string[]>();
    itemsUsed.forEach((row) => {
      const info = itemsMap.get(row.item_id);
      if (!info) return;
      const label = `${info.category} — ${info.name} x${row.qty}`;
      itemsByReservation.set(row.reservation_id, [
        ...(itemsByReservation.get(row.reservation_id) ?? []),
        label,
      ]);
    });

    const grouped: Record<
      string,
      { id: string; who: string; schoolClass: string; schoolName: string; period: string; items: string[] }[]
    > = {};

    (reservations ?? []).forEach((r: ReservationRow) => {
      const period =
        r.start_period === r.end_period ? `${r.start_period}º` : `${r.start_period}º-${r.end_period}º`;
      const who = r.teacher_name?.trim() || r.teacher_email || "Sem nome";
      const schoolClass = r.school_class ?? "-";
      const schoolName = r.school_name ?? "";
      const items = itemsByReservation.get(r.id) ?? [];
      grouped[r.use_date] ??= [];
      grouped[r.use_date].push({ id: r.id, who, schoolClass, schoolName, period, items });
    });

    return NextResponse.json({ ok: true, data: grouped });
  } catch {
    return NextResponse.json({ error: "Falha ao processar a requisição." }, { status: 400 });
  }
}
