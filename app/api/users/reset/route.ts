import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
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

async function listAllUsers() {
  const perPage = 1000;
  let page = 1;
  const users: User[] = [];

  while (page <= 10) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      perPage,
      page,
    });
    if (error) return { users: null as User[] | null, error };
    const chunk = data?.users ?? [];
    users.push(...chunk);
    if (chunk.length < perPage) break;
    page += 1;
  }

  return { users, error: null as { message?: string } | null };
}

export async function POST(req: Request) {
  try {
    const { user: requester, response } = await requireAdmin(req);
    if (response || !requester) return response;
    const viewerScope = await getViewerSchoolScope(requester);

    const body = await req.json();
    const teacherId = String(body?.teacher_id ?? "").trim();
    const name = String(body?.name ?? "").trim();
    if (!teacherId) {
      return NextResponse.json({ error: "Professor inválido." }, { status: 400 });
    }

    const { users, error: listErr } = await listAllUsers();
    if (listErr) {
      return NextResponse.json({ error: "Falha ao localizar usuário." }, { status: 500 });
    }

    const { data: teacherRow, error: teacherErr } = await supabaseAdmin
      .from("teachers")
      .select("email,name,school_ids")
      .eq("id", teacherId)
      .maybeSingle();
    if (teacherErr) {
      return NextResponse.json({ error: teacherErr.message ?? "Falha ao localizar professor." }, { status: 500 });
    }
    if (!teacherRow) {
      return NextResponse.json({ error: "Professor não encontrado." }, { status: 404 });
    }
    if (!viewerScope.isSuperAdmin) {
      const teacherSchoolIds = normalizeSchoolIds((teacherRow as { school_ids?: unknown }).school_ids);
      const canManage = teacherSchoolIds.some((sid) => viewerScope.allowedSchoolIds.includes(sid));
      if (!canManage) {
        return NextResponse.json({ error: "Você não pode redefinir acesso de outra escola." }, { status: 403 });
      }
    }

    const teacherUsername = normalizeUsername(String(teacherRow?.email ?? ""));
    const teacherEmail = teacherUsername ? `${teacherUsername}@local.eeav` : "";
    const user =
      users?.find((u) => String(u.user_metadata?.teacher_id ?? "") === teacherId) ??
      users?.find((u) => {
        const userEmail = String(u.email ?? "").toLowerCase();
        const metadataUsername = normalizeUsername(String(u.user_metadata?.username ?? ""));
        return (
          (teacherEmail && userEmail === teacherEmail) ||
          (teacherUsername && metadataUsername === teacherUsername)
        );
      }) ??
      null;

    const resolvedUser = user;
    let username = "";
    const fallbackName = String(teacherRow?.name ?? "").trim();
    const chosenName = name || fallbackName;

    if (!resolvedUser) {
      if (!teacherUsername || teacherUsername.length < 3) {
        return NextResponse.json(
          { error: "Usuário não encontrado e este professor não possui login válido para recriar acesso." },
          { status: 404 }
        );
      }
      const password = passwordFromName(chosenName, teacherUsername);
      const createRes = await supabaseAdmin.auth.admin.createUser({
        email: teacherEmail,
        password,
        email_confirm: true,
        user_metadata: {
          username: teacherUsername,
          name: chosenName || null,
          teacher_id: teacherId,
          force_password_change: true,
        },
      });
      if (createRes.error || !createRes.data?.user) {
        return NextResponse.json(
          { error: createRes.error?.message ?? "Falha ao recriar usuário." },
          { status: 500 }
        );
      }
      return NextResponse.json({ ok: true, username: teacherUsername, password, created: true });
    }

    const email = String(resolvedUser.email ?? "");
    username = email.endsWith("@local.eeav") ? email.replace("@local.eeav", "") : email;
    const password = passwordFromName(chosenName, username);

    const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(resolvedUser.id, {
      password,
      user_metadata: {
        ...(resolvedUser.user_metadata ?? {}),
        teacher_id: teacherId,
        username: username || teacherUsername || null,
        name: chosenName || null,
        force_password_change: true,
      },
    });

    if (updErr) {
      return NextResponse.json({ error: updErr.message ?? "Falha ao redefinir senha." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, username, password });
  } catch {
    return NextResponse.json({ error: "Falha ao processar a requisição." }, { status: 400 });
  }
}
