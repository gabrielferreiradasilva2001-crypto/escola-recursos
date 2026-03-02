import { NextResponse } from "next/server";
import { requireAdmin } from "../../_auth";
import { getAdminUserId, getValidLocations, getValidPeriods } from "../../_admin";
import { supabaseAdmin } from "../../teachers/_supabaseAdmin";

type AccessRow = {
  user_id: string;
  allowed_periods: string[] | null;
  allowed_locations: string[] | null;
  default_period: string | null;
  default_location: string | null;
};
type AdminRow = {
  user_id: string;
};

async function resolveUserIdFromTeacherId(teacherId: string) {
  const normalizedTeacherId = String(teacherId ?? "").trim();
  if (!normalizedTeacherId) return "";

  const { data: teacherRow, error: teacherErr } = await supabaseAdmin
    .from("teachers")
    .select("email")
    .eq("id", normalizedTeacherId)
    .maybeSingle();
  if (teacherErr || !teacherRow) return "";

  const teacherEmailRaw = String((teacherRow as { email?: unknown }).email ?? "").trim().toLowerCase();
  const teacherEmailNormalized = teacherEmailRaw.includes("@")
    ? teacherEmailRaw
    : teacherEmailRaw
    ? `${teacherEmailRaw}@local.eeav`
    : "";

  const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const users = authUsers?.users ?? [];
  const matchByMeta = users.find((u) => {
    const metaTeacherId = String((u.user_metadata as { teacher_id?: unknown } | null)?.teacher_id ?? "").trim();
    return metaTeacherId === normalizedTeacherId;
  });
  if (matchByMeta?.id) return String(matchByMeta.id);

  const matchByEmail = users.find((u) => {
    const email = String(u.email ?? "").trim().toLowerCase();
    return !!email && (email === teacherEmailRaw || email === teacherEmailNormalized);
  });
  if (matchByEmail?.id) return String(matchByEmail.id);

  return "";
}

async function resolveTargetUserId(body: Record<string, unknown>) {
  const directUserId = String(body?.user_id ?? "").trim();
  if (directUserId) return directUserId;
  const teacherId = String(body?.teacher_id ?? "").trim();
  if (!teacherId) return "";
  return resolveUserIdFromTeacherId(teacherId);
}

function normalizePeriod(value: unknown) {
  const raw = String(value ?? "").trim().toLowerCase();
  const validPeriods = getValidPeriods() as readonly string[];
  return validPeriods.includes(raw) ? raw : "";
}

function normalizeLocation(value: unknown) {
  const text = String(value ?? "").trim().replace(/\s+/g, " ");
  const raw = text.toLowerCase();
  if (raw === "antonio valadares - sed") return "Antonio Valadares - SED";
  if (raw === "antonio valadares - extensão" || raw === "antonio valadares - extensao") {
    return "Antonio Valadares - Extensão";
  }
  if (raw === "eeav - sede") return "Antonio Valadares - SED";
  if (raw === "eeav - extensão" || raw === "eeav - extensao") return "Antonio Valadares - Extensão";
  if (raw === "escola antonio valadares") return "Antonio Valadares - SED";
  return text;
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}

function normalizePeriods(list: unknown) {
  if (!Array.isArray(list)) return [];
  return unique(list.map((v) => normalizePeriod(v)).filter(Boolean));
}

function normalizeLocations(list: unknown) {
  if (!Array.isArray(list)) return [];
  return unique(list.map((v) => normalizeLocation(v)).filter(Boolean));
}

function normalizeManagementRole(value: unknown) {
  const raw = String(value ?? "").trim().toLowerCase();
  if (raw === "diretor" || raw === "secretaria" || raw === "coordenador") return raw;
  return "diretor";
}

async function ensurePrimaryAdmin(userId: string) {
  const primary = await getAdminUserId();
  return Boolean(primary && primary === userId);
}

