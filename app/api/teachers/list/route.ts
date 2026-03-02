import { NextResponse } from "next/server";
import { supabaseAdmin } from "../_supabaseAdmin";
import { getAdminUserId, isAdminUser } from "../../_admin";
import { getViewerSchoolScope } from "../../_schoolScope";

export async function POST(req: Request) {
  try {
    await req.json().catch(() => ({}));

    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    let isAdmin = false;
    let viewerScope: { isSuperAdmin: boolean; allowedSchoolIds: string[] } = {
      isSuperAdmin: false,
      allowedSchoolIds: [],
    };

    if (token) {
      const { data: userData } = await supabaseAdmin.auth.getUser(token);
      const userId = userData?.user?.id ?? "";
      isAdmin = await isAdminUser(userId);
      if (userData?.user) {
        const scope = await getViewerSchoolScope(userData.user);
        viewerScope = {
          isSuperAdmin: scope.isSuperAdmin,
          allowedSchoolIds: scope.allowedSchoolIds,
        };
      }
    }

    let query = supabaseAdmin
      .from("teachers")
      .select("id,name,email,active,created_at,birth_day,birth_month,school_ids");
    if (!isAdmin) {
      query = query.eq("active", true);
    }

    const { data, error } = await query
      .order("active", { ascending: false })
      .order("name");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const visible = viewerScope.isSuperAdmin
      ? (data ?? [])
      : (data ?? []).filter((t) => {
          const schools = Array.isArray((t as { school_ids?: unknown }).school_ids)
            ? (((t as { school_ids?: unknown }).school_ids as unknown[]) ?? [])
                .map((id) => String(id ?? "").trim())
                .filter(Boolean)
            : [];
          return schools.some((id) => viewerScope.allowedSchoolIds.includes(id));
        });

    const visibleTeacherIds = visible
      .map((row) => String((row as { id?: unknown }).id ?? "").trim())
      .filter(Boolean);
    const classIdsByTeacher = new Map<string, string[]>();
    if (visibleTeacherIds.length) {
      const { data: classLinks, error: classLinksErr } = await supabaseAdmin
        .from("teacher_class_assignments")
        .select("teacher_id,class_id")
        .in("teacher_id", visibleTeacherIds);
      if (!classLinksErr && classLinks?.length) {
        classLinks.forEach((link) => {
          const teacherId = String((link as { teacher_id?: unknown }).teacher_id ?? "").trim();
          const classId = String((link as { class_id?: unknown }).class_id ?? "").trim();
          if (!teacherId || !classId) return;
          const prev = classIdsByTeacher.get(teacherId) ?? [];
          if (!prev.includes(classId)) prev.push(classId);
          classIdsByTeacher.set(teacherId, prev);
        });
      }
    }

    if (!visible.length) {
      return NextResponse.json({ ok: true, data: [] });
    }

    const primaryAdminId = await getAdminUserId();
    const { data: adminRows } = await supabaseAdmin.from("admins").select("user_id");
    const adminUserIds = new Set<string>(
      [
        ...(adminRows ?? []).map((row) => String((row as { user_id?: unknown }).user_id ?? "").trim()),
        primaryAdminId ? String(primaryAdminId).trim() : "",
      ].filter(Boolean)
    );

    const { data: authList } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    const authUsers = authList?.users ?? [];
    const teacherIdToUserId = new Map<string, string>();
    const emailToUserId = new Map<string, string>();
    const userIdToRole = new Map<string, "professor" | "estagiario" | "diretor" | "secretaria" | "coordenador">();
    authUsers.forEach((user) => {
      const uid = String(user.id ?? "").trim();
      if (!uid) return;
      const teacherId = String((user.user_metadata as { teacher_id?: unknown } | null)?.teacher_id ?? "").trim();
      if (teacherId) teacherIdToUserId.set(teacherId, uid);
      const email = String(user.email ?? "").trim().toLowerCase();
      if (email) emailToUserId.set(email, uid);
      const roleRaw = String(
        (user.user_metadata as { management_role?: unknown } | null)?.management_role ?? ""
      ).trim().toLowerCase();
      const role =
        roleRaw === "diretor" ||
        roleRaw === "secretaria" ||
        roleRaw === "coordenador" ||
        roleRaw === "estagiario"
          ? roleRaw
          : "professor";
      userIdToRole.set(uid, role);
    });

    const withProfile = visible.map((teacher) => {
      const row = teacher as { id?: unknown; email?: unknown };
      const teacherId = String(row.id ?? "").trim();
      const teacherEmailRaw = String(row.email ?? "").trim().toLowerCase();
      const teacherEmailNormalized = teacherEmailRaw.includes("@")
        ? teacherEmailRaw
        : teacherEmailRaw
        ? `${teacherEmailRaw}@local.eeav`
        : "";
      const userId =
        teacherIdToUserId.get(teacherId) ??
        (teacherEmailRaw ? emailToUserId.get(teacherEmailRaw) : undefined) ??
        (teacherEmailNormalized ? emailToUserId.get(teacherEmailNormalized) : undefined) ??
        "";
      const isManagementAdmin = userId ? adminUserIds.has(userId) : false;
      const managementRole = userId ? userIdToRole.get(userId) ?? "professor" : "professor";
      return {
        ...teacher,
        class_ids: classIdsByTeacher.get(teacherId) ?? [],
        profile_type: isManagementAdmin ? "admin_gestao" : "professor",
        management_role: managementRole,
      };
    });

    return NextResponse.json({ ok: true, data: withProfile });
  } catch {
    return NextResponse.json({ error: "Falha ao processar a requisição." }, { status: 400 });
  }
}
