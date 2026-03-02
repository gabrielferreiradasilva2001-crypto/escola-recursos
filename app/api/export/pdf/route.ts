import React from "react";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { supabaseAdmin } from "../../teachers/_supabaseAdmin";
import { requireUser } from "../../_auth";
import { ReportDocument } from "./ReportDocument";
import { loadSchoolLogoDataUrl } from "../../../../lib/schoolBranding";
import { getSharedSchoolIdsForSchool } from "../../_resourceGroups";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MONTHS_PT = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
type SchoolNameRow = { name: string };
type ReservationRow = {
  id: string;
  teacher_email: string | null;
  teacher_name: string | null;
  school_class: string | null;
  use_date: string;
  start_period: number;
  end_period: number;
  other_item_name: string | null;
};
type ReservationItemRow = {
  reservation_id: string;
  item_id: string;
  qty: number;
};
type ItemRow = {
  id: string;
  name: string;
  category: string;
};

function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDatePt(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export async function GET(req: Request) {
  try {
    const { response } = await requireUser(req);
    if (response) return response;

    const url = new URL(req.url);
    const year = Number(url.searchParams.get("year"));
    const month = Number(url.searchParams.get("month"));
    const schoolId = url.searchParams.get("school_id") ?? "";
    const sharedSchoolIds = schoolId ? await getSharedSchoolIdsForSchool(schoolId) : [];

    if (!year || !month || month < 1 || month > 12) {
      return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400 });
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    let schoolName = "";
    if (schoolId) {
      const { data: schoolRow } = await supabaseAdmin
        .from("schools")
        .select("name")
        .eq("id", schoolId)
        .maybeSingle();
      schoolName = (schoolRow as SchoolNameRow | null)?.name ?? "";
    }

    let reservationsQuery = supabaseAdmin
      .from("reservations")
      .select("id,teacher_email,teacher_name,school_class,use_date,start_period,end_period,status,other_item_name")
      .gte("use_date", toISODate(startDate))
      .lte("use_date", toISODate(endDate))
      .eq("status", "active")
      .order("use_date")
      .order("start_period");
    if (schoolId) {
      reservationsQuery = reservationsQuery.in("school_id", sharedSchoolIds.length ? sharedSchoolIds : [schoolId]);
    }
    const { data: reservations, error: resErr } = await reservationsQuery;

    if (resErr) {
      return NextResponse.json({ error: resErr.message }, { status: 500 });
    }

    const reservationIds = (reservations ?? []).map((r: ReservationRow) => r.id);
    let itemsUsed: { reservation_id: string; item_id: string; qty: number }[] = [];

    if (reservationIds.length) {
      const { data: ri, error: riErr } = await supabaseAdmin
        .from("reservation_items")
        .select("reservation_id,item_id,qty")
        .in("reservation_id", reservationIds);

      if (riErr) {
        return NextResponse.json({ error: riErr.message }, { status: 500 });
      }
      itemsUsed = (ri ?? []) as ReservationItemRow[];
    }

    const itemIds = Array.from(new Set(itemsUsed.map((x) => x.item_id)));
    const itemsMap = new Map<string, { name: string; category: string }>();

    if (itemIds.length) {
      let itemsQuery = supabaseAdmin
        .from("items")
        .select("id,name,category")
        .in("id", itemIds);
      if (schoolId) {
        itemsQuery = itemsQuery.in("school_id", sharedSchoolIds.length ? sharedSchoolIds : [schoolId]);
      }
      const { data: items, error: itemsErr } = await itemsQuery;

      if (itemsErr) {
        return NextResponse.json({ error: itemsErr.message }, { status: 500 });
      }

      (items ?? []).forEach((it: ItemRow) => itemsMap.set(it.id, { name: it.name, category: it.category }));
    }

    const itemsByReservation = new Map<string, { label: string; qty: number }[]>();
    const itemsTotals = new Map<string, { label: string; category: string; qty: number }>();

    itemsUsed.forEach((row) => {
      const info = itemsMap.get(row.item_id);
      if (!info) return;
      const label = info.name;
      itemsByReservation.set(row.reservation_id, [
        ...(itemsByReservation.get(row.reservation_id) ?? []),
        { label, qty: row.qty },
      ]);
      const current = itemsTotals.get(row.item_id);
      itemsTotals.set(row.item_id, {
        label,
        category: info.category,
        qty: (current?.qty ?? 0) + row.qty,
      });
    });

    const rows =
      (reservations ?? []).map((r: ReservationRow) => {
        const period =
          r.start_period === r.end_period ? `${r.start_period}º` : `${r.start_period}º-${r.end_period}º`;
        const teacher = r.teacher_name?.trim() || r.teacher_email || "Sem professor";
        const materials = [
          ...(itemsByReservation.get(r.id) ?? []).map((m) => `${m.label} x${m.qty}`),
          r.other_item_name ? `Outros: ${r.other_item_name}` : null,
        ]
          .filter(Boolean)
          .join(", ");

        return {
          date: formatDatePt(r.use_date),
          period,
          teacher,
          schoolClass: r.school_class || "-",
          materials: materials || "Sem itens",
        };
      }) ?? [];

    const topItems = Array.from(itemsTotals.values())
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5)
      .map((item) => ({ label: item.label, category: item.category, qty: item.qty }));

    const logoDataUrl = await loadSchoolLogoDataUrl(schoolId);
    const monthLabel = MONTHS_PT[month - 1] ?? String(month).padStart(2, "0");
    const titleBase = `Relatório de Agendamentos – ${monthLabel}/${year}`;
    const schoolContext = schoolName || "Todas as escolas";
    const title = `${titleBase} • ${schoolContext}`;
    const generatedAt = new Date().toLocaleString("pt-BR");

    const pdfBuffer = await renderToBuffer(
      React.createElement(ReportDocument, {
        title,
        generatedAt,
        logoDataUrl,
        rows,
        totalReservations: rows.length,
        topItems,
      })
    );

    const filename = `relatorio-agendamentos-${year}-${String(month).padStart(2, "0")}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Falha ao gerar PDF." }, { status: 500 });
  }
}
