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

async function loadSchoolIdsFromClassAssignments(teacherId: string) {
  const safeTeacherId = String(teacherId ?? "").trim();
  if (!safeTeacherId) return [];

  const { data: links, error: linksErr } = await supabaseAdmin
    .from("teacher_class_assignments")
    .select("class_id")
    .eq("teacher_id", safeTeacherId);
  if (linksErr || !links?.length) return [];

  const classIds = Array.from(
    new Set(
      links
        .map((row) => String((row as { class_id?: unknown }).class_id ?? "").trim())
        .filter(Boolean)
    )
  );
  if (!classIds.length) return [];

  const { data: classes, error: classesErr } = await supabaseAdmin
    .from("classes")
    .select("id,school_id")
    .in("id", classIds);
  if (classesErr || !classes?.length) return [];

  return Array.from(
    new Set(
      classes
        .map((row) => String((row as { school_id?: unknown }).school_id ?? "").trim())
        .filter(Boolean)
    )
  );
}

async function loadTeacherSchoolIdsByTeacherId(teacherId: string) {
  const safeTeacherId = String(teacherId ?? "").trim();
  if (!safeTeacherId) return [];

  const { data, error } = await supabaseAdmin
    .from("teachers")
    .select("id,school_ids")
    .eq("id", safeTeacherId)
    .maybeSingle();
  const fromTeacher = error || !data ? [] : normalizeIds((data as { school_ids?: unknown }).school_ids);
  const fromAssignments = await loadSchoolIdsFromClassAssignments(safeTeacherId);
  return Array.from(new Set([...fromTeacher, ...fromAssignments]));
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
    .select("id,school_ids")
    .in("email", candidates)
    .limit(1)
    .maybeSingle();

  if (error || !data) return [];
  const teacherId = String((data as { id?: unknown }).id ?? "").trim();
  const fromTeacher = normalizeIds((data as { school_ids?: unknown }).school_ids);
  const fromAssignments = await loadSchoolIdsFromClassAssignments(teacherId);
  return Array.from(new Set([...fromTeacher, ...fromAssignments]));
}

async function loadTeacherSchoolIdsByUsername(username: string) {
  const normalized = String(username ?? "").trim().toLowerCase();
  if (!normalized) return [];
  const candidates = Array.from(new Set([normalized, `${normalized}@local.eeav`]));
  const { data, error } = await supabaseAdmin
    .from("teachers")
    .select("id,school_ids")
    .in("email", candidates)
    .limit(1)
    .maybeSingle();
  if (error || !data) return [];
  const teacherId = String((data as { id?: unknown }).id ?? "").trim();
  const fromTeacher = normalizeIds((data as { school_ids?: unknown }).school_ids);
  const fromAssignments = await loadSchoolIdsFromClassAssignments(teacherId);
  return Array.from(new Set([...fromTeacher, ...fromAssignments]));
}

export async function resolveTeacherSchoolIdsForUser(user: User): Promise<string[]> {
  const metadataTeacherId = String(user.user_metadata?.teacher_id ?? "").trim();
  if (metadataTeacherId) {
    const ids = await loadTeacherSchoolIdsByTeacherId(metadataTeacherId);
    if (ids.length) return ids;
  }

  const byEmail = await loadTeacherSchoolIdsByEmail(String(user.email ?? ""));
  if (byEmail.length) return byEmail;

  const metadataUsername = String(user.user_metadata?.username ?? "").trim().toLowerCase();
  if (metadataUsername) {
    const byUsername = await loadTeacherSchoolIdsByUsername(metadataUsername);
    if (byUsername.length) return byUsername;
  }

  return [];
}

export async function getViewerSchoolScope(user: User): Promise<ViewerSchoolScope> {
  const scope = await getAdminScope(user.id ?? "");
  if (scope.isSuperAdmin) {
    return { isAdmin: scope.isAdmin, isSuperAdmin: true, allowedSchoolIds: [] };
  }

  const teacherSchoolIds = await resolveTeacherSchoolIdsForUser(user);
  return { isAdmin: scope.isAdmin, isSuperAdmin: false, allowedSchoolIds: teacherSchoolIds };
}

export function hasSchoolAccess(scope: ViewerSchoolScope, schoolId: string) {
  if (scope.isSuperAdmin) return true;
  return scope.allowedSchoolIds.includes(String(schoolId ?? "").trim());
}

export function normalizeSchoolIds(values: unknown) {
  return normalizeIds(values);
}
