import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../teachers/_supabaseAdmin";
import { requireUser } from "../../_auth";
import { isAdminUser } from "../../_admin";

export async function GET(req: Request) {
  const { user, response } = await requireUser(req);
  if (response || !user) return response;

  const ok = await isAdminUser(user.id ?? "");
  if (!ok) return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });

  const { data, error } = await supabaseAdmin
    .from("substitute_teachers")
    .select("id,name,area,phone,notes,created_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data: data ?? [] });
}

export async function POST(req: Request) {
  const { user, response } = await requireUser(req);
  if (response || !user) return response;

  const ok = await isAdminUser(user.id ?? "");
  if (!ok) return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const name = String(body?.name ?? "").trim();
  const area = String(body?.area ?? "").trim();
  const phone = String(body?.phone ?? "").trim();
  const notes = String(body?.notes ?? "").trim();

  if (!name) return NextResponse.json({ error: "Informe o nome." }, { status: 400 });
  if (!area) return NextResponse.json({ error: "Informe a área." }, { status: 400 });

  const { error } = await supabaseAdmin.from("substitute_teachers").insert({
    name,
    area,
    phone: phone || null,
    notes: notes || null,
    created_by: user.id ?? null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { user, response } = await requireUser(req);
  if (response || !user) return response;

  const ok = await isAdminUser(user.id ?? "");
  if (!ok) return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const id = String(body?.id ?? "").trim();
  if (!id) return NextResponse.json({ error: "ID inválido." }, { status: 400 });

  const { error } = await supabaseAdmin.from("substitute_teachers").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
