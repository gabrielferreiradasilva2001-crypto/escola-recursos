import React from "react";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { requireUser } from "../../_auth";
import { supabaseAdmin } from "../../teachers/_supabaseAdmin";
import { loadSchoolLogoDataUrl } from "../../../../lib/schoolBranding";
import { OpenOccurrencesDocument } from "./OpenOccurrencesDocument";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ItemRow = { id: string; name: string; category: string };
type OccRow = {
  id: string;
  item_id: string;
  observation: string;
  created_at: string;
  created_by_email: string | null;
  status: string | null;
};
type SchoolRow = { id: string; name: string };

function formatDateTimePt(value: string) {
  return new Date(value).toLocaleString("pt-BR");
}

export async function POST(req: Request) {
  try {
    const { response } = await requireUser(req);
    if (response) return response;

    const body = (await req.json().catch(() => ({}))) as {
      school_id?: string;
      school_name?: string;
    };

    const schoolId = String(body.school_id ?? "").trim();
    let schoolName = String(body.school_name ?? "").trim();

    if (!schoolName && schoolId) {
      const { data: school } = await supabaseAdmin
        .from("schools")
        .select("id,name")
        .eq("id", schoolId)
        .maybeSingle();
      schoolName = (school as SchoolRow | null)?.name ?? "";
    }
    if (!schoolName) schoolName = "Todas as escolas";

    let itemsQuery = supabaseAdmin
      .from("items")
      .select("id,name,category")
      .order("category")
      .order("name");
    if (schoolId) itemsQuery = itemsQuery.eq("school_id", schoolId);
    const { data: items, error: itemsErr } = await itemsQuery;
    if (itemsErr) {
      return NextResponse.json({ error: "Erro ao buscar itens." }, { status: 500 });
    }

    const itemRows = (items ?? []) as ItemRow[];
    const itemMap = new Map(itemRows.map((it) => [it.id, `${it.category} — ${it.name}`]));
    const itemIds = itemRows.map((it) => it.id);

    if (!itemIds.length) {
      return NextResponse.json({ error: "Nenhum item encontrado." }, { status: 404 });
    }

    const { data: occurrences, error: occErr } = await supabaseAdmin
      .from("item_occurrences")
      .select("id,item_id,observation,created_at,created_by_email,status")
      .in("item_id", itemIds)
      .order("created_at", { ascending: false })
      .limit(500);

    if (occErr) {
      return NextResponse.json({ error: "Erro ao buscar ocorrências." }, { status: 500 });
    }

    const openRows = ((occurrences ?? []) as OccRow[]).filter(
      (row) => String(row.status ?? "open") !== "resolved"
    );

    if (!openRows.length) {
      return NextResponse.json({ error: "Não há ocorrências em aberto." }, { status: 404 });
    }

    const generatedAt = new Date().toLocaleString("pt-BR");
    const logoDataUrl = await loadSchoolLogoDataUrl(schoolId || undefined);
    const pdfRows = openRows.map((row) => ({
      code: `OC-${row.id.slice(0, 8).toUpperCase()}`,
      itemLabel: itemMap.get(row.item_id) ?? "Item não identificado",
      createdAt: formatDateTimePt(row.created_at),
      createdBy: row.created_by_email || "Usuário",
      observation: row.observation,
    }));

    const pdfBuffer = await renderToBuffer(
      React.createElement(OpenOccurrencesDocument, {
        title: "Registro de Ocorrências para Manutenção",
        generatedAt,
        logoDataUrl,
        schoolName,
        totalOpen: pdfRows.length,
        rows: pdfRows,
      })
    );

    const filename = `registro-ocorrencias-manutencao-${new Date().toISOString().slice(0, 10)}.pdf`;
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Falha ao gerar PDF de ocorrências em aberto." }, { status: 500 });
  }
}
