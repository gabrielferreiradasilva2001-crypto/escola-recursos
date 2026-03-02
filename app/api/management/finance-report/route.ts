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
  page: {
    paddingTop: 22,
    paddingHorizontal: 24,
    paddingBottom: 18,
    fontSize: 9.5,
    color: "#0f172a",
    fontFamily: "Helvetica",
  },
  headerWrap: {
    borderWidth: 1,
    borderColor: "#dbeafe",
    borderStyle: "solid",
    borderRadius: 8,
    backgroundColor: "#eff6ff",
    padding: 10,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logo: {
    width: 38,
    height: 38,
    objectFit: "contain",
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: 700,
  },
  subtitle: {
    marginTop: 2,
    color: "#334155",
    fontSize: 9,
  },
  infoBar: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  infoItem: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderStyle: "solid",
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 6,
    width: "32%",
  },
  infoLabel: {
    color: "#64748b",
    fontSize: 8.5,
  },
  infoValue: {
    marginTop: 2,
    fontWeight: 700,
    fontSize: 10,
  },
  summaryGrid: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  summaryCard: {
    width: "49%",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderStyle: "solid",
    borderRadius: 7,
    padding: 8,
    backgroundColor: "#f8fafc",
  },
  summaryLabel: {
    color: "#475569",
    fontSize: 9,
  },
  summaryValue: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: 700,
  },
  sectionTitle: {
    marginTop: 12,
    marginBottom: 5,
    fontSize: 11.5,
    fontWeight: 700,
  },
  table: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderStyle: "solid",
    borderRadius: 6,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    borderBottomStyle: "solid",
    backgroundColor: "#ffffff",
  },
  rowAlt: {
    backgroundColor: "#f8fafc",
  },
  head: {
    backgroundColor: "#e2e8f0",
  },
  cell: {
    paddingVertical: 5,
    paddingHorizontal: 5,
    borderRightWidth: 1,
    borderRightColor: "#e2e8f0",
    borderRightStyle: "solid",
  },
  cellDate: { width: "12%" },
  cellDesc: { width: "31%" },
  cellCat: { width: "15%" },
  cellType: { width: "10%" },
  cellAmount: { width: "14%" },
  cellStatus: { width: "18%", borderRightWidth: 0 },
  footWrap: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderStyle: "solid",
    borderRadius: 6,
    backgroundColor: "#f8fafc",
    padding: 7,
  },
  footText: {
    color: "#475569",
    fontSize: 8.5,
  },
});

