import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../teachers/_supabaseAdmin";
import { requireAdmin } from "../../_auth";
import { canAccessLocation, getAdminScope } from "../../_admin";

const BUCKET = "school-activity-photos";

type SubmissionRow = {
  id: string;
  batch_id: string;
  created_at: string;
  created_by: string;
  created_by_name: string;
  location: string | null;
  description: string;
  photo_name: string;
  photo_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  status: "pending" | "published" | "rejected";
  reviewed_at: string | null;
  reviewed_by: string | null;
  review_note: string | null;
};
type SubmissionScopeRow = {
  location: string | null;
};

async function buildSignedRows(rows: SubmissionRow[]) {
  return Promise.all(
    rows.map(async (row) => {
      const { data: signed } = await supabaseAdmin.storage
        .from(BUCKET)
        .createSignedUrl(row.photo_path, 60 * 60);
      return {
        ...row,
        url: signed?.signedUrl ?? "",
      };
    })
  );
}

export async function GET(req: Request) {
  const { user, response } = await requireAdmin(req);
  if (response || !user) return response;
  const scope = await getAdminScope(user.id);

  const { searchParams } = new URL(req.url);
  const status = String(searchParams.get("status") ?? "").trim();

  let query = supabaseAdmin
    .from("activity_submissions")
    .select(
      "id,batch_id,created_at,created_by,created_by_name,location,description,photo_name,photo_path,mime_type,size_bytes,status,reviewed_at,reviewed_by,review_note"
    )
    .order("created_at", { ascending: false })
    .limit(1000);

  if (status === "pending" || status === "published" || status === "rejected") {
    query = query.eq("status", status);
  }
  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const scoped = (data ?? []).filter((row: SubmissionScopeRow) => canAccessLocation(scope, row.location));
  const rows = await buildSignedRows(scoped as SubmissionRow[]);
  return NextResponse.json({ ok: true, data: rows });
}

export async function PATCH(req: Request) {
  const { user, response } = await requireAdmin(req);
  if (response || !user) return response;
  const scope = await getAdminScope(user.id);

  const body = await req.json().catch(() => ({}));
  const batchId = String(body?.batch_id ?? "").trim();
  const status = String(body?.status ?? "").trim();
  const reviewNoteRaw = String(body?.review_note ?? "").trim();

  if (!batchId) {
    return NextResponse.json({ error: "Lote inválido." }, { status: 400 });
  }
  if (status !== "pending" && status !== "published" && status !== "rejected") {
    return NextResponse.json({ error: "Status inválido." }, { status: 400 });
  }

  const { data: sampleRow, error: sampleErr } = await supabaseAdmin
    .from("activity_submissions")
    .select("batch_id,location")
    .eq("batch_id", batchId)
    .limit(1)
    .maybeSingle();
  if (sampleErr) {
    return NextResponse.json({ error: sampleErr.message }, { status: 500 });
  }
  if (!sampleRow) {
    return NextResponse.json({ error: "Envio não encontrado." }, { status: 404 });
  }
  if (!canAccessLocation(scope, sampleRow.location)) {
    return NextResponse.json({ error: "Sem permissão para este envio." }, { status: 403 });
  }

  const { error } = await supabaseAdmin
    .from("activity_submissions")
    .update({
      status,
      review_note: reviewNoteRaw || null,
      reviewed_at: status === "pending" ? null : new Date().toISOString(),
      reviewed_by: status === "pending" ? null : user.id,
    })
    .eq("batch_id", batchId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
