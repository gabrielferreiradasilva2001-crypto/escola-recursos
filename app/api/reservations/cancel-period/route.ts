import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../teachers/_supabaseAdmin";
import { requireUser } from "../../_auth";
import { isAdminUser } from "../../_admin";

type Reservation = {
  id: string;
  user_id: string | null;
  teacher_email: string | null;
  teacher_name: string | null;
  teacher_id: string | null;
  school_class: string;
  use_date: string;
  start_period: number;
  end_period: number;
  status: string;
  other_item_name: string | null;
};

type ReservationItem = {
  reservation_id: string;
  item_id: string;
  qty: number;
};

export async function POST(req: Request) {
  try {
    const { user, response } = await requireUser(req);
    if (response) return response;

    const body = await req.json();
    const { reservation_id, period } = body ?? {};

    if (!reservation_id || !period) {
      return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400 });
    }

    const { data: resData, error: getErr } = await supabaseAdmin
      .from("reservations")
      .select("id,user_id,teacher_email,teacher_name,teacher_id,school_class,use_date,start_period,end_period,status,other_item_name")
      .eq("id", reservation_id)
      .single();

    if (getErr || !resData) {
      return NextResponse.json({ error: "Erro ao carregar reserva." }, { status: 500 });
    }

    const r = resData as Reservation;
    const isAdmin = await isAdminUser(user?.id ?? "");
    if (!isAdmin && r.user_id !== (user?.id ?? null)) {
      return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });
    }
    const start = r.start_period;
    const end = r.end_period;

    if (period < start || period > end) {
      return NextResponse.json({ error: "Esse tempo não está dentro do intervalo desse registro." }, { status: 400 });
    }

    if (start === end) {
      const { error } = await supabaseAdmin
        .from("reservations")
        .update({ status: "cancelled" })
        .eq("id", reservation_id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ ok: true, mode: "cancelled" });
    }

    const { data: itemsRows, error: itemsErr } = await supabaseAdmin
      .from("reservation_items")
      .select("reservation_id,item_id,qty")
      .eq("reservation_id", reservation_id);

    if (itemsErr) {
      return NextResponse.json({ error: "Erro ao carregar materiais da reserva." }, { status: 500 });
    }

    const reservationItems = (itemsRows ?? []) as ReservationItem[];

    if (period === start) {
      const { error: upErr } = await supabaseAdmin
        .from("reservations")
        .update({ start_period: start + 1 })
        .eq("id", reservation_id);

      if (upErr) {
        return NextResponse.json({ error: upErr.message }, { status: 500 });
      }

      return NextResponse.json({ ok: true, mode: "trim-start" });
    }

    if (period === end) {
      const { error: upErr } = await supabaseAdmin
        .from("reservations")
        .update({ end_period: end - 1 })
        .eq("id", reservation_id);

      if (upErr) {
        return NextResponse.json({ error: upErr.message }, { status: 500 });
      }

      return NextResponse.json({ ok: true, mode: "trim-end" });
    }

    const { error: upAErr } = await supabaseAdmin
      .from("reservations")
      .update({ end_period: period - 1 })
      .eq("id", reservation_id);

    if (upAErr) {
      return NextResponse.json({ error: upAErr.message }, { status: 500 });
    }

    const { data: newRes, error: insErr } = await supabaseAdmin
      .from("reservations")
      .insert({
        user_id: r.user_id,
        teacher_email: r.teacher_email,
        teacher_id: r.teacher_id,
        teacher_name: r.teacher_name,
        school_class: r.school_class,
        use_date: r.use_date,
        start_period: period + 1,
        end_period: end,
        status: "active",
        other_item_name: r.other_item_name,
      })
      .select("id")
      .single();

    if (insErr || !newRes?.id) {
      return NextResponse.json({ error: "Erro ao dividir reserva." }, { status: 500 });
    }

    if (reservationItems.length) {
      const payload = reservationItems.map((x) => ({
        reservation_id: newRes.id,
        item_id: x.item_id,
        qty: x.qty,
      }));

      const { error: copyErr } = await supabaseAdmin.from("reservation_items").insert(payload);
      if (copyErr) {
        return NextResponse.json({ error: "Falhou ao copiar materiais." }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true, mode: "split" });
  } catch {
    return NextResponse.json({ error: "Falha ao processar a requisição." }, { status: 400 });
  }
}
