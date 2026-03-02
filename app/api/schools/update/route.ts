import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../teachers/_supabaseAdmin";
import { requireAdmin } from "../../_auth";
import { getViewerSchoolScope, hasSchoolAccess } from "../../_schoolScope";

export async function POST(req: Request) {
  try {
    const { user, response } = await requireAdmin(req);
    if (response || !user) return response;
    const viewerScope = await getViewerSchoolScope(user);

    const body = await req.json();
    const id = String(body?.id ?? "").trim();
    const name = String(body?.name ?? "").trim();
    const active = body?.active;

    if (!id || !name) {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
    }
    if (!viewerScope.isSuperAdmin && !hasSchoolAccess(viewerScope, id)) {
      return NextResponse.json({ error: "Você não pode editar outra escola." }, { status: 403 });
    }

    const payload: { name: string; active?: boolean } = { name };
    if (typeof active === "boolean") payload.active = active;

    const { error } = await supabaseAdmin
      .from("schools")
      .update(payload)
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Falha ao processar a requisição." }, { status: 400 });
  }
}
