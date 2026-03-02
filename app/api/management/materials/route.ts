import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../teachers/_supabaseAdmin";
import { requireUser } from "../../_auth";
import { canAccessPeriod, getAdminScope } from "../../_admin";
import { getViewerSchoolScope, hasSchoolAccess } from "../../_schoolScope";

type DeliveryRow = {
  id: string;
  school_id: string | null;
  period: string | null;
};
type RecipientInput = {
  name?: string;
  teacher_id?: string;
  student_id?: string;
  school_class?: string;
  items?: Array<{ material?: string; qty?: number }>;
};
type BaseItemInput = { material?: string; qty?: number };

function monthRange(year: number, month: number) {
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 1, 0, 0, 0));
  return { start: start.toISOString(), end: end.toISOString() };
}

function normalizeLocation(value: string) {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return String(value ?? "").trim();
  if (raw === "antonio valadares - sed") return "Antonio Valadares - SED";
  if (raw === "antonio valadares - extensão" || raw === "antonio valadares - extensao") {
    return "Antonio Valadares - Extensão";
  }
  if (raw === "sed" || raw === "eeav - sede" || raw === "escola antonio valadares") {
    return "Antonio Valadares - SED";
  }
  if (raw === "extensão" || raw === "extensao" || raw === "eeav - extensão" || raw === "eeav - extensao") {
    return "Antonio Valadares - Extensão";
  }
  return String(value ?? "").trim();
}

function isMaterialsSchoolColumnMissingError(message: string) {
  const text = String(message ?? "").toLowerCase();
  return text.includes("material_deliveries") && text.includes("school_id") && text.includes("column");
}

