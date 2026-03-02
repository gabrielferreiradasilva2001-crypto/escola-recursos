import React from "react";
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

type OccurrencePdfProps = {
  title: string;
  generatedAt: string;
  logoDataUrl?: string | null;
  occurrence: {
    code: string;
    itemLabel: string;
    observation: string;
    status: string;
    createdAt: string;
    createdBy: string;
    diagnosis?: string;
    resolvedAt?: string;
    resolvedBy?: string;
    schoolName: string;
  };
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
  section: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderStyle: "solid",
    borderRadius: 10,
    backgroundColor: "#ffffff",
    padding: 10,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 5,
    color: "#0f172a",
  },
  line: {
    marginTop: 4,
    fontSize: 10,
    color: "#334155",
  },
  observationBox: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderStyle: "solid",
    borderRadius: 8,
    backgroundColor: "#f8fafc",
    padding: 8,
  },
  observationText: {
    fontSize: 10,
    color: "#0f172a",
    lineHeight: 1.4,
  },
  footer: {
    marginTop: 10,
    fontSize: 9,
    color: "#64748b",
    textAlign: "center",
  },
});

function statusLabel(status: string) {
  if (status === "resolved") return "Resolvida";
  return "Aberta";
}

export function OccurrenceDocument({
  title,
  generatedAt,
  logoDataUrl,
  occurrence,
}: OccurrencePdfProps) {
  const hasDiagnosis = Boolean(occurrence.diagnosis?.trim());

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
            <Text style={styles.kpiLabel}>Código</Text>
            <Text style={styles.kpiValue}>{occurrence.code}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Status</Text>
            <Text style={styles.kpiValue}>{statusLabel(occurrence.status)}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Escola</Text>
            <Text style={styles.kpiValue}>{occurrence.schoolName}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dados da ocorrência</Text>
          <Text style={styles.line}>Material: {occurrence.itemLabel}</Text>
          <Text style={styles.line}>Registrado por: {occurrence.createdBy}</Text>
          <Text style={styles.line}>Data do registro: {occurrence.createdAt}</Text>

          <View style={styles.observationBox}>
            <Text style={styles.observationText}>{occurrence.observation}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Encaminhamento para manutenção</Text>
          <Text style={styles.line}>Solicita-se análise técnica e retorno com diagnóstico.</Text>
          <Text style={styles.line}>Registrar ação executada e data de conclusão no sistema.</Text>
        </View>

        {occurrence.status === "resolved" ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Fechamento</Text>
            {hasDiagnosis ? (
              <View style={styles.observationBox}>
                <Text style={styles.observationText}>{occurrence.diagnosis}</Text>
              </View>
            ) : (
              <Text style={styles.line}>Diagnóstico não informado.</Text>
            )}
            {occurrence.resolvedAt ? <Text style={styles.line}>Resolvido em: {occurrence.resolvedAt}</Text> : null}
            {occurrence.resolvedBy ? <Text style={styles.line}>Resolvido por: {occurrence.resolvedBy}</Text> : null}
          </View>
        ) : null}

        <Text style={styles.footer}>LOOP • Sistema de Gestão Escolar • Registro de Ocorrência</Text>
      </Page>
    </Document>
  );
}
