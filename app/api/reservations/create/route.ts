import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../teachers/_supabaseAdmin";
import { requireUser } from "../../_auth";
import { isAdminUser } from "../../_admin";
import { getSharedSchoolIdsForSchool } from "../../_resourceGroups";

type MaterialRow = { item_id: string; qty: number };
type ClassesByDatePeriod = Record<string, Record<string, string>>;
type ReservationRangeRow = {
  id: string;
  start_period: number;
  end_period: number;
};
type ReservationItemCheckRow = {
  item_id: string;
  qty: number;
};
type ItemStockRow = {
  id: string;
  total_qty: number;
  category: string;
  name: string;
  school_id: string | null;
};
type ShiftType = "matutino" | "vespertino";

function isSchoolDay(d: Date) {
  const wd = d.getDay();
  return wd >= 1 && wd <= 5;
}

function getClassShiftLabel(schoolClass: string): ShiftType | null {
  const normalized = String(schoolClass ?? "").toLowerCase();
  if (normalized.includes("vespertino")) return "vespertino";
  if (normalized.includes("matutino")) return "matutino";
  return null;
}

export async function POST(req: Request) {
  try {
    const { user, response } = await requireUser(req);
    if (response || !user) return response;

    const body = await req.json();
    const {
      teacher_id: bodyTeacherId,
      teacher_name: bodyTeacherName,
      school_class: bodySchoolClass,
      school_classes: bodySchoolClasses,
      default_school_class,
      classes_by_date_period,
      school_id,
      school_name,
      dates,
      start_period,
      end_period,
      per_day_periods,
      material_rows,
      other_item_name,
    } = body ?? {};

    let teacher_id = bodyTeacherId;
    let teacher_name = bodyTeacherName;
    let school_class = bodySchoolClass;
    let school_classes = bodySchoolClasses;

    const isAdmin = await isAdminUser(user.id ?? "");
    if (!isAdmin) {
      const metaTeacherId = String(user.user_metadata?.teacher_id ?? "").trim();
      const metaName = String(user.user_metadata?.name ?? "").trim();
      if (!metaTeacherId) {
        return NextResponse.json(
          { error: "Seu usuário não está vinculado a um professor." },
          { status: 400 }
        );
      }
      teacher_id = metaTeacherId;
      teacher_name = metaName || "Sem nome";
    }

    if (!Array.isArray(dates) || dates.length === 0) {
      return NextResponse.json({ error: "Selecione pelo menos 1 data." }, { status: 400 });
    }
    if (!teacher_id) {
      return NextResponse.json({ error: "Selecione o professor." }, { status: 400 });
    }
    if (!school_class && default_school_class) {
      school_class = default_school_class;
    }
    if (!Array.isArray(school_classes) && classes_by_date_period) {
      const unique = new Set<string>();
      Object.values(classes_by_date_period as ClassesByDatePeriod).forEach((row) => {
        Object.values(row ?? {}).forEach((v) => {
          if (v) unique.add(String(v));
        });
      });
      school_classes = Array.from(unique);
    }
    const classes =
      Array.isArray(school_classes) && school_classes.length
        ? school_classes
        : school_class
          ? [school_class]
          : [];
    if (!classes.length && !classes_by_date_period) {
      return NextResponse.json({ error: "Selecione pelo menos 1 turma." }, { status: 400 });
    }
    if (!school_id) {
      return NextResponse.json({ error: "Selecione a escola." }, { status: 400 });
    }
    const sharedSchoolIds = await getSharedSchoolIdsForSchool(String(school_id));
    if (!Array.isArray(material_rows) || material_rows.length === 0) {
      return NextResponse.json({ error: "Adicione pelo menos 1 material." }, { status: 400 });
    }

    const datesToSave: string[] = dates;
    const mat: MaterialRow[] = material_rows;
    const itemIds = mat.map((m) => m.item_id);

    const { data: itemsData, error: itemsErr } = await supabaseAdmin
      .from("items")
      .select("id,total_qty,category,name,school_id")
      .in("id", itemIds)
      .in("school_id", sharedSchoolIds.length ? sharedSchoolIds : [String(school_id)]);
    if (itemsErr) {
      return NextResponse.json({ error: "Erro ao carregar itens: " + itemsErr.message }, { status: 500 });
    }
    if (!itemsData || itemsData.length !== itemIds.length) {
      return NextResponse.json(
        { error: "Materiais inválidos para a escola selecionada." },
        { status: 400 }
      );
    }

    for (const dateISO of datesToSave) {
      const d = new Date(dateISO + "T00:00:00");
      if (!isSchoolDay(d)) {
        return NextResponse.json({ error: "Data não letiva (só seg a sex)." }, { status: 400 });
      }

      const dayPeriods = per_day_periods && per_day_periods[dateISO];
      const daySel = Array.isArray(dayPeriods) && dayPeriods.length ? dayPeriods : null;
      const dayStart = daySel ? Math.min(...daySel) : start_period;
      const dayEnd = daySel ? Math.max(...daySel) : end_period;

      const { data: reservations, error: resErr } = await supabaseAdmin
        .from("reservations")
        .select("id,start_period,end_period,status,school_class")
        .eq("use_date", dateISO)
        .in("school_id", sharedSchoolIds.length ? sharedSchoolIds : [String(school_id)])
        .eq("status", "active");
      if (resErr) {
        return NextResponse.json({ error: "Erro ao verificar reservas: " + resErr.message }, { status: 500 });
      }

      const classesForDate = (() => {
        if (classes_by_date_period && classes_by_date_period[dateISO]) {
          const unique = new Set<string>();
          Object.values((classes_by_date_period as ClassesByDatePeriod)[dateISO] ?? {}).forEach((v) => {
            if (v) unique.add(String(v));
          });
          return Array.from(unique);
        }
        return classes;
      })();
      const requestedShifts = new Set<ShiftType>(
        classesForDate
          .map((cls) => getClassShiftLabel(String(cls)))
          .filter((shift): shift is ShiftType => !!shift)
      );

      if (!classesForDate.length) {
        return NextResponse.json({ error: "Selecione pelo menos 1 turma." }, { status: 400 });
      }

      const overlapping = (reservations ?? []).filter(
        (r: ReservationRangeRow & { school_class?: string | null }) => {
          if (requestedShifts.size) {
            const existingShift = getClassShiftLabel(String(r.school_class ?? ""));
            if (!existingShift || !requestedShifts.has(existingShift)) return false;
          }
          const a1 = r.start_period;
          const a2 = r.end_period;
          return !(a2 < dayStart || a1 > dayEnd);
        }
      );

      if (overlapping.length) {
        const ids = overlapping.map((r: ReservationRangeRow) => r.id);
        const { data: ri, error: riErr } = await supabaseAdmin
          .from("reservation_items")
          .select("reservation_id,item_id,qty")
          .in("reservation_id", ids)
          .in("item_id", itemIds);
        if (riErr) {
          return NextResponse.json({ error: "Erro ao verificar itens reservados: " + riErr.message }, { status: 500 });
        }

        const reservedByItem: Record<string, number> = {};
        (ri ?? []).forEach((x: ReservationItemCheckRow) => {
          reservedByItem[x.item_id] = (reservedByItem[x.item_id] ?? 0) + x.qty;
        });

        const classesCount = classesForDate.length;
        for (const row of mat) {
          const it = (itemsData ?? []).find((i: ItemStockRow) => i.id === row.item_id);
          const total = it?.total_qty ?? 0;
          const already = reservedByItem[row.item_id] ?? 0;
          const remaining = Math.max(total - already, 0);
          const requested = row.qty * classesCount;
          if (requested > remaining) {
            return NextResponse.json(
              {
                error:
                  `Sem estoque para \"${it?.category} — ${it?.name}\". ` +
                  `Disponível: ${remaining}, solicitado: ${requested}. ` +
          `Data: ${dateISO} • Tempos ${dayStart}–${dayEnd}.`,
              },
              { status: 400 }
            );
          }
        }
      }

      for (const clsRaw of classesForDate) {
        const cls = String(clsRaw).trim();
        if (!cls) continue;

        const { data: newRes, error: insErr } = await supabaseAdmin
          .from("reservations")
          .insert({
            user_id: user.id,
            teacher_email: user.email ?? "publico@eeav",
            teacher_id,
            teacher_name: teacher_name ?? "Sem nome",
            school_class: cls,
            school_id,
            school_name: school_name ?? null,
            use_date: dateISO,
            start_period: dayStart,
            end_period: dayEnd,
            status: "active",
            other_item_name: other_item_name ?? null,
          })
          .select("id")
          .single();

        if (insErr || !newRes?.id) {
          return NextResponse.json({ error: "Erro ao criar reserva: " + (insErr?.message ?? "desconhecido") }, { status: 500 });
        }

        const payload = mat.map((r) => ({
          reservation_id: newRes.id,
          item_id: r.item_id,
          qty: r.qty,
        }));

        const { error: riErr } = await supabaseAdmin.from("reservation_items").insert(payload);
        if (riErr) {
          return NextResponse.json({ error: "Erro ao adicionar materiais: " + riErr.message }, { status: 500 });
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Falha ao processar a requisição." }, { status: 400 });
  }
}
