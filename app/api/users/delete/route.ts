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
    if (!teacherId) {
      return NextResponse.json({ error: "Professor inválido." }, { status: 400 });
    }

    const { users, error: listErr } = await listAllUsers();
    if (listErr) {
      return NextResponse.json({ error: "Falha ao localizar usuário." }, { status: 500 });
    }

    const { data: teacherRow, error: teacherErr } = await supabaseAdmin
      .from("teachers")
      .select("email,school_ids")
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
        return NextResponse.json({ error: "Você não pode apagar acesso de outra escola." }, { status: 403 });
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

    if (user) {
      const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(user.id);
      if (delErr) {
        return NextResponse.json({ error: delErr.message ?? "Falha ao apagar usuário." }, { status: 500 });
      }
    }

    const { data: resv, error: resvErr } = await supabaseAdmin
      .from("reservations")
      .select("id")
      .eq("teacher_id", teacherId)
      .limit(1);
    if (resvErr) {
      return NextResponse.json(
        { error: resvErr.message ?? "Falha ao verificar reservas do professor." },
        { status: 500 }
      );
    }
    if (resv?.length) {
      return NextResponse.json(
        {
          error:
            "Este professor possui reservas vinculadas. Desative o professor em vez de apagar, ou apague as reservas primeiro.",
        },
        { status: 409 }
      );
    }

    const { error: tErr } = await supabaseAdmin
      .from("teachers")
      .delete()
      .eq("id", teacherId);

    if (tErr) {
      return NextResponse.json({ error: tErr.message ?? "Falha ao apagar professor." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Falha ao processar a requisição." }, { status: 400 });
  }
}