export async function GET(req: Request) {
  const { user, response } = await requireUser(req);
  if (response || !user) return response;

  const scope = await getAdminScope(user.id ?? "");
  const viewerScope = await getViewerSchoolScope(user);
  if (!scope.isAdmin) return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const year = Number(searchParams.get("year") ?? "");
  const month = Number(searchParams.get("month") ?? "");
  const period = String(searchParams.get("period") ?? "").trim();
  const schoolId = String(searchParams.get("school_id") ?? "").trim();
  if (schoolId && !hasSchoolAccess(viewerScope, schoolId)) {
    return NextResponse.json({ error: "Sem acesso a esta escola." }, { status: 403 });
  }

  let query = supabaseAdmin
    .from("material_deliveries")
    .select("id,material,qty,recipient_name,recipient_type,school_class,school_id,location,period,delivered_at,created_at")
    .order("delivered_at", { ascending: false });

  if (year && month) {
    const { start, end } = monthRange(year, month);
    query = query.gte("delivered_at", start).lt("delivered_at", end);
  } else if (year) {
    const start = new Date(Date.UTC(year, 0, 1, 0, 0, 0)).toISOString();
    const end = new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0)).toISOString();
    query = query.gte("delivered_at", start).lt("delivered_at", end);
  }
  if (period) {
    if (!canAccessPeriod(scope, period)) {
      return NextResponse.json({ error: "Sem acesso a este período." }, { status: 403 });
    }
    query = query.eq("period", period);
  }
  if (scope.allowedPeriods.length) query = query.in("period", scope.allowedPeriods);
  if (schoolId) query = query.eq("school_id", schoolId);
  if (!schoolId && !viewerScope.isSuperAdmin && viewerScope.allowedSchoolIds.length) {
    query = query.in("school_id", viewerScope.allowedSchoolIds);
  }

  const { data, error } = await query;
  if (error) {
    if (isMaterialsSchoolColumnMissingError(error.message)) {
      return NextResponse.json(
        { error: "Tabela de materiais desatualizada. Execute scripts/sql/material-deliveries-school.sql." },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const filtered = (data ?? []).filter((row: DeliveryRow) => {
    if (!canAccessPeriod(scope, row.period)) return false;
    if (viewerScope.isSuperAdmin) return true;
    if (!viewerScope.allowedSchoolIds.length) return false;
    return row.school_id ? viewerScope.allowedSchoolIds.includes(String(row.school_id)) : false;
  });

  return NextResponse.json({ ok: true, data: filtered });
}

export async function POST(req: Request) {
  const { user, response } = await requireUser(req);
  if (response || !user) return response;

  const scope = await getAdminScope(user.id ?? "");
  if (!scope.isAdmin) return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const items = Array.isArray(body?.items) ? body.items : null;
  const material = String(body?.material ?? "").trim();
  const qty = Number(body?.qty ?? 0);
  const recipients = Array.isArray(body?.recipients) ? body.recipients : null;
  const recipient_name = String(body?.recipient_name ?? "").trim();
  const recipient_type = String(body?.recipient_type ?? "").trim();
  const school_class = String(body?.school_class ?? "").trim();
  const school_id = String(body?.school_id ?? "").trim();
  const location = normalizeLocation(String(body?.location ?? "").trim());
  const period = String(body?.period ?? "").trim();
  const delivered_at = String(body?.delivered_at ?? "").trim();

  if (!recipient_type) return NextResponse.json({ error: "Informe se é aluno ou professor." }, { status: 400 });
  if (!school_id) return NextResponse.json({ error: "Informe a escola." }, { status: 400 });
  if (!period) return NextResponse.json({ error: "Informe o período." }, { status: 400 });
  if (!delivered_at) return NextResponse.json({ error: "Informe a data." }, { status: 400 });
  const viewerScope = await getViewerSchoolScope(user);
  if (!hasSchoolAccess(viewerScope, school_id)) {
    return NextResponse.json({ error: "Sem acesso a esta escola." }, { status: 403 });
  }
  if (!canAccessPeriod(scope, period)) {
    return NextResponse.json({ error: "Sem acesso a este período." }, { status: 403 });
  }

  const recipientsWithItems =
    recipients && recipients.length && Array.isArray(recipients[0]?.items)
      ? recipients
      : null;

  if (recipientsWithItems) {
    const rows = recipientsWithItems.flatMap((r: RecipientInput) => {
      const name = String(r?.name ?? "").trim();
      const teacherId = String(r?.teacher_id ?? "").trim();
      const studentId = String(r?.student_id ?? "").trim();
      const recipientClass = String(r?.school_class ?? "").trim() || school_class || null;
      if (!name) return [];
      const rItems = Array.isArray(r?.items) ? r.items : [];
      return rItems.map((it: BaseItemInput) => ({
        material: String(it?.material ?? "").trim(),
        qty: Number(it?.qty ?? 0),
        recipient_name: name,
        recipient_type,
        recipient_teacher_id: teacherId || null,
        recipient_student_id: studentId || null,
        school_class: recipientClass,
        school_id,
        location,
        period,
        delivered_at,
        created_by: user.id ?? null,
      }));
    });

    const hasInvalid = rows.some(
      (r: { material: string; qty: number }) => !r.material || !r.qty || r.qty < 1
    );
    if (!rows.length) {
      return NextResponse.json({ error: "Informe ao menos uma pessoa com materiais." }, { status: 400 });
    }
    if (hasInvalid) {
      return NextResponse.json({ error: "Informe materiais e quantidades válidas." }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from("material_deliveries").insert(rows);
    if (error) {
      if (isMaterialsSchoolColumnMissingError(error.message)) {
        return NextResponse.json(
          { error: "Tabela de materiais desatualizada. Execute scripts/sql/material-deliveries-school.sql." },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  const cleanRecipients = (recipients && recipients.length ? recipients : [{ name: recipient_name }])
    .map((r: RecipientInput) => String(r?.name ?? "").trim())
    .filter(Boolean);

  if (!cleanRecipients.length) {
    return NextResponse.json({ error: "Informe ao menos uma pessoa." }, { status: 400 });
  }

  const baseItems = items && items.length ? items : [{ material, qty }];
  const rows = baseItems.flatMap((it: BaseItemInput) =>
    cleanRecipients.map((name: string) => ({
      material: String(it?.material ?? "").trim(),
      qty: Number(it?.qty ?? 0),
      recipient_name: name,
      recipient_type,
      recipient_teacher_id: null,
      recipient_student_id: null,
      school_class: school_class || null,
      school_id,
      location,
      period,
      delivered_at,
      created_by: user.id ?? null,
    }))
  );

  const hasInvalid = rows.some(
    (r: { material: string; qty: number }) => !r.material || !r.qty || r.qty < 1
  );
  if (hasInvalid) {
    return NextResponse.json({ error: "Informe materiais e quantidades válidas." }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("material_deliveries").insert(rows);
  if (error) {
    if (isMaterialsSchoolColumnMissingError(error.message)) {
      return NextResponse.json(
        { error: "Tabela de materiais desatualizada. Execute scripts/sql/material-deliveries-school.sql." },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { user, response } = await requireUser(req);
  if (response || !user) return response;

  const scope = await getAdminScope(user.id ?? "");
  if (!scope.isAdmin) return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const id = String(body?.id ?? "").trim();
  if (!id) return NextResponse.json({ error: "ID inválido." }, { status: 400 });

  const { data: row, error: rowErr } = await supabaseAdmin
    .from("material_deliveries")
    .select("id,school_id,period")
    .eq("id", id)
    .maybeSingle();
  if (rowErr) return NextResponse.json({ error: rowErr.message }, { status: 500 });
  if (!row) return NextResponse.json({ error: "Registro não encontrado." }, { status: 404 });
  const viewerScope = await getViewerSchoolScope(user);
  if (!canAccessPeriod(scope, row.period) || !hasSchoolAccess(viewerScope, String(row.school_id ?? ""))) {
    return NextResponse.json({ error: "Sem permissão para excluir este registro." }, { status: 403 });
  }

  const { error } = await supabaseAdmin.from("material_deliveries").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
