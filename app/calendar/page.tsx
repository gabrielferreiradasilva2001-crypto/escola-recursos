"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import { APP_BRAND_NAME } from "../../lib/branding";
import HomeTopButton from "../components/HomeTopButton";
import SchoolLogo from "../components/SchoolLogo";

type Item = {
  id: string;
  name: string;
  category: string;
  total_qty: number;
  school_id?: string | null;
};

type Teacher = {
  id: string;
  name: string;
  active: boolean;
  school_ids?: string[] | null;
  class_ids?: string[] | null;
};

type School = {
  id: string;
  name: string;
  active: boolean;
  logo_url?: string | null;
};

type ClassRow = {
  id: string;
  name: string;
  school_id: string;
  period: string;
  active: boolean;
};
type ShiftType = "matutino" | "vespertino";
type ClassOption = {
  value: string;
  label: string;
  period: ShiftType;
};

type Reservation = {
  id: string;
  user_id: string;
  teacher_email: string;
  teacher_name: string | null;
  teacher_id: string | null;
  school_class: string;
  school_id?: string | null;
  school_name?: string | null;
  use_date: string;
  start_period: number;
  end_period: number;
  status: string;
  other_item_name: string | null;
};

type ReservationItem = {
  reservation_id: string;
  item_id: string;
  qty: number;
};
type SearchReservationRow = {
  id: string;
  teacher_name: string | null;
  teacher_email: string | null;
  use_date: string;
  start_period: number;
  end_period: number;
  school_class: string;
  school_name?: string | null;
  status: string;
  resources?: string[];
};
type AvailabilityReservationRow = {
  id: string;
  start_period: number;
  end_period: number;
};
type ReservationItemUsageRow = {
  item_id: string;
  qty: number;
};
type UnifiedRow = {
  id: string;
  period: number;
  teacher: string;
  school_class: string;
  school_id: string | null;
  school_name?: string | null;
  items: string[];
};

type CellStatus = "free" | "partial" | "full" | "no-school";
type CellMode = "create" | "details";
type ReservationDuplicatePayload = {
  id: string;
  user_id: string;
  school_id: string | null;
  school_name: string | null;
  teacher_id: string | null;
  school_class: string;
  other_item_name: string | null;
};

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

// -------- Ícones (SVG inline) ----------
function IconPlus() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}
function IconTrash() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M4 7h16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M10 11v7M14 11v7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path
        d="M6 7l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path
        d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
function IconLogout() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M10 7V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-1"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M15 12H3m0 0 3-3m-3 3 3 3"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function IconCalendar() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M7 3v3M17 3v3" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M4 8h16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path
        d="M6 6h12a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function IconTeacher() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 20v-1a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v1"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function IconBox() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M21 8.5 12 13 3 8.5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M12 13v9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path
        d="M21 8.5v10a2 2 0 0 1-1.1 1.8l-7.8 3.9a2 2 0 0 1-1.8 0L2.5 20.3A2 2 0 0 1 1.4 18.5v-10a2 2 0 0 1 1.1-1.8l7.8-3.9a2 2 0 0 1 1.8 0l7.8 3.9A2 2 0 0 1 21 8.5Z"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function IconSearch() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path
        d="M21 21l-4.3-4.3"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ---------------- Helpers ----------------
function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function isSchoolDay(d: Date) {
  const wd = d.getDay();
  return wd >= 1 && wd <= 5;
}
function clampPeriodsSelected(periods: number[]) {
  return [...periods].sort((a, b) => a - b);
}
function rangeFromPeriods(periods: number[]) {
  const s = clampPeriodsSelected(periods);
  return { start: s[0], end: s[s.length - 1] };
}
function getClassShiftLabel(schoolClass: string): ShiftType | null {
  const normalized = String(schoolClass ?? "").toLowerCase();
  if (normalized.includes("vespertino")) return "vespertino";
  if (normalized.includes("matutino")) return "matutino";
  return null;
}
function pickDefaultItemId(list: Item[]) {
  const preferred = list.find((i) => i.name.trim().toLowerCase() === "sala de informática");
  return preferred?.id ?? list[0]?.id ?? "";
}
function splitMonth(ym: string) {
  const [y, m] = ym.split("-");
  return { year: Number(y), month: Number(m) };
}
function buildYM(year: number, month: number) {
  const mm = String(month).padStart(2, "0");
  return `${year}-${mm}`;
}
function formatDatePtBr(dateISO: string) {
  return new Date(dateISO + "T00:00:00").toLocaleDateString("pt-BR");
}

function schoolDisplayLabel(name?: string | null) {
  const raw = String(name ?? "").trim();
  if (!raw) return "Escola";
  const normalized = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (normalized.includes("antonio valadares") && normalized.includes("extens")) return "EEAV • Extensão";
  if (normalized.includes("antonio valadares") && (normalized.includes("sede") || normalized.includes("sed"))) {
    return "EEAV • SED";
  }

  const shortName = raw.replace(/^escola\s+(estadual|municipal)\s+/i, "").trim();
  const words = shortName
    .split(/\s+/)
    .map((w) => w.trim())
    .filter(Boolean)
    .filter((w) => !["de", "da", "do", "das", "dos", "e"].includes(w.toLowerCase()));
  const acronym = words.map((w) => w[0]?.toUpperCase() ?? "").join("").slice(0, 4);
  if (acronym.length >= 2) return `${shortName} - ${acronym}`;
  return shortName || raw;
}

function resourceBriefDescription(category: string, name: string) {
  const c = category.toLowerCase();
  const n = name.toLowerCase();
  if (c.includes("inform") || n.includes("notebook") || n.includes("computador") || n.includes("tablet")) {
    return "Apoio para aulas digitais, pesquisas e atividades em laboratório.";
  }
  if (c.includes("audio") || c.includes("video") || n.includes("caixa de som") || n.includes("microfone") || n.includes("projetor")) {
    return "Uso em apresentações, vídeos, eventos e reforço audiovisual em sala.";
  }
  if (c.includes("esport") || c.includes("educa") && n.includes("fis")) {
    return "Material para práticas corporais, jogos e atividades de educação física.";
  }
  if (c.includes("arte") || n.includes("pincel") || n.includes("tinta")) {
    return "Recursos para projetos criativos, oficinas e produções artísticas.";
  }
  if (c.includes("ciencia") || n.includes("microscop")) {
    return "Recurso de apoio para aulas práticas e experimentos pedagógicos.";
  }
  return "Recurso pedagógico para apoiar aulas e projetos da escola.";
}

