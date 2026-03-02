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

function normalizeIdentity(value: unknown) {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return "";
  return raw.endsWith("@local.eeav") ? raw.replace("@local.eeav", "") : raw;
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

async function loadTeacherSchoolIdsByTeacherRecord(record: { id?: unknown; school_ids?: unknown }) {
  const teacherId = String(record.id ?? "").trim();
  const fromTeacher = normalizeIds(record.school_ids);
  const fromAssignments = teacherId ? await loadSchoolIdsFromClassAssignments(teacherId) : [];
  return Array.from(new Set([...fromTeacher, ...fromAssignments]));
}

async function loadTeacherSchoolIdsByIdentityCandidates(candidates: string[]) {
  const normalizedCandidates = Array.from(new Set(candidates.map(normalizeIdentity).filter(Boolean)));
  if (!normalizedCandidates.length) return [];

  const { data: teachers, error } = await supabaseAdmin
    .from("teachers")
    .select("id,email,school_ids")
    .limit(3000);
  if (error || !teachers?.length) return [];

  const matched = (teachers as Array<{ id?: unknown; email?: unknown; school_ids?: unknown }>).find((row) => {
    const emailRaw = String(row.email ?? "").trim().toLowerCase();
    const emailAsIdentity = normalizeIdentity(emailRaw);
    const emailLocal = emailRaw ? normalizeIdentity(`${emailAsIdentity}@local.eeav`) : "";
    return normalizedCandidates.some((c) => c === emailAsIdentity || c === emailLocal);
  });
  if (!matched) return [];

  return loadTeacherSchoolIdsByTeacherRecord(matched);
}

async function loadTeacherSchoolIdsByTeacherId(teacherId: string) {
  const safeTeacherId = String(teacherId ?? "").trim();
  if (!safeTeacherId) return [];

  const { data, error } = await supabaseAdmin
    .from("teachers")
    .select("id,school_ids")
    .eq("id", safeTeacherId)
    .maybeSingle();
  if (error || !data) return [];
  return loadTeacherSchoolIdsByTeacherRecord(data as { id?: unknown; school_ids?: unknown });
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

  if (!error && data) {
    return loadTeacherSchoolIdsByTeacherRecord(data as { id?: unknown; school_ids?: unknown });
  }

  return loadTeacherSchoolIdsByIdentityCandidates([normalizedEmail, localUsername]);
}

async function loadTeacherSchoolIdsByUsername(username: string) {
  const normalized = normalizeIdentity(username);
  if (!normalized) return [];
  const candidates = Array.from(new Set([normalized, `${normalized}@local.eeav`]));
  return loadTeacherSchoolIdsByIdentityCandidates(candidates);
}

async function loadTeacherSchoolIdsByName(displayName: string) {
  const safeName = String(displayName ?? "").trim();
  if (!safeName) return [];

  const { data, error } = await supabaseAdmin
    .from("teachers")
    .select("id,name,school_ids")
    .ilike("name", safeName)
    .limit(1)
    .maybeSingle();
  if (error || !data) return [];
  return loadTeacherSchoolIdsByTeacherRecord(data as { id?: unknown; school_ids?: unknown });
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

  const metadataName = String(user.user_metadata?.name ?? "").trim();
  if (metadataName) {
    const byName = await loadTeacherSchoolIdsByName(metadataName);
    if (byName.length) return byName;
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
