import { NextResponse } from "next/server";
import { requireAdmin } from "../../_auth";
import { supabaseAdmin } from "../../teachers/_supabaseAdmin";

export async function POST(req: Request) {
  try {
    const { response } = await requireAdmin(req);
    if (response) return response;

    const body = await req.json();
    const admin_user_id = String(body?.admin_user_id ?? "").trim();
    if (!admin_user_id) {
      return NextResponse.json({ error: "admin_user_id obrigatório." }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("admin_settings")
      .upsert({ id: 1, admin_user_id });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Falha ao processar a requisição." }, { status: 400 });
  }
}
