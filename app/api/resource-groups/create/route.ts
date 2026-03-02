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
        { error: "Somente o admin geral pode criar grupo de recursos." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const name = String(body?.name ?? "").trim();
    if (!name) {
      return NextResponse.json({ error: "Informe o nome do grupo." }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("resource_groups")
      .insert({ name, active: true })
      .select("id,name,active,created_at")
      .maybeSingle();

    if (error) {
      if (isResourceGroupsNotConfiguredError(error)) {
        return NextResponse.json(
          { error: "Tabelas de grupo não configuradas. Execute scripts/sql/resource-groups.sql." },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data });
  } catch {
    return NextResponse.json({ error: "Falha ao criar grupo de recursos." }, { status: 400 });
  }
}

