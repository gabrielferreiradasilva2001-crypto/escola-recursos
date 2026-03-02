import { NextResponse } from "next/server";
import { renderToBuffer, Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import React from "react";
import { supabaseAdmin } from "../../teachers/_supabaseAdmin";
import { requireUser } from "../../_auth";
import { canAccessPeriod, getAdminScope } from "../../_admin";
import { getViewerSchoolScope, hasSchoolAccess } from "../../_schoolScope";
import { loadSchoolLogoDataUrl } from "../../../../lib/schoolBranding";

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 10, fontFamily: "Helvetica" },
  header: { display: "flex", flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  logo: { width: 42, height: 42, borderRadius: 8 },
  title: { fontSize: 16, fontWeight: 700 },
  subtitle: { fontSize: 10, color: "#475569", marginBottom: 12 },
  table: { display: "flex", width: "100%", borderWidth: 1, borderColor: "#e2e8f0" },
  row: { flexDirection: "row", borderBottomWidth: 1, borderColor: "#e2e8f0" },
  head: { backgroundColor: "#f1f5f9", fontWeight: 700 },
  cell: { padding: 6, flexGrow: 1 },
  colSmall: { width: "10%" },
  colMed: { width: "15%" },
  colLarge: { width: "30%" },
  footer: { marginTop: 10, fontSize: 10 },
  totalsTitle: { marginTop: 12, fontSize: 11, fontWeight: 700 },
  totalsRow: { flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 1, borderColor: "#e2e8f0", paddingVertical: 4 },
});
type DeliveryRow = {
  material: string;
  qty: number;
  recipient_name: string;
  recipient_type: string;
  school_class: string | null;
  period: string | null;
  school_id: string | null;
  delivered_at: string;
};

