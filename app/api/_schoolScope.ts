import type { User } from "@supabase/supabase-js";
import { getAdminScope } from "./_admin";
import { supabaseAdmin } from "./teachers/_supabaseAdmin";

export type ViewerSchoolScope = {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  allowedSchoolIds: string[];
};

function normalizeIds(input: unknown) {
  if (!Array.isArray(input)) return [];
  return Array.from(
    new Set(
      input
        .map((v) => String(v ?? "").trim())
        .filter(Boolean)
    )
  );
}

async function loadTeacherSchoolIdsByTeacherId(teacherId: string) {
  const { data, error } = await supabaseAdmin
    .from("teachers")
    .select("school_ids")
    .eq("id", teacherId)
    .maybeSingle();
  if (error || !data) return [];
  return normalizeIds((data as { school_ids?: unknown }).school_ids);
}

async function loadTeacherSchoolIdsByEmail(userEmail: string) {
  const normalizedEmail = String(userEmail ?? "").trim().toLowerCase();
  if (!normalizedEmail) return [];
  const localUsername = normalizedEmail.endsWith("@local.eeav")
    ? normalizedEmail.replace("@local.eeav", "")
    : normalizedEmail;
  const candidates = Array.from(new Set([normalizedEmail, localUsername].filter(Boolean)));
  if (!candidates.length) return [];

  const { data, error } = await supabaseAdmin
    .from("teachers")
    .select("school_ids")
    .in("email", candidates)
    .limit(1)
    .maybeSingle();

  if (error || !data) return [];
  return normalizeIds((data as { school_ids?: unknown }).school_ids);
}

export async function getViewerSchoolScope(user: User): Promise<ViewerSchoolScope> {
  const scope = await getAdminScope(user.id ?? "");
  if (scope.isSuperAdmin) {
    return { isAdmin: scope.isAdmin, isSuperAdmin: true, allowedSchoolIds: [] };
  }

  const metadataTeacherId = String(user.user_metadata?.teacher_id ?? "").trim();
  const byTeacherId = metadataTeacherId
    ? await loadTeacherSchoolIdsByTeacherId(metadataTeacherId)
    : [];
  if (byTeacherId.length) {
    return { isAdmin: scope.isAdmin, isSuperAdmin: false, allowedSchoolIds: byTeacherId };
  }

  const byEmail = await loadTeacherSchoolIdsByEmail(String(user.email ?? ""));
  return { isAdmin: scope.isAdmin, isSuperAdmin: false, allowedSchoolIds: byEmail };
}

export function hasSchoolAccess(scope: ViewerSchoolScope, schoolId: string) {
  if (scope.isSuperAdmin) return true;
  return scope.allowedSchoolIds.includes(String(schoolId ?? "").trim());
}

export function normalizeSchoolIds(values: unknown) {
  return normalizeIds(values);
}