function money(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function categoryLabel(category: FinanceCategory, customCategory?: string | null) {
  if (category === "cash") return "Caixa";
  if (category === "school_income") return "Recebimento";
  if (category === "event_income") return "Festa/Evento";
  if (category === "accounts_payable") return "Conta a pagar";
  if (category === "custom") return customCategory?.trim() || "Personalizada";
  return "Despesa";
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
    const schoolId = String(body?.school_id ?? "").trim();
    const schoolNameInput = String(body?.school_name ?? "").trim();
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
      .filter((x: FinanceRow) => x.date && x.description && Number.isFinite(x.amount) && x.amount > 0)
      .slice(0, 2400);

    const totals = rows.reduce(
      (acc, item) => {
        if (item.type === "entry") acc.entries += item.amount;
        if (item.type === "exit") acc.exits += item.amount;
        if (item.category === "cash") acc.cash += item.type === "entry" ? item.amount : -item.amount;
        if (item.category === "event_income") acc.eventIncome += item.amount;
        if (item.category === "school_income") acc.schoolIncome += item.amount;
        if (item.category === "accounts_payable" && !item.paid) acc.openPayables += item.amount;
        return acc;
      },
      {
        entries: 0,
        exits: 0,
        cash: 0,
        eventIncome: 0,
        schoolIncome: 0,
        openPayables: 0,
      }
    );

    const monthLabel = month === 0 ? "Anual" : `${String(month).padStart(2, "0")}/${year}`;
    const generatedAt = new Date().toLocaleString("pt-BR");
    const result = totals.entries - totals.exits;
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
                React.createElement(Text, { style: styles.title }, "Resumo Financeiro da Escola"),
                React.createElement(
                  Text,
                  { style: styles.subtitle },
                  `Escola: ${schoolName}`
                )
              )
            ),
            React.createElement(
              View,
              { style: styles.infoBar },
              React.createElement(
                View,
                { style: styles.infoItem },
                React.createElement(Text, { style: styles.infoLabel }, "Período"),
                React.createElement(Text, { style: styles.infoValue }, monthLabel)
              ),
              React.createElement(
                View,
                { style: styles.infoItem },
                React.createElement(Text, { style: styles.infoLabel }, "Ano"),
                React.createElement(Text, { style: styles.infoValue }, String(year))
              ),
              React.createElement(
                View,
                { style: styles.infoItem },
                React.createElement(Text, { style: styles.infoLabel }, "Gerado em"),
                React.createElement(Text, { style: styles.infoValue }, generatedAt)
              )
            )
          ),
          React.createElement(
            View,
            { style: styles.summaryGrid },
            React.createElement(
              View,
              { style: styles.summaryCard },
              React.createElement(Text, { style: styles.summaryLabel }, "Entradas"),
              React.createElement(Text, { style: styles.summaryValue }, money(totals.entries))
            ),
            React.createElement(
              View,
              { style: styles.summaryCard },
              React.createElement(Text, { style: styles.summaryLabel }, "Saídas"),
              React.createElement(Text, { style: styles.summaryValue }, money(totals.exits))
            ),
            React.createElement(
              View,
              { style: styles.summaryCard },
              React.createElement(Text, { style: styles.summaryLabel }, "Resultado do período"),
              React.createElement(Text, { style: styles.summaryValue }, money(result))
            ),
            React.createElement(
              View,
              { style: styles.summaryCard },
              React.createElement(Text, { style: styles.summaryLabel }, "Saldo em caixa"),
              React.createElement(Text, { style: styles.summaryValue }, money(totals.cash))
            ),
            React.createElement(
              View,
              { style: styles.summaryCard },
              React.createElement(Text, { style: styles.summaryLabel }, "Recebimentos da escola"),
              React.createElement(Text, { style: styles.summaryValue }, money(totals.schoolIncome))
            ),
            React.createElement(
              View,
              { style: styles.summaryCard },
              React.createElement(Text, { style: styles.summaryLabel }, "Arrecadações de festas/eventos"),
              React.createElement(Text, { style: styles.summaryValue }, money(totals.eventIncome))
            ),
            React.createElement(
              View,
              { style: styles.summaryCard },
              React.createElement(Text, { style: styles.summaryLabel }, "Contas a pagar em aberto"),
              React.createElement(Text, { style: styles.summaryValue }, money(totals.openPayables))
            )
          ),
          React.createElement(Text, { style: styles.sectionTitle }, "Lançamentos Financeiros"),
          React.createElement(
            View,
            { style: styles.table },
            React.createElement(
              View,
              { style: [styles.row, styles.head] },
              React.createElement(Text, { style: [styles.cell, styles.cellDate] }, "Data"),
              React.createElement(Text, { style: [styles.cell, styles.cellDesc] }, "Descrição"),
              React.createElement(Text, { style: [styles.cell, styles.cellCat] }, "Categoria"),
              React.createElement(Text, { style: [styles.cell, styles.cellType] }, "Tipo"),
              React.createElement(Text, { style: [styles.cell, styles.cellAmount] }, "Valor"),
              React.createElement(Text, { style: [styles.cell, styles.cellStatus] }, "Status"),
            ),
            ...(
              rows.length
                ? rows
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .slice(0, 140)
                    .map((row, idx) =>
                      React.createElement(
                        View,
                        {
                          key: `${row.id}-${row.date}-${row.amount}`,
                          style: idx % 2 ? [styles.row, styles.rowAlt] : [styles.row],
                        },
                        React.createElement(Text, { style: [styles.cell, styles.cellDate] }, row.date),
                        React.createElement(Text, { style: [styles.cell, styles.cellDesc] }, row.description),
                        React.createElement(
                          Text,
                          { style: [styles.cell, styles.cellCat] },
                          categoryLabel(row.category, row.customCategory)
                        ),
                        React.createElement(
                          Text,
                          { style: [styles.cell, styles.cellType] },
                          row.type === "entry" ? "Entrada" : "Saída"
                        ),
                        React.createElement(Text, { style: [styles.cell, styles.cellAmount] }, money(row.amount)),
                        React.createElement(
                          Text,
                          { style: [styles.cell, styles.cellStatus] },
                          row.category === "accounts_payable" ? (row.paid ? "Paga" : "Pendente") : "-"
                        )
                      )
                    )
                : [
                    React.createElement(
                      View,
                      { key: "empty-row", style: styles.row },
                      React.createElement(Text, { style: { padding: 6 } }, "Sem lançamentos no período.")
                    ),
                  ]
            )
          ),
          React.createElement(
            View,
            { style: styles.footWrap },
            React.createElement(
              Text,
              { style: styles.footText },
              "Observação: este resumo é gerado a partir dos lançamentos registrados no módulo financeiro."
            )
          )
        )
      )
    );

    const filename = `financeiro-${year}-${String(month).padStart(2, "0")}.pdf`;
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Erro ao gerar resumo financeiro em PDF." }, { status: 500 });
  }
}