export default function CalendarPage() {
  function normalizeUsername(input: string) {
    return input
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, ".")
      .replace(/[^a-z0-9._-]/g, "")
      .replace(/\.+/g, ".")
      .replace(/^\.|\.$/g, "");
  }
  const searchParams = useSearchParams();
  const todayISO = useMemo(() => toISODate(new Date()), []);

  // dados
  const [items, setItems] = useState<Item[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [allowedSchoolIds, setAllowedSchoolIds] = useState<string[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState("");
  const [selectedSchoolName, setSelectedSchoolName] = useState("");
  const [schoolsLoading, setSchoolsLoading] = useState(false);
  const [, setClassesLoading] = useState(false);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    const stored =
      typeof window !== "undefined" ? Number(localStorage.getItem("eeav_year") ?? "") : NaN;
    const year = Number.isFinite(stored) && stored >= 2026 ? stored : 2026;
    return `${year}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  // filtros
  const [allCategories, setAllCategories] = useState<string[]>(["Todos"]);
  const [categoryFilter, setCategoryFilter] = useState<string>("Todos");
  const [showResourcesPanel, setShowResourcesPanel] = useState(false);
  const [teacherSearch, setTeacherSearch] = useState<string>("");
  const [teacherQuery, setTeacherQuery] = useState("");

  const periodCount = useMemo(() => {
    const normalized = selectedSchoolName.toLowerCase();
    return normalized.includes("sede") || normalized.includes("sed") ? 6 : 5;
  }, [selectedSchoolName]);
  const schoolUnitLabel = useMemo(() => {
    const normalized = selectedSchoolName.toLowerCase();
    if (normalized.includes("extens")) return "Extensão";
    if (normalized.includes("sede") || normalized.includes("sed")) return "SED";
    return selectedSchoolName || "Escola";
  }, [selectedSchoolName]);
  const schoolCompactLabel = useMemo(
    () => schoolDisplayLabel(selectedSchoolName),
    [selectedSchoolName]
  );
  const periods = useMemo(
    () => Array.from({ length: periodCount }, (_, i) => i + 1),
    [periodCount]
  );

  // grid
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [grid, setGrid] = useState<Record<string, Record<string, CellStatus>>>({});
  const [dayStatus, setDayStatus] = useState<Record<string, CellStatus>>({});
  const [cellTooltip, setCellTooltip] = useState<Record<string, string>>({});
  const [reservedQtyMap, setReservedQtyMap] = useState<Record<string, Record<string, number>>>({});
  const [selectedItemTotalQty, setSelectedItemTotalQty] = useState(1);
  const [selectedCellKeys, setSelectedCellKeys] = useState<string[]>([]);

  // reservas por célula (para excluir só 1 tempo)
  const [cellResMap, setCellResMap] = useState<
    Record<
      string,
      {
        id: string;
        user_id: string;
        who: string;
        turma: string;
        school_name?: string | null;
        other?: string | null;
        start_period: number;
        end_period: number;
      }[]
    >
  >({});

  // ui
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [alertMsg, setAlertMsg] = useState("");
  const [searchTeacherName, setSearchTeacherName] = useState("");
  const [searchItemId, setSearchItemId] = useState("");
  const [searchDate, setSearchDate] = useState("");
  const [searchStatus, setSearchStatus] = useState("active");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchReservationRow[]>([]);
  const [searchMsg, setSearchMsg] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginUser, setLoginUser] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginMsg, setLoginMsg] = useState("");
  const [loginOk, setLoginOk] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showUnified, setShowUnified] = useState(false);
  const [showUnifiedFull, setShowUnifiedFull] = useState(false);
  const [showCalendarFull, setShowCalendarFull] = useState(false);
  const [showCalendarExpanded, setShowCalendarExpanded] = useState(false);
  const [showCalendarCardMode, setShowCalendarCardMode] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [unifiedDate, setUnifiedDate] = useState(todayISO);
  const [unifiedRows, setUnifiedRows] = useState<UnifiedRow[]>([]);
  const [unifiedLoading, setUnifiedLoading] = useState(false);
  const [unifiedMsg, setUnifiedMsg] = useState("");
  const unifiedBySchool = useMemo(() => {
    const map: Record<string, { name: string; rows: UnifiedRow[] }> = {};
    unifiedRows.forEach((r) => {
      const name =
        r.school_name ??
        schools.find((s) => s.id === r.school_id)?.name ??
        "Sem escola";
      if (!map[name]) map[name] = { name, rows: [] };
      map[name].rows.push(r);
    });
    return Object.values(map);
  }, [unifiedRows, schools]);

  // modal
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<CellMode>("create");
  const [formDate, setFormDate] = useState("");
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [teacherId, setTeacherId] = useState<string>("");
  const [defaultSchoolClass, setDefaultSchoolClass] = useState<string>("");
  const [bookingShift, setBookingShift] = useState<ShiftType>("matutino");
  const [calendarViewShift, setCalendarViewShift] = useState<ShiftType>("matutino");
  const [classByDatePeriod, setClassByDatePeriod] = useState<Record<string, Record<number, string>>>({});
  const [selectedPeriods, setSelectedPeriods] = useState<number[]>([1]);
  const [selectedPeriodsByDate, setSelectedPeriodsByDate] = useState<Record<string, number[]>>({});
  const [materialRows, setMaterialRows] = useState<{ item_id: string; qty: number }[]>([]);
  const [otherText, setOtherText] = useState<string>("");

  const [saving, setSaving] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // session
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [userTeacherId, setUserTeacherId] = useState<string>("");
  const [userDisplayName, setUserDisplayName] = useState<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("mutare_calendar_card_mode");
    if (saved === "1") {
      setShowCalendarCardMode(true);
      return;
    }
    if (saved === "0") {
      setShowCalendarCardMode(false);
      return;
    }
    if (window.innerWidth <= 560) setShowCalendarCardMode(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("mutare_calendar_card_mode", showCalendarCardMode ? "1" : "0");
  }, [showCalendarCardMode]);

  const getAccessToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user?.user_metadata?.force_password_change) {
      window.location.href = "/auth/first-login";
      return "";
    }
    return data.session?.access_token ?? "";
  }, []);

  const loadUnifiedDay = useCallback(async () => {
    if (!unifiedDate) {
      setUnifiedRows([]);
      setUnifiedMsg("Selecione uma data.");
      return;
    }
    setUnifiedLoading(true);
    setUnifiedMsg("");
    try {
      const token = await getAccessToken();
      if (!token) {
        setUnifiedRows([]);
        setUnifiedMsg(authReady ? "Faça login para carregar agendamentos." : "");
        return;
      }
      const res = await fetch("/api/reservations/unified", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ date: unifiedDate }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setUnifiedRows([]);
        setUnifiedMsg(payload?.error ?? "Erro ao carregar agendamentos.");
        return;
      }
      setUnifiedRows((payload?.data ?? []) as UnifiedRow[]);
    } catch {
      setUnifiedRows([]);
      setUnifiedMsg("Erro ao carregar agendamentos.");
    } finally {
      setUnifiedLoading(false);
    }
  }, [authReady, getAccessToken, unifiedDate]);

  useEffect(() => {
    if (!showUnified) return;
    void loadUnifiedDay();
  }, [showUnified, loadUnifiedDay]);

  const unifiedBody = (
    <div className="mt-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="text-xs font-extrabold text-slate-500">Data</label>
          <input
            type="date"
            value={unifiedDate}
            onChange={(e) => setUnifiedDate(e.target.value)}
            className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none"
          />
        </div>
        <div className="flex items-end">
          <button
            type="button"
            onClick={() => {
              setUnifiedDate(todayISO);
              loadUnifiedDay();
            }}
            className="h-10 w-full rounded-2xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 shadow-sm transition-all duration-200 hover:bg-slate-50"
          >
            Hoje
          </button>
        </div>
        <div className="flex items-end">
          <button
            type="button"
            onClick={loadUnifiedDay}
            className="h-10 w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-sky-500 px-3 text-xs font-black text-white shadow-sm transition-all duration-200 hover:-translate-y-[1px] hover:shadow-md"
          >
            {unifiedLoading ? "Carregando..." : "Atualizar"}
          </button>
        </div>
      </div>

      {unifiedMsg ? (
        <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3 text-xs font-bold text-slate-600">
          {unifiedMsg}
        </div>
      ) : null}

      {unifiedLoading ? (
        <div className="mt-3 text-xs font-bold text-slate-600">Carregando...</div>
      ) : unifiedRows.length ? (
        <div className="mt-4 grid gap-3">
          {unifiedBySchool.map((group) => (
            <div key={group.name} className="rounded-2xl border border-slate-200 bg-white p-3">
              <div className="text-xs font-extrabold text-slate-500">{group.name}</div>
              <div className="mt-2 grid gap-2">
                {group.rows.map((row) => (
                  <div
                    key={`${row.id}-${row.period}`}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-bold text-slate-700"
                  >
                    <div className="font-black text-slate-900">{row.teacher || "Sem nome"}</div>
                    <div className="mt-1">
                      {row.period}º tempo • {row.school_class || "Sem turma"}
                      {row.school_name ? ` • ${row.school_name}` : ""}
                    </div>
                    {row.items.length ? (
                      <div className="mt-2 text-[11px] text-slate-600">
                        {row.items.join(" • ")}
                      </div>
                    ) : (
                      <div className="mt-2 text-[11px] text-slate-500">Sem materiais</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-3 text-xs font-bold text-slate-600">
          Sem agendamentos para a data selecionada.
        </div>
      )}
    </div>
  );

  async function loadTeacherSchools(token?: string | null) {
    if (!token) {
      setAllowedSchoolIds([]);
      return [] as string[];
    }
    try {
      const res = await fetch("/api/teachers/me", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAllowedSchoolIds([]);
        return [] as string[];
      }
      const ids = (payload?.data?.school_ids ?? []) as string[];
      const next = ids.filter(Boolean);
      setAllowedSchoolIds(next);
      return next;
    } catch {
      setAllowedSchoolIds([]);
      return [] as string[];
    }
  }

  async function loadSchools(explicitAllowedSchoolIds?: string[]) {
    setSchoolsLoading(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        setSchools([]);
        setMsg(authReady ? "Faça login para carregar escolas." : "");
        return;
      }
      const res = await fetch("/api/schools/list", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg("Erro ao carregar escolas: " + (payload?.error ?? "desconhecido"));
        setSchools([]);
        return;
      }
      const list = (payload?.data ?? []) as School[];
      const scopeIds = explicitAllowedSchoolIds ?? allowedSchoolIds;
      const filtered = scopeIds.length
        ? list.filter((s) => scopeIds.includes(s.id))
        : list;
      setSchools(filtered);
      if (!selectedSchoolId || !filtered.some((s) => s.id === selectedSchoolId)) {
        if (!filtered.length) {
          setSelectedSchoolId("");
          setSelectedSchoolName("");
          if (!isAdmin) {
            setMsg("Você não possui escola vinculada. Fale com a gestão.");
          }
          return;
        }
        const preferredByScopeOrder = scopeIds
          .map((id) => filtered.find((s) => s.id === id))
          .find(Boolean);
        const chosen = preferredByScopeOrder ?? filtered[0];
        setSelectedSchoolId(chosen.id);
        setSelectedSchoolName(chosen.name);
      }
    } catch {
      setMsg("Erro ao carregar escolas.");
      setSchools([]);
    } finally {
      setSchoolsLoading(false);
    }
  }

  async function loadClassesForSchool(schoolId: string, year: number) {
    if (!schoolId) {
      setClasses([]);
      return;
    }
    setClassesLoading(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        setClasses([]);
        setMsg(authReady ? "Faça login para carregar turmas." : "");
        return;
      }
      const res = await fetch("/api/classes/list", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ year, school_id: schoolId }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg("Erro ao carregar turmas: " + (payload?.error ?? "desconhecido"));
        setClasses([]);
        return;
      }
      setClasses((payload?.data ?? []) as ClassRow[]);
    } catch {
      setMsg("Erro ao carregar turmas.");
      setClasses([]);
    } finally {
      setClassesLoading(false);
    }
  }

  async function loadItemsForSchool(schoolId: string) {
    if (!schoolId) {
      setItems([]);
      setAllCategories(["Todos"]);
      setSelectedItemId("");
      setMaterialRows([]);
      buildEmptyMonthGrid();
      return;
    }
    try {
      const token = await getAccessToken();
      if (!token) {
        setItems([]);
        setAllCategories(["Todos"]);
        setSelectedItemId("");
        setMaterialRows([]);
        setMsg(authReady ? "Faça login para carregar materiais." : "");
        buildEmptyMonthGrid();
        return;
      }
      const resItems = await fetch("/api/items/list", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ school_id: schoolId }),
      });
      const payloadItems = await resItems.json().catch(() => ({}));
      if (!resItems.ok) {
        if (isAuthenticated) {
          setMsg("Erro ao carregar itens: " + (payloadItems?.error ?? "desconhecido"));
        } else {
          setMsg("");
        }
        setItems([]);
        setAllCategories(["Todos"]);
        setSelectedItemId("");
        setMaterialRows([]);
        buildEmptyMonthGrid();
        return;
      }

      const listItems = (payloadItems?.data ?? []) as Item[];
      setItems(listItems);
      const cats = Array.from(new Set(listItems.map((i) => i.category))).sort();
      setAllCategories(["Todos", ...cats]);

      if (listItems.length) {
        const defaultItemId = pickDefaultItemId(listItems);
        setSelectedItemId(defaultItemId);
        setMaterialRows([{ item_id: defaultItemId, qty: 1 }]);
      } else {
        if (isAuthenticated) {
          setMsg("Nenhum item cadastrado para esta escola.");
        } else {
          setMsg("");
        }
        buildEmptyMonthGrid();
      }
    } catch {
      if (isAuthenticated) {
        setMsg("Erro ao carregar itens.");
      } else {
        setMsg("");
      }
      setItems([]);
      setAllCategories(["Todos"]);
      setSelectedItemId("");
      setMaterialRows([]);
      buildEmptyMonthGrid();
    }
  }

  async function refreshAdmin(session?: { access_token?: string } | null) {
    const token = session?.access_token ?? "";
    if (!token) {
      setIsAdmin(false);
      return;
    }
    try {
      const res = await fetch("/api/admin/me", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      setIsAdmin(!!data?.isAdmin);
    } catch {
      setIsAdmin(false);
    }
  }

  // trava scroll quando modal abre
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const filteredItems = useMemo(() => {
    if (categoryFilter === "Todos") return items;
    return items.filter((i) => i.category === categoryFilter);
  }, [items, categoryFilter]);
  const availableResources = useMemo(() => {
    return [...filteredItems]
      .filter((i) => Number(i.total_qty) > 0)
      .sort(
        (a, b) =>
          a.category.localeCompare(b.category, "pt-BR") ||
          a.name.localeCompare(b.name, "pt-BR")
      );
  }, [filteredItems]);
  const filteredTeachersForModal = useMemo(() => {
    const q = teacherQuery.trim().toLowerCase();
    if (!q) return teachers;
    return teachers.filter((t) => t.name.toLowerCase().includes(q));
  }, [teachers, teacherQuery]);

  const selectedTeacherClassIds = useMemo(() => {
    const teacher = teachers.find((t) => t.id === teacherId);
    return ((teacher?.class_ids ?? []) as string[]).filter(Boolean);
  }, [teachers, teacherId]);
  const classOptions = useMemo<ClassOption[]>(() => {
    const source = classes.filter((c) => selectedTeacherClassIds.includes(c.id));
    return source
      .filter((c) => c.active)
      .map((c) => {
        const rawPeriod = String(c.period ?? "").trim().toLowerCase();
        const normalizedPeriod: ShiftType = rawPeriod.startsWith("vesp") ? "vespertino" : "matutino";
        return {
          value: `${c.name} • ${normalizedPeriod}`,
          label: `${c.name} • ${normalizedPeriod}`,
          period: normalizedPeriod,
        };
      });
  }, [classes, selectedTeacherClassIds]);
  const availableShifts = useMemo<ShiftType[]>(() => {
    const set = new Set<ShiftType>();
    classOptions.forEach((opt) => set.add(opt.period));
    const ordered = (["matutino", "vespertino"] as ShiftType[]).filter((s) => set.has(s));
    return ordered.length ? ordered : ["matutino"];
  }, [classOptions]);
  useEffect(() => {
    if (availableShifts.includes(calendarViewShift)) return;
    setCalendarViewShift(availableShifts[0] ?? "matutino");
  }, [availableShifts, calendarViewShift]);
  const visibleClassOptions = useMemo(() => {
    return classOptions.filter((c) => c.period === bookingShift);
  }, [classOptions, bookingShift]);
  useEffect(() => {
    if (availableShifts.includes(bookingShift)) return;
    setBookingShift(availableShifts[0] ?? "matutino");
  }, [availableShifts, bookingShift]);
  useEffect(() => {
    setBookingShift(calendarViewShift);
    setSelectedCellKeys([]);
    setMsg("");
  }, [calendarViewShift]);
  useEffect(() => {
    if (!visibleClassOptions.length) {
      setDefaultSchoolClass("");
      return;
    }
    if (!visibleClassOptions.some((c) => c.value === defaultSchoolClass)) {
      setDefaultSchoolClass(visibleClassOptions[0].value);
    }
  }, [visibleClassOptions, defaultSchoolClass]);
  const hasClassOptions = classOptions.length > 0;
  const hasShiftClassOptions = visibleClassOptions.length > 0;
  const missingTeacherSelection = isAdmin && !teacherId;
  const missingTeacherClassBinding = !missingTeacherSelection && (!teacherId || selectedTeacherClassIds.length === 0);
  const noClassOptionsMessage = missingTeacherClassBinding
    ? "Professor sem turmas vinculadas no turno. Ajuste em Cadastros > Usuários."
    : missingTeacherSelection
    ? "Selecione o professor para carregar as turmas e horários disponíveis."
    : `Não há turmas cadastradas para o turno ${bookingShift} nesta escola e ano.`;
  const schoolLocked = schools.length === 1;
  const selectedCellSet = useMemo(() => new Set(selectedCellKeys), [selectedCellKeys]);
  const isDaySelected = useCallback(
    (dateISO: string) => selectedCellKeys.some((k) => k.startsWith(`${dateISO}-`)),
    [selectedCellKeys]
  );
  const [dragging, setDragging] = useState(false);
  const [dragMode, setDragMode] = useState<"add" | "remove" | null>(null);

  // carga inicial
  useEffect(() => {
    (async () => {
      const tempSession = localStorage.getItem("eeav_temp_session");
      if (tempSession && !sessionStorage.getItem("eeav_temp_session")) {
        await supabase.auth.signOut({ scope: "local" });
        localStorage.removeItem("eeav_temp_session");
      }
      const { data: session } = await supabase.auth.getSession();
      const currentSession = session.session;
      setIsAuthenticated(!!currentSession);
      if (currentSession?.user?.user_metadata?.force_password_change) {
        window.location.href = "/auth/first-login";
        return;
      }
      if (!currentSession) {
        setCurrentUserId("");
        setUserTeacherId("");
        setUserDisplayName("");
        setIsAdmin(false);
      }

      if (currentSession) {
        setCurrentUserId(currentSession.user.id);
        setUserTeacherId(String(currentSession.user.user_metadata?.teacher_id ?? ""));
        setUserDisplayName(String(currentSession.user.user_metadata?.name ?? ""));
        await refreshAdmin(currentSession);
      }

      try {
        const teacherHeaders: HeadersInit = { "Content-Type": "application/json" };
        if (currentSession?.access_token) {
          teacherHeaders.Authorization = `Bearer ${currentSession.access_token}`;
        }
        const res = await fetch("/api/teachers/list", {
          method: "POST",
          headers: teacherHeaders,
          body: JSON.stringify({}),
        });
        const payload = await res.json().catch(() => ({}));
        if (res.ok) {
          const listT = ((payload?.data ?? []) as Teacher[]).filter((t) => t.active);
          setTeachers(listT);
          if (!isAdmin) {
            const preferredId = userTeacherId && listT.some((t) => t.id === userTeacherId)
              ? userTeacherId
              : "";
            if (preferredId) {
              setTeacherId(preferredId);
            } else if (userDisplayName) {
              const match = listT.find(
                (t) => t.name.trim().toLowerCase() === userDisplayName.trim().toLowerCase()
              );
              if (match) setTeacherId(match.id);
            }
          }
          if (isAdmin && listT.length) setTeacherId(listT[0].id);
        } else {
          setMsg("Erro ao carregar professores: " + (payload?.error ?? "desconhecido"));
        }
      } catch {
        setMsg("Erro ao carregar professores.");
      }

      const scopedSchoolIds = await loadTeacherSchools(currentSession?.access_token ?? null);
      await loadSchools(scopedSchoolIds);
      setAuthReady(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setAuthReady(true);
        if (!session) {
          setIsAuthenticated(false);
          setCurrentUserId("");
          setUserTeacherId("");
          setUserDisplayName("");
          setIsAdmin(false);
          setAllowedSchoolIds([]);
          return;
        }
        if (session.user?.user_metadata?.force_password_change) {
          window.location.href = "/auth/first-login";
          return;
        }
        setIsAuthenticated(true);
        setCurrentUserId(session.user.id);
        setUserTeacherId(String(session.user.user_metadata?.teacher_id ?? ""));
        setUserDisplayName(String(session.user.user_metadata?.name ?? ""));
        refreshAdmin(session);
        void (async () => {
          const scopedSchoolIds = await loadTeacherSchools(session.access_token);
          await loadSchools(scopedSchoolIds);
        })();
        void loadMonthForSelectedItem();
      }
    );
    return () => {
      authListener.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // se troca filtro e item some, seleciona o primeiro
  useEffect(() => {
    if (!filteredItems.length) return;
    if (!selectedItemId || !filteredItems.some((i) => i.id === selectedItemId)) {
      const defaultItemId = pickDefaultItemId(filteredItems);
      setSelectedItemId(defaultItemId);
      setMaterialRows([{ item_id: defaultItemId, qty: 1 }]);
      setOtherText("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryFilter, items]);
  useEffect(() => {
    if (!filteredTeachersForModal.length) return;
    if (!isAdmin) return;
    if (!filteredTeachersForModal.some((t) => t.id === teacherId)) {
      setTeacherId(filteredTeachersForModal[0].id);
    }
  }, [filteredTeachersForModal, teacherId, isAdmin]);

  useEffect(() => {
    if (isAdmin) return;
    if (userTeacherId) {
      setTeacherId(userTeacherId);
      return;
    }
    if (teacherId || !userDisplayName || !teachers.length) return;
    const match = teachers.find(
      (t) => t.name.trim().toLowerCase() === userDisplayName.trim().toLowerCase()
    );
    if (match) setTeacherId(match.id);
  }, [isAdmin, userTeacherId, userDisplayName, teachers, teacherId]);

  // recarrega
  useEffect(() => {
    if (!selectedItemId) {
      buildEmptyMonthGrid();
      return;
    }
    loadMonthForSelectedItem();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedItemId, month, calendarViewShift]);

  function buildPeriodMap(status: CellStatus): Record<string, CellStatus> {
    const byPeriod: Record<string, CellStatus> = {};
    periods.forEach((p) => {
      byPeriod[String(p)] = status;
    });
    return byPeriod;
  }

  function buildEmptyMonthGrid() {
    const { year, month: mon } = splitMonth(month);
    const endDate = new Date(year, mon, 0);

    const newGrid: Record<string, Record<string, CellStatus>> = {};
    const newDayStatus: Record<string, CellStatus> = {};

    for (let d = 1; d <= endDate.getDate(); d++) {
      const dateObj = new Date(year, mon - 1, d);
      const iso = toISODate(dateObj);

      if (!isSchoolDay(dateObj)) {
        newGrid[iso] = buildPeriodMap("no-school");
        newDayStatus[iso] = "no-school";
        continue;
      }

      newGrid[iso] = buildPeriodMap("free");
      newDayStatus[iso] = "free";
    }

    setGrid(newGrid);
    setDayStatus(newDayStatus);
    setCellTooltip({});
    setCellResMap({});
    setLoading(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  async function handleLogin() {
    setLoginMsg("");
    setLoginOk(false);
    setLoginLoading(true);
    const rawLogin = loginUser.trim();
    const email = rawLogin.includes("@")
      ? rawLogin.toLowerCase()
      : `${normalizeUsername(rawLogin)}@local.eeav`;
    if (!email || email.startsWith("@")) {
      setLoginMsg("Usuário inválido.");
      setLoginLoading(false);
      return;
    }
    const { data: signInData, error } = await supabase.auth.signInWithPassword({
      email,
      password: loginPassword,
    });
    if (error) {
      setLoginMsg("Login inválido.");
      setLoginLoading(false);
      return;
    }

    const user = signInData?.session?.user ?? null;
    if (user?.user_metadata?.force_password_change) {
      setLoginLoading(false);
      setLoginOpen(false);
      window.location.href = "/auth/first-login";
      return;
    }

    setIsAuthenticated(!!user);
    setCurrentUserId(user?.id ?? "");
    if (rememberMe) {
      localStorage.removeItem("eeav_temp_session");
      sessionStorage.removeItem("eeav_temp_session");
    } else {
      localStorage.setItem("eeav_temp_session", "1");
      sessionStorage.setItem("eeav_temp_session", "1");
    }
    setLoginMsg("Login realizado!");
    setLoginOk(true);
    void loadMonthForSelectedItem();
    window.setTimeout(() => {
      setLoginLoading(false);
      setLoginOpen(false);
      setLoginPassword("");
      setLoginUser("");
      setLoginMsg("");
      setLoginOk(false);
    }, 400);
  }

  function statusPill(s: CellStatus) {
    if (s === "free") return { label: "Livre", bg: "rgba(22,163,74,0.18)", bd: "rgba(22,163,74,0.35)", tx: "#14532d" };
    if (s === "partial") return { label: "Parcial", bg: "rgba(14,165,233,0.18)", bd: "rgba(14,165,233,0.35)", tx: "#0c4a6e" };
    if (s === "full") return { label: "Lotado", bg: "rgba(239,68,68,0.16)", bd: "rgba(239,68,68,0.35)", tx: "#991b1b" };
    return { label: "Não letivo", bg: "rgba(100,116,139,0.20)", bd: "rgba(100,116,139,0.35)", tx: "#1e293b" };
  }

  function cellClass(s: CellStatus): CSSProperties {
    const base: CSSProperties = {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minWidth: 44,
      minHeight: 44,
      padding: "8px 10px",
      borderRadius: 12,
      fontWeight: 900,
      cursor: "pointer",
      userSelect: "none",
      touchAction: "manipulation",
      transition: "transform .08s ease, filter .15s ease, box-shadow .15s ease",
    };

    if (s === "free") {
      return {
        ...base,
        background: "rgba(22,163,74,0.18)",
        border: "1px solid rgba(22,163,74,0.35)",
        color: "#14532d",
        boxShadow: "0 10px 18px rgba(22,163,74,0.10)",
      };
    }
    if (s === "partial") {
      return {
        ...base,
        background: "rgba(14,165,233,0.18)",
        border: "1px solid rgba(14,165,233,0.35)",
        color: "#0c4a6e",
        boxShadow: "0 10px 18px rgba(14,165,233,0.10)",
      };
    }
    if (s === "full") {
      return {
        ...base,
        background: "rgba(239,68,68,0.16)",
        border: "1px solid rgba(239,68,68,0.35)",
        color: "#991b1b",
        boxShadow: "0 10px 18px rgba(239,68,68,0.10)",
      };
    }
    return {
      ...base,
      background: "rgba(100,116,139,0.20)",
      border: "1px solid rgba(100,116,139,0.35)",
      color: "#1e293b",
      cursor: "not-allowed",
    };
  }

  function cellIcon(s: CellStatus) {
    if (s === "free") return "✓";
    if (s === "partial") return "•";
    if (s === "full") return "×";
    return "—";
  }

  function cellResponsibleText(dateISO: string, period: number) {
    const tip = cellTooltip[`${dateISO}-${period}`];
    if (!tip) return null;

    const lines = tip.split("\n").filter(Boolean);

    if (teacherSearch.trim()) {
      const q = teacherSearch.trim().toLowerCase();
      const filtered = lines.filter((l) => l.toLowerCase().includes(q));
      if (!filtered.length) return null;
      const first = filtered[0];
      const extra = filtered.length > 1 ? `+${filtered.length - 1}` : "";
      return { first, extra, tip: filtered.join("\n") };
    }

    const first = lines[0];
    const extra = lines.length > 1 ? `+${lines.length - 1}` : "";
    return { first, extra, tip };
  }

  function isBlockedDate(dateISO: string) {
    if (!dateISO) return true;
    if (dateISO < todayISO) return true;
    return !isSchoolDay(new Date(dateISO + "T00:00:00"));
  }

  function updateCellSelection(keys: string[], mode: "add" | "remove") {
    setSelectedCellKeys((prev) => {
      const set = new Set(prev);
      keys.forEach((k) => {
        if (mode === "add") set.add(k);
        else set.delete(k);
      });
      return Array.from(set);
    });
  }

  function isSelectableCell(dateISO: string, period: number) {
    const status = grid[dateISO]?.[String(period)];
    return status === "free" || status === "partial";
  }

  function toggleDaySelection(dateISO: string) {
    if (!selectedSchoolId) {
      setMsg("Selecione a escola antes de agendar.");
      return;
    }
    if (!hasClassOptions) {
      setMsg(noClassOptionsMessage);
      return;
    }
    const keys = periods
      .filter((p) => isSelectableCell(dateISO, p))
      .map((p) => `${dateISO}-${p}`);
    if (!keys.length) {
      setMsg("Nenhum tempo disponível para este dia.");
      return;
    }
    if (keys.length < periods.length) {
      setMsg("Alguns tempos já estão ocupados e foram ignorados.");
    }
    const allSelected = keys.every((k) => selectedCellSet.has(k));
    updateCellSelection(keys, allSelected ? "remove" : "add");
  }

  function clearCellSelection() {
    setSelectedCellKeys([]);
  }

  function openSelectionModal() {
    if (!selectedCellKeys.length) return;
    if (!selectedSchoolId) {
      setMsg("Selecione a escola antes de agendar.");
      return;
    }
    if (!hasClassOptions) {
      setMsg(noClassOptionsMessage);
      return;
    }

    const dateMap: Record<string, number[]> = {};
    selectedCellKeys.forEach((key) => {
      const lastDash = key.lastIndexOf("-");
      const dateISO = key.slice(0, lastDash);
      const period = Number(key.slice(lastDash + 1));
      if (!dateMap[dateISO]) dateMap[dateISO] = [];
      if (!dateMap[dateISO].includes(period)) dateMap[dateISO].push(period);
    });
    Object.keys(dateMap).forEach((d) => dateMap[d].sort((a, b) => a - b));

    setMsg("");
    setMode("create");
    setFormDate("");
    setSelectedDates(Object.keys(dateMap));
    setSelectedPeriods([]);
    setSelectedPeriodsByDate(dateMap);
    setDefaultSchoolClass("");
    setClassByDatePeriod({});
    setOtherText("");

    if (!isAdmin) {
      if (userTeacherId) setTeacherId(userTeacherId);
    } else if (!teacherId && teachers.length) {
      setTeacherId(teachers[0].id);
    }
    if (!materialRows.length && items.length) setMaterialRows([{ item_id: items[0].id, qty: 1 }]);
    setOpen(true);
  }

  function openNewReservation() {
    if (!selectedSchoolId) {
      setMsg("Selecione a escola antes de agendar.");
      return;
    }
    if (!hasClassOptions) {
      setMsg(noClassOptionsMessage);
      return;
    }
    clearCellSelection();
    setMsg("");
    setMode("create");
    setFormDate("");
    setSelectedDates([]);
    setSelectedPeriods([1]);
    setSelectedPeriodsByDate({});
    setDefaultSchoolClass("");
    setClassByDatePeriod({});
    setOtherText("");
    if (!isAdmin) {
      if (userTeacherId) setTeacherId(userTeacherId);
    } else if (!teacherId && teachers.length) {
      setTeacherId(teachers[0].id);
    }
    if (!materialRows.length && items.length) setMaterialRows([{ item_id: items[0].id, qty: 1 }]);
    setOpen(true);
  }

  function openModalFromCell(dateISO: string, period: number) {
    setMsg("");
    clearCellSelection();
    setFormDate(dateISO);
    if (isBlockedDate(dateISO)) {
      setSelectedDates([]);
    } else {
      setSelectedDates([dateISO]);
    }
    setSelectedPeriods([period]);
    setSelectedPeriodsByDate({ [dateISO]: [period] });
    setDefaultSchoolClass("");
    setClassByDatePeriod({});
    setOtherText("");
    if (!isAdmin) {
      if (userTeacherId) setTeacherId(userTeacherId);
    } else if (!teacherId && teachers.length) {
      setTeacherId(teachers[0].id);
    }

    const cellKey = `${dateISO}-${period}`;
    const hasRes = (cellResMap[cellKey]?.length ?? 0) > 0;

    setMode(hasRes ? "details" : "create");
    if (!hasRes) {
      if (!materialRows.length && items.length) setMaterialRows([{ item_id: items[0].id, qty: 1 }]);
    }
    setOpen(true);
  }

  function togglePeriod(p: number) {
    setSelectedPeriods((prev) => {
      if (prev.includes(p)) return prev.filter((x) => x !== p);
      return [...prev, p];
    });
  }

  function togglePeriodForDate(dateISO: string, p: number) {
    setSelectedPeriodsByDate((prev) => {
      const current = prev[dateISO] ?? [];
      const next = current.includes(p)
        ? current.filter((x) => x !== p)
        : [...current, p].sort((a, b) => a - b);
      return { ...prev, [dateISO]: next };
    });
  }

  function addSelectedDate() {
    if (!formDate) return;
    if (formDate < todayISO) {
      setMsg("Data inválida: só é permitido a partir de hoje.");
      return;
    }
    if (!isSchoolDay(new Date(formDate + "T00:00:00"))) {
      setMsg("Data não letiva (só seg a sex).");
      return;
    }
    setMsg("");
    setSelectedDates((prev) => {
      if (prev.includes(formDate)) return prev;
      return [...prev, formDate].sort();
    });
    setSelectedPeriodsByDate((prev) => ({
      ...prev,
      [formDate]: prev[formDate]?.length ? prev[formDate] : [...selectedPeriods],
    }));
  }

  function removeSelectedDate(d: string) {
    setSelectedDates((prev) => prev.filter((x) => x !== d));
    setSelectedPeriodsByDate((prev) => {
      const next = { ...prev };
      delete next[d];
      return next;
    });
  }

  function addMaterialRow() {
    const first = filteredItems[0]?.id ?? items[0]?.id ?? "";
    setMaterialRows((prev) => [...prev, { item_id: first, qty: 1 }]);
  }

  function removeMaterialRow(index: number) {
    setMaterialRows((prev) => prev.filter((_, i) => i !== index));
  }

  function updateMaterialRow(index: number, patch: Partial<{ item_id: string; qty: number }>) {
    setMaterialRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
    if (index === 0 && patch.item_id) {
      setSelectedItemId(patch.item_id);
    }
  }

  function getClassForDatePeriod(dateISO: string, p: number) {
    const specific = classByDatePeriod[dateISO]?.[p];
    if (specific && specific.trim()) return specific.trim();
    if (defaultSchoolClass && defaultSchoolClass.trim()) return defaultSchoolClass.trim();
    return "";
  }

  function setClassForDatePeriod(dateISO: string, p: number, value: string) {
    setClassByDatePeriod((prev) => ({
      ...prev,
      [dateISO]: { ...(prev[dateISO] ?? {}), [p]: value },
    }));
  }

  function validateForm() {
    if (!selectedSchoolId) return "Selecione a escola.";
    if (!hasShiftClassOptions) return `Cadastre turmas para o turno ${bookingShift} antes de agendar.`;
    if (!selectedDates.length && !formDate) return "Selecione pelo menos 1 data.";
    if (!teacherId) {
      return isAdmin
        ? "Selecione o professor."
        : "Seu usuário não está vinculado a um professor. Peça ao admin para vincular.";
    }

    const selected = clampPeriodsSelected(selectedPeriods);
    if (selectedDates.length) {
      for (const d of selectedDates) {
        const perDay = selectedPeriodsByDate[d] ?? [];
        if (!perDay.length) return "Selecione pelo menos 1 tempo em cada dia.";
      }
    } else if (selected.length === 0) {
      return "Selecione pelo menos 1 tempo.";
    }

    const datesToCheck = selectedDates.length ? selectedDates : [formDate];
    for (const d of datesToCheck) {
      const perDay = selectedDates.length ? selectedPeriodsByDate[d] ?? [] : selected;
      for (const p of perDay) {
        if (!getClassForDatePeriod(d, p)) {
          return "Selecione a turma para cada tempo (ou defina uma turma padrão).";
        }
      }
    }
    const today = new Date();
    const todayISO = toISODate(today);
    for (const d of datesToCheck) {
      if (d < todayISO) return "Data inválida: só é permitido a partir de hoje.";
      if (!isSchoolDay(new Date(d + "T00:00:00"))) return "Data não letiva (só seg a sex).";
    }

    if (materialRows.length === 0) return "Adicione pelo menos 1 material.";
    for (const r of materialRows) {
      if (!r.item_id) return "Selecione o material em todas as linhas.";
      if (!r.qty || r.qty < 1) return "Quantidade deve ser >= 1.";
    }

    const ids = materialRows.map((r) => r.item_id);
    const unique = new Set(ids);
    if (unique.size !== ids.length) return "Não repita o mesmo material. Use quantidade na mesma linha.";

    const first = materialRows[0]?.item_id ? items.find((i) => i.id === materialRows[0].item_id) : null;
    if (first?.category === "Outros" && !otherText.trim()) return "Descreva o equipamento em 'Outros'.";

    return null;
  }

  function isPeriodBlocked(dateISO: string, p: number) {
    if (!dateISO) return false;
    return (reservedQtyMap[dateISO]?.[String(p)] ?? 0) >= selectedItemTotalQty;
  }

  async function checkAvailabilityBeforeSave(dateISO: string, startP: number, endP: number) {
    const dateLabel = formatDatePtBr(dateISO);
    const { data: reservations, error: resErr } = await supabase
      .from("reservations")
      .select("id,start_period,end_period,status")
      .eq("use_date", dateISO)
      .eq("school_id", selectedSchoolId)
      .eq("status", "active");

    if (resErr) return `Erro ao verificar reservas em ${dateLabel} (tempo ${startP}): ${resErr.message}`;

    const overlapping = (reservations ?? []).filter((r: AvailabilityReservationRow) => {
      const a1 = r.start_period;
      const a2 = r.end_period;
      return !(a2 < startP || a1 > endP);
    });

    if (!overlapping.length) return null;

    const ids = overlapping.map((r: AvailabilityReservationRow) => r.id);
    const itemIds = materialRows.map((r) => r.item_id);

    const { data: ri, error: riErr } = await supabase
      .from("reservation_items")
      .select("reservation_id,item_id,qty")
      .in("reservation_id", ids)
      .in("item_id", itemIds);

    if (riErr) return `Erro ao verificar itens reservados em ${dateLabel} (tempo ${startP}): ${riErr.message}`;

    const reservedByItem: Record<string, number> = {};
    (ri ?? []).forEach((x: ReservationItemUsageRow) => {
      reservedByItem[x.item_id] = (reservedByItem[x.item_id] ?? 0) + x.qty;
    });

    for (const row of materialRows) {
      const it = items.find((i) => i.id === row.item_id);
      const total = it?.total_qty ?? 0;
      const already = reservedByItem[row.item_id] ?? 0;
      const remaining = Math.max(total - already, 0);

      if (row.qty > remaining) {
        return `Conflito em ${dateLabel}, tempo ${startP}: "${it?.category} — ${it?.name}" com estoque insuficiente (disponível: ${remaining}, solicitado: ${row.qty}).`;
      }
    }
    return null;
  }

  async function duplicateReservationFromDetails(reservationId: string) {
    if (!reservationId) return;
    setDuplicating(true);
    setMsg("");
    try {
      const { data: reservation, error: reservationErr } = await supabase
        .from("reservations")
        .select("id,user_id,school_id,school_name,teacher_id,school_class,other_item_name")
        .eq("id", reservationId)
        .single();

      const reservationSafe = reservation as ReservationDuplicatePayload | null;
      if (reservationErr || !reservationSafe) {
        setMsg("Não foi possível duplicar esta reserva agora.");
        return;
      }
      if (!isAdmin && currentUserId && reservationSafe.user_id !== currentUserId) {
        setMsg("Você só pode duplicar reservas criadas por você.");
        return;
      }

      const { data: rows, error: rowsErr } = await supabase
        .from("reservation_items")
        .select("item_id,qty")
        .eq("reservation_id", reservationId);

      if (rowsErr) {
        setMsg("Não foi possível carregar os materiais da reserva.");
        return;
      }

      const rowsSafe = (rows ?? [])
        .map((r: { item_id: string; qty: number }) => ({
          item_id: r.item_id,
          qty: Number(r.qty) > 0 ? Number(r.qty) : 1,
        }))
        .filter((r) => items.some((i) => i.id === r.item_id));

      if (!rowsSafe.length) {
        setMsg("Não há materiais válidos para duplicar nesta reserva.");
        return;
      }

      const targetPeriod = selectedPeriods[0] ?? 1;
      const targetDate = formDate || todayISO;
      const nextTeacherId =
        reservationSafe.teacher_id && teachers.some((t) => t.id === reservationSafe.teacher_id)
          ? reservationSafe.teacher_id
          : teacherId || userTeacherId || "";

      if (reservationSafe.school_id) setSelectedSchoolId(reservationSafe.school_id);
      if (reservationSafe.school_name) setSelectedSchoolName(reservationSafe.school_name);
      if (nextTeacherId) setTeacherId(nextTeacherId);
      setDefaultSchoolClass(reservationSafe.school_class || "");
      setClassByDatePeriod({
        [targetDate]: { [targetPeriod]: reservationSafe.school_class || "" },
      });
      setSelectedDates([targetDate]);
      setSelectedPeriods([targetPeriod]);
      setSelectedPeriodsByDate({ [targetDate]: [targetPeriod] });
      setMaterialRows(rowsSafe);
      setSelectedItemId(rowsSafe[0]?.item_id ?? selectedItemId);
      setOtherText(reservationSafe.other_item_name ?? "");
      setMode("create");
      setMsg(`Reserva duplicada. Revise o resumo e confirme o novo agendamento para ${formatDatePtBr(targetDate)}.`);
    } catch {
      setMsg("Erro ao duplicar reserva.");
    } finally {
      setDuplicating(false);
    }
  }

  async function saveReservation() {
    const errorMsg = validateForm();
    if (errorMsg) {
      setMsg(errorMsg);
      return;
    }

    const datesToSave = selectedDates.length ? selectedDates : [formDate];
    const sel = clampPeriodsSelected(selectedPeriods);
    const { start, end } = rangeFromPeriods(sel);
    const perDayPeriods: Record<string, number[]> = {};
    if (selectedDates.length) {
      selectedDates.forEach((d) => {
        perDayPeriods[d] = selectedPeriodsByDate[d] ?? [];
      });
    } else if (formDate) {
      perDayPeriods[formDate] = sel;
    }

    setSaving(true);
    setMsg("");

    const t = teachers.find((x) => x.id === teacherId);
    const teacherName = t?.name ?? "Sem nome";

    const firstItem = materialRows[0]?.item_id ? items.find((i) => i.id === materialRows[0].item_id) : null;
    const isOther = firstItem?.category === "Outros";

    try {
      for (const d of datesToSave) {
        const dayPeriods = perDayPeriods[d] ?? [];
        for (const p of dayPeriods) {
          const availabilityError = await checkAvailabilityBeforeSave(d, p, p);
          if (availabilityError) {
            setMsg(availabilityError);
            setAlertMsg(availabilityError);
            setSaving(false);
            setTimeout(() => setAlertMsg(""), 3500);
            return;
          }
        }
      }

      const token = await getAccessToken();
      if (!token) {
        setSaving(false);
        setMsg("Faça login para agendar.");
        return;
      }

      const classesByDatePeriod: Record<string, Record<number, string>> = {};
      for (const d of datesToSave) {
        classesByDatePeriod[d] = classesByDatePeriod[d] ?? {};
        const dayPeriods = perDayPeriods[d] ?? [];
        for (const p of dayPeriods) {
          const cls = getClassForDatePeriod(d, p);
          if (cls) classesByDatePeriod[d][p] = cls;
        }
      }

      const res = await fetch("/api/reservations/create", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          teacher_id: teacherId,
          teacher_name: teacherName,
          school_id: selectedSchoolId,
          school_name: selectedSchoolName,
          default_school_class: defaultSchoolClass || null,
          classes_by_date_period: classesByDatePeriod,
          dates: datesToSave,
          start_period: start,
          end_period: end,
          per_day_periods: perDayPeriods,
          material_rows: materialRows,
          other_item_name: isOther ? (otherText.trim() || null) : null,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaving(false);
        setMsg(data?.error ?? "Erro ao salvar agendamento.");
        return;
      }
    } catch {
      setSaving(false);
      setMsg("Erro ao salvar agendamento.");
      return;
    }

    setOpen(false);
    setSaving(false);
    setSuccessMsg(datesToSave.length > 1 ? `Agendamentos realizados: ${datesToSave.length}` : "Agendamento realizado com sucesso!");
    setTimeout(() => setSuccessMsg(""), 4000);
    await loadMonthForSelectedItem();
  }

  async function runSearch() {
    setSearchLoading(true);
    setSearchMsg("");
    setSearchResults([]);

    try {
      const token = await getAccessToken();
      if (!token) {
        setSearchMsg("Faça login para buscar reservas.");
        setSearchLoading(false);
        return;
      }

      const res = await fetch("/api/reservations/search", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          teacher_name: searchTeacherName.trim(),
          item_id: searchItemId,
          use_date: searchDate,
          status: searchStatus,
          school_id: selectedSchoolId,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSearchMsg(payload?.error ?? "Erro ao buscar reservas.");
        setSearchLoading(false);
        return;
      }
      setSearchResults(payload?.results ?? []);
    } catch {
      setSearchMsg("Erro ao buscar reservas.");
    } finally {
      setSearchLoading(false);
    }
  }

  function clearSearch() {
    setSearchTeacherName("");
    setSearchItemId("");
    setSearchDate("");
    setSearchStatus("active");
    setSearchResults([]);
    setSearchMsg("");
  }

  // Cancelar reserva inteira (histórico)
  async function cancelReservationWhole(reservationId: string) {
    const ok = window.confirm("Excluir a RESERVA INTEIRA? (todos os tempos desse registro)");
    if (!ok) return;

    setDeleting(true);
    setMsg("");

    try {
      const token = await getAccessToken();
      if (!token) {
        setDeleting(false);
        setMsg("Faça login para cancelar.");
        return;
      }

      const res = await fetch("/api/reservations/cancel-whole", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reservation_id: reservationId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDeleting(false);
        const errMsg = data?.error ?? "desconhecido";
        setMsg("Erro ao excluir: " + errMsg);
        if (String(errMsg).toLowerCase().includes("acesso restrito")) {
          setAlertMsg("Você só pode excluir registros feitos por você.");
          setTimeout(() => setAlertMsg(""), 3500);
        }
        return;
      }
    } catch {
      setDeleting(false);
      setMsg("Erro ao excluir.");
      return;
    }

    setDeleting(false);
    setOpen(false);
    await loadMonthForSelectedItem();
  }

  async function cancelOnlyThisPeriod(reservationId: string, periodToRemove: number) {
    const ok = window.confirm(`Excluir somente o tempo ${periodToRemove} deste registro?`);
    if (!ok) return;

    setDeleting(true);
    setMsg("");
    try {
      const token = await getAccessToken();
      if (!token) {
        setDeleting(false);
        setMsg("Faça login para cancelar.");
        return;
      }

      const res = await fetch("/api/reservations/cancel-period", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reservation_id: reservationId, period: periodToRemove }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDeleting(false);
        const errMsg = data?.error ?? "desconhecido";
        setMsg("Erro ao ajustar reserva: " + errMsg);
        if (String(errMsg).toLowerCase().includes("acesso restrito")) {
          setAlertMsg("Você só pode excluir registros feitos por você.");
          setTimeout(() => setAlertMsg(""), 3500);
        }
        return;
      }
    } catch {
      setDeleting(false);
      setMsg("Erro ao ajustar reserva.");
      return;
    }

    setDeleting(false);
    setOpen(false);
    await loadMonthForSelectedItem();
  }

  async function loadMonthForSelectedItem() {
    setLoading(true);
    setMsg("");

    if (!selectedItemId) {
      setLoading(false);
      return;
    }

    const { year, month: mon } = splitMonth(month);
    const startDate = new Date(year, mon - 1, 1);
    const endDate = new Date(year, mon, 0);

    let reservations: Reservation[] = [];
    let itemsUsed: ReservationItem[] = [];

    try {
      const token = await getAccessToken();
      if (!token) {
        setLoading(false);
        setMsg(authReady ? "Faça login para carregar reservas." : "");
        return;
      }
      const res = await fetch("/api/reservations/list", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          start_date: toISODate(startDate),
          end_date: toISODate(endDate),
          item_id: selectedItemId,
          school_id: selectedSchoolId,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLoading(false);
        setMsg("Erro ao carregar reservas: " + (payload?.error ?? "desconhecido"));
        return;
      }
      reservations = payload?.reservations ?? [];
      itemsUsed = (payload?.itemsUsed ?? []) as ReservationItem[];
    } catch {
      setLoading(false);
      setMsg("Erro ao carregar reservas.");
      return;
    }

    const filteredReservations = (reservations ?? []).filter((r: Reservation) => {
      const shift = getClassShiftLabel(r.school_class);
      if (!shift) return calendarViewShift === "matutino";
      return shift === calendarViewShift;
    });

    const selected = items.find((i) => i.id === selectedItemId);
    const totalQty = selected?.total_qty ?? 1;

    const byResId = new Map<string, Reservation>();
    filteredReservations.forEach((r: Reservation) => byResId.set(r.id, r));

    const reservedQty: Record<string, Record<string, number>> = {};
    const tooltipMap: Record<string, string> = {};
    const cellMap: Record<
      string,
      {
        id: string;
        user_id: string;
        who: string;
        turma: string;
        other?: string | null;
        start_period: number;
        end_period: number;
      }[]
    > = {};

    for (const use of itemsUsed) {
      const r = byResId.get(use.reservation_id);
      if (!r) continue;

      const who = r.teacher_name?.trim() ? r.teacher_name.trim() : r.teacher_email ?? "sem-email";
      const extra = r.other_item_name ? ` • ${r.other_item_name}` : "";
      const schoolLabel = r.school_name ? ` • ${r.school_name}` : "";
      const line = `${who} • ${r.school_class}${schoolLabel}${extra}`;

      for (let p = r.start_period; p <= r.end_period; p++) {
        const keyDate = r.use_date;
        reservedQty[keyDate] ??= {};
        reservedQty[keyDate][String(p)] = (reservedQty[keyDate][String(p)] ?? 0) + use.qty;

        const cellKey = `${keyDate}-${p}`;

        tooltipMap[cellKey] = tooltipMap[cellKey] ? `${tooltipMap[cellKey]}\n${line}` : line;

        cellMap[cellKey] ??= [];
        cellMap[cellKey].push({
          id: r.id,
          user_id: r.user_id,
          who,
          turma: r.school_class,
          school_name: r.school_name ?? null,
          other: r.other_item_name,
          start_period: r.start_period,
          end_period: r.end_period,
        });
      }
    }

    const newGrid: Record<string, Record<string, CellStatus>> = {};
    const newDayStatus: Record<string, CellStatus> = {};

    for (let d = 1; d <= endDate.getDate(); d++) {
      const dateObj = new Date(year, mon - 1, d);
      const iso = toISODate(dateObj);

      if (!isSchoolDay(dateObj)) {
        newGrid[iso] = buildPeriodMap("no-school");
        newDayStatus[iso] = "no-school";
        continue;
      }

      let fullCount = 0;
      newGrid[iso] = {};

      for (const p of periods) {
        const qtyReserved = reservedQty[iso]?.[String(p)] ?? 0;
        const available = Math.max(totalQty - qtyReserved, 0);

        if (available <= 0) {
          newGrid[iso][String(p)] = "full";
          fullCount++;
        } else if (qtyReserved > 0) {
          newGrid[iso][String(p)] = "partial";
        } else {
          newGrid[iso][String(p)] = "free";
        }
      }

      if (fullCount === periods.length) newDayStatus[iso] = "full";
      else if (fullCount === 0) newDayStatus[iso] = "free";
      else newDayStatus[iso] = "partial";
    }

    setGrid(newGrid);
    setDayStatus(newDayStatus);
    setCellTooltip(tooltipMap);
    setCellResMap(cellMap);
    setReservedQtyMap(reservedQty);
    setSelectedItemTotalQty(totalQty);
    setLoading(false);
  }

  const { year, month: m } = splitMonth(month);
  const years = useMemo(() => {
    const current = new Date().getFullYear();
    const start = 2026;
    const end = Math.max(current, start);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, []);
  useEffect(() => {
    if (!selectedSchoolId) return;
    void loadClassesForSchool(selectedSchoolId, year);
    void loadItemsForSchool(selectedSchoolId);
    setDefaultSchoolClass("");
    setClassByDatePeriod({});
    clearCellSelection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSchoolId, year]);

  useEffect(() => {
    const stopDragging = () => {
      setDragging(false);
      setDragMode(null);
    };
    window.addEventListener("mouseup", stopDragging);
    window.addEventListener("touchend", stopDragging);
    window.addEventListener("touchcancel", stopDragging);
    return () => {
      window.removeEventListener("mouseup", stopDragging);
      window.removeEventListener("touchend", stopDragging);
      window.removeEventListener("touchcancel", stopDragging);
    };
  }, []);
  useEffect(() => {
    if (!selectedSchoolId) return;
    const s = schools.find((sc) => sc.id === selectedSchoolId);
    if (s) setSelectedSchoolName(s.name);
  }, [selectedSchoolId, schools]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!selectedSchoolId) return;
    localStorage.setItem("mutare_selected_school_id", selectedSchoolId);
  }, [selectedSchoolId]);
  useEffect(() => {
    const fromQuery = Number(searchParams.get("year") ?? "");
    const fromStorage = Number(
      typeof window !== "undefined" ? localStorage.getItem("eeav_year") ?? "" : ""
    );
    const current = new Date().getFullYear();
    const picked =
      Number.isFinite(fromQuery) && fromQuery >= 2026
        ? Math.min(fromQuery, current)
        : Number.isFinite(fromStorage) && fromStorage >= 2026
        ? Math.min(fromStorage, current)
        : 2026;
    setMonth(buildYM(picked, m));
  }, [searchParams, m]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("eeav_year", String(year));
  }, [year]);
  const selectedItem = items.find((x) => x.id === selectedItemId);
  const selectedTeacher = teachers.find((x) => x.id === teacherId);
  const selectedTeacherName =
    selectedTeacher?.name || userDisplayName || "Professor não vinculado";

  const modalFirstItem = materialRows[0]?.item_id ? items.find((i) => i.id === materialRows[0].item_id) : null;
  const isModalOther = modalFirstItem?.category === "Outros";
  const modalDatesPreview =
    selectedDates.length > 0
      ? selectedDates
      : formDate && !isBlockedDate(formDate)
      ? [formDate]
      : [];
  const summaryPeriodsByDate = useMemo(() => {
    if (selectedDates.length) return selectedPeriodsByDate;
    if (!formDate) return {};
    return { [formDate]: clampPeriodsSelected(selectedPeriods) };
  }, [selectedDates, selectedPeriodsByDate, formDate, selectedPeriods]);
  const summaryMaterials = useMemo(() => {
    return materialRows
      .map((row) => {
        const item = items.find((i) => i.id === row.item_id);
        if (!item) return null;
        return { label: `${item.category} — ${item.name}`, qty: row.qty };
      })
      .filter((x): x is { label: string; qty: number } => !!x);
  }, [materialRows, items]);
  const cardSurface: CSSProperties = {
    background: "rgba(241, 250, 246, 0.82)",
    border: "1px solid rgba(15,23,42,0.10)",
    borderRadius: 22,
    boxShadow: "0 18px 50px rgba(15,23,42,0.14)",
    backdropFilter: "blur(12px)",
  };
  const modalSection: CSSProperties = {
    background: "rgba(255,255,255,0.90)",
    border: "1px solid rgba(15,23,42,0.08)",
    borderRadius: 16,
    padding: 12,
    boxShadow: "0 10px 24px rgba(15,23,42,0.08)",
  };
  const motionCard: CSSProperties = { animation: "floatIn .45s ease both" };
  const softBorder = "1px solid rgba(15,23,42,0.10)";
  const sortedDates = useMemo(() => Object.keys(grid).sort(), [grid]);
  const datesToRender =
    showCalendarExpanded || showCalendarFull ? sortedDates : sortedDates.slice(0, 8);
  const calendarTableMinWidth = showCalendarFull ? 0 : 980;
  const calendarTable = (
    <div
      className={showCalendarFull ? "calendar-table calendar-full" : "calendar-table"}
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        borderRadius: 22,
        border: softBorder,
        background: "rgba(255,255,255,0.94)",
        overflow: "hidden",
        boxShadow: "0 18px 44px rgba(15,23,42,0.12)",
        ...motionCard,
      }}
    >
      <div className="calendar-table-scroll" style={{ overflow: "auto" }}>
        <table
          className="calendar-grid-table"
          style={{
            width: "100%",
            borderCollapse: "collapse",
            minWidth: calendarTableMinWidth ? calendarTableMinWidth : "100%",
          }}
        >
          <thead>
            <tr
              style={{
                background:
                  "linear-gradient(90deg, rgba(16,185,129,0.18), rgba(14,165,233,0.16), rgba(16,185,129,0.10))",
                borderBottom: "1px solid rgba(15,23,42,0.08)",
              }}
            >
              <th className="th th-sticky-col">Data</th>
              <th className="th">Dia</th>
              {periods.map((p) => (
                <th key={p} className="th">
                  Tempo {p}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {datesToRender.map((d, idx) => {
                const wd = new Date(d + "T00:00:00").toLocaleDateString("pt-BR", {
                  weekday: "short",
                });
                const dayP = statusPill(dayStatus[d]);
                const isToday = d === todayISO;

                return (
                  <tr
                    key={d}
                    style={{
                      borderTop: "1px solid rgba(15,23,42,0.06)",
                      background: idx % 2 === 0 ? "rgba(2,6,23,0.012)" : "transparent",
                      outline: isToday ? "2px solid rgba(14,165,233,0.28)" : "none",
                      outlineOffset: "-2px",
                    }}
                  >
                    <td
                      className="td-sticky-col"
                      style={{ padding: 12, textAlign: "center", fontWeight: 1000, color: "#0f172a", cursor: "pointer" }}
                      onClick={() => toggleDaySelection(d)}
                      title="Clique para selecionar o dia inteiro"
                    >
                      {new Date(d + "T00:00:00").toLocaleDateString("pt-BR")}
                      {isToday && (
                        <span
                          style={{
                            marginLeft: 8,
                            padding: "4px 10px",
                            borderRadius: 999,
                            fontWeight: 1000,
                            fontSize: 11,
                            border: "1px solid rgba(16,185,129,0.24)",
                            background: "rgba(16,185,129,0.10)",
                            color: "#065f46",
                          }}
                        >
                          HOJE
                        </span>
                      )}
                      {isDaySelected(d) ? (
                        <span
                          style={{
                            marginLeft: 8,
                            padding: "3px 8px",
                            borderRadius: 999,
                            fontWeight: 1000,
                            fontSize: 10,
                            border: "1px solid rgba(14,165,233,0.35)",
                            background: "rgba(14,165,233,0.12)",
                            color: "#0b5f85",
                          }}
                        >
                          SELECIONADO
                        </span>
                      ) : null}
                      <div style={{ marginTop: 6, display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleDaySelection(d);
                          }}
                          style={{
                            borderRadius: 999,
                            border: "1px solid rgba(14,165,233,0.3)",
                            background: "rgba(14,165,233,0.08)",
                            minHeight: 44,
                            minWidth: 44,
                            padding: "8px 12px",
                            fontSize: 11,
                            fontWeight: 900,
                            cursor: "pointer",
                            color: "#0f172a",
                          }}
                          title="Selecionar o dia inteiro"
                        >
                          Dia
                        </button>
                      </div>
                    </td>

                    <td style={{ padding: 12, textAlign: "center" }}>
                      <div style={{ display: "grid", gap: 6, justifyItems: "center" }}>
                        <span
                          style={{
                            padding: "6px 12px",
                            borderRadius: 999,
                            fontWeight: 1000,
                            background: dayP.bg,
                            border: `1px solid ${dayP.bd}`,
                            color: dayP.tx,
                          }}
                        >
                          {dayP.label}
                        </span>
                        <span style={{ fontSize: 12, color: "#64748b", fontWeight: 1000 }}>{wd}</span>
                      </div>
                    </td>

                    {periods.map((p) => {
                      const status = grid[d][String(p)];
                      const clickable = status !== "no-school";
                      const info = cellResponsibleText(d, p);
                      const hasRes = (cellResMap[`${d}-${p}`]?.length ?? 0) > 0;

                      const title = info?.tip
                        ? `Agendado por:\n${info.tip}\n\nClique para ver detalhes/excluir`
                        : clickable
                        ? "Clique para agendar"
                        : "Não letivo";

                      return (
                        <td key={p} style={{ padding: 12, textAlign: "center", verticalAlign: "middle" }}>
                          <div style={{ display: "grid", gap: 6, justifyItems: "center" }}>
                            <span
                              className="calendar-cell-btn"
                              data-cell-key={`${d}|${p}`}
                              style={{
                                ...cellClass(status),
                                ...(selectedCellSet.has(`${d}-${p}`)
                                  ? {
                                      boxShadow: "0 0 0 2px rgba(14,165,233,0.9)",
                                      background: "rgba(14,165,233,0.12)",
                                    }
                                  : {}),
                              }}
                              title={title}
                              onMouseDown={(e) => {
                                if (!clickable) return;
                                if (hasRes || status === "full") {
                                  openModalFromCell(d, p);
                                  return;
                                }
                                if (!selectedSchoolId) {
                                  setMsg("Selecione a escola antes de agendar.");
                                  return;
                                }
                                if (!hasClassOptions) {
                                  setMsg(noClassOptionsMessage);
                                  return;
                                }
                                if (isBlockedDate(d)) {
                                  setMsg("Data não letiva ou inválida.");
                                  return;
                                }
                                if (!isSelectableCell(d, p)) return;
                                e.preventDefault();
                                const key = `${d}-${p}`;
                                const willAdd = !selectedCellSet.has(key);
                                setDragMode(willAdd ? "add" : "remove");
                                setDragging(true);
                                updateCellSelection([key], willAdd ? "add" : "remove");
                              }}
                              onMouseEnter={() => {
                                if (!dragging || !dragMode) return;
                                if (!isSelectableCell(d, p)) return;
                                const key = `${d}-${p}`;
                                updateCellSelection([key], dragMode);
                              }}
                              onPointerDown={(e) => {
                                if (e.pointerType !== "touch") return;
                                if (!clickable) return;
                                if (hasRes || status === "full") {
                                  openModalFromCell(d, p);
                                  return;
                                }
                                if (!selectedSchoolId) {
                                  setMsg("Selecione a escola antes de agendar.");
                                  return;
                                }
                                if (!hasClassOptions) {
                                  setMsg(noClassOptionsMessage);
                                  return;
                                }
                                if (isBlockedDate(d)) {
                                  setMsg("Data não letiva ou inválida.");
                                  return;
                                }
                                if (!isSelectableCell(d, p)) return;
                                const key = `${d}-${p}`;
                                const willAdd = !selectedCellSet.has(key);
                                updateCellSelection([key], willAdd ? "add" : "remove");
                                e.preventDefault();
                              }}
                            >
                              {cellIcon(status)}
                            </span>
                            {info?.first ? (
                              <div
                                className="calendar-cell-owner"
                                style={{
                                  fontSize: 10,
                                  fontWeight: 900,
                                  color: "#0f172a",
                                  maxWidth: 90,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                                title={info.tip ? `Responsável: ${info.tip}` : `Responsável: ${info.first}`}
                              >
                                {info.first}
                              </div>
                            ) : null}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
  const fullScreenMobileCards = (
    <div className="calendar-fullscreen-mobile-cards">
      {datesToRender.map((d) => {
        const wd = new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "short" });
        const dayP = statusPill(dayStatus[d]);
        const isToday = d === todayISO;
        return (
          <div key={`mobile-card-${d}`} className="calendar-mobile-day-card">
            <div className="calendar-mobile-day-head">
              <div className="calendar-mobile-day-date">
                {new Date(d + "T00:00:00").toLocaleDateString("pt-BR")}
                {isToday ? <span className="calendar-mobile-day-today">HOJE</span> : null}
              </div>
              <div className="calendar-mobile-day-badges">
                <span
                  style={{
                    padding: "5px 10px",
                    borderRadius: 999,
                    fontWeight: 1000,
                    fontSize: 12,
                    background: dayP.bg,
                    border: `1px solid ${dayP.bd}`,
                    color: dayP.tx,
                  }}
                >
                  {dayP.label}
                </span>
                <span className="calendar-mobile-day-weekday">{wd}</span>
              </div>
            </div>
            <details className="calendar-mobile-day-details" open={showCalendarFull}>
              <summary className="calendar-mobile-day-summary-toggle">Detalhes do dia</summary>
              <div className="calendar-mobile-period-grid">
                {periods.map((p) => {
                const status = grid[d][String(p)];
                const clickable = status !== "no-school";
                const info = cellResponsibleText(d, p);
                const hasRes = (cellResMap[`${d}-${p}`]?.length ?? 0) > 0;
                const key = `${d}-${p}`;
                const selected = selectedCellSet.has(key);
                return (
                  <button
                    key={`mobile-cell-${d}-${p}`}
                    type="button"
                    className="calendar-mobile-period-btn"
                    onClick={() => {
                      if (!clickable) return;
                      if (hasRes || status === "full") {
                        openModalFromCell(d, p);
                        return;
                      }
                      if (!selectedSchoolId) {
                        setMsg("Selecione a escola antes de agendar.");
                        return;
                      }
                      if (!hasClassOptions) {
                        setMsg(noClassOptionsMessage);
                        return;
                      }
                      if (isBlockedDate(d) || !isSelectableCell(d, p)) return;
                      updateCellSelection([key], selected ? "remove" : "add");
                    }}
                    title={info?.tip || `Tempo ${p}`}
                  >
                    <span
                      style={{
                        ...cellClass(status),
                        ...(selected
                          ? {
                              boxShadow: "0 0 0 2px rgba(14,165,233,0.9)",
                              background: "rgba(14,165,233,0.12)",
                            }
                          : {}),
                      }}
                    >
                      {cellIcon(status)}
                    </span>
                    <span className="calendar-mobile-period-label">Tempo {p}</span>
                    <span className="calendar-mobile-period-info">{info?.first || "—"}</span>
                  </button>
                );
                })}
              </div>
            </details>
          </div>
        );
      })}
    </div>
  );

  return (
    <main
      className="calendar-page mutare-page-bg"
      style={{
        minHeight: "100vh",
        padding: 18,
        paddingBottom: 24,
        color: "#0f172a",
        fontFamily:
          '"IBM Plex Sans", "Inter", "Plus Jakarta Sans", ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial',
      }}
    >
      <HomeTopButton />
      {successMsg && (
        <div
          className="toast-success"
          style={{
            position: "fixed",
            top: 14,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 99999,
            background: "linear-gradient(135deg, rgba(16,185,129,0.18), rgba(16,185,129,0.08))",
            border: "1px solid rgba(16,185,129,0.35)",
            color: "#065f46",
            padding: "10px 16px",
            borderRadius: 14,
            fontWeight: 900,
            boxShadow: "0 16px 30px rgba(16,185,129,0.18)",
            display: "flex",
            alignItems: "center",
            gap: 10,
            maxWidth: "min(92vw, 680px)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/agendamento.png" alt="" style={{ height: 26, width: "auto", display: "block" }} />
          {successMsg}
        </div>
      )}
      {alertMsg && (
        <div
          className="toast-alert"
          style={{
            position: "fixed",
            top: 62,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 100000,
            background: "rgba(239,68,68,0.92)",
            border: "1px solid rgba(127,29,29,0.4)",
            color: "#fff",
            padding: "10px 16px",
            borderRadius: 14,
            fontWeight: 900,
            boxShadow: "0 16px 30px rgba(127,29,29,0.35)",
            display: "flex",
            alignItems: "center",
            gap: 10,
            maxWidth: "min(92vw, 680px)",
          }}
        >
          <IconTrash />
          {alertMsg}
        </div>
      )}

      {/* ✅ HEADER (compacto, sem sobreposição) */}
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto 12px auto",
          ...cardSurface,
          border: softBorder,
          padding: 14,
          position: "relative",
          overflow: "hidden",
          ...motionCard,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(90deg, rgba(16,185,129,0.16), rgba(14,165,233,0.10), rgba(16,185,129,0.12))",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: 'url("/back-sala.png")',
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: 0.18,
            filter: "saturate(0.9) contrast(1.05)",
          }}
        />

        <div style={{ position: "relative" }}>
          <div
            className="topbar"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 2fr 1fr",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Link
                href="/portal"
                title="Voltar ao Portal"
                style={{
                  padding: 6,
                  borderRadius: 16,
                  border: "1px solid rgba(15,23,42,0.10)",
                  background: "rgba(255,255,255,0.92)",
                  boxShadow: "0 12px 24px rgba(15,23,42,0.10)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <SchoolLogo schoolId={selectedSchoolId || undefined} size={54} />
              </Link>

              <div className="extlabel" style={{ display: "grid", gap: 2 }}>
                <div style={{ fontSize: 12, fontWeight: 1000, color: "#0f172a" }}>Acesso institucional</div>
              </div>
            </div>

            <div style={{ textAlign: "center" }}>
              <div className="hero-chips" style={{ display: "inline-flex", gap: 10, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
                <span
                  style={{
                    display: "inline-flex",
                    gap: 8,
                    alignItems: "center",
                    padding: "6px 12px",
                    borderRadius: 999,
                    fontWeight: 900,
                    border: "1px solid rgba(14,165,233,0.26)",
                    background: "rgba(14,165,233,0.12)",
                    color: "#075985",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6)",
                  }}
                >
                  <IconCalendar /> Calendário
                </span>

                {selectedItem ? (
                  <span
                    style={{
                      display: "inline-flex",
                      gap: 8,
                      alignItems: "center",
                      padding: "6px 12px",
                      borderRadius: 999,
                      fontWeight: 900,
                      border: "1px solid rgba(22,163,74,0.26)",
                      background: "rgba(22,163,74,0.12)",
                      color: "#0f5f2c",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6)",
                      maxWidth: 520,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={`${selectedItem.category} — ${selectedItem.name}`}
                  >
                    <IconBox /> {selectedItem.category} — {selectedItem.name}
                  </span>
                ) : null}
              </div>

              <h1
                className="hero-title"
                style={{
                  margin: "10px 0 4px",
                  fontSize: 26,
                  fontWeight: 1100,
                  letterSpacing: "-0.02em",
                  color: "#0f172a",
                }}
              >
                Agendamentos de materiais
              </h1>
              <p style={{ margin: 0, color: "#334155", fontWeight: 900, fontSize: 13 }}>
                {loading ? "Carregando..." : "Clique em um tempo para agendar. Clique em reservado para ver detalhes/excluir."}
              </p>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              {isAuthenticated ? (
                <button onClick={signOut} type="button" className="ux-btn ux-btn-ghost" title="Sair">
                  <IconLogout /> Sair
                </button>
              ) : (
                <button
                  type="button"
                  className="ux-btn ux-btn-ghost"
                  title="Entrar"
                  onClick={() => {
                    setLoginMsg("");
                    setLoginOpen(true);
                  }}
                >
                  Entrar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <section className="mt-6 rounded-3xl border border-slate-200 bg-slate-50/80 p-5 shadow-[0_14px_40px_rgba(15,23,42,0.10)] backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-black text-slate-900">Agendamentos unificados</div>
            <div className="text-xs font-bold text-slate-500">
              Visualize todos os agendamentos por dia e tempo, separados por escola.
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowUnified((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 shadow-sm transition-all duration-200 hover:bg-slate-50"
            >
              {showUnified ? "Fechar unificado" : "Ver unificado"}
            </button>
            {showUnified ? (
              <button
                type="button"
                onClick={() => setShowUnifiedFull(true)}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 shadow-sm transition-all duration-200 hover:bg-slate-50"
              >
                Ampliar
              </button>
            ) : null}
          </div>
        </div>

        {showUnified ? unifiedBody : null}
      </section>

      {showUnifiedFull ? (
        <div className="fixed inset-0 z-[9999] grid place-items-center bg-slate-900/60 p-4 backdrop-blur">
          <div className="relative w-full max-w-5xl rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.35)]">
            <button
              type="button"
              onClick={() => setShowUnifiedFull(false)}
              className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              ✕
            </button>
            <div className="text-base font-black text-slate-900">Agendamentos unificados</div>
            <div className="mt-1 text-xs font-bold text-slate-500">
              Visualize todos os agendamentos por dia e tempo, separados por escola.
            </div>
            {unifiedBody}
          </div>
        </div>
      ) : null}

      {loginOpen ? (
        <div
          onClick={() => setLoginOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(15,23,42,0.55)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 420,
              background:
                "linear-gradient(180deg, rgba(52,211,153,0.35), rgba(56,189,248,0.25))",
              borderRadius: 24,
              border: "1px solid rgba(15,23,42,0.12)",
              padding: 18,
              boxShadow: "0 20px 60px rgba(15,23,42,0.25)",
              display: "grid",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 6 }}>
              <div style={{ fontWeight: 1000, fontSize: 18, color: "#0f172a", textShadow: "0 0 16px rgba(56,189,248,0.5)" }}>
                Login
              </div>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 10px",
                  borderRadius: 999,
                  background: "rgba(16,185,129,0.16)",
                  border: "1px solid rgba(16,185,129,0.25)",
                  color: "#0b6b3a",
                  fontSize: 11,
                  fontWeight: 900,
                }}
              >
                Acesso
              </span>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 900, color: "#0f172a", textAlign: "center" }}>
                Usuário
              </div>
              <input
                type="text"
                placeholder="primeiro.ultimo"
                value={loginUser}
                onChange={(e) => setLoginUser(e.target.value)}
                style={{
                  width: "100%",
                  height: 44,
                  borderRadius: 14,
                  border: "1px solid rgba(15,23,42,0.12)",
                  padding: "0 12px",
                  fontWeight: 900,
                  background: "rgba(255,255,255,0.95)",
                  marginTop: 6,
                }}
              />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 900, color: "#0f172a", textAlign: "center" }}>
                Senha
              </div>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  style={{
                    width: "100%",
                    height: 44,
                    borderRadius: 14,
                    border: "1px solid rgba(15,23,42,0.12)",
                    padding: "0 40px 0 12px",
                    fontWeight: 900,
                    background: "rgba(255,255,255,0.95)",
                    marginTop: 6,
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  style={{
                    position: "absolute",
                    right: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#000",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-5.52 0-10-4.48-10-10a10.94 10.94 0 0 1 2.06-6.36" />
                      <path d="M1 1l22 22" />
                      <path d="M9.88 9.88A3 3 0 0 0 12 15a3 3 0 0 0 2.12-5.12" />
                      <path d="M14.12 4.12A10.94 10.94 0 0 1 22 10c-.73 1.29-1.74 2.4-2.95 3.26" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            {loginMsg ? (
              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: loginOk ? "1px solid rgba(16,185,129,0.35)" : "1px solid rgba(239,68,68,0.35)",
                  background: loginOk ? "rgba(16,185,129,0.12)" : "rgba(254,226,226,0.8)",
                  color: loginOk ? "#065f46" : "#b91c1c",
                  fontWeight: 900,
                  fontSize: 12,
                }}
              >
                {loginMsg}
              </div>
            ) : null}
            <label style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900, color: "#0f172a" }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ width: 16, height: 16 }}
              />
              Manter conectado
            </label>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setLoginOpen(false)}
                disabled={loginLoading}
                className="ux-btn ux-btn-ghost login-btn-fun"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleLogin}
                disabled={loginLoading}
                className="ux-btn ux-btn-primary login-btn-fun"
              >
                {loginLoading ? "Entrando..." : "Entrar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="calendar-mobile-filter-trigger-wrap">
        <button
          type="button"
          onClick={() => setMobileFiltersOpen(true)}
          className="ux-btn ux-btn-info calendar-mobile-filter-trigger"
        >
          <IconSearch /> Filtros e busca
        </button>
      </div>

      {mobileFiltersOpen ? (
        <div
          className="calendar-mobile-filters-overlay"
          onClick={() => setMobileFiltersOpen(false)}
        >
          <div
            className="calendar-mobile-filters-sheet"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="calendar-mobile-filters-head">
              <div className="text-sm font-black text-slate-900">Filtros e busca</div>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-sm font-black text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="calendar-mobile-filters-grid">
              <div>
                <div className="label">Categoria</div>
                <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="field">
                  {allCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="label">Material</div>
                <select value={selectedItemId} onChange={(e) => setSelectedItemId(e.target.value)} className="field">
                  {filteredItems.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.category} — {it.name} (qty: {it.total_qty})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="label">Ano</div>
                <select value={year} onChange={(e) => setMonth(buildYM(Number(e.target.value), m))} className="field">
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="label">Mês</div>
                <select value={m} onChange={(e) => setMonth(buildYM(year, Number(e.target.value)))} className="field">
                  {MONTHS_PT.map((label, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="label">Selecionar escola</div>
                {schoolLocked ? (
                  <div
                    className="field"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 1000,
                      color: "#0f172a",
                      background: "rgba(255,255,255,0.95)",
                    }}
                  >
                    {schoolCompactLabel || "Escola"}
                  </div>
                ) : (
                  <select
                    value={selectedSchoolId}
                    onChange={(e) => setSelectedSchoolId(e.target.value)}
                    className="field"
                    disabled={schoolsLoading || !schools.length}
                  >
                    {schoolsLoading ? (
                      <option value="">Carregando…</option>
                    ) : (
                      <>
                        <option value="">Selecione a escola</option>
                        {schools.map((s) => (
                          <option key={s.id} value={s.id}>
                            {schoolDisplayLabel(s.name)}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                )}
              </div>
              <div>
                <div className="label">Buscar professor</div>
                <input
                  value={teacherSearch}
                  onChange={(e) => setTeacherSearch(e.target.value)}
                  placeholder="Ex: Gabriel, Ana, João..."
                  className="field"
                  style={{ textAlign: "left" }}
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  openNewReservation();
                  setMobileFiltersOpen(false);
                }}
                className="ux-btn ux-btn-primary"
                style={{ width: "100%" }}
              >
                <IconPlus /> Novo agendamento
              </button>
            </div>

            <div className="calendar-mobile-filters-subtitle">Busca inteligente</div>
            <div className="calendar-mobile-filters-grid">
              <div>
                <div className="label">Professor</div>
                <input
                  value={searchTeacherName}
                  onChange={(e) => setSearchTeacherName(e.target.value)}
                  className="field"
                  placeholder="Digite o nome"
                />
              </div>
              <div>
                <div className="label">Recurso</div>
                <select value={searchItemId} onChange={(e) => setSearchItemId(e.target.value)} className="field">
                  <option value="">Todos</option>
                  {items.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.category} — {it.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="label">Data</div>
                <input type="date" value={searchDate} onChange={(e) => setSearchDate(e.target.value)} className="field" />
              </div>
              <div>
                <div className="label">Status</div>
                <select value={searchStatus} onChange={(e) => setSearchStatus(e.target.value)} className="field">
                  <option value="active">Ativo</option>
                  <option value="cancelled">Cancelado</option>
                  <option value="all">Todos</option>
                </select>
              </div>
            </div>
            <div className="calendar-mobile-filters-actions">
              <button type="button" className="ux-btn ux-btn-ghost" onClick={clearSearch} disabled={searchLoading}>
                Limpar
              </button>
              <button type="button" className="ux-btn ux-btn-primary" onClick={runSearch} disabled={searchLoading}>
                {searchLoading ? "Buscando..." : "Buscar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* ✅ FILTROS (mais alinhados + botão menor) */}
      <div
        className="calendar-filters-card"
        style={{
          maxWidth: 1200,
          margin: "0 auto 12px auto",
          ...cardSurface,
          border: softBorder,
          padding: 14,
          ...motionCard,
          position: "relative",
          zIndex: 2,
        }}
      >
        <div className="filters-grid" style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 12 }}>
          {/* Categoria */}
          <div className="col-cat" style={{ gridColumn: "span 2" }}>
            <div className="label">Categoria</div>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="field">
              {allCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Material */}
          <div className="col-material" style={{ gridColumn: "span 4" }}>
            <div className="label">Material (visualização)</div>
            <select value={selectedItemId} onChange={(e) => setSelectedItemId(e.target.value)} className="field">
              {filteredItems.map((it) => (
                <option key={it.id} value={it.id}>
                  {it.category} — {it.name} (qty: {it.total_qty})
                </option>
              ))}
            </select>
          </div>

          {/* Ano */}
          <div className="col-year" style={{ gridColumn: "span 2" }}>
            <div className="label">Ano</div>
            <select value={year} onChange={(e) => setMonth(buildYM(Number(e.target.value), m))} className="field">
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Mês */}
          <div className="col-month" style={{ gridColumn: "span 2" }}>
            <div className="label">Mês</div>
            <select value={m} onChange={(e) => setMonth(buildYM(year, Number(e.target.value)))} className="field">
              {MONTHS_PT.map((label, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Selecionar escola */}
          <div className="col-school" style={{ gridColumn: "span 2" }}>
            <div className="label">Selecionar escola</div>
            {schoolLocked ? (
              <div
                className="field"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 1000,
                  color: "#0f172a",
                  background: "rgba(255,255,255,0.95)",
                }}
              >
                {schoolCompactLabel || "Escola"}
              </div>
            ) : (
              <select
                value={selectedSchoolId}
                onChange={(e) => setSelectedSchoolId(e.target.value)}
                className="field"
                disabled={schoolsLoading || !schools.length}
              >
                {schoolsLoading ? (
                  <option value="">Carregando…</option>
                ) : (
                  <>
                    <option value="">Selecione a escola</option>
                    {schools.map((s) => (
                      <option key={s.id} value={s.id}>
                        {schoolDisplayLabel(s.name)}
                      </option>
                    ))}
                  </>
                )}
              </select>
            )}
            {!schoolsLoading && selectedSchoolId && !hasClassOptions ? (
              <div style={{ marginTop: 6, fontSize: 12, fontWeight: 900, color: "#b91c1c" }}>
                {noClassOptionsMessage}
              </div>
            ) : null}
          </div>


          {/* Busca + Botão (segunda linha, mais elegante) */}
          <div className="col-search" style={{ gridColumn: "span 8" }}>
            <div className="label">Buscar professor</div>
            <div
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  left: 12,
                  color: "#64748b",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <IconSearch />
              </span>
              <input
                value={teacherSearch}
                onChange={(e) => setTeacherSearch(e.target.value)}
                placeholder="Ex: Gabriel, Ana, João..."
                className="field"
                style={{ paddingLeft: 42, textAlign: "left" }}
              />
            </div>
          </div>

          <div className="col-new" style={{ gridColumn: "span 4", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
            <button
              type="button"
              onClick={openNewReservation}
              className="ux-btn ux-btn-primary"
              style={{
                width: "min(340px, 100%)",
                height: 46,
                opacity: !selectedSchoolId || !hasClassOptions ? 0.6 : 1,
              }}
            >
              <IconPlus /> Novo agendamento
            </button>
          </div>
        </div>

        {/* ✅ Legenda com título */}
        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          <div style={{ textAlign: "center", fontWeight: 1100, color: "#334155", fontSize: 12, letterSpacing: ".08em", textTransform: "uppercase" }}>
            Legenda
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
            {(["free", "partial", "full", "no-school"] as CellStatus[]).map((s) => {
              const p = statusPill(s);
              return (
                <span
                  key={s}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "6px 12px",
                    borderRadius: 999,
                    fontWeight: 1000,
                    background: p.bg,
                    border: `1px solid ${p.bd}`,
                    color: p.tx,
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.65)",
                  }}
                >
                  {p.label}
                </span>
              );
            })}
          </div>
        </div>

        {/* ✅ Busca inteligente */}
        <div
          style={{
            marginTop: 14,
            borderRadius: 16,
            border: "1px solid rgba(15,23,42,0.10)",
            background: "rgba(248,250,252,0.9)",
            padding: 12,
            display: "grid",
            gap: 10,
          }}
        >
          <div style={{ fontWeight: 1100, color: "#0f172a" }}>Busca inteligente</div>

          <div className="smart-grid" style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 10 }}>
            <div style={{ gridColumn: "span 4" }}>
              <div className="label">Professor</div>
              <input
                value={searchTeacherName}
                onChange={(e) => setSearchTeacherName(e.target.value)}
                className="field"
                placeholder="Digite o nome"
              />
            </div>

            <div style={{ gridColumn: "span 4" }}>
              <div className="label">Recurso</div>
              <select value={searchItemId} onChange={(e) => setSearchItemId(e.target.value)} className="field">
                <option value="">Todos</option>
                {items.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.category} — {it.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ gridColumn: "span 2" }}>
              <div className="label">Data</div>
              <input
                type="date"
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
                className="field"
              />
            </div>

            <div style={{ gridColumn: "span 2" }}>
              <div className="label">Status</div>
              <select value={searchStatus} onChange={(e) => setSearchStatus(e.target.value)} className="field">
                <option value="active">Ativo</option>
                <option value="cancelled">Cancelado</option>
                <option value="all">Todos</option>
              </select>
            </div>
          </div>

          <div className="smart-actions" style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" className="ux-btn ux-btn-ghost" onClick={clearSearch} disabled={searchLoading}>
              Limpar
            </button>
            <button type="button" className="ux-btn ux-btn-primary" onClick={runSearch} disabled={searchLoading}>
              {searchLoading ? "Buscando..." : "Buscar"}
            </button>
          </div>

          {searchMsg ? (
            <div style={{ fontWeight: 1000, color: "#b91c1c" }}>{searchMsg}</div>
          ) : null}

          {searchResults.length ? (
            <div style={{ display: "grid", gap: 8 }}>
              {searchResults.map((r) => (
                <div
                  key={r.id}
                  style={{
                    border: "1px solid rgba(15,23,42,0.08)",
                    borderRadius: 14,
                    padding: 10,
                    background: "rgba(255,255,255,0.9)",
                    display: "grid",
                    gap: 4,
                  }}
                >
                  <div style={{ fontWeight: 1100, color: "#0f172a" }}>
                    {r.teacher_name || r.teacher_email || "Sem nome"}
                  </div>
                  <div style={{ fontWeight: 900, color: "#475569", fontSize: 12 }}>
                    {new Date(r.use_date + "T00:00:00").toLocaleDateString("pt-BR")} • Tempos{" "}
                    {r.start_period}–{r.end_period} • {r.school_class}
                    {r.school_name ? ` • ${r.school_name}` : ""} • {r.status}
                  </div>
                  {r.resources?.length ? (
                    <div style={{ fontWeight: 900, color: "#0f172a", fontSize: 12 }}>
                      {r.resources.join(" • ")}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontWeight: 900, color: "#64748b", fontSize: 12 }}>
              {searchLoading ? "Buscando..." : "Sem resultados para os filtros atuais."}
            </div>
          )}
        </div>

        {msg && (
          <div
            style={{
              marginTop: 12,
              border: "1px solid rgba(239,68,68,0.22)",
              borderRadius: 14,
              padding: 12,
              background: "rgba(239,68,68,0.06)",
              color: "#991b1b",
              fontWeight: 1000,
              textAlign: "center",
              whiteSpace: "pre-wrap",
              boxShadow: "0 12px 28px rgba(239,68,68,0.08)",
            }}
          >
            {msg}
          </div>
        )}
      </div>

      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto 10px",
          ...cardSurface,
          border: softBorder,
          padding: 14,
          ...motionCard,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 1100, color: "#0f172a" }}>Recursos disponíveis</div>
            <div style={{ marginTop: 2, fontSize: 12, fontWeight: 900, color: "#475569" }}>
              Professor(a): veja rapidamente o que está disponível para reserva.
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowResourcesPanel((prev) => !prev)}
            className="ux-btn ux-btn-info"
            style={{ height: 38, padding: "0 14px" }}
          >
            {showResourcesPanel ? "Ocultar recursos" : "Ver recursos disponíveis"}
          </button>
        </div>

        {showResourcesPanel ? (
          <div
            style={{
              marginTop: 12,
              borderRadius: 16,
              border: "1px solid rgba(15,23,42,0.10)",
              background: "rgba(255,255,255,0.92)",
              padding: 12,
              display: "grid",
              gap: 10,
              maxHeight: 320,
              overflow: "auto",
            }}
          >
            {availableResources.length ? (
              availableResources.map((it) => (
                <div
                  key={it.id}
                  style={{
                    borderRadius: 12,
                    border: "1px solid rgba(148,163,184,0.24)",
                    background: "rgba(248,250,252,0.9)",
                    padding: 10,
                    display: "grid",
                    gap: 4,
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 1100, color: "#0f172a" }}>
                    {it.category} — {it.name}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 900, color: "#0f766e" }}>
                    Quantidade disponível: {it.total_qty}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#475569" }}>
                    {resourceBriefDescription(it.category, it.name)}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ fontSize: 12, fontWeight: 900, color: "#64748b" }}>
                Nenhum recurso disponível para a categoria selecionada.
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* ✅ Cabeçalho do calendário */}
      <div
        className="calendar-month-header"
        style={{
          maxWidth: 1200,
          margin: "12px auto 8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          padding: "6px 4px",
        }}
      >
        <div className="calendar-month-title" style={{ fontSize: 14, fontWeight: 1100, color: "#0f172a" }}>
          Calendário do mês ({calendarViewShift === "matutino" ? "Manhã" : "Tarde"})
          <span className="calendar-month-note" style={{ marginLeft: 8, fontSize: 11, fontWeight: 900, color: "#64748b" }}>
            (clique e arraste para selecionar)
          </span>
          <span className="calendar-month-count" style={{ marginLeft: 8, fontSize: 11, fontWeight: 900, color: "#0f766e" }}>
            Mostrando {datesToRender.length} de {sortedDates.length} datas
          </span>
        </div>
          <div className="calendar-month-actions" style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ display: "inline-flex", border: "1px solid rgba(14,165,233,.35)", borderRadius: 999, overflow: "hidden", background: "rgba(255,255,255,.85)" }}>
            <button
              type="button"
              onClick={() => setCalendarViewShift("matutino")}
              className="ux-btn"
              style={{
                height: 36,
                padding: "0 14px",
                borderRadius: 0,
                background: calendarViewShift === "matutino" ? "linear-gradient(135deg,#22c55e,#0ea5e9)" : "transparent",
                color: calendarViewShift === "matutino" ? "#fff" : "#0f172a",
              }}
            >
              Manhã
            </button>
            <button
              type="button"
              onClick={() => setCalendarViewShift("vespertino")}
              className="ux-btn"
              style={{
                height: 36,
                padding: "0 14px",
                borderRadius: 0,
                background: calendarViewShift === "vespertino" ? "linear-gradient(135deg,#22c55e,#0ea5e9)" : "transparent",
                color: calendarViewShift === "vespertino" ? "#fff" : "#0f172a",
              }}
            >
              Tarde
            </button>
          </div>
          {selectedCellKeys.length ? (
            <div className="calendar-selected-actions" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, fontWeight: 900, color: "#0f172a" }}>
                Selecionados: {selectedCellKeys.length}
              </span>
              <button
                type="button"
                onClick={openSelectionModal}
                className="ux-btn ux-btn-primary"
                style={{ height: 40, padding: "0 16px" }}
              >
                Agendar seleção
              </button>
              <button
                type="button"
                onClick={clearCellSelection}
                className="ux-btn ux-btn-ghost"
                style={{ height: 40, padding: "0 12px" }}
              >
                Limpar
              </button>
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => setShowCalendarExpanded((prev) => !prev)}
            className="ux-btn ux-btn-ghost"
            style={{ height: 40, padding: "0 16px" }}
            title={showCalendarExpanded ? "Ver calendário resumido" : "Ver todas as datas"}
          >
            {showCalendarExpanded ? "Ver menos" : "Ver mais"}
          </button>
          <div className="mobile-only">
            <button
              type="button"
              onClick={() => setShowCalendarCardMode((prev) => !prev)}
              className="ux-btn ux-btn-ghost"
              style={{ height: 40, padding: "0 16px" }}
              title="Alternar visualização em cartões"
            >
              {showCalendarCardMode ? "Modo tabela" : "Modo cartões"}
            </button>
          </div>
          <div className="mobile-only">
            <button
              type="button"
              onClick={() => setShowCalendarFull(true)}
              className="ux-btn ux-btn-ghost"
              style={{ height: 40, padding: "0 16px" }}
              title="Abrir calendário em tela cheia"
            >
              Tela cheia
            </button>
          </div>
        </div>
      </div>

      {/* ✅ TABELA (zebra + hover melhor) */}
      <div className={showCalendarCardMode && !showCalendarFull ? "calendar-mobile-table-hidden" : ""}>
        {calendarTable}
      </div>
      {showCalendarCardMode && !showCalendarFull ? (
        <div className="calendar-mobile-card-mode">{fullScreenMobileCards}</div>
      ) : null}

      {showCalendarFull ? (
        <div className="calendar-fullscreen fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur">
          <div
            className="calendar-fullscreen-shell relative flex h-[100dvh] w-full flex-col overflow-hidden bg-white p-4 shadow-[0_20px_60px_rgba(15,23,42,0.35)]"
            style={{ paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))" }}
          >
            <button
              type="button"
              onClick={() => setShowCalendarFull(false)}
              className="absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              ✕
            </button>
            <div className="pr-12 text-base font-black text-slate-900">Tabela de agendamentos</div>
            <div className="mt-1 text-xs font-bold text-slate-500">
              Visualização em tela cheia.
            </div>
            <div className="calendar-fullscreen-content mt-4 min-h-0 flex-1 overflow-auto overscroll-contain">
              <div className="calendar-fullscreen-table">{calendarTable}</div>
              {fullScreenMobileCards}
            </div>
            {selectedCellKeys.length ? (
              <div className="calendar-fullscreen-mobile-cta">
                <div className="calendar-mobile-selection-count">Selecionados: {selectedCellKeys.length}</div>
                <button type="button" onClick={openSelectionModal} className="ux-btn ux-btn-primary">
                  Agendar seleção
                </button>
                <button type="button" onClick={clearCellSelection} className="ux-btn ux-btn-ghost">
                  Limpar
                </button>
              </div>
            ) : null}
            {!selectedCellKeys.length ? (
              <div style={{ height: "calc(10px + env(safe-area-inset-bottom, 0px))" }} />
            ) : null}
          </div>
        </div>
      ) : null}

      {selectedCellKeys.length && !showCalendarFull ? (
        <div className="calendar-mobile-selection-bar">
          <div className="calendar-mobile-selection-count">Selecionados: {selectedCellKeys.length}</div>
          <button type="button" onClick={openSelectionModal} className="ux-btn ux-btn-primary">
            Agendar seleção
          </button>
          <button type="button" onClick={clearCellSelection} className="ux-btn ux-btn-ghost">
            Limpar
          </button>
        </div>
      ) : null}

      <div
        style={{
          maxWidth: 1200,
          margin: "16px auto 0",
          textAlign: "center",
          color: "#475569",
          fontWeight: 900,
          fontSize: 12,
          letterSpacing: ".02em",
          background: "rgba(255,255,255,0.72)",
          border: "1px solid rgba(15,23,42,0.08)",
          borderRadius: 14,
          padding: "10px 12px",
          boxShadow: "0 10px 24px rgba(15,23,42,0.08)",
          backdropFilter: "blur(10px)",
        }}
      >
        {APP_BRAND_NAME}
      </div>

      {/* MODAL (mantive seu modal, só deixei o resto melhor) */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="calendar-modal-overlay"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            background: "radial-gradient(1200px 600px at 50% 10%, rgba(15,23,42,0.35), rgba(15,23,42,0.70))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            backdropFilter: "blur(4px)",
          }}
        >
          {/* (modal permanece igual ao seu — mantive todo o conteúdo/funcionalidade) */}
          {/* --- COLEI SEU MODAL INTEIRO ABAIXO SEM MEXER NA LÓGICA --- */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="calendar-modal"
            style={{
              width: "100%",
              maxWidth: 980,
              maxHeight: "88vh",
              overflow: "auto",
              background: "rgba(255,255,255,0.96)",
              borderRadius: 22,
              border: "1px solid rgba(15,23,42,0.12)",
              padding: 16,
              boxShadow: "0 22px 60px rgba(15,23,42,0.22)",
              animation: "floatIn .45s ease both",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ textAlign: "center", flex: "1 1 auto", display: "grid", justifyItems: "center" }}>
                <div style={{ display: "inline-flex", gap: 10, alignItems: "center", justifyContent: "center", flexWrap: "wrap", margin: "0 auto" }}>
                  <span
                    style={{
                      padding: "6px 12px",
                      borderRadius: 999,
                      fontWeight: 1000,
                      border: mode === "details" ? "1px solid rgba(239,68,68,0.22)" : "1px solid rgba(22,163,74,0.22)",
                      background: mode === "details" ? "rgba(239,68,68,0.08)" : "rgba(22,163,74,0.10)",
                      color: mode === "details" ? "#b91c1c" : "#0f5f2c",
                      display: "inline-flex",
                      gap: 8,
                      alignItems: "center",
                    }}
                  >
                    {mode === "details" ? "Detalhes" : (
                      <>
                        <IconPlus /> Novo
                      </>
                    )}
                  </span>

                  <span
                    style={{
                      padding: "6px 12px",
                      borderRadius: 999,
                      fontWeight: 1000,
                      border: "1px solid rgba(14,165,233,0.22)",
                      background: "rgba(14,165,233,0.10)",
                      color: "#075985",
                      display: "inline-flex",
                      gap: 8,
                      alignItems: "center",
                    }}
                  >
                    <IconCalendar /> {formDate || "—"} • Tempo {selectedPeriods[0] ?? "—"}
                  </span>
                </div>

                <h2 style={{ margin: "10px 0 4px", fontSize: 20, fontWeight: 1100, color: "#0f172a" }}>
                  {mode === "details" ? "Agendamentos deste horário" : "Novo agendamento"}
                </h2>
                <p style={{ margin: 0, color: "#64748b", fontWeight: 1000 }}>
                  {mode === "details"
                    ? "Você pode excluir só este tempo ou excluir o registro inteiro."
                    : "Selecione professor, turma, tempos e materiais."}
                </p>
              </div>

              <button type="button" onClick={() => setOpen(false)} className="ux-btn ux-btn-ghost">
                Fechar
              </button>
            </div>

            {/* DETAILS MODE */}
            {mode === "details" && (
              <div style={{ marginTop: 14 }}>
                {(() => {
                  const p = selectedPeriods[0] ?? 1;
                  const key = `${formDate}-${p}`;
                  const list = cellResMap[key] ?? [];

                  if (!list.length) {
                    return (
                      <div style={{ marginTop: 12, textAlign: "center", fontWeight: 1000, color: "#64748b" }}>
                        Nenhum registro encontrado nesta célula.
                      </div>
                    );
                  }

                  return (
                    <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                      {list.map((r) => {
                        const interval = r.start_period === r.end_period ? `Tempo ${r.start_period}` : `Tempos ${r.start_period}–${r.end_period}`;

                        return (
                          <div
                            key={r.id}
                            style={{
                              border: "1px solid rgba(15,23,42,0.10)",
                              borderRadius: 16,
                              padding: 12,
                              background: "rgba(248,250,252,0.8)",
                              display: "grid",
                              gap: 10,
                            }}
                          >
                            <div style={{ display: "grid", gap: 4, textAlign: "center" }}>
                              <div style={{ fontWeight: 1100, color: "#0f172a", display: "inline-flex", gap: 8, alignItems: "center", justifyContent: "center" }}>
                                <IconTeacher /> {r.who}
                              </div>
                              <div style={{ fontWeight: 1000, color: "#475569" }}>
                                Turma: {r.turma}
                                {r.school_name ? ` • ${r.school_name}` : ""}
                                {r.other ? ` • Outros: ${r.other}` : ""}
                              </div>
                              <div style={{ fontWeight: 1000, color: "#64748b", fontSize: 12 }}>
                                Intervalo do registro: <b>{interval}</b>
                              </div>
                            </div>

                            <div
                              style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}
                              className="modal-actions"
                            >
                              <button
                                type="button"
                                disabled={duplicating}
                                onClick={() => {
                                  void duplicateReservationFromDetails(r.id);
                                }}
                                className="ux-btn ux-btn-primary"
                                title="Preenche novo agendamento com os mesmos dados"
                              >
                                {duplicating ? "Duplicando..." : "Duplicar reserva"}
                              </button>

                              <button
                                type="button"
                                disabled={deleting}
                                onClick={() => {
                                  cancelOnlyThisPeriod(r.id, selectedPeriods[0] ?? 1);
                                }}
                                className="ux-btn ux-btn-info"
                                title="Remove apenas este tempo do intervalo"
                              >
                                {deleting ? "Aguarde..." : `Excluir só o tempo ${selectedPeriods[0] ?? 1}`}
                              </button>

                              <button
                                type="button"
                                disabled={deleting}
                                onClick={() => {
                                  cancelReservationWhole(r.id);
                                }}
                                className="ux-btn ux-btn-danger"
                                title="Cancela o registro inteiro"
                              >
                                <IconTrash /> Excluir registro inteiro
                              </button>
                            </div>
                            <div style={{ marginTop: 8, textAlign: "center", fontSize: 12, color: "#64748b", fontWeight: 900 }}>
                              Admin pode excluir qualquer registro.
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* CREATE MODE */}
            {mode === "create" && (
              <>
                {/* Top grid: Data / Professor / Turmas */}
                <div style={{ marginTop: 16, ...modalSection }} className="modal-section">
                  <div
                    className="modal-grid-12"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(12, 1fr)",
                      gap: 12,
                      textAlign: "center",
                    }}
                  >
                    {/* DATA */}
                    <div style={{ gridColumn: "span 4" }}>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 1100,
                          color: "#64748b",
                          textTransform: "uppercase",
                          letterSpacing: ".08em",
                          textAlign: "center",
                          marginBottom: 8,
                        }}
                      >
                        Data
                      </div>

                      <div
                        style={{
                          border: "1px solid rgba(15,23,42,0.10)",
                          borderRadius: 16,
                          padding: 12,
                          background: "rgba(248,250,252,0.9)",
                          boxShadow: "0 10px 22px rgba(15,23,42,0.06)",
                        }}
                      >
                        <input
                          type="date"
                          min={todayISO}
                          value={formDate}
                          onChange={(e) => {
                            const next = e.target.value;
                            const prevDate = formDate;
                            setFormDate(next);
                            if (!next) return;
                            setMsg("");
                            // Quando há somente 1 data selecionada, trocar no campo já substitui a data do agendamento.
                            // Isso evita conflito "preso" na data anterior após duplicar reserva.
                            if (selectedDates.length <= 1) {
                              const prevPeriods =
                                prevDate && selectedPeriodsByDate[prevDate]?.length
                                  ? selectedPeriodsByDate[prevDate]
                                  : [...selectedPeriods];
                              const prevClassByPeriod = prevDate ? classByDatePeriod[prevDate] ?? {} : {};
                              setSelectedDates([next]);
                              setSelectedPeriodsByDate({ [next]: prevPeriods });
                              setClassByDatePeriod({ [next]: prevClassByPeriod });
                            }
                          }}
                          style={{
                            width: "100%",
                            height: 44,
                            borderRadius: 14,
                            border: "1px solid rgba(15,23,42,0.12)",
                            padding: "0 12px",
                            fontWeight: 1000,
                            textAlign: "center",
                            background: "rgba(255,255,255,0.95)",
                          }}
                        />

                        {schoolLocked ? (
                          <div
                            style={{
                              width: "100%",
                              height: 44,
                              borderRadius: 14,
                              border: "1px solid rgba(15,23,42,0.12)",
                              padding: "0 12px",
                              fontWeight: 1000,
                              textAlign: "center",
                              background: "rgba(255,255,255,0.95)",
                              marginTop: 10,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#0f172a",
                            }}
                          >
                            {schoolCompactLabel || "Escola"}
                          </div>
                        ) : (
                          <select
                            value={selectedSchoolId}
                            onChange={(e) => setSelectedSchoolId(e.target.value)}
                            style={{
                              width: "100%",
                              height: 44,
                              borderRadius: 14,
                              border: "1px solid rgba(15,23,42,0.12)",
                              padding: "0 12px",
                              fontWeight: 1000,
                              textAlign: "center",
                              background: "rgba(255,255,255,0.95)",
                              marginTop: 10,
                            }}
                          >
                            {schoolsLoading ? (
                              <option value="">Carregando escola…</option>
                            ) : (
                              <>
                                <option value="">Selecione a escola</option>
                                {schools.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {schoolDisplayLabel(s.name)}
                                  </option>
                                ))}
                              </>
                            )}
                          </select>
                        )}

                        <div style={{ marginTop: 6, fontSize: 12, fontWeight: 900, color: "#64748b", textAlign: "center" }}>
                          {schoolUnitLabel === "SED"
                            ? "SED: 6 tempos por dia"
                            : schoolUnitLabel === "Extensão"
                            ? "Extensão: 5 tempos por dia"
                            : "Padrão: 5 tempos por dia"}
                        </div>

                        <button
                          type="button"
                          onClick={addSelectedDate}
                          className="ux-btn ux-btn-info"
                          disabled={!formDate || formDate < todayISO || !isSchoolDay(new Date(formDate + "T00:00:00"))}
                          style={{ marginTop: 10, height: 40, width: "100%" }}
                        >
                          + Adicionar data
                        </button>
                      </div>
                    </div>

                    {/* PROFESSOR + PESQUISA */}
                    <div style={{ gridColumn: "span 4" }}>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 1100,
                          color: "#64748b",
                          textTransform: "uppercase",
                          letterSpacing: ".08em",
                          textAlign: "center",
                          marginBottom: 8,
                        }}
                      >
                        Professor(a)
                      </div>

                      <div
                        style={{
                          border: "1px solid rgba(15,23,42,0.10)",
                          borderRadius: 16,
                          padding: 12,
                          background: "rgba(248,250,252,0.9)",
                          boxShadow: "0 10px 22px rgba(15,23,42,0.06)",
                        }}
                      >
                        {isAdmin ? (
                          <>
                            {/* input pesquisa */}
                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                              <input
                                value={teacherQuery}
                                onChange={(e) => setTeacherQuery(e.target.value)}
                                placeholder="Pesquisar professor..."
                                style={{
                                  width: "100%",
                                  height: 44,
                                  borderRadius: 14,
                                  border: "1px solid rgba(15,23,42,0.12)",
                                  padding: "0 12px",
                                  fontWeight: 1000,
                                  textAlign: "center",
                                  background: "rgba(255,255,255,0.95)",
                                }}
                              />
                            </div>

                            {/* select filtrado */}
                            <select
                              value={teacherId}
                              onChange={(e) => setTeacherId(e.target.value)}
                              style={{
                                width: "100%",
                                height: 44,
                                borderRadius: 14,
                                border: "1px solid rgba(15,23,42,0.12)",
                                padding: "0 12px",
                                fontWeight: 1000,
                                textAlign: "center",
                                background: "rgba(255,255,255,0.95)",
                                marginTop: 10,
                              }}
                            >
                              {filteredTeachersForModal.length ? (
                                filteredTeachersForModal.map((t) => (
                                  <option key={t.id} value={t.id}>
                                    {t.name}
                                  </option>
                                ))
                              ) : (
                                <option value="">Nenhum professor cadastrado</option>
                              )}
                            </select>

                            {/* dica */}
                            <div style={{ marginTop: 10, color: "#64748b", fontWeight: 900, fontSize: 12 }}>
                              Dica: digite parte do nome e selecione na lista.
                            </div>
                          </>
                        ) : (
                          <>
                            <input
                              value={selectedTeacherName}
                              readOnly
                              style={{
                                width: "100%",
                                height: 44,
                                borderRadius: 14,
                                border: "1px solid rgba(15,23,42,0.12)",
                                padding: "0 12px",
                                fontWeight: 1000,
                                textAlign: "center",
                                background: "rgba(255,255,255,0.95)",
                              }}
                            />
                            <div style={{ marginTop: 10, color: "#64748b", fontWeight: 900, fontSize: 12 }}>
                              Professor(a) associado ao seu usuário.
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* TURMA PADRÃO */}
                    <div style={{ gridColumn: "span 4" }}>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 1100,
                          color: "#64748b",
                          textTransform: "uppercase",
                          letterSpacing: ".08em",
                          textAlign: "center",
                          marginBottom: 8,
                        }}
                      >
                        Turma padrão (opcional)
                      </div>

                      <div
                        style={{
                          border: "1px solid rgba(15,23,42,0.10)",
                          borderRadius: 16,
                          padding: 12,
                          background: "rgba(248,250,252,0.9)",
                          boxShadow: "0 10px 22px rgba(15,23,42,0.06)",
                        }}
                      >
                        <select
                          value={bookingShift}
                          onChange={(e) => setBookingShift(e.target.value as ShiftType)}
                          style={{
                            width: "100%",
                            height: 44,
                            borderRadius: 14,
                            border: "1px solid rgba(15,23,42,0.12)",
                            padding: "0 12px",
                            fontWeight: 1000,
                            textAlign: "center",
                            background: "rgba(255,255,255,0.95)",
                            marginBottom: 10,
                          }}
                        >
                          {availableShifts.includes("matutino") ? <option value="matutino">Matutino</option> : null}
                          {availableShifts.includes("vespertino") ? <option value="vespertino">Vespertino</option> : null}
                        </select>
                        <select
                          value={defaultSchoolClass}
                          onChange={(e) => setDefaultSchoolClass(e.target.value)}
                          style={{
                            width: "100%",
                            height: 44,
                            borderRadius: 14,
                            border: "1px solid rgba(15,23,42,0.12)",
                            padding: "0 12px",
                            fontWeight: 1000,
                            textAlign: "center",
                            background: "rgba(255,255,255,0.95)",
                          }}
                        >
                          <option value="">Selecionar turma padrão</option>
                          {visibleClassOptions.map((c) => (
                            <option key={c.value} value={c.value}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                        <div style={{ marginTop: 8, fontSize: 12, fontWeight: 900, color: "#64748b", textAlign: "center" }}>
                          A turma padrão preenche todos os tempos, se você não escolher uma turma específica.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Datas selecionadas */}
                <div style={{ marginTop: 14, textAlign: "center", ...modalSection }} className="modal-section">
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 1100,
                      color: "#64748b",
                      textTransform: "uppercase",
                      letterSpacing: ".08em",
                    }}
                  >
                    Datas selecionadas
                  </div>

                  <div style={{ marginTop: 10, display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                    {modalDatesPreview.map((d) => (
                      <div
                        key={d}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "7px 12px",
                          borderRadius: 999,
                          border: "1px solid rgba(14,165,233,0.25)",
                          background: "linear-gradient(135deg, rgba(14,165,233,0.10), rgba(34,197,94,0.06))",
                          color: "#075985",
                          fontWeight: 950,
                          boxShadow: "0 10px 20px rgba(14,165,233,0.08)",
                        }}
                      >
                        {new Date(d + "T00:00:00").toLocaleDateString("pt-BR")}
                        <button
                          type="button"
                          onClick={() => removeSelectedDate(d)}
                          style={{
                            border: "none",
                            background: "transparent",
                            color: "#075985",
                            fontWeight: 950,
                            cursor: "pointer",
                          }}
                          title="Remover"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>

                  {modalDatesPreview.length ? (
                    <div style={{ marginTop: 12, textAlign: "left" }}>
                      <div style={{ fontSize: 12, fontWeight: 1100, color: "#64748b", textTransform: "uppercase", letterSpacing: ".08em" }}>
                        Resumo por dia (tempos indisponíveis)
                      </div>
                      <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                        {modalDatesPreview.map((d) => {
                          const blocked = periods.filter(
                            (p) => (reservedQtyMap[d]?.[String(p)] ?? 0) >= selectedItemTotalQty
                          );
                          const hasConflict = blocked.length > 0;
                          return (
                            <div
                              key={`${d}-blocked`}
                              className="modal-day-summary"
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                gap: 10,
                                padding: "8px 12px",
                                borderRadius: 12,
                                border: hasConflict
                                  ? "1px solid rgba(239,68,68,0.35)"
                                  : "1px solid rgba(16,185,129,0.28)",
                                background: hasConflict
                                  ? "linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.06))"
                                  : "linear-gradient(135deg, rgba(16,185,129,0.12), rgba(14,165,233,0.06))",
                                fontWeight: 900,
                                color: "#0f172a",
                                fontSize: 12,
                                boxShadow: hasConflict
                                  ? "0 10px 20px rgba(239,68,68,0.18)"
                                  : "0 10px 20px rgba(16,185,129,0.12)",
                              }}
                            >
                              <span>{new Date(d + "T00:00:00").toLocaleDateString("pt-BR")}</span>
                              <span style={{ color: hasConflict ? "#b91c1c" : "#16a34a" }}>
                                {hasConflict ? `Indisponível: ${blocked.join(", ")}` : "Todos livres"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  {selectedDates.length ? (
                    <div style={{ marginTop: 12, textAlign: "left" }}>
                      <div style={{ fontSize: 12, fontWeight: 1100, color: "#64748b", textTransform: "uppercase", letterSpacing: ".08em" }}>
                        Tempos por dia
                      </div>
                      <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
                        {selectedDates.map((d) => {
                          const daySelected = selectedPeriodsByDate[d] ?? [];
                          return (
                            <div key={`${d}-periods`} style={{ display: "grid", gap: 6 }}>
                              <div style={{ fontSize: 12, fontWeight: 1000, color: "#0f172a" }}>
                                {new Date(d + "T00:00:00").toLocaleDateString("pt-BR")}
                              </div>
                              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }} className="modal-periods">
                                {periods.map((p) => {
                                  const active = daySelected.includes(p);
                                  const blocked = isPeriodBlocked(d, p);
                                  return (
                                    <div key={`${d}-${p}`} style={{ display: "grid", gap: 4, justifyItems: "center" }}>
                                      <button
                                        type="button"
                                        onClick={() => !blocked && togglePeriodForDate(d, p)}
                                        style={{
                                          minWidth: 48,
                                          height: 36,
                                          borderRadius: 12,
                                          border: blocked
                                            ? "1px solid rgba(239,68,68,0.45)"
                                            : active
                                            ? "1px solid rgba(14,165,233,0.45)"
                                            : "1px solid rgba(15,23,42,0.12)",
                                          background: blocked
                                            ? "linear-gradient(135deg, rgba(239,68,68,0.22), rgba(239,68,68,0.08))"
                                            : active
                                            ? "linear-gradient(135deg, rgba(34,197,94,0.16), rgba(14,165,233,0.16))"
                                            : "rgba(255,255,255,0.95)",
                                          color: blocked ? "#b91c1c" : active ? "#0b5f85" : "#0f172a",
                                          fontWeight: 1100,
                                          cursor: blocked ? "not-allowed" : "pointer",
                                        }}
                                      >
                                        {p}
                                      </button>
                                      {active ? (
                                        <select
                                          value={classByDatePeriod[d]?.[p] ?? ""}
                                          onChange={(e) => setClassForDatePeriod(d, p, e.target.value)}
                                          style={{
                                            minWidth: 110,
                                            height: 30,
                                            borderRadius: 10,
                                            border: "1px solid rgba(15,23,42,0.12)",
                                            padding: "0 8px",
                                            fontWeight: 900,
                                            background: "rgba(255,255,255,0.95)",
                                          }}
                                        >
                                          <option value="">Usar padrão</option>
                                          {visibleClassOptions.map((c) => (
                                            <option key={c.value} value={c.value}>
                                              {c.label}
                                            </option>
                                          ))}
                                        </select>
                                      ) : null}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Tempos de aula */}
                <div style={{ marginTop: 14, textAlign: "center", ...modalSection }} className="modal-section">
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 1100,
                      color: "#64748b",
                      textTransform: "uppercase",
                      letterSpacing: ".08em",
                    }}
                  >
                    Tempos de aula (selecione vários)
                  </div>

                  <div
                    style={{ marginTop: 10, display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}
                    className="modal-periods"
                  >
                    {periods.map((p) => {
                      const active = selectedPeriods.includes(p);
                      const blocked = isPeriodBlocked(formDate, p);
                      return (
                        <div key={p} style={{ display: "grid", gap: 4, justifyItems: "center" }}>
                          <button
                            type="button"
                            onClick={() => !blocked && togglePeriod(p)}
                            style={{
                              minWidth: 56,
                              height: 42,
                              borderRadius: 14,
                              border: blocked
                                ? "1px solid rgba(239,68,68,0.45)"
                                : active
                                ? "1px solid rgba(14,165,233,0.45)"
                                : "1px solid rgba(15,23,42,0.12)",
                              background: blocked
                                ? "linear-gradient(135deg, rgba(239,68,68,0.22), rgba(239,68,68,0.08))"
                                : active
                                ? "linear-gradient(135deg, rgba(34,197,94,0.16), rgba(14,165,233,0.16))"
                                : "rgba(255,255,255,0.95)",
                              color: blocked ? "#b91c1c" : active ? "#0b5f85" : "#0f172a",
                              fontWeight: 1100,
                              cursor: blocked ? "not-allowed" : "pointer",
                              boxShadow: blocked
                                ? "0 10px 22px rgba(239,68,68,0.18)"
                                : active
                                ? "0 10px 22px rgba(14,165,233,0.16)"
                                : "none",
                            }}
                          >
                            {p}
                          </button>
                          {active ? (
                            <select
                              value={classByDatePeriod[formDate]?.[p] ?? ""}
                              onChange={(e) => setClassForDatePeriod(formDate, p, e.target.value)}
                              style={{
                                minWidth: 110,
                                height: 30,
                                borderRadius: 10,
                                border: "1px solid rgba(15,23,42,0.12)",
                                padding: "0 8px",
                                fontWeight: 900,
                                background: "rgba(255,255,255,0.95)",
                              }}
                            >
                              <option value="">Usar padrão</option>
                              {visibleClassOptions.map((c) => (
                                <option key={c.value} value={c.value}>
                                  {c.label}
                                </option>
                              ))}
                            </select>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Materiais */}
                <div style={{ marginTop: 14, ...modalSection }} className="modal-section">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ textAlign: "left", flex: "1 1 auto" }}>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 1100,
                          color: "#64748b",
                          textTransform: "uppercase",
                          letterSpacing: ".08em",
                        }}
                      >
                        Materiais
                      </div>
                      <div style={{ color: "#64748b", fontWeight: 900, fontSize: 12, marginTop: 4 }}>
                        Adicione vários materiais no mesmo agendamento.
                      </div>
                    </div>

                    <button type="button" onClick={addMaterialRow} className="ux-btn ux-btn-info" style={{ height: 42 }}>
                      <IconPlus /> Adicionar material
                    </button>
                  </div>

                  <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                    {materialRows.map((row, idx) => (
                      <div
                        key={idx}
                        style={{
                          border: "1px solid rgba(15,23,42,0.10)",
                          borderRadius: 16,
                          padding: 12,
                          background: "rgba(248,250,252,0.92)",
                          boxShadow: "0 10px 22px rgba(15,23,42,0.06)",
                        }}
                      >
                        <div
                          className="modal-material-row"
                          style={{ display: "grid", gridTemplateColumns: "1fr 120px 52px", gap: 10, alignItems: "center" }}
                        >
                          <select
                            value={row.item_id}
                            onChange={(e) => updateMaterialRow(idx, { item_id: e.target.value })}
                            style={{
                              width: "100%",
                              height: 44,
                              borderRadius: 14,
                              border: "1px solid rgba(15,23,42,0.12)",
                              padding: "0 12px",
                              fontWeight: 1000,
                              textAlign: "center",
                              background: "rgba(255,255,255,0.95)",
                            }}
                          >
                            {items.map((it) => (
                              <option key={it.id} value={it.id}>
                                {it.category} — {it.name} (total: {it.total_qty})
                              </option>
                            ))}
                          </select>

                          <input
                            type="number"
                            min={1}
                            value={row.qty}
                            onChange={(e) => updateMaterialRow(idx, { qty: Number(e.target.value) })}
                            style={{
                              width: "100%",
                              height: 44,
                              borderRadius: 14,
                              border: "1px solid rgba(15,23,42,0.12)",
                              padding: "0 12px",
                              fontWeight: 1100,
                              textAlign: "center",
                              background: "rgba(255,255,255,0.95)",
                            }}
                          />

                          <button
                            type="button"
                            onClick={() => removeMaterialRow(idx)}
                            title="Remover"
                            style={{
                              height: 44,
                              borderRadius: 14,
                              border: "1px solid rgba(239,68,68,0.28)",
                              background: "rgba(239,68,68,0.08)",
                              color: "#b91c1c",
                              fontWeight: 1100,
                              cursor: "pointer",
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                {isModalOther && (
                  <div style={{ marginTop: 12 }}>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 1100,
                          color: "#64748b",
                          textTransform: "uppercase",
                          letterSpacing: ".08em",
                          textAlign: "center",
                          marginBottom: 8,
                        }}
                      >
                        Outros (descreva o equipamento)
                      </div>
                      <input
                        value={otherText}
                        onChange={(e) => setOtherText(e.target.value)}
                        placeholder="Ex: Microfone, Caixa JBL, Extensão, Tripé..."
                        style={{
                          width: "100%",
                          height: 44,
                          borderRadius: 14,
                          border: "1px solid rgba(15,23,42,0.12)",
                          padding: "0 12px",
                          fontWeight: 1100,
                          textAlign: "center",
                          background: "rgba(255,255,255,0.95)",
                        }}
                      />
                    </div>
                  )}
                </div>

                <div
                  style={{
                    marginTop: 14,
                    borderRadius: 16,
                    border: "1px solid rgba(14,165,233,0.30)",
                    background: "linear-gradient(135deg, rgba(14,165,233,0.10), rgba(34,197,94,0.08))",
                    padding: 12,
                    display: "grid",
                    gap: 8,
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 1100, color: "#075985", textTransform: "uppercase", letterSpacing: ".08em" }}>
                    Resumo final antes de confirmar
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 900, color: "#0f172a" }}>
                    Escola: {schoolDisplayLabel(schools.find((s) => s.id === selectedSchoolId)?.name || selectedSchoolName || "")}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 900, color: "#0f172a" }}>
                    Turma padrão: {defaultSchoolClass || "Não definida"}
                  </div>
                  <div style={{ display: "grid", gap: 6 }}>
                    {Object.entries(summaryPeriodsByDate).map(([dateISO, dayPeriods]) => (
                      <div
                        key={`summary-${dateISO}`}
                        style={{
                          borderRadius: 12,
                          border: "1px solid rgba(15,23,42,0.10)",
                          background: "rgba(255,255,255,0.85)",
                          padding: "8px 10px",
                          fontSize: 12,
                          fontWeight: 900,
                          color: "#0f172a",
                        }}
                      >
                        {formatDatePtBr(dateISO)} • Tempos: {dayPeriods.length ? dayPeriods.join(", ") : "Nenhum"}
                      </div>
                    ))}
                    {!Object.keys(summaryPeriodsByDate).length ? (
                      <div style={{ fontSize: 12, fontWeight: 900, color: "#64748b" }}>
                        Selecione data e tempos para completar o resumo.
                      </div>
                    ) : null}
                  </div>
                  <div style={{ display: "grid", gap: 6 }}>
                    {summaryMaterials.map((m, idx) => (
                      <div
                        key={`${m.label}-${idx}`}
                        style={{
                          borderRadius: 12,
                          border: "1px solid rgba(15,23,42,0.10)",
                          background: "rgba(255,255,255,0.85)",
                          padding: "8px 10px",
                          fontSize: 12,
                          fontWeight: 900,
                          color: "#0f172a",
                        }}
                      >
                        Recurso: {m.label} • Quantidade: {m.qty}
                      </div>
                    ))}
                    {!summaryMaterials.length ? (
                      <div style={{ fontSize: 12, fontWeight: 900, color: "#64748b" }}>
                        Adicione ao menos um recurso para concluir.
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Alerta no modal */}
                {alertMsg && (
                  <div
                    style={{
                      marginTop: 12,
                      border: "1px solid rgba(239,68,68,0.28)",
                      borderRadius: 14,
                      padding: 12,
                      background: "rgba(239,68,68,0.12)",
                      color: "#991b1b",
                      fontWeight: 1100,
                      textAlign: "center",
                      boxShadow: "0 12px 26px rgba(239,68,68,0.18)",
                    }}
                  >
                    {alertMsg}
                  </div>
                )}

                {/* Mensagem erro */}
                {msg && (
                  <div
                    style={{
                      marginTop: 12,
                      border: "1px solid rgba(239,68,68,0.22)",
                      borderRadius: 14,
                      padding: 12,
                      background: "rgba(239,68,68,0.06)",
                      color: "#991b1b",
                      fontWeight: 1100,
                      textAlign: "center",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {msg}
                  </div>
                )}

                {/* Ações */}
                <div
                  style={{ marginTop: 16, display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}
                  className="modal-actions"
                >
                  <button type="button" onClick={() => setOpen(false)} disabled={saving} className="ux-btn ux-btn-ghost">
                    Cancelar
                  </button>

                  <button
                    type="button"
                    onClick={saveReservation}
                    disabled={saving}
                    className="ux-btn ux-btn-primary"
                  >
                    {saving ? "Salvando..." : "Confirmar agendamento"}
                  </button>
                </div>

                {!isAuthenticated ? (
                  <div style={{ marginTop: 12, display: "flex", justifyContent: "center" }}>
                    <button
                      type="button"
                      className="ux-btn ux-btn-primary"
                      onClick={() => {
                        setOpen(false);
                        setLoginMsg("");
                        setLoginOpen(true);
                      }}
                    >
                      Fazer login para agendar
                    </button>
                  </div>
                ) : null}

                {/* Rodapé dica */}
                <div style={{ marginTop: 10, color: "#64748b", fontWeight: 1100, fontSize: 12, textAlign: "center" }}>
                  <span style={{ display: "inline-flex", gap: 6, alignItems: "center", justifyContent: "center" }}>
                    <IconTeacher /> O responsável ficará salvo e aparecerá no calendário.
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap");

        .calendar-page .label {
          font-size: 12px;
          font-weight: 1100;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          text-align: center;
          margin-bottom: 6px;
        }
        .calendar-page .field {
          width: 100%;
          height: 46px !important;
          border-radius: 16px !important;
          border: 1px solid rgba(15, 23, 42, 0.14) !important;
          background: rgba(255, 255, 255, 0.95) !important;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7) !important;
          transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.12s ease;
          padding: 0 12px;
          font-weight: 900;
          text-align: center;
        }
        .calendar-page .field:focus {
          outline: none;
          border-color: rgba(16, 185, 129, 0.55) !important;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.16),
            inset 0 1px 0 rgba(255, 255, 255, 0.7) !important;
        }

        .calendar-page button {
          transition: transform 0.12s ease, box-shadow 0.2s ease, filter 0.2s ease;
        }
        .calendar-page button:hover:not(:disabled) {
          transform: translateY(-2px) rotate(-1.5deg);
          filter: brightness(0.99);
        }

        .calendar-page .ux-btn {
          height: 46px;
          padding: 0 16px;
          border-radius: 26px 14px 30px 12px;
          border: 1px solid rgba(15, 23, 42, 0.12);
          font-weight: 900;
          display: inline-flex;
          gap: 8px;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 10px 22px rgba(15, 23, 42, 0.12);
        }
        .calendar-page .ux-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          box-shadow: none;
        }
        .calendar-page .ux-btn-ghost {
          background: rgba(255, 255, 255, 0.92);
          color: #0b1324;
        }
        .calendar-page .ux-btn-primary {
          border: 1px solid rgba(16, 185, 129, 0.35);
          background: linear-gradient(90deg, rgba(16, 185, 129, 0.98), rgba(56, 189, 248, 0.98));
          color: white;
          box-shadow: 0 16px 30px rgba(16, 185, 129, 0.24);
        }
        .calendar-page .ux-btn-info {
          border: 1px solid rgba(56, 189, 248, 0.35);
          background: linear-gradient(90deg, rgba(56, 189, 248, 0.95), rgba(14, 165, 233, 0.95));
          color: #0b1220;
        }
        .calendar-page .ux-btn-danger {
          border: 1px solid rgba(239, 68, 68, 0.35);
          background: linear-gradient(90deg, rgba(239, 68, 68, 0.95), rgba(248, 113, 113, 0.95));
          color: white;
        }
        .calendar-page .calendar-mobile-selection-bar {
          display: none;
        }
        .calendar-page .calendar-mobile-filter-trigger-wrap {
          display: none;
        }
        .calendar-page .calendar-mobile-filters-overlay {
          display: none;
        }
        .calendar-page .calendar-fullscreen-mobile-cards {
          display: none;
        }
        .calendar-page .calendar-fullscreen-mobile-cta {
          display: none;
        }

        .calendar-page .th {
          padding: 12px;
          text-align: center;
          font-size: 12px;
          font-weight: 1100;
          color: #334155;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .calendar-page .calendar-table-scroll {
          scroll-behavior: smooth;
          -webkit-overflow-scrolling: touch;
        }
        .calendar-page .calendar-grid-table .th-sticky-col,
        .calendar-page .calendar-grid-table .td-sticky-col {
          position: static;
          left: auto;
          z-index: auto;
          background: transparent;
          box-shadow: none;
        }
        .calendar-page .calendar-full .calendar-grid-table .th-sticky-col,
        .calendar-page .calendar-full .calendar-grid-table .td-sticky-col {
          position: sticky;
          left: 0;
          z-index: 4;
          background: rgba(255, 255, 255, 0.98);
        }
        .calendar-page .calendar-full .calendar-grid-table .th-sticky-col {
          z-index: 6;
          box-shadow: 1px 0 0 rgba(15, 23, 42, 0.08);
        }
        .calendar-page .calendar-full .calendar-grid-table .td-sticky-col {
          box-shadow: 1px 0 0 rgba(15, 23, 42, 0.08);
        }
        .calendar-page .calendar-cell-btn {
          transition: transform 0.08s ease, box-shadow 0.12s ease, filter 0.12s ease;
          touch-action: manipulation;
        }
        .calendar-page .calendar-cell-btn:active {
          transform: scale(0.94);
          box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.34);
          filter: saturate(1.1);
        }
        .calendar-page .calendar-mobile-card-mode {
          max-width: 1200px;
          margin: 10px auto 0;
        }
        .calendar-page .calendar-mobile-table-hidden .calendar-table {
          display: none;
        }
        .calendar-page .calendar-cell-owner {
          max-width: 90px;
        }

        /* ✅ responsivo: no celular, filtros empilham */
        @media (max-width: 980px) {
          .calendar-page {
            background-attachment: scroll !important;
          }
          .calendar-page .filters-grid {
            grid-template-columns: repeat(6, 1fr) !important;
          }
          .calendar-page .col-cat {
            grid-column: span 3 !important;
          }
          .calendar-page .col-material {
            grid-column: span 3 !important;
          }
          .calendar-page .col-year {
            grid-column: span 3 !important;
          }
          .calendar-page .col-month {
            grid-column: span 3 !important;
          }
          .calendar-page .col-school {
            grid-column: span 6 !important;
          }
          .calendar-page .col-search {
            grid-column: span 6 !important;
          }
          .calendar-page .col-new {
            grid-column: span 6 !important;
          }
          .calendar-page .topbar {
            grid-template-columns: 1fr !important;
            justify-items: center !important;
            text-align: center;
          }
          .calendar-page .extlabel {
            display: none !important;
          }
        }

        @media (max-width: 560px) {
          .calendar-page {
            padding-bottom: calc(112px + env(safe-area-inset-bottom, 0px)) !important;
          }
          .calendar-page .calendar-filters-card {
            display: none !important;
          }
          .calendar-page .calendar-mobile-filter-trigger-wrap {
            display: block;
            max-width: 1200px;
            margin: 0 auto 10px;
          }
          .calendar-page .calendar-mobile-filter-trigger {
            width: 100% !important;
            height: 44px !important;
            border-radius: 14px !important;
          }
          .calendar-page .calendar-mobile-filters-overlay {
            position: fixed;
            inset: 0;
            z-index: 100001;
            background: rgba(15, 23, 42, 0.52);
            display: flex !important;
            align-items: flex-end;
            backdrop-filter: blur(6px);
          }
          .calendar-page .calendar-mobile-filters-sheet {
            width: 100%;
            max-height: 88vh;
            overflow: auto;
            background: rgba(255, 255, 255, 0.98);
            border-radius: 18px 18px 0 0;
            border: 1px solid rgba(15, 23, 42, 0.12);
            border-bottom: none;
            padding: 12px;
            padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px));
            box-shadow: 0 -18px 40px rgba(15, 23, 42, 0.25);
            -webkit-overflow-scrolling: touch;
            display: grid;
            gap: 10px;
          }
          .calendar-page .calendar-mobile-filters-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
          }
          .calendar-page .calendar-mobile-filters-grid {
            display: grid;
            gap: 8px;
          }
          .calendar-page .calendar-mobile-filters-subtitle {
            font-size: 12px;
            font-weight: 1000;
            color: #334155;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            margin-top: 4px;
          }
          .calendar-page .calendar-mobile-filters-actions {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }
          .calendar-page .calendar-month-header {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 8px !important;
          }
          .calendar-page .calendar-month-title {
            font-size: 13px !important;
            line-height: 1.3 !important;
          }
          .calendar-page .calendar-month-note,
          .calendar-page .calendar-month-count {
            display: block !important;
            margin-left: 0 !important;
            margin-top: 2px !important;
          }
          .calendar-page .calendar-month-actions {
            width: 100% !important;
            flex-wrap: nowrap !important;
            justify-content: flex-start !important;
            overflow-x: auto !important;
            -webkit-overflow-scrolling: touch;
            padding-bottom: 4px !important;
          }
          .calendar-page .calendar-selected-actions {
            width: auto !important;
            flex-wrap: nowrap !important;
          }
          .calendar-page .calendar-selected-actions {
            display: inline-flex !important;
          }
          .calendar-page .calendar-cell-owner {
            max-width: 68px !important;
          }
          .calendar-page .filters-grid {
            grid-template-columns: 1fr !important;
          }
          .calendar-page .col-cat,
          .calendar-page .col-material,
          .calendar-page .col-year,
          .calendar-page .col-month,
          .calendar-page .col-school,
          .calendar-page .col-search,
          .calendar-page .col-new {
            grid-column: span 1 !important;
          }
          .calendar-page .topbar {
            gap: 16px !important;
          }
          .calendar-page .topbar h1 {
            font-size: 20px !important;
            line-height: 1.2 !important;
          }
          .calendar-page .hero-title {
            font-size: 20px !important;
            line-height: 1.2 !important;
          }
          .calendar-page .hero-chips {
            width: 100% !important;
          }
          .calendar-page .toast-success,
          .calendar-page .toast-alert {
            top: 10px !important;
            padding: 10px 12px !important;
            font-size: 12px !important;
            gap: 8px !important;
            width: min(94vw, 560px) !important;
          }
          .calendar-page .topbar p {
            font-size: 12px !important;
          }
          .calendar-page .ux-btn {
            width: 100% !important;
            justify-content: center !important;
            min-height: 44px !important;
          }
          .calendar-page .smart-actions {
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .calendar-page .smart-actions .ux-btn {
            width: 100% !important;
          }
          .calendar-page .smart-grid {
            grid-template-columns: 1fr !important;
          }
          .calendar-page .smart-grid > div {
            grid-column: span 12 !important;
          }
          .calendar-page .calendar-modal-overlay {
            align-items: flex-start !important;
            padding-top: 12px !important;
            padding-bottom: 12px !important;
          }
          .calendar-page .calendar-modal {
            width: min(96vw, 980px) !important;
            max-height: 94vh !important;
            padding: 12px !important;
            border-radius: 18px !important;
          }
          .calendar-page .modal-section {
            padding: 10px !important;
          }
          .calendar-page .modal-grid-12 input,
          .calendar-page .modal-grid-12 select {
            font-size: 14px !important;
          }
          .calendar-page .modal-grid-12 {
            grid-template-columns: 1fr !important;
            text-align: left !important;
          }
          .calendar-page .modal-grid-12 > div {
            grid-column: span 12 !important;
          }
          .calendar-page .modal-material-row {
            grid-template-columns: 1fr !important;
          }
          .calendar-page .modal-material-row select,
          .calendar-page .modal-material-row input {
            width: 100% !important;
          }
          .calendar-page .modal-actions {
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .calendar-page .modal-actions .ux-btn {
            width: 100% !important;
          }
          .calendar-page .modal-periods button {
            min-width: 44px !important;
            height: 36px !important;
          }
          .calendar-page .modal-periods {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            align-items: start !important;
            width: 100% !important;
          }
          .calendar-page .modal-periods > div {
            min-width: 0 !important;
            width: 100% !important;
          }
          .calendar-page .modal-periods select {
            min-width: 0 !important;
            width: 100% !important;
          }
          .calendar-page .modal-day-summary {
            flex-direction: column !important;
            align-items: flex-start !important;
          }
          .calendar-page .modal-day-summary span {
            overflow-wrap: anywhere !important;
          }
          .calendar-full .th {
            padding: 8px 6px !important;
            font-size: 11px !important;
          }
          .calendar-full td {
            padding: 8px 6px !important;
            font-size: 11px !important;
          }
          .calendar-full .th,
          .calendar-full td {
            white-space: nowrap;
          }
          .calendar-page .calendar-fullscreen-shell {
            padding: 10px !important;
            border-radius: 0 !important;
          }
          .calendar-page .calendar-fullscreen-table {
            display: none !important;
          }
          .calendar-page .calendar-fullscreen-mobile-cards {
            display: grid !important;
            gap: 10px;
            padding-bottom: calc(96px + env(safe-area-inset-bottom, 0px));
          }
          .calendar-page .calendar-mobile-card-mode .calendar-fullscreen-mobile-cards {
            display: grid !important;
            padding-bottom: calc(124px + env(safe-area-inset-bottom, 0px));
          }
          .calendar-page .calendar-mobile-day-card {
            border: 1px solid rgba(15, 23, 42, 0.12);
            border-radius: 14px;
            background: rgba(255, 255, 255, 0.96);
            box-shadow: 0 12px 24px rgba(15, 23, 42, 0.1);
            padding: 10px;
            display: grid;
            gap: 10px;
          }
          .calendar-page .calendar-mobile-day-head {
            display: grid;
            gap: 6px;
          }
          .calendar-page .calendar-mobile-day-date {
            font-size: 13px;
            font-weight: 1000;
            color: #0f172a;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            flex-wrap: wrap;
          }
          .calendar-page .calendar-mobile-day-today {
            padding: 3px 8px;
            border-radius: 999px;
            border: 1px solid rgba(16, 185, 129, 0.24);
            background: rgba(16, 185, 129, 0.1);
            color: #065f46;
            font-size: 10px;
            font-weight: 1000;
          }
        .calendar-page .calendar-mobile-day-badges {
          display: flex;
          gap: 6px;
          align-items: center;
          flex-wrap: wrap;
        }
        .calendar-page .calendar-mobile-day-details {
          display: grid;
          gap: 8px;
        }
        .calendar-page .calendar-mobile-day-summary-toggle {
          list-style: none;
          cursor: pointer;
          min-height: 44px;
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid rgba(148, 163, 184, 0.28);
          background: rgba(255, 255, 255, 0.94);
          font-size: 11px;
          font-weight: 1000;
          color: #0f172a;
        }
        .calendar-page .calendar-mobile-day-summary-toggle::-webkit-details-marker {
          display: none;
        }
        .calendar-page .calendar-mobile-day-details[open] .calendar-mobile-day-summary-toggle {
          background: rgba(16, 185, 129, 0.08);
          border-color: rgba(16, 185, 129, 0.24);
        }
          .calendar-page .calendar-mobile-day-weekday {
            font-size: 11px;
            color: #64748b;
            font-weight: 1000;
          }
          .calendar-page .calendar-mobile-period-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 8px;
          }
          .calendar-page .calendar-mobile-period-btn {
            border: 1px solid rgba(148, 163, 184, 0.3);
            border-radius: 12px;
            background: rgba(248, 250, 252, 0.96);
            min-height: 88px;
            min-width: 44px;
            display: grid;
            justify-items: center;
            align-content: center;
            gap: 5px;
            padding: 8px 6px;
          }
          .calendar-page .calendar-mobile-period-label {
            font-size: 11px;
            font-weight: 1000;
            color: #0f172a;
            line-height: 1;
          }
          .calendar-page .calendar-mobile-period-info {
            max-width: 100%;
            font-size: 10px;
            font-weight: 900;
            color: #475569;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .calendar-page .calendar-fullscreen-content {
            -webkit-overflow-scrolling: touch !important;
          }
          .calendar-page .calendar-fullscreen-mobile-cta {
            position: absolute;
            left: 10px;
            right: 10px;
            bottom: calc(10px + env(safe-area-inset-bottom, 0px));
            z-index: 3;
            display: grid !important;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            padding: 8px;
            border-radius: 14px;
            border: 1px solid rgba(15, 23, 42, 0.12);
            background: rgba(255, 255, 255, 0.96);
            box-shadow: 0 14px 36px rgba(15, 23, 42, 0.22);
            backdrop-filter: blur(10px);
          }
          .calendar-page .calendar-mobile-selection-bar {
            position: fixed;
            left: 10px;
            right: 10px;
            bottom: calc(10px + env(safe-area-inset-bottom, 0px));
            z-index: 9998;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            padding: 8px;
            border-radius: 14px;
            border: 1px solid rgba(15, 23, 42, 0.12);
            background: rgba(255, 255, 255, 0.96);
            box-shadow: 0 14px 36px rgba(15, 23, 42, 0.22);
            backdrop-filter: blur(10px);
          }
          .calendar-page .calendar-mobile-selection-count {
            grid-column: 1 / -1;
            font-size: 12px;
            font-weight: 1000;
            color: #0f172a;
            text-align: center;
          }
          .calendar-page .calendar-mobile-selection-bar .ux-btn {
            height: 44px !important;
            width: 100% !important;
            border-radius: 12px !important;
            padding: 0 10px !important;
          }
        }
        @media (max-width: 420px) {
          .calendar-page .modal-periods {
            grid-template-columns: 1fr !important;
          }
        }

        @keyframes floatIn {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Evita “espaço branco” ao puxar a tela e mantém o fundo */
        html,
        body {
          background: transparent;
          overscroll-behavior-y: none;
        }

        .mobile-only {
          display: none;
        }
        @media (max-width: 768px) {
          .mobile-only {
            display: flex;
          }
        }
      `}</style>
    </main>
  );
}
