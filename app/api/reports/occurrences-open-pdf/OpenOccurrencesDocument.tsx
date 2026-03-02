import React from "react";
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

type OpenOccurrenceRow = {
  code: string;
  itemLabel: string;
  createdAt: string;
  createdBy: string;
  observation: string;
};

type OpenOccurrencesPdfProps = {
  title: string;
  generatedAt: string;
  logoDataUrl?: string | null;
  schoolName: string;
  totalOpen: number;
  rows: OpenOccurrenceRow[];
};

const styles = StyleSheet.create({
  page: {
    padding: 28,
    fontSize: 10,
    color: "#0f172a",
    fontFamily: "Helvetica",
    backgroundColor: "#f8fafc",
  },
  header: {
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#dbeafe",
    borderBottomStyle: "solid",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logo: {
    width: 52,
    height: 52,
    objectFit: "contain",
  },
  titleWrap: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
  },
  subtitle: {
    marginTop: 4,
    fontSize: 10,
    color: "#475569",
  },
  kpiRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  kpiCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderStyle: "solid",
    borderRadius: 10,
    backgroundColor: "#eff6ff",
    padding: 8,
  },
  kpiLabel: {
    fontSize: 9,
    color: "#475569",
    marginBottom: 2,
  },
  kpiValue: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#0f172a",
  },
  rowCard: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderStyle: "solid",
    borderRadius: 10,
    backgroundColor: "#ffffff",
    padding: 10,
    marginBottom: 8,
  },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  code: {
    fontSize: 9,
    color: "#475569",
    fontWeight: "bold",
  },
  item: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "bold",
  },
  meta: {
    marginTop: 2,
    fontSize: 9,
    color: "#475569",
  },
  observation: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderStyle: "solid",
    borderRadius: 8,
    backgroundColor: "#f8fafc",
    padding: 8,
    fontSize: 10,
    lineHeight: 1.35,
  },
  footer: {
    marginTop: 10,
    fontSize: 9,
    color: "#64748b",
    textAlign: "center",
  },
});

export function OpenOccurrencesDocument({
  title,
  generatedAt,
  logoDataUrl,
  schoolName,
  totalOpen,
  rows,
}: OpenOccurrencesPdfProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          {logoDataUrl ? <Image style={styles.logo} src={logoDataUrl} alt="" /> : null}
          <View style={styles.titleWrap}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>Gerado em: {generatedAt}</Text>
          </View>
        </View>

        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Escola</Text>
            <Text style={styles.kpiValue}>{schoolName}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Ocorrências em aberto</Text>
            <Text style={styles.kpiValue}>{totalOpen}</Text>
          </View>
        </View>

        {rows.map((row) => (
          <View key={row.code} style={styles.rowCard}>
            <View style={styles.rowTop}>
              <Text style={styles.code}>{row.code}</Text>
              <Text style={styles.code}>{row.createdAt}</Text>
            </View>
            <Text style={styles.item}>{row.itemLabel}</Text>
            <Text style={styles.meta}>Registrado por: {row.createdBy}</Text>
            <Text style={styles.observation}>{row.observation}</Text>
          </View>
        ))}

        <Text style={styles.footer}>LOOP • Sistema de Gestão Escolar • Registro de Ocorrências para Manutenção</Text>
      </Page>
    </Document>
  );
}
