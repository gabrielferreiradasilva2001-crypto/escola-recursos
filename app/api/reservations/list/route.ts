import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../teachers/_supabaseAdmin";
import { requireUser } from "../../_auth";
import { getSharedSchoolIdsForSchool } from "../../_resourceGroups";

type ReservationRow = { id: string };
type ReservationItemRow = {
  reservation_id: string;
  item_id: string;
  qty: number;
};

export async function POST(req: Request) {
  try {
    const { response } = await requireUser(req);
    if (response) return response;

    const body = await req.json();
    const { start_date, end_date } = body ?? {};
    const school_id = String(body?.school_id ?? "").trim();
    let item_id = String(body?.item_id ?? "").trim();
    const sharedSchoolIds = school_id ? await getSharedSchoolIdsForSchool(school_id) : [];

    if (!start_date || !end_date) {
      return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400 });
    }

    if (!item_id) {
      let firstItemQuery = supabaseAdmin
        .from("items")
        .select("id")
        .order("category")
        .order("name")
        .limit(1);
      if (school_id) {
        firstItemQuery = firstItemQuery.in("school_id", sharedSchoolIds.length ? sharedSchoolIds : [school_id]);
      }
      const { data: firstItem, error: itemErr } = await firstItemQuery.maybeSingle();

      if (itemErr) {
        return NextResponse.json({ error: itemErr.message }, { status: 500 });
      }
      item_id = firstItem?.id ?? "";
    }

    if (!item_id) {
      return NextResponse.json({ ok: true, reservations: [], itemsUsed: [] });
    }

    let query = supabaseAdmin
      .from("reservations")
      .select("id,user_id,teacher_email,teacher_name,teacher_id,school_class,school_id,school_name,use_date,start_period,end_period,status,other_item_name")
      .gte("use_date", start_date)
      .lte("use_date", end_date)
      .eq("status", "active");
    if (school_id) {
      query = query.in("school_id", sharedSchoolIds.length ? sharedSchoolIds : [school_id]);
    }
    const { data: reservations, error: resErr } = await query;

    if (resErr) {
      return NextResponse.json({ error: resErr.message }, { status: 500 });
    }

    const reservationIds = (reservations ?? []).map((r: ReservationRow) => r.id);
    let itemsUsed: ReservationItemRow[] = [];

    if (reservationIds.length) {
      const { data: ri, error: riErr } = await supabaseAdmin
        .from("reservation_items")
        .select("reservation_id,item_id,qty")
        .in("reservation_id", reservationIds)
        .eq("item_id", item_id);

      if (riErr) {
        return NextResponse.json({ error: riErr.message }, { status: 500 });
      }
      itemsUsed = ri ?? [];
    }

    return NextResponse.json({ ok: true, reservations: reservations ?? [], itemsUsed });
  } catch {
    return NextResponse.json({ error: "Falha ao processar a requisição." }, { status: 400 });
  }
}
