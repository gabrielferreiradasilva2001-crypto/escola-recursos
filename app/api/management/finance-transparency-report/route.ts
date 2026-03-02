import { NextResponse } from "next/server";
import React from "react";
import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { requireUser } from "../../_auth";
import { getAdminScope } from "../../_admin";
import { loadSchoolLogoDataUrl } from "../../../../lib/schoolBranding";

type FinanceType = "entry" | "exit";
type FinanceCategory =
  | "cash"
  | "school_income"
  | "event_income"
  | "expense"
  | "accounts_payable"
  | "custom";
type FinanceRow = {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: FinanceType;
  category: FinanceCategory;
  method: string;
  notes: string;
  customCategory: string | null;
  dueDate: string | null;
  paid: boolean;
};

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 10, fontFamily: "Helvetica", color: "#0f172a" },
  headerWrap: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderStyle: "solid",
    borderRadius: 8,
    padding: 10,
    backgroundColor: "#f8fafc",
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logo: {
    width: 34,
    height: 34,
    objectFit: "contain",
  },
  headerText: {
    flex: 1,
  },
  title: { fontSize: 16, fontWeight: 700 },
  subtitle: { marginTop: 2, color: "#475569", fontSize: 10 },
  section: { marginTop: 12 },
  summaryRow: { flexDirection: "row", gap: 8 },
  summaryBox: {
    width: "48%",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderStyle: "solid",
    borderRadius: 6,
    padding: 7,
    backgroundColor: "#f8fafc",
  },
  summaryLabel: { color: "#64748b", fontSize: 9 },
  summaryValue: { marginTop: 2, fontWeight: 700, fontSize: 12 },
  tableWrap: { marginTop: 8, borderWidth: 1, borderColor: "#e2e8f0", borderStyle: "solid", borderRadius: 6 },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    borderBottomStyle: "solid",
    backgroundColor: "#ffffff",
  },
  rowAlt: { backgroundColor: "#f8fafc" },
  head: { backgroundColor: "#f1f5f9" },
  cell: { paddingVertical: 5, paddingHorizontal: 6, borderRightWidth: 1, borderRightColor: "#e2e8f0" },
  cat: { width: "40%" },
  entry: { width: "20%" },
  exit: { width: "20%" },
  saldo: { width: "20%", borderRightWidth: 0 },
});

