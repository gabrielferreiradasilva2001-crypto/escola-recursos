import { NextResponse } from "next/server";
import { supabaseAdmin } from "../_supabaseAdmin";
import { requireUser } from "../../_auth";

export async function GET(req: Request) {
  try {
    const { response } = await requireUser(req);
    if (response) return response;

    const { data, error } = await supabaseAdmin
      .from("teachers")
      .select("name,birth_day,birth_month,active")
      .eq("active", true);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data: data ?? [] });
  } catch {
    return NextResponse.json({ error: "Falha ao processar a requisição." }, { status: 400 });
  }
}
