import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../teachers/_supabaseAdmin";
import { requireUser } from "../../_auth";
import { getSharedSchoolIdsForSchool } from "../../_resourceGroups";

type ReservationRow = {
  id: string;
  teacher_name: string | null;
  teacher_email: string | null;
  school_class: string | null;
  school_id: string | null;
  start_period: number;
  end_period: number;
  other_item_name: string | null;
};
type ReservationItemRow = {
  reservation_id: string;
  item_id: string;
  qty: number;
};
type ItemRow = {
  id: string;
  name: string;
  category: string;
};
type SchoolRow = {
  id: string;
  name: string;
};
type UnifiedRow = {
  id: string;
  period: number;
  teacher: string;
  school_class: string | null;
  school_id: string | null;
  school_name: string | null;
  items: string[];
};

function normalizeTeacherName(row: ReservationRow) {
  return row?.teacher_name || row?.teacher_email || "Sem nome";
}

export async function POST(req: Request) {
  try {
    const { response } = await requireUser(req);
    if (response) return response;

    const body = await req.json().catch(() => ({}));
    const date = String(body?.date ?? "");
    const schoolId = String(body?.school_id ?? "").trim();
    if (!date) {
      return NextResponse.json({ ok: false, error: "Parâmetros inválidos." }, { status: 400 });
    }
    const sharedSchoolIds = schoolId ? await getSharedSchoolIdsForSchool(schoolId) : [];

    let reservationsQuery = supabaseAdmin
      .from("reservations")
      .select(
        "id,teacher_name,teacher_email,school_class,school_id,use_date,start_period,end_period,status,other_item_name"
      )
      .eq("use_date", date)
      .eq("status", "active");
    if (schoolId) {
      reservationsQuery = reservationsQuery.in("school_id", sharedSchoolIds.length ? sharedSchoolIds : [schoolId]);
    }
    const { data: reservations, error: resErr } = await reservationsQuery;
    if (resErr) {
      return NextResponse.json(
        { ok: false, error: resErr.message },
        { status: 400 }
      );
    }

    const reservationIds = (reservations ?? []).map((r) => r.id);
    if (!reservationIds.length) {
      return NextResponse.json({ ok: true, data: [] });
    }

    const { data: reservationItems, error: riErr } = await supabaseAdmin
      .from("reservation_items")
      .select("reservation_id,item_id,qty")
      .in("reservation_id", reservationIds);
    if (riErr) {
      return NextResponse.json(
        { ok: false, error: riErr.message },
        { status: 400 }
      );
    }

    const itemIds = Array.from(
      new Set((reservationItems ?? []).map((r) => r.item_id))
    );
    const { data: items } = await supabaseAdmin
      .from("items")
      .select("id,name,category,school_id")
      .in("id", itemIds);

    const schoolIds = Array.from(
      new Set((reservations ?? []).map((r) => r.school_id).filter(Boolean))
    ) as string[];
    const { data: schools } = await supabaseAdmin
      .from("schools")
      .select("id,name")
      .in("id", schoolIds);

    const schoolMap = new Map<string, string>();
    (schools ?? []).forEach((s: SchoolRow) => schoolMap.set(s.id, s.name));

    const itemMap = new Map<string, { name: string; category: string }>();
    (items ?? []).forEach((it: ItemRow) => itemMap.set(it.id, it));

    const itemsByReservation: Record<string, string[]> = {};
    (reservationItems ?? []).forEach((ri: ReservationItemRow) => {
      const it = itemMap.get(ri.item_id);
      const label = it ? `${it.category} — ${it.name}` : "Material";
      itemsByReservation[ri.reservation_id] ??= [];
      itemsByReservation[ri.reservation_id].push(
        ri.qty && ri.qty > 1 ? `${label} (${ri.qty})` : label
      );
    });
    (reservations ?? []).forEach((r: ReservationRow) => {
      if (!r.other_item_name) return;
      itemsByReservation[r.id] ??= [];
      itemsByReservation[r.id].push(`Outros — ${r.other_item_name}`);
    });

    const rows = (reservations ?? []).flatMap((r: ReservationRow) => {
      const list: UnifiedRow[] = [];
      for (let p = r.start_period; p <= r.end_period; p += 1) {
        list.push({
          id: r.id,
          period: p,
          teacher: normalizeTeacherName(r),
          school_class: r.school_class,
          school_id: r.school_id,
          school_name: r.school_id ? schoolMap.get(r.school_id) ?? null : null,
          items: itemsByReservation[r.id] ?? [],
        });
      }
      return list;
    });

    return NextResponse.json({ ok: true, data: rows });
  } catch {
    return NextResponse.json({ ok: false, error: "Erro ao carregar agendamentos." }, { status: 500 });
  }
}
