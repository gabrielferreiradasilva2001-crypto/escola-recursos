import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../teachers/_supabaseAdmin";
import { requireAdmin } from "../../_auth";
import { getViewerSchoolScope, normalizeSchoolIds } from "../../_schoolScope";

function normalizeUsername(input: string) {
  return input
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, ".")
    .replace(/[^a-z0-9._-]/g, "")
    .replace(/\.+/g, ".")
    .replace(/^\.|\.$/g, "");
}

function normalizeForPassword(input: string) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "")
    .toLowerCase();
}

function passwordFromName(name: string, fallback: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const first = parts[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1] : "";
  const combined = `${first}${last}`;
  const base = normalizeForPassword(combined) || normalizeForPassword(fallback);
  if (base.length >= 8) return base;
  return `${base}1234`;
}

export async function POST(req: Request) {
  try {
    const { user, response } = await requireAdmin(req);
    if (response || !user) return response;
    const viewerScope = await getViewerSchoolScope(user);

    const body = await req.json();
    const rawUsername = String(body?.username ?? "");
    const displayName = String(body?.name ?? "").trim() || null;
    const requestedRole = String(body?.management_role ?? "").trim().toLowerCase();
    const managementRole =
      requestedRole === "diretor" ||
      requestedRole === "secretaria" ||
      requestedRole === "coordenador" ||
      requestedRole === "estagiario"
        ? requestedRole
        : "professor";
    const teacherId = String(body?.teacher_id ?? "").trim() || null;
    if (!teacherId) {
      return NextResponse.json({ error: "Professor inválido." }, { status: 400 });
    }

    if (!viewerScope.isSuperAdmin) {
      const { data: teacherRow, error: teacherErr } = await supabaseAdmin
        .from("teachers")
        .select("school_ids")
        .eq("id", teacherId)
        .maybeSingle();
      if (teacherErr || !teacherRow) {
        return NextResponse.json({ error: "Professor não encontrado." }, { status: 404 });
      }
      const teacherSchoolIds = normalizeSchoolIds((teacherRow as { school_ids?: unknown }).school_ids);
      const canManage = teacherSchoolIds.some((id) => viewerScope.allowedSchoolIds.includes(id));
      if (!canManage) {
        return NextResponse.json({ error: "Você não pode criar acesso para outra escola." }, { status: 403 });
      }
    }

    const username = normalizeUsername(rawUsername);
    if (!username || username.length < 3) {
      return NextResponse.json({ error: "Usuário inválido." }, { status: 400 });
    }

    const email = `${username}@local.eeav`;
    const password = passwordFromName(displayName ?? "", username);

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        username,
        name: displayName,
        teacher_id: teacherId,
        management_role: managementRole,
        force_password_change: true,
      },
    });

    if (error || !data?.user) {
      const msg = error?.message?.toLowerCase?.() ?? "";
      if (msg.includes("already") || msg.includes("exists") || msg.includes("registered")) {
        const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
          perPage: 1000,
          page: 1,
        });
        if (listErr) {
          return NextResponse.json(
            { error: listErr.message ?? "Falha ao localizar usuário existente." },
            { status: 500 }
          );
        }
        const existing =
          list?.users?.find((u) => String(u.email ?? "").toLowerCase() === email.toLowerCase()) ??
          null;
        if (!existing) {
          return NextResponse.json({ error: "Usuário já existe, mas não foi localizado." }, { status: 500 });
        }
        const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(existing.id, {
          password,
          user_metadata: {
            ...(existing.user_metadata ?? {}),
            username,
            name: displayName,
            teacher_id: teacherId,
            management_role: managementRole,
            force_password_change: true,
          },
        });
        if (updErr) {
          return NextResponse.json(
            { error: updErr.message ?? "Falha ao atualizar usuário existente." },
            { status: 500 }
          );
        }
        return NextResponse.json({ ok: true, username, password, user_id: existing.id });
      }
      return NextResponse.json({ error: error?.message ?? "Falha ao criar usuário." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, username, password, user_id: data.user.id });
  } catch {
    return NextResponse.json({ error: "Falha ao processar a requisição." }, { status: 400 });
  }
}
