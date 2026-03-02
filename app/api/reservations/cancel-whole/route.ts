import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../teachers/_supabaseAdmin";
import { requireUser } from "../../_auth";
import { isAdminUser } from "../../_admin";

export async function POST(req: Request) {
  try {
    const { user, response } = await requireUser(req);
    if (response) return response;

    const body = await req.json();
    const { reservation_id } = body ?? {};

    if (!reservation_id) {
      return NextResponse.json({ error: "ID inválido." }, { status: 400 });
    }

    const isAdmin = await isAdminUser(user?.id ?? "");

    if (!isAdmin) {
      const { data: resData, error: resErr } = await supabaseAdmin
        .from("reservations")
        .select("id,user_id")
        .eq("id", reservation_id)
        .single();

      if (resErr || !resData) {
        return NextResponse.json({ error: "Erro ao carregar reserva." }, { status: 500 });
      }

      if (resData.user_id !== (user?.id ?? null)) {
        return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });
      }
    }

    const { error } = await supabaseAdmin
      .from("reservations")
      .update({ status: "cancelled" })
      .eq("id", reservation_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Falha ao processar a requisição." }, { status: 400 });
  }
}
