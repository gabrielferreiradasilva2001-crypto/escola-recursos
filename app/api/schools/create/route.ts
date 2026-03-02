import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../teachers/_supabaseAdmin";
import { requireAdmin } from "../../_auth";
import { getAdminUserId } from "../../_admin";

export async function POST(req: Request) {
  try {
    const { user, response } = await requireAdmin(req);
    if (response || !user) return response;
    const primaryAdminId = await getAdminUserId();
    if (!primaryAdminId || user.id !== primaryAdminId) {
      return NextResponse.json({ error: "Somente o admin principal pode cadastrar escolas." }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const name = String(body?.name ?? "").trim();
    const active = typeof body?.active === "boolean" ? body.active : true;

    if (!name) {
      return NextResponse.json({ error: "Informe o nome da escola." }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("schools")
      .insert({ name, active })
      .select("id,name,active,created_at")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data });
  } catch {
    return NextResponse.json({ error: "Falha ao processar a requisição." }, { status: 400 });
  }
}
