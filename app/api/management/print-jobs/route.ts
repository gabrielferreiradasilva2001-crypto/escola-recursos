import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../teachers/_supabaseAdmin";
import { requireAdmin } from "../../_auth";
import { canAccessLocation, canAccessPeriod, getAdminScope } from "../../_admin";

export async function GET(req: Request) {
  const { user, response } = await requireAdmin(req);
  if (response || !user) return response;
  const scope = await getAdminScope(user.id);

  const { searchParams } = new URL(req.url);
  const location = String(searchParams.get("location") ?? "").trim();
  const status = String(searchParams.get("status") ?? "").trim();
  const period = String(searchParams.get("period") ?? "").trim();

  if (location && !canAccessLocation(scope, location)) {
    return NextResponse.json({ error: "Sem acesso a esta escola/local." }, { status: 403 });
  }
  if (period && !canAccessPeriod(scope, period)) {
    return NextResponse.json({ error: "Sem acesso a este período." }, { status: 403 });
  }

  let query = supabaseAdmin
    .from("print_jobs")
    .select(
      "id,created_at,created_by,created_by_name,location,file_name,file_path,title,period,printed,printed_at"
    )
    .order("created_at", { ascending: false });

  if (location) query = query.eq("location", location);
  if (status === "printed") query = query.eq("printed", true);
  if (status === "pending") query = query.eq("printed", false);
  if (period) query = query.eq("period", period);
  if (scope.allowedLocations.length) query = query.in("location", scope.allowedLocations);
  if (scope.allowedPeriods.length) query = query.in("period", scope.allowedPeriods);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = await Promise.all(
    (data ?? []).map(async (row) => {
      const { data: signed } = await supabaseAdmin.storage
        .from("print-jobs")
        .createSignedUrl(row.file_path, 60 * 60);
      return { ...row, url: signed?.signedUrl ?? "" };
    })
  );

  return NextResponse.json({ ok: true, data: rows });
}

export async function PATCH(req: Request) {
  const { user, response } = await requireAdmin(req);
  if (response || !user) return response;
  const scope = await getAdminScope(user.id);

  const body = await req.json().catch(() => ({}));
  const id = String(body?.id ?? "").trim();
  const printed = Boolean(body?.printed);

  if (!id) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  }

  const { data: row, error: rowErr } = await supabaseAdmin
    .from("print_jobs")
    .select("id,location,period")
    .eq("id", id)
    .maybeSingle();
  if (rowErr) return NextResponse.json({ error: rowErr.message }, { status: 500 });
  if (!row) return NextResponse.json({ error: "Registro não encontrado." }, { status: 404 });
  if (!canAccessLocation(scope, row.location) || !canAccessPeriod(scope, row.period)) {
    return NextResponse.json({ error: "Sem permissão para alterar este envio." }, { status: 403 });
  }

  const { error } = await supabaseAdmin
    .from("print_jobs")
    .update({
      printed,
      printed_at: printed ? new Date().toISOString() : null,
      printed_by: printed ? user.id : null,
    })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
