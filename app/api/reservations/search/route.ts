import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../teachers/_supabaseAdmin";
import { requireUser } from "../../_auth";
import { getSharedSchoolIdsForSchool } from "../../_resourceGroups";

type ReservationSearchRow = {
  id: string;
  teacher_name: string | null;
  teacher_email: string | null;
  teacher_id: string | null;
  school_class: string;
  school_id: string | null;
  school_name: string | null;
  use_date: string;
  start_period: number;
  end_period: number;
  status: string;
  other_item_name: string | null;
};
type ReservationItemSearchRow = {
  reservation_id: string;
  qty: number;
  items: {
    name: string;
    category: string;
  } | null;
};

export async function POST(req: Request) {
  try {
    const { response } = await requireUser(req);
    if (response) return response;

    const body = await req.json();
    const teacher_name = String(body?.teacher_name ?? "").trim();
    const item_id = String(body?.item_id ?? "").trim();
    const use_date = String(body?.use_date ?? "").trim();
    const status = String(body?.status ?? "active").trim();
    const school_id = String(body?.school_id ?? "").trim();
    const sharedSchoolIds = school_id ? await getSharedSchoolIdsForSchool(school_id) : [];

    let query = supabaseAdmin
      .from("reservations")
      .select(
        "id,teacher_name,teacher_email,teacher_id,school_class,school_id,school_name,use_date,start_period,end_period,status,other_item_name"
      );

    if (use_date) query = query.eq("use_date", use_date);
    if (status && status !== "all") query = query.eq("status", status);
    if (teacher_name) query = query.ilike("teacher_name", `%${teacher_name}%`);
    if (school_id) {
      query = query.in("school_id", sharedSchoolIds.length ? sharedSchoolIds : [school_id]);
    }

    const { data: reservations, error: resErr } = await query;
    if (resErr) {
      return NextResponse.json({ error: resErr.message }, { status: 500 });
    }

    const reservationIds = (reservations ?? []).map((r: ReservationSearchRow) => r.id);
    if (!reservationIds.length) {
      return NextResponse.json({ ok: true, results: [] });
    }

    let riQuery = supabaseAdmin
      .from("reservation_items")
      .select("reservation_id,qty,items(name,category)")
      .in("reservation_id", reservationIds);

    if (item_id) riQuery = riQuery.eq("item_id", item_id);

    const { data: ri, error: riErr } = await riQuery;
    if (riErr) {
      return NextResponse.json({ error: riErr.message }, { status: 500 });
    }

    const resourceMap = new Map<string, string[]>();
    (ri ?? []).forEach((row: ReservationItemSearchRow) => {
      const label = row.items
        ? `${row.items.category} — ${row.items.name} (${row.qty})`
        : `Item (${row.qty})`;
      const list = resourceMap.get(row.reservation_id) ?? [];
      list.push(label);
      resourceMap.set(row.reservation_id, list);
    });

    const results = (reservations ?? [])
      .filter((r: ReservationSearchRow) => (item_id ? resourceMap.has(r.id) : true))
      .map((r: ReservationSearchRow) => ({
        ...r,
        resources: resourceMap.get(r.id) ?? [],
      }));

    return NextResponse.json({ ok: true, results });
  } catch {
    return NextResponse.json({ error: "Falha ao processar a requisição." }, { status: 400 });
  }
}