function money(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function categoryLabel(category: FinanceCategory, customCategory?: string | null) {
  if (category === "cash") return "Caixa";
  if (category === "school_income") return "Recebimento da escola";
  if (category === "event_income") return "Festa/Evento";
  if (category === "expense") return "Despesa";
  if (category === "accounts_payable") return "Conta a pagar";
  return customCategory?.trim() || "Categoria personalizada";
}

export async function POST(req: Request) {
  const { user, response } = await requireUser(req);
  if (response || !user) return response;

  const scope = await getAdminScope(user.id ?? "");
  if (!scope.isAdmin) return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });

  try {
    const body = await req.json().catch(() => ({}));
    const year = Number(body?.year ?? "");
    const month = Number(body?.month ?? "");
    const schoolNameInput = String(body?.school_name ?? "").trim();
    const schoolId = String(body?.school_id ?? "").trim();
    const schoolName = schoolNameInput || "Escola não informada";
    const rawRows = Array.isArray(body?.rows) ? body.rows : [];

    if (!year || !Number.isFinite(month) || month < 0 || month > 12) {
      return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400 });
    }

    const rows: FinanceRow[] = rawRows
      .filter((x: unknown) => !!x && typeof x === "object")
      .map((item: Record<string, unknown>) => ({
        id: String(item.id ?? ""),
        date: String(item.date ?? ""),
        description: String(item.description ?? ""),
        amount: Number(item.amount ?? 0),
        type: item.type === "exit" ? "exit" : "entry",
        category:
          item.category === "school_income"
            ? "school_income"
            : item.category === "event_income"
            ? "event_income"
            : item.category === "expense"
            ? "expense"
            : item.category === "accounts_payable"
            ? "accounts_payable"
            : item.category === "custom"
            ? "custom"
            : "cash",
        method: String(item.method ?? ""),
        notes: String(item.notes ?? ""),
        customCategory: item.customCategory ? String(item.customCategory) : null,
        dueDate: item.dueDate ? String(item.dueDate) : null,
        paid: Boolean(item.paid),
      }))
      .filter((x: FinanceRow) => x.date && x.description && Number.isFinite(x.amount) && x.amount > 0);

    const categoryMap = new Map<string, { categoryName: string; entries: number; exits: number }>();
    rows.forEach((row) => {
      const categoryName = categoryLabel(row.category, row.customCategory);
      const existing = categoryMap.get(categoryName) ?? { categoryName, entries: 0, exits: 0 };
      if (row.type === "entry") existing.entries += row.amount;
      else existing.exits += row.amount;
      categoryMap.set(categoryName, existing);
    });

    const categoryTotals = Array.from(categoryMap.values())
      .sort((a, b) => a.categoryName.localeCompare(b.categoryName))
      .slice(0, 200);

    const totals = categoryTotals.reduce(
      (acc, row) => {
        acc.entries += row.entries;
        acc.exits += row.exits;
        return acc;
      },
      { entries: 0, exits: 0 }
    );
    const saldo = totals.entries - totals.exits;

    const periodLabel = month === 0 ? `Anual/${year}` : `${String(month).padStart(2, "0")}/${year}`;
    const generatedAt = new Date().toLocaleString("pt-BR");
    const logoDataUrl = await loadSchoolLogoDataUrl(schoolId);

    const pdfBuffer = await renderToBuffer(
      React.createElement(
        Document,
        null,
        React.createElement(
          Page,
          { size: "A4", style: styles.page },
          React.createElement(
            View,
            { style: styles.headerWrap },
            React.createElement(
              View,
              { style: styles.headerTop },
              logoDataUrl ? React.createElement(Image, { style: styles.logo, src: logoDataUrl }) : null,
              React.createElement(
                View,
                { style: styles.headerText },
                React.createElement(Text, { style: styles.title }, "Transparência Financeira da Escola"),
                React.createElement(
                  Text,
                  { style: styles.subtitle },
                  `Escola: ${schoolName} • Período: ${periodLabel} • Gerado em: ${generatedAt}`
                )
              )
            ),
            React.createElement(
              Text,
              { style: { marginTop: 3, fontSize: 9, color: "#64748b" } },
              "Resumo público consolidado por categoria (entradas e saídas)."
            )
          ),
          React.createElement(
            View,
            { style: [styles.section, styles.summaryRow] },
            React.createElement(
              View,
              { style: styles.summaryBox },
              React.createElement(Text, { style: styles.summaryLabel }, "Total de entradas"),
              React.createElement(Text, { style: styles.summaryValue }, money(totals.entries))
            ),
            React.createElement(
              View,
              { style: styles.summaryBox },
              React.createElement(Text, { style: styles.summaryLabel }, "Total de saídas"),
              React.createElement(Text, { style: styles.summaryValue }, money(totals.exits))
            )
          ),
          React.createElement(
            View,
            { style: [styles.section, styles.summaryRow] },
            React.createElement(
              View,
              { style: styles.summaryBox },
              React.createElement(Text, { style: styles.summaryLabel }, "Saldo do período"),
              React.createElement(Text, { style: styles.summaryValue }, money(saldo))
            )
          ),
          React.createElement(Text, { style: { marginTop: 12, fontWeight: 700 } }, "Valores por categoria"),
          React.createElement(
            View,
            { style: styles.tableWrap },
            React.createElement(
              View,
              { style: [styles.row, styles.head] },
              React.createElement(Text, { style: [styles.cell, styles.cat] }, "Categoria"),
              React.createElement(Text, { style: [styles.cell, styles.entry] }, "Entradas"),
              React.createElement(Text, { style: [styles.cell, styles.exit] }, "Saídas"),
              React.createElement(Text, { style: [styles.cell, styles.saldo] }, "Saldo")
            ),
            ...(
              categoryTotals.length
                ? categoryTotals.map((row, idx) =>
                    React.createElement(
                      View,
                      {
                        key: row.categoryName,
                        style: idx % 2 ? [styles.row, styles.rowAlt] : [styles.row],
                      },
                      React.createElement(Text, { style: [styles.cell, styles.cat] }, row.categoryName),
                      React.createElement(Text, { style: [styles.cell, styles.entry] }, money(row.entries)),
                      React.createElement(Text, { style: [styles.cell, styles.exit] }, money(row.exits)),
                      React.createElement(Text, { style: [styles.cell, styles.saldo] }, money(row.entries - row.exits))
                    )
                  )
                : [
                    React.createElement(
                      View,
                      { key: "empty", style: styles.row },
                      React.createElement(Text, { style: { padding: 7 } }, "Sem lançamentos no período.")
                    ),
                  ]
            )
          ),
          React.createElement(
            Text,
            { style: { marginTop: 8, color: "#64748b", fontSize: 9 } },
            "Relatório simplificado para transparência, com consolidação por categoria."
          )
        )
      )
    );

    const filename = `transparencia-${year}-${String(month).padStart(2, "0")}.pdf`;
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Erro ao gerar PDF de transparência." }, { status: 500 });
  }
}
