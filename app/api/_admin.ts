import { supabaseAdmin } from "./teachers/_supabaseAdmin";

const VALID_PERIODS = ["matutino", "vespertino", "noturno"] as const;
const VALID_LOCATIONS = ["Antonio Valadares - SED", "Antonio Valadares - Extensão"] as const;

export type AdminScope = {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  allowedPeriods: string[];
  allowedLocations: string[];
  defaultPeriod: string | null;
  defaultLocation: string | null;
};

function uniq(values: string[]) {
  return Array.from(new Set(values));
}

function normalizePeriod(value: unknown) {
  const v = String(value ?? "").trim().toLowerCase();
  return VALID_PERIODS.includes(v as (typeof VALID_PERIODS)[number]) ? v : "";
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

function locationToken(value: unknown) {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return "";
  if (raw.includes("antonio valadares") && raw.includes("extens")) return "antonio-valadares-extensao";
  if (raw.includes("antonio valadares") && (raw.includes("sed") || raw.includes("sede"))) {
    return "antonio-valadares-sed";
  }
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizePeriodArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return uniq(value.map((v) => normalizePeriod(v)).filter(Boolean));
}

function normalizeLocationArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return uniq(value.map((v) => normalizeLocation(v)).filter(Boolean));
}

export async function getAdminUserId() {
  const envAdminId = process.env.ADMIN_USER_ID || "";
  try {
    const { data, error } = await supabaseAdmin
      .from("admin_settings")
      .select("admin_user_id")
      .eq("id", 1)
      .maybeSingle();
    if (!error && data?.admin_user_id) {
      return String(data.admin_user_id);
    }
  } catch {
    // fallback to env
  }
  return envAdminId;
}

export async function getAdminScope(userId?: string | null): Promise<AdminScope> {
  const normalizedUserId = String(userId ?? "").trim();
  if (!normalizedUserId) {
    return {
      isAdmin: false,
      isSuperAdmin: false,
      allowedPeriods: [],
      allowedLocations: [],
      defaultPeriod: null,
      defaultLocation: null,
    };
  }

  const primaryAdminId = await getAdminUserId();
  if (primaryAdminId && normalizedUserId === primaryAdminId) {
    return {
      isAdmin: true,
      isSuperAdmin: true,
      allowedPeriods: [],
      allowedLocations: [],
      defaultPeriod: null,
      defaultLocation: null,
    };
  }

  try {
    const { data: adminRows, error: adminErr } = await supabaseAdmin
      .from("admins")
      .select("user_id")
      .eq("user_id", normalizedUserId)
      .limit(1);
    if (adminErr || !adminRows?.length) {
      return {
        isAdmin: false,
        isSuperAdmin: false,
        allowedPeriods: [],
        allowedLocations: [],
        defaultPeriod: null,
        defaultLocation: null,
      };
    }
  } catch {
    return {
      isAdmin: false,
      isSuperAdmin: false,
      allowedPeriods: [],
      allowedLocations: [],
      defaultPeriod: null,
      defaultLocation: null,
    };
  }

  try {
    const { data: accessRow, error } = await supabaseAdmin
      .from("admin_access")
      .select("allowed_periods,allowed_locations,default_period,default_location")
      .eq("user_id", normalizedUserId)
      .maybeSingle();

    if (error || !accessRow) {
      return {
        isAdmin: true,
        isSuperAdmin: false,
        allowedPeriods: [],
        allowedLocations: [],
        defaultPeriod: null,
        defaultLocation: null,
      };
    }

    const allowedPeriods = normalizePeriodArray((accessRow as { allowed_periods?: unknown }).allowed_periods);
    const allowedLocations = normalizeLocationArray(
      (accessRow as { allowed_locations?: unknown }).allowed_locations
    );
    const rawDefaultPeriod = normalizePeriod((accessRow as { default_period?: unknown }).default_period);
    const rawDefaultLocation = normalizeLocation((accessRow as { default_location?: unknown }).default_location);

    const effectivePeriods = allowedPeriods;
    const effectiveLocations = allowedLocations;
    const defaultPeriod = effectivePeriods.includes(rawDefaultPeriod) ? rawDefaultPeriod : effectivePeriods[0] ?? null;
    const defaultLocation = effectiveLocations.includes(rawDefaultLocation)
      ? rawDefaultLocation
      : effectiveLocations[0] ?? null;

    return {
      isAdmin: true,
      isSuperAdmin: false,
      allowedPeriods: effectivePeriods,
      allowedLocations: effectiveLocations,
      defaultPeriod,
      defaultLocation,
    };
  } catch {
    return {
      isAdmin: true,
      isSuperAdmin: false,
      allowedPeriods: [],
      allowedLocations: [],
      defaultPeriod: null,
      defaultLocation: null,
    };
  }
}

export async function isAdminUser(userId?: string | null) {
  const scope = await getAdminScope(userId);
  return scope.isAdmin;
}

export function canAccessPeriod(scope: AdminScope, period?: string | null) {
  if (!scope.isAdmin) return false;
  if (!scope.allowedPeriods.length) return true;
  if (!period) return true;
  const normalized = normalizePeriod(period);
  return !normalized ? false : scope.allowedPeriods.includes(normalized);
}

export function canAccessLocation(scope: AdminScope, location?: string | null) {
  if (!scope.isAdmin) return false;
  if (!scope.allowedLocations.length) return true;
  if (!location) return true;
  const target = locationToken(location);
  if (!target) return false;
  const allowedTokens = scope.allowedLocations.map((loc) => locationToken(loc)).filter(Boolean);
  return allowedTokens.includes(target);
}

export function getValidPeriods() {
  return [...VALID_PERIODS];
}

export function getValidLocations() {
  return [...VALID_LOCATIONS];
}