function monthRange(year: number, month: number) {
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 1, 0, 0, 0));
  return { start: start.toISOString(), end: end.toISOString() };
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
  const recipientType = String(searchParams.get("recipientType") ?? "").trim();
  const schoolId = String(searchParams.get("school_id") ?? "").trim();
  const schoolNameInput = String(searchParams.get("school_name") ?? "").trim();
  const schoolName = schoolNameInput || "Escola não informada";
  if (schoolId && !hasSchoolAccess(viewerScope, schoolId)) {
    return NextResponse.json({ error: "Sem acesso a esta escola." }, { status: 403 });
  }
  if (period && !canAccessPeriod(scope, period)) {
    return NextResponse.json({ error: "Sem acesso a este período." }, { status: 403 });
  }

  let query = supabaseAdmin
    .from("material_deliveries")
    .select("material,qty,recipient_name,recipient_type,school_class,location,period,school_id,delivered_at")
    .order("delivered_at", { ascending: false });

  let label = "Todos os registros";
  if (year && month) {
    const { start, end } = monthRange(year, month);
    query = query.gte("delivered_at", start).lt("delivered_at", end);
    label = `${String(month).padStart(2, "0")}/${year}`;
  } else if (year) {
    const start = new Date(Date.UTC(year, 0, 1, 0, 0, 0)).toISOString();
    const end = new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0)).toISOString();
    query = query.gte("delivered_at", start).lt("delivered_at", end);
    label = `${year}`;
  }
  if (period) {
    query = query.eq("period", period);
    label = `${label} • ${period}`;
  }
  if (scope.allowedPeriods.length) {
    query = query.in("period", scope.allowedPeriods);
  }
  if (schoolId) query = query.eq("school_id", schoolId);
  if (!schoolId && !viewerScope.isSuperAdmin && viewerScope.allowedSchoolIds.length) {
    query = query.in("school_id", viewerScope.allowedSchoolIds);
  }
  if (recipientType && recipientType !== "geral") {
    query = query.eq("recipient_type", recipientType);
    label = `${label} • ${recipientType}`;
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const scopedRows = (data ?? []).filter((row: DeliveryRow) => {
    if (!canAccessPeriod(scope, row.period)) return false;
    if (viewerScope.isSuperAdmin) return true;
    return row.school_id ? viewerScope.allowedSchoolIds.includes(String(row.school_id)) : false;
  });

  const totalQty = scopedRows.reduce((sum, r: DeliveryRow) => sum + (r.qty ?? 0), 0);
  const totalsByRecipient = scopedRows.reduce((acc: Record<string, number>, r: DeliveryRow) => {
    const key = String(r.recipient_name ?? "Sem nome");
    acc[key] = (acc[key] ?? 0) + (r.qty ?? 0);
    return acc;
  }, {});
  const totalsList = Object.entries(totalsByRecipient).sort((a, b) => b[1] - a[1]);
  const totalsByMaterial = scopedRows.reduce((acc: Record<string, number>, r: DeliveryRow) => {
    const key = String(r.material ?? "Sem nome").trim() || "Sem nome";
    acc[key] = (acc[key] ?? 0) + (r.qty ?? 0);
    return acc;
  }, {});
  const topMaterials = Object.entries(totalsByMaterial).sort((a, b) => b[1] - a[1]).slice(0, 10);

  const logoDataUri = (await loadSchoolLogoDataUrl(schoolId)) ?? "";

  const pdfBuffer = await renderToBuffer(
    React.createElement(
      Document,
      null,
      React.createElement(
        Page,
        { size: "A4", style: styles.page },
        React.createElement(
          View,
          { style: styles.header },
          logoDataUri ? React.createElement(Image, { style: styles.logo, src: logoDataUri }) : null,
          React.createElement(Text, { style: styles.title }, "Relatórios de Materiais")
        ),
        React.createElement(Text, { style: styles.subtitle }, `Escola: ${schoolName} • Período: ${label}`),
        React.createElement(
          View,
          { style: styles.table },
          React.createElement(
            View,
            { style: [styles.row, styles.head] },
            React.createElement(Text, { style: [styles.cell, styles.colMed] }, "Data"),
            React.createElement(Text, { style: [styles.cell, styles.colLarge] }, "Material"),
            React.createElement(Text, { style: [styles.cell, styles.colSmall] }, "Qtd"),
            React.createElement(Text, { style: [styles.cell, styles.colLarge] }, "Para quem"),
            React.createElement(Text, { style: [styles.cell, styles.colMed] }, "Tipo"),
            React.createElement(Text, { style: [styles.cell, styles.colMed] }, "Turma"),
            React.createElement(Text, { style: [styles.cell, styles.colMed] }, "Período")
          ),
          ...scopedRows.map((r: DeliveryRow, i: number) =>
            React.createElement(
              View,
              { key: i, style: styles.row },
              React.createElement(
                Text,
                { style: [styles.cell, styles.colMed] },
                new Date(r.delivered_at).toLocaleDateString("pt-BR")
              ),
              React.createElement(Text, { style: [styles.cell, styles.colLarge] }, r.material),
              React.createElement(Text, { style: [styles.cell, styles.colSmall] }, String(r.qty)),
              React.createElement(Text, { style: [styles.cell, styles.colLarge] }, r.recipient_name),
              React.createElement(Text, { style: [styles.cell, styles.colMed] }, r.recipient_type),
              React.createElement(Text, { style: [styles.cell, styles.colMed] }, r.school_class),
              React.createElement(Text, { style: [styles.cell, styles.colMed] }, r.period ?? "")
            )
          )
        ),
        React.createElement(Text, { style: styles.footer }, `Total de itens entregues: ${totalQty}`)
        ,
        React.createElement(Text, { style: styles.totalsTitle }, "Total por pessoa"),
        ...totalsList.map(([name, qty], i) =>
          React.createElement(
            View,
            { key: `t-${i}`, style: styles.totalsRow },
            React.createElement(Text, null, name),
            React.createElement(Text, null, String(qty))
          )
        ),
        React.createElement(Text, { style: styles.totalsTitle }, "Materiais mais usados"),
        ...(topMaterials.length
          ? topMaterials.map(([material, qty], i) =>
              React.createElement(
                View,
                { key: `m-${i}`, style: styles.totalsRow },
                React.createElement(Text, null, material),
                React.createElement(Text, null, String(qty))
              )
            )
          : [
              React.createElement(
                Text,
                { key: "m-empty", style: styles.footer },
                "Sem dados de materiais no período."
              ),
            ])
      )
    )
  );

  const filename = year && month ? `materiais-${year}-${String(month).padStart(2, "0")}.pdf` : "materiais.pdf";
  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}
