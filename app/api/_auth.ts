import { NextResponse } from "next/server";
import { supabaseAdmin } from "./teachers/_supabaseAdmin";
import { isAdminUser } from "./_admin";

export async function requireUser(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!token) {
    return { user: null, response: NextResponse.json({ error: "Não autorizado." }, { status: 401 }) };
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) {
    return { user: null, response: NextResponse.json({ error: "Sessão inválida." }, { status: 401 }) };
  }

  return { user: data.user, response: null };
}

export async function requireAdmin(req: Request) {
  const { user, response } = await requireUser(req);
  if (response || !user) {
    return { user: null, response: response ?? NextResponse.json({ error: "Não autorizado." }, { status: 401 }) };
  }

  const ok = await isAdminUser(user.id);
  if (!ok) {
    return { user: null, response: NextResponse.json({ error: "Acesso restrito." }, { status: 403 }) };
  }

  return { user, response: null };
}
