import React from "react";
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

type ReportRow = {
  date: string;
  period: string;
  teacher: string;
  schoolClass: string;
  materials: string;
};

type ReportDocumentProps = {
  title: string;
  generatedAt: string;
  logoDataUrl?: string | null;
  rows: ReportRow[];
  totalReservations: number;
  topItems: { label: string; category: string; qty: number }[];
};

const styles = StyleSheet.create({
  page: {
    padding: 28,
    fontSize: 10,
    color: "#0f172a",
    fontFamily: "Helvetica",
  },
  header: {
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    borderBottomStyle: "solid",
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logo: {
    width: 54,
    height: 54,
    objectFit: "contain",
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  subtitle: {
    color: "#475569",
    fontSize: 10,
  },
  table: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderStyle: "solid",
    marginTop: 6,
    borderRadius: 8,
  },
  tableTitle: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 4,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#e0f2fe",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    borderBottomStyle: "solid",
    paddingVertical: 6,
    paddingHorizontal: 6,
    fontWeight: "bold",
    color: "#0c4a6e",
  },
  row: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#edf2f7",
    borderBottomStyle: "solid",
  },
  rowAlt: {
    backgroundColor: "#f8fafc",
  },
  cellDate: { width: "12%" },
  cellPeriod: { width: "12%" },
  cellTeacher: { width: "22%" },
  cellClass: { width: "12%" },
  cellMaterials: { width: "42%" },
  footer: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    borderTopStyle: "solid",
    paddingTop: 10,
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  footerBlock: {
    flex: 1,
  },
  footerTitle: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 4,
  },
  footerText: {
    color: "#475569",
    fontSize: 10,
  },
  chartBlock: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    borderTopStyle: "solid",
    paddingTop: 8,
  },
  chartTitle: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 6,
  },
  chartRow: {
    marginBottom: 6,
  },
  chartLabel: {
    fontSize: 9,
    color: "#334155",
    marginBottom: 2,
  },
  chartTrack: {
    width: "100%",
    height: 8,
    backgroundColor: "#e2e8f0",
    borderRadius: 999,
    overflow: "hidden",
  },
  chartFill: {
    height: 8,
    backgroundColor: "#0ea5e9",
    borderRadius: 999,
  },
  chartQty: {
    marginTop: 1,
    fontSize: 8,
    color: "#475569",
  },
});

function iconByCategory(category: string) {
  const c = (category || "").toLowerCase();
  if (c.includes("inform") || c.includes("tec") || c.includes("comp")) return "💻";
  if (c.includes("audio") || c.includes("video") || c.includes("som")) return "🎤";
  if (c.includes("projet") || c.includes("tv")) return "📽️";
  if (c.includes("esport")) return "⚽";
  if (c.includes("arte")) return "🎨";
  if (c.includes("cien")) return "🔬";
  return "📦";
}

export function ReportDocument({
  title,
  generatedAt,
  logoDataUrl,
  rows,
  totalReservations,
  topItems,
}: ReportDocumentProps) {
  const maxTopQty = topItems.length ? Math.max(...topItems.map((i) => i.qty)) : 0;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          {logoDataUrl ? <Image style={styles.logo} src={logoDataUrl} alt="" /> : null}
          <View style={styles.headerText}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>Gerado em: {generatedAt}</Text>
          </View>
        </View>

        <Text style={styles.tableTitle}>Detalhamento de agendamentos</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.cellDate}>Data</Text>
            <Text style={styles.cellPeriod}>Período</Text>
            <Text style={styles.cellTeacher}>Professor</Text>
            <Text style={styles.cellClass}>Turma</Text>
            <Text style={styles.cellMaterials}>Materiais</Text>
          </View>

          {rows.length === 0 ? (
            <View style={styles.row}>
              <Text>Nenhum agendamento encontrado.</Text>
            </View>
          ) : (
            rows.map((row, idx) => (
              <View key={`${row.date}-${idx}`} style={[styles.row, idx % 2 === 1 ? styles.rowAlt : null]}>
                <Text style={styles.cellDate}>{row.date}</Text>
                <Text style={styles.cellPeriod}>{row.period}</Text>
                <Text style={styles.cellTeacher}>{row.teacher}</Text>
                <Text style={styles.cellClass}>{row.schoolClass}</Text>
                <Text style={styles.cellMaterials}>{row.materials}</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.footer}>
          <View style={styles.footerBlock}>
            <Text style={styles.footerTitle}>Total de agendamentos</Text>
            <Text style={styles.footerText}>{totalReservations}</Text>
          </View>
          <View style={styles.footerBlock}>
            <Text style={styles.footerTitle}>Itens mais usados</Text>
            {topItems.length ? (
              topItems.map((item) => (
                <Text key={item.label} style={styles.footerText}>
                  {iconByCategory(item.category)} {item.label} x{item.qty}
                </Text>
              ))
            ) : (
              <Text style={styles.footerText}>Sem itens.</Text>
            )}
          </View>
        </View>

        <View style={styles.chartBlock}>
          <Text style={styles.chartTitle}>Resumo visual de itens utilizados</Text>
          {topItems.length ? (
            topItems.map((item) => {
              const pct = maxTopQty ? Math.max(4, Math.round((item.qty / maxTopQty) * 100)) : 0;
              return (
                <View key={`chart-${item.label}`} style={styles.chartRow}>
                  <Text style={styles.chartLabel}>
                    {iconByCategory(item.category)} {item.category} • {item.label}
                  </Text>
                  <View style={styles.chartTrack}>
                    <View style={[styles.chartFill, { width: `${pct}%` }]} />
                  </View>
                  <Text style={styles.chartQty}>{item.qty} uso(s)</Text>
                </View>
              );
            })
          ) : (
            <Text style={styles.footerText}>Sem dados para gráfico.</Text>
          )}
        </View>
      </Page>
    </Document>
  );
}
