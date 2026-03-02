import { NextResponse } from "next/server";
import { requireAdmin } from "../../_auth";
import { getViewerSchoolScope } from "../../_schoolScope";
import { isResourceGroupsNotConfiguredError } from "../../_resourceGroups";
import { supabaseAdmin } from "../../teachers/_supabaseAdmin";

export async function POST(req: Request) {
  try {
    const { user, response } = await requireAdmin(req);
    if (response || !user) return response;
    const viewerScope = await getViewerSchoolScope(user);
    if (!viewerScope.isSuperAdmin) {
      return NextResponse.json(
        { error: "Somente o admin geral pode vincular escola em grupo de recursos." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const schoolId = String(body?.school_id ?? "").trim();
    const groupId = String(body?.group_id ?? "").trim();

    if (!schoolId) {
      return NextResponse.json({ error: "Escola inválida." }, { status: 400 });
    }

    const { error: delErr } = await supabaseAdmin
      .from("school_resource_groups")
      .delete()
      .eq("school_id", schoolId);

    if (delErr) {
      if (isResourceGroupsNotConfiguredError(delErr)) {
        return NextResponse.json(
          { error: "Tabelas de grupo não configuradas. Execute scripts/sql/resource-groups.sql." },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }

    if (!groupId) {
      return NextResponse.json({ ok: true, unlinked: true });
    }

    const { error: insErr } = await supabaseAdmin
      .from("school_resource_groups")
      .insert({ school_id: schoolId, group_id: groupId });

    if (insErr) {
      if (isResourceGroupsNotConfiguredError(insErr)) {
        return NextResponse.json(
          { error: "Tabelas de grupo não configuradas. Execute scripts/sql/resource-groups.sql." },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, linked: true });
  } catch {
    return NextResponse.json({ error: "Falha ao vincular escola no grupo." }, { status: 400 });
  }
}

