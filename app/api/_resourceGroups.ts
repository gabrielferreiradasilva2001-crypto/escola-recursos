import { supabaseAdmin } from "./teachers/_supabaseAdmin";

function isMissingRelationError(message: string) {
  const msg = String(message ?? "").toLowerCase();
  return (
    msg.includes("does not exist") ||
    msg.includes("relation") ||
    msg.includes("school_resource_groups") ||
    msg.includes("resource_groups")
  );
}

export function isResourceGroupsNotConfiguredError(error: unknown) {
  const message =
    typeof error === "object" && error && "message" in error
      ? String((error as { message?: unknown }).message ?? "")
      : "";
  return isMissingRelationError(message);
}

export async function getSharedSchoolIdsForSchool(schoolId: string) {
  const normalized = String(schoolId ?? "").trim();
  if (!normalized) return [];

  const { data: links, error: linkErr } = await supabaseAdmin
    .from("school_resource_groups")
    .select("group_id")
    .eq("school_id", normalized);

  if (linkErr) {
    if (isMissingRelationError(linkErr.message ?? "")) return [normalized];
    throw linkErr;
  }

  const groupIds = Array.from(
    new Set(
      (links ?? [])
        .map((row) => String((row as { group_id?: string | null }).group_id ?? "").trim())
        .filter(Boolean)
    )
  );
  if (!groupIds.length) return [normalized];

  const { data: groupLinks, error: groupErr } = await supabaseAdmin
    .from("school_resource_groups")
    .select("school_id")
    .in("group_id", groupIds);

  if (groupErr) {
    if (isMissingRelationError(groupErr.message ?? "")) return [normalized];
    throw groupErr;
  }

  const schools = Array.from(
    new Set(
      (groupLinks ?? [])
        .map((row) => String((row as { school_id?: string | null }).school_id ?? "").trim())
        .filter(Boolean)
    )
  );
  return schools.length ? schools : [normalized];
}

