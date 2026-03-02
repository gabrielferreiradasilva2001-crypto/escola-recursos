import { NextResponse } from "next/server";
import { requireAdmin } from "../../_auth";
import { getViewerSchoolScope } from "../../_schoolScope";
import { isResourceGroupsNotConfiguredError } from "../../_resourceGroups";
import { supabaseAdmin } from "../../teachers/_supabaseAdmin";

type GroupRow = {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
};

export async function POST(req: Request) {
  try {
    const { user, response } = await requireAdmin(req);
    if (response || !user) return response;
    await req.json().catch(() => ({}));

    const viewerScope = await getViewerSchoolScope(user);

    const { data: groups, error: groupErr } = await supabaseAdmin
      .from("resource_groups")
      .select("id,name,active,created_at")
      .order("name");
    if (groupErr) {
      if (isResourceGroupsNotConfiguredError(groupErr)) {
        return NextResponse.json({ ok: true, data: [], not_configured: true });
      }
      return NextResponse.json({ error: groupErr.message }, { status: 500 });
    }

    const { data: links, error: linkErr } = await supabaseAdmin
      .from("school_resource_groups")
      .select("school_id,group_id");
    if (linkErr) {
      if (isResourceGroupsNotConfiguredError(linkErr)) {
        return NextResponse.json({ ok: true, data: [], not_configured: true });
      }
      return NextResponse.json({ error: linkErr.message }, { status: 500 });
    }

    const groupToSchools = new Map<string, string[]>();
    (links ?? []).forEach((row) => {
      const groupId = String((row as { group_id?: string | null }).group_id ?? "").trim();
      const schoolId = String((row as { school_id?: string | null }).school_id ?? "").trim();
      if (!groupId || !schoolId) return;
      groupToSchools.set(groupId, [...(groupToSchools.get(groupId) ?? []), schoolId]);
    });

    const visible = (groups ?? []).filter((group: GroupRow) => {
      if (viewerScope.isSuperAdmin) return true;
      const schools = groupToSchools.get(group.id) ?? [];
      return schools.some((id) => viewerScope.allowedSchoolIds.includes(id));
    });

    const data = visible.map((group: GroupRow) => ({
      ...group,
      school_ids: Array.from(new Set(groupToSchools.get(group.id) ?? [])),
    }));

    return NextResponse.json({ ok: true, data, not_configured: false });
  } catch {
    return NextResponse.json({ error: "Falha ao listar grupos de recursos." }, { status: 400 });
  }
}

