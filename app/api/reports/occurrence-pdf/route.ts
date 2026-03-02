import React from "react";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { requireUser } from "../../_auth";
import { supabaseAdmin } from "../../teachers/_supabaseAdmin";
import { loadSchoolLogoDataUrl } from "../../../../lib/schoolBranding";
import { OccurrenceDocument } from "./OccurrenceDocument";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ItemRow = { id: string; name: string; category: string };
type OccRow = {
  id: string;
  item_id: string;
  observation: string;
  created_at: string;
  created_by_email: string | null;
  status: string;
  diagnosis?: string | null;
  resolved_at?: string | null;
  resolved_by_email?: string | null;
};
type SchoolRow = { id: string; name: string };

function formatDateTimePt(value: string) {
  return new Date(value).toLocaleString("pt-BR");
}

function extractDiagnosisFromObservation(text: string) {
  const match = text.match(/Diagnóstico \(resolução\):\s*([^\n]+)/i);
  return match?.[1]?.trim() ?? "";
}

export async function POST(req: Request) {
  try {
    const { user, response } = await requireUser(req);
    if (response || !user) return response;

    const body = (await req.json().catch(() => ({}))) as {
      occurrence_id?: string;
      item_id?: string;
      observation?: string;
      status?: string;
      school_id?: string;
      school_name?: string;
      created_at?: string;
      created_by_email?: string;
      diagnosis?: string;
      resolved_at?: string;
      resolved_by_email?: string;
    };

    let occ: OccRow | null = null;
    if (body.occurrence_id) {
      let { data, error } = await supabaseAdmin
        .from("item_occurrences")
        .select("id,item_id,observation,created_at,created_by_email,status,diagnosis,resolved_at,resolved_by_email")
        .eq("id", body.occurrence_id)
        .single();

      if (error) {
        const msg = String(error.message ?? "").toLowerCase();
        const missingNewCols =
          msg.includes("diagnosis") ||
          msg.includes("resolved_at") ||
          msg.includes("resolved_by_email");

        if (missingNewCols) {
          const fallback = await supabaseAdmin
            .from("item_occurrences")
            .select("id,item_id,observation,created_at,created_by_email,status")
            .eq("id", body.occurrence_id)
            .single();
          data = fallback.data as typeof data;
          error = fallback.error;
        }
      }

      if (error || !data) {
        return NextResponse.json({ error: "Ocorrência não encontrada." }, { status: 404 });
      }
      const row = data as OccRow;
      occ = {
        ...row,
        diagnosis:
          typeof row.diagnosis === "string" && row.diagnosis.trim()
            ? row.diagnosis.trim()
            : extractDiagnosisFromObservation(String(row.observation ?? "")),
      };
    } else {
      const itemId = String(body.item_id ?? "").trim();
      const observation = String(body.observation ?? "").trim();
      if (!itemId || !observation) {
        return NextResponse.json({ error: "Informe item e descrição da ocorrência." }, { status: 400 });
      }
      occ = {
        id: `rascunho-${Date.now()}`,
        item_id: itemId,
        observation,
        created_at: body.created_at || new Date().toISOString(),
        created_by_email: body.created_by_email || user.email || "",
        status: body.status || "open",
        diagnosis: body.diagnosis || null,
        resolved_at: body.resolved_at || null,
        resolved_by_email: body.resolved_by_email || null,
      };
    }

    const { data: item, error: itemErr } = await supabaseAdmin
      .from("items")
      .select("id,name,category")
      .eq("id", occ.item_id)
      .maybeSingle();
    if (itemErr || !item) {
      return NextResponse.json({ error: "Item não encontrado para a ocorrência." }, { status: 404 });
    }

    let schoolName = String(body.school_name ?? "").trim();
    const schoolId = String(body.school_id ?? "").trim();
    if (!schoolName && schoolId) {
      const { data: school } = await supabaseAdmin
        .from("schools")
        .select("id,name")
        .eq("id", schoolId)
        .maybeSingle();
      schoolName = (school as SchoolRow | null)?.name ?? "";
    }
    if (!schoolName) schoolName = "Não informada";

    const logoDataUrl = await loadSchoolLogoDataUrl(schoolId || undefined);
    const code = occ.id.startsWith("rascunho-") ? "RASCUNHO" : `OC-${occ.id.slice(0, 8).toUpperCase()}`;
    const generatedAt = new Date().toLocaleString("pt-BR");

    const pdfBuffer = await renderToBuffer(
      React.createElement(OccurrenceDocument, {
        title: "Registro de Ocorrência de Material",
        generatedAt,
        logoDataUrl,
        occurrence: {
          code,
          itemLabel: `${(item as ItemRow).category} — ${(item as ItemRow).name}`,
          observation: occ.observation,
          status: occ.status,
          createdAt: formatDateTimePt(occ.created_at),
          createdBy: occ.created_by_email || user.email || "Usuário",
          diagnosis: occ.diagnosis || "",
          resolvedAt: occ.resolved_at ? formatDateTimePt(occ.resolved_at) : "",
          resolvedBy: occ.resolved_by_email || "",
          schoolName,
        },
      })
    );

    const filename = `ocorrencia-material-${new Date().toISOString().slice(0, 10)}.pdf`;
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Falha ao gerar PDF da ocorrência." }, { status: 500 });
  }
}