export async function GET(req: Request) {
  const { user, response } = await requireAdmin(req);
  if (response || !user) return response;
  const canManage = await ensurePrimaryAdmin(user.id);
  if (!canManage) {
    return NextResponse.json({ error: "Somente o admin principal pode gerenciar admins." }, { status: 403 });
  }

  try {
    const primaryAdminId = await getAdminUserId();
    const { data: adminsRows, error: adminsErr } = await supabaseAdmin
      .from("admins")
      .select("user_id")
      .order("user_id");
    if (adminsErr) return NextResponse.json({ error: adminsErr.message }, { status: 500 });

    const { data: accessRowsRaw, error: accessErr } = await supabaseAdmin
      .from("admin_access")
      .select("user_id,allowed_periods,allowed_locations,default_period,default_location");
    const accessRows =
      accessErr && accessErr.message?.toLowerCase?.().includes("admin_access")
        ? []
        : accessRowsRaw ?? [];
    if (accessErr && !accessErr.message?.toLowerCase?.().includes("admin_access")) {
      return NextResponse.json({ error: accessErr.message }, { status: 500 });
    }

    const accessByUserId = new Map<
      string,
      {
        allowed_periods: string[] | null;
        allowed_locations: string[] | null;
        default_period: string | null;
        default_location: string | null;
      }
    >();
    accessRows.forEach((row: AccessRow) => {
      accessByUserId.set(String(row.user_id), {
        allowed_periods: row.allowed_periods ?? null,
        allowed_locations: row.allowed_locations ?? null,
        default_period: row.default_period ?? null,
        default_location: row.default_location ?? null,
      });
    });

    const validPeriods = getValidPeriods();
    const validLocations = getValidLocations();

    const userIds = unique([
      ...(adminsRows ?? []).map((row: AdminRow) => String(row.user_id)),
      ...(primaryAdminId ? [String(primaryAdminId)] : []),
    ]);

    const rows = userIds.map((userId: string) => {
      const access = accessByUserId.get(userId);
      const allowedPeriods = normalizePeriods(access?.allowed_periods ?? []);
      const allowedLocations = normalizeLocations(access?.allowed_locations ?? []);
      const defaultPeriod = normalizePeriod(access?.default_period ?? "");
      const defaultLocation = normalizeLocation(access?.default_location ?? "");
      return {
        user_id: userId,
        is_primary: Boolean(primaryAdminId && primaryAdminId === userId),
        allowed_periods: allowedPeriods.length ? allowedPeriods : validPeriods,
        allowed_locations: allowedLocations.length ? allowedLocations : validLocations,
        default_period: defaultPeriod || allowedPeriods[0] || validPeriods[0] || null,
        default_location: defaultLocation || allowedLocations[0] || validLocations[0] || null,
      };
    });

    return NextResponse.json({
      ok: true,
      data: rows,
      valid_periods: validPeriods,
      valid_locations: validLocations,
      primary_admin_user_id: primaryAdminId || null,
    });
  } catch {
    return NextResponse.json({ error: "Erro ao listar admins." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { user, response } = await requireAdmin(req);
  if (response || !user) return response;
  const canManage = await ensurePrimaryAdmin(user.id);
  if (!canManage) {
    return NextResponse.json({ error: "Somente o admin principal pode gerenciar admins." }, { status: 403 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const targetUserId = await resolveTargetUserId(body as Record<string, unknown>);
    if (!targetUserId) {
      return NextResponse.json({ error: "Usuário não encontrado para este professor." }, { status: 400 });
    }

    const allowedPeriods = normalizePeriods(body?.allowed_periods);
    const allowedLocations = normalizeLocations(body?.allowed_locations);
    if (!allowedPeriods.length) {
      return NextResponse.json({ error: "Selecione ao menos um período." }, { status: 400 });
    }
    if (!allowedLocations.length) {
      return NextResponse.json({ error: "Selecione ao menos uma escola/local." }, { status: 400 });
    }

    const defaultPeriodInput = normalizePeriod(body?.default_period);
    const defaultLocationInput = normalizeLocation(body?.default_location);
    const managementRole = normalizeManagementRole(body?.management_role);
    const defaultPeriod = allowedPeriods.includes(defaultPeriodInput) ? defaultPeriodInput : allowedPeriods[0];
    const defaultLocation = allowedLocations.includes(defaultLocationInput)
      ? defaultLocationInput
      : allowedLocations[0];

    const { error: adminErr } = await supabaseAdmin.from("admins").upsert({ user_id: targetUserId });
    if (adminErr) {
      return NextResponse.json({ error: adminErr.message }, { status: 500 });
    }

    const { error: accessErr } = await supabaseAdmin.from("admin_access").upsert({
      user_id: targetUserId,
      allowed_periods: allowedPeriods,
      allowed_locations: allowedLocations,
      default_period: defaultPeriod,
      default_location: defaultLocation,
      updated_by: user.id,
    });
    if (accessErr) {
      return NextResponse.json({ error: accessErr.message }, { status: 500 });
    }

    const userList = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const authUser = (userList.data?.users ?? []).find((u) => String(u.id ?? "") === targetUserId);
    const currentMeta = (authUser?.user_metadata ?? {}) as Record<string, unknown>;
    const { error: metaErr } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
      user_metadata: {
        ...currentMeta,
        management_role: managementRole,
      },
    });
    if (metaErr) {
      return NextResponse.json({ error: metaErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Falha ao salvar admin." }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  const { user, response } = await requireAdmin(req);
  if (response || !user) return response;
  const canManage = await ensurePrimaryAdmin(user.id);
  if (!canManage) {
    return NextResponse.json({ error: "Somente o admin principal pode gerenciar admins." }, { status: 403 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const targetUserId = await resolveTargetUserId(body as Record<string, unknown>);
    if (!targetUserId) {
      return NextResponse.json({ error: "Usuário não encontrado para este professor." }, { status: 400 });
    }

    const primaryAdminId = await getAdminUserId();
    if (primaryAdminId && targetUserId === primaryAdminId) {
      return NextResponse.json({ error: "Não é permitido remover o admin principal." }, { status: 400 });
    }

    const { error: accessErr } = await supabaseAdmin.from("admin_access").delete().eq("user_id", targetUserId);
    if (accessErr) {
      return NextResponse.json({ error: accessErr.message }, { status: 500 });
    }

    const { error: adminErr } = await supabaseAdmin.from("admins").delete().eq("user_id", targetUserId);
    if (adminErr) {
      return NextResponse.json({ error: adminErr.message }, { status: 500 });
    }

    const userList = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const authUser = (userList.data?.users ?? []).find((u) => String(u.id ?? "") === targetUserId);
    if (authUser) {
      const currentMeta = (authUser.user_metadata ?? {}) as Record<string, unknown>;
      await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
        user_metadata: {
          ...currentMeta,
          management_role: "professor",
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Falha ao remover admin." }, { status: 400 });
  }
}
