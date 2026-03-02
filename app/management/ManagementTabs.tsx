"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import HomeTopButton from "../components/HomeTopButton";
import SchoolLogo from "../components/SchoolLogo";
import {
  ShieldCheck,
  Loader2,
  Trash2,
  FileDown,
  Plus,
  X,
  Sun,
  Sunset,
  MoonStar,
  Printer,
  Check,
} from "lucide-react";

type SubstituteRow = {
  id: string;
  name: string;
  area: string;
  phone: string | null;
  notes: string | null;
  created_at: string;
};

type MaterialRow = {
  id: string;
  material: string;
  qty: number;
  recipient_name: string;
  recipient_type: string;
  school_class: string;
  location: string;
  period: string;
  delivered_at: string;
  created_at: string;
};
type SchoolClassOption = {
  id: string;
  name: string;
  period: string | null;
};
type StudentRow = {
  id: string;
  name: string;
  school_id: string;
  class_id: string | null;
  class_name: string | null;
  active: boolean;
};
type TeacherOption = {
  id: string;
  name: string;
  active: boolean;
  school_ids: string[];
};
type MaterialRecipient = {
  name: string;
  teacherId: string;
  studentId: string;
  schoolClass: string;
  items: { material: string; qty: number }[];
};

type TabKey = "materials" | "substitutes" | "prints" | "publications" | "finance";
type PrintJobRow = {
  id: string;
  created_at: string;
  created_by_name: string;
  location: string;
  file_name: string;
  file_path: string;
  title: string | null;
  period: string | null;
  printed: boolean;
  printed_at: string | null;
  url: string;
};

type PublicationStatus = "pending" | "published" | "rejected";
type PublicationRow = {
  id: string;
  batch_id: string;
  created_at: string;
  created_by_name: string;
  location: string | null;
  description: string;
  status: PublicationStatus;
  review_note: string | null;
  photo_name: string;
  url: string;
};
type GroupedPublication = {
  batchId: string;
  createdAt: string;
  createdByName: string;
  location: string | null;
  description: string;
  status: PublicationStatus;
  reviewNote: string | null;
  photos: PublicationRow[];
};
type FinanceType = "entry" | "exit";
type FinanceCategory =
  | "cash"
  | "school_income"
  | "event_income"
  | "expense"
  | "accounts_payable"
  | "custom";
type FinanceRange = "monthly" | "annual";
type FinanceCategoryFilter = "all" | FinanceCategory;
type FinanceStatusFilter = "all" | "paid" | "pending";
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
  createdAt: string;
};

type School = {
  id: string;
  name: string;
  active: boolean;
  logo_url?: string | null;
};

type AdminScopeState = {
  allowedPeriods: string[];
  allowedLocations: string[];
  defaultPeriod: string | null;
  defaultLocation: string | null;
  isSuperAdmin: boolean;
};

export default function ManagementTabs({
  initialTab = "materials",
  showBack = false,
}: {
  initialTab?: TabKey;
  showBack?: boolean;
}) {
  function errorMessage(err: unknown, fallback: string) {
    return err instanceof Error ? err.message : fallback;
  }

  const searchParams = useSearchParams();
  const [tab, setTab] = useState<TabKey>(initialTab);
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(new Date().getMonth() + 1);

  const [isAdmin, setIsAdmin] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [adminScope, setAdminScope] = useState<AdminScopeState>({
    allowedPeriods: [],
    allowedLocations: [],
    defaultPeriod: null,
    defaultLocation: null,
    isSuperAdmin: false,
  });
  const [authEmail, setAuthEmail] = useState("");
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginMsg, setLoginMsg] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [subs, setSubs] = useState<SubstituteRow[]>([]);
  const [subsLoading, setSubsLoading] = useState(false);
  const [subsMsg, setSubsMsg] = useState("");
  const [subName, setSubName] = useState("");
  const [subArea, setSubArea] = useState("");
  const [subAreaOther, setSubAreaOther] = useState("");
  const [subPhone, setSubPhone] = useState("");
  const [subNotes, setSubNotes] = useState("");
  const [subSearch, setSubSearch] = useState("");
  const [subAreaFilter, setSubAreaFilter] = useState("");
  const [subSearchMsg, setSubSearchMsg] = useState("");
  const [subsVisibleCount, setSubsVisibleCount] = useState(10);

  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [matLoading, setMatLoading] = useState(false);
  const [matMsg, setMatMsg] = useState("");
  const [matRecipients, setMatRecipients] = useState<MaterialRecipient[]>([
    { name: "", teacherId: "", studentId: "", schoolClass: "", items: [{ material: "", qty: 1 }] },
  ]);
  const [matRecipientType, setMatRecipientType] = useState("");
  const [matClass, setMatClass] = useState("");
  const [matLocation, setMatLocation] = useState("Antonio Valadares - SED");
  const [matPeriod, setMatPeriod] = useState("matutino");
  const [matDate, setMatDate] = useState("");
  const [matSearch, setMatSearch] = useState("");
  const [matSearchDate, setMatSearchDate] = useState("");
  const [matPage, setMatPage] = useState(1);
  const [matPeriodReport, setMatPeriodReport] = useState("");
  const [matRecipientTypeReport, setMatRecipientTypeReport] = useState("geral");
  const [matSearchMsg, setMatSearchMsg] = useState("");
  const [classOptions, setClassOptions] = useState<SchoolClassOption[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [studentName, setStudentName] = useState("");
  const [studentClassId, setStudentClassId] = useState("");
  const [studentLoading, setStudentLoading] = useState(false);
  const [studentMsg, setStudentMsg] = useState("");
  const [printJobs, setPrintJobs] = useState<PrintJobRow[]>([]);
  const [printLoading, setPrintLoading] = useState(false);
  const [printMsg, setPrintMsg] = useState("");
  const [printLocationFilter, setPrintLocationFilter] = useState("");
  const [printStatusFilter, setPrintStatusFilter] = useState("pending");
  const [printPeriodFilter, setPrintPeriodFilter] = useState("matutino");
  const [printSearch, setPrintSearch] = useState("");
  const [printPage, setPrintPage] = useState(1);
  const [printDownloadingId, setPrintDownloadingId] = useState("");
  const [pubRows, setPubRows] = useState<PublicationRow[]>([]);
  const [pubLoading, setPubLoading] = useState(false);
  const [pubMsg, setPubMsg] = useState("");
  const [pubStatusFilter, setPubStatusFilter] = useState<PublicationStatus | "all">("pending");
  const [pubSavingBatch, setPubSavingBatch] = useState("");
  const [pubDownloadingBatch, setPubDownloadingBatch] = useState("");
  const [pubGalleryBatchId, setPubGalleryBatchId] = useState<string | null>(null);
  const [pubVisibleCount, setPubVisibleCount] = useState(8);
  const [showSearchMaterials, setShowSearchMaterials] = useState(false);
  const [showSearchPrints, setShowSearchPrints] = useState(false);
  const [showSearchSubstitutes, setShowSearchSubstitutes] = useState(false);
  const [financeRows, setFinanceRows] = useState<FinanceRow[]>([]);
  const [finMsg, setFinMsg] = useState("");
  const [finDate, setFinDate] = useState("");
  const [finDescription, setFinDescription] = useState("");
  const [finAmount, setFinAmount] = useState("");
  const [finType, setFinType] = useState<FinanceType>("entry");
  const [finCategory, setFinCategory] = useState<FinanceCategory>("cash");
  const [finMethod, setFinMethod] = useState("Dinheiro");
  const [finNotes, setFinNotes] = useState("");
  const [finCustomCategory, setFinCustomCategory] = useState("");
  const [finCustomCategoryNew, setFinCustomCategoryNew] = useState("");
  const [finDueDate, setFinDueDate] = useState("");
  const [finPaid, setFinPaid] = useState(false);
  const [finExporting, setFinExporting] = useState(false);
  const [finTransparencyExporting, setFinTransparencyExporting] = useState(false);
  const [financeRange, setFinanceRange] = useState<FinanceRange>("monthly");
  const [financeCategoryFilter, setFinanceCategoryFilter] = useState<FinanceCategoryFilter>("all");
  const [financeStatusFilter, setFinanceStatusFilter] = useState<FinanceStatusFilter>("all");
  const [financeTextFilter, setFinanceTextFilter] = useState("");
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [financeYear, setFinanceYear] = useState(new Date().getFullYear());
  const [financeMonth, setFinanceMonth] = useState(new Date().getMonth() + 1);

  const [schools, setSchools] = useState<School[]>([]);
  const [reportSchoolId, setReportSchoolId] = useState("");
  const [overviewDate, setOverviewDate] = useState("");
  const [overviewEndDate, setOverviewEndDate] = useState("");
  const [overviewSchoolId, setOverviewSchoolId] = useState("");
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewMsg, setOverviewMsg] = useState("");
  const [showOverviewSearch, setShowOverviewSearch] = useState(false);
  const [overviewData, setOverviewData] = useState<
    Record<
      string,
      { id: string; who: string; schoolClass: string; schoolName: string; period: string; items: string[] }[]
    >
  >({});

  const subsResultsRef = useRef<HTMLDivElement | null>(null);
  const matsResultsRef = useRef<HTMLDivElement | null>(null);
  const printResultsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem("mutare_management_mobile_prefs_v1");
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        showSearchMaterials?: boolean;
        showSearchPrints?: boolean;
        showSearchSubstitutes?: boolean;
        subsVisibleCount?: number;
        pubVisibleCount?: number;
      };
      if (typeof parsed.showSearchMaterials === "boolean") setShowSearchMaterials(parsed.showSearchMaterials);
      if (typeof parsed.showSearchPrints === "boolean") setShowSearchPrints(parsed.showSearchPrints);
      if (typeof parsed.showSearchSubstitutes === "boolean") setShowSearchSubstitutes(parsed.showSearchSubstitutes);
      if (Number.isFinite(parsed.subsVisibleCount) && Number(parsed.subsVisibleCount) >= 10) {
        setSubsVisibleCount(Number(parsed.subsVisibleCount));
      }
      if (Number.isFinite(parsed.pubVisibleCount) && Number(parsed.pubVisibleCount) >= 8) {
        setPubVisibleCount(Number(parsed.pubVisibleCount));
      }
    } catch {
      // ignore storage parse errors
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(
      "mutare_management_mobile_prefs_v1",
      JSON.stringify({
        showSearchMaterials,
        showSearchPrints,
        showSearchSubstitutes,
        subsVisibleCount,
        pubVisibleCount,
      })
    );
  }, [showSearchMaterials, showSearchPrints, showSearchSubstitutes, subsVisibleCount, pubVisibleCount]);

  const years = useMemo(() => {
    const current = new Date().getFullYear();
    const start = 2026;
    const end = Math.max(current, start);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, []);
  const monthOptions = useMemo(
    () => [
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
    ],
    []
  );
  const reportSchool = useMemo(
    () => schools.find((school) => school.id === reportSchoolId) ?? null,
    [schools, reportSchoolId]
  );
  const reportSchoolName = reportSchool?.name || "Escola não informada";

  const areaOptions = useMemo(
    () => [
      "Língua Portuguesa",
      "Literatura",
      "Língua Inglesa",
      "Língua Espanhola",
      "Arte",
      "Educação Física",
      "Matemática",
      "Biologia",
      "Física",
      "Química",
      "História",
      "Geografia",
      "Filosofia",
      "Sociologia",
      "Ciências",
      "Outros",
    ],
    []
  );

  const printLocations = useMemo(
    () => ["Antonio Valadares - SED", "Antonio Valadares - Extensão"],
    []
  );
  const visiblePeriods = useMemo(
    () =>
      adminScope.allowedPeriods.length
        ? ["matutino", "vespertino", "noturno"].filter((p) => adminScope.allowedPeriods.includes(p))
        : ["matutino", "vespertino", "noturno"],
    [adminScope.allowedPeriods]
  );
  const visiblePrintLocations = useMemo(
    () =>
      adminScope.allowedLocations.length
        ? printLocations.filter((loc) => adminScope.allowedLocations.includes(loc))
        : printLocations,
    [adminScope.allowedLocations, printLocations]
  );
  const studentsByClass = useMemo(() => {
    const map = new Map<string, StudentRow[]>();
    for (const s of students) {
      const key = String(s.class_name ?? "").trim();
      if (!key) continue;
      const list = map.get(key) ?? [];
      list.push(s);
      map.set(key, list);
    }
    return map;
  }, [students]);

  function isScopeAccessMessage(message: string) {
    const m = message.toLowerCase();
    return m.includes("sem acesso a este período") || m.includes("sem acesso a esta escola/local");
  }

  function normalizeLookupName(value: string) {
    return String(value ?? "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  async function refreshAdmin(session?: { access_token?: string } | null) {
    const token = session?.access_token ?? "";
    if (!token) {
      setIsAdmin(false);
      setAdminScope({
        allowedPeriods: [],
        allowedLocations: [],
        defaultPeriod: null,
        defaultLocation: null,
        isSuperAdmin: false,
      });
      return;
    }
    try {
      const res = await fetch("/api/admin/me", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      setIsAdmin(!!data?.isAdmin);
      setAdminScope({
        allowedPeriods: Array.isArray(data?.allowedPeriods)
          ? data.allowedPeriods.map((x: unknown) => String(x))
          : [],
        allowedLocations: Array.isArray(data?.allowedLocations)
          ? data.allowedLocations.map((x: unknown) => String(x))
          : [],
        defaultPeriod: data?.defaultPeriod ? String(data.defaultPeriod) : null,
        defaultLocation: data?.defaultLocation ? String(data.defaultLocation) : null,
        isSuperAdmin: !!data?.isSuperAdmin,
      });
    } catch {
      setIsAdmin(false);
      setAdminScope({
        allowedPeriods: [],
        allowedLocations: [],
        defaultPeriod: null,
        defaultLocation: null,
        isSuperAdmin: false,
      });
    }
  }

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      setAuthEmail(data.session?.user?.email ?? "");
      await refreshAdmin(data.session ?? null);
      if (!active) return;
      setAuthChecking(false);
    })();
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthEmail(session?.user?.email ?? "");
      void (async () => {
        await refreshAdmin(session ?? null);
        setAuthChecking(false);
      })();
    });
    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

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
    setYear(picked);
  }, [searchParams]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("eeav_year", String(year));
  }, [year]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!reportSchoolId) return;
    localStorage.setItem("mutare_selected_school_id", reportSchoolId);
  }, [reportSchoolId]);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    setFinDate(today);
    setFinDueDate(today);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem("eeav_finance_records_v1");
      if (!raw) return;
      const parsed = JSON.parse(raw) as FinanceRow[];
      if (!Array.isArray(parsed)) return;
      setFinanceRows(
        parsed
          .filter((item) => item && typeof item === "object")
          .map((item) => ({
            id: String(item.id ?? crypto.randomUUID()),
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
            method: String(item.method ?? "Dinheiro"),
            notes: String(item.notes ?? ""),
            customCategory: item.customCategory ? String(item.customCategory) : null,
            dueDate: item.dueDate ? String(item.dueDate) : null,
            paid: Boolean(item.paid),
            createdAt: String(item.createdAt ?? ""),
          }))
      );
    } catch {
      setFinanceRows([]);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("eeav_finance_records_v1", JSON.stringify(financeRows));
  }, [financeRows]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem("eeav_finance_custom_categories_v1");
      if (!raw) return;
      const parsed = JSON.parse(raw) as string[];
      if (!Array.isArray(parsed)) return;
      const cleaned = parsed
        .map((item) => String(item ?? "").trim())
        .filter((item) => !!item)
        .slice(0, 60);
      setCustomCategories(Array.from(new Set(cleaned)));
    } catch {
      setCustomCategories([]);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("eeav_finance_custom_categories_v1", JSON.stringify(customCategories));
  }, [customCategories]);

  async function handleLogin() {
    setLoginMsg("");
    setLoginLoading(true);
    const rawLogin = loginEmail.trim();
    const email = rawLogin.includes("@")
      ? rawLogin.toLowerCase()
      : rawLogin
          .trim()
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/\s+/g, ".")
          .replace(/[^a-z0-9._-]/g, "")
          .replace(/\.+/g, ".")
          .replace(/^\.|\.$/g, "") + "@local.eeav";
    if (!email || email.startsWith("@")) {
      setLoginMsg("Usuário inválido.");
      setLoginLoading(false);
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: loginPassword,
    });
    if (error) {
      setLoginMsg("Login inválido.");
      setLoginLoading(false);
      return;
    }
    setLoginLoading(false);
    setLoginOpen(false);
    setLoginPassword("");
  }

  async function loadSubstitutes() {
    setSubsLoading(true);
    setSubsMsg("");
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token ?? "";
      const res = await fetch("/api/management/substitutes", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Erro ao carregar substitutos.");
      setSubs(data.data ?? []);
    } catch (err: unknown) {
      setSubs([]);
      setSubsMsg(errorMessage(err, "Erro ao carregar substitutos."));
    } finally {
      setSubsLoading(false);
    }
  }

  async function loadMaterials() {
    setMatLoading(true);
    setMatMsg("");
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token ?? "";
      const res = await fetch(
        `/api/management/materials?year=${year}&month=${month}&period=${encodeURIComponent(matPeriod)}&school_id=${encodeURIComponent(reportSchoolId)}`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Erro ao carregar materiais.");
      setMaterials(data.data ?? []);
    } catch (err: unknown) {
      const message = errorMessage(err, "Erro ao carregar materiais.");
      if (!isScopeAccessMessage(message)) {
        setMaterials([]);
        setMatMsg(message);
      }
    } finally {
      setMatLoading(false);
    }
  }

  async function loadPrintJobs() {
    setPrintLoading(true);
    setPrintMsg("");
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token ?? "";
      const url = `/api/management/print-jobs?location=${encodeURIComponent(
        printLocationFilter
      )}&status=${encodeURIComponent(printStatusFilter)}&period=${encodeURIComponent(
        printPeriodFilter
      )}`;
      const res = await fetch(url, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Erro ao carregar impressões.");
      setPrintJobs(data.data ?? []);
    } catch (err: unknown) {
      const message = errorMessage(err, "Erro ao carregar impressões.");
      if (!isScopeAccessMessage(message)) {
        setPrintJobs([]);
        setPrintMsg(message);
      }
    } finally {
      setPrintLoading(false);
    }
  }

  async function loadSchools() {
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token ?? "";
      const res = await fetch("/api/schools/list", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setSchools(data.data ?? []);
      }
    } catch {
      setSchools([]);
    }
  }

  async function loadClassOptions(targetSchoolId: string) {
    if (!targetSchoolId) {
      setClassOptions([]);
      return;
    }
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token ?? "";
      const res = await fetch("/api/classes/list", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ year, school_id: targetSchoolId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Erro ao carregar turmas.");
      const nextOptions = Array.isArray(data.data)
        ? data.data.map((row: { id?: string; name?: string; period?: string | null }) => ({
            id: String(row.id ?? ""),
            name: String(row.name ?? "").trim(),
            period: row.period ? String(row.period) : null,
          }))
        : [];
      setClassOptions(nextOptions.filter((c) => c.id && c.name));
    } catch {
      setClassOptions([]);
    }
  }

  async function loadStudents(targetSchoolId: string) {
    if (!targetSchoolId) {
      setStudents([]);
      return;
    }
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token ?? "";
      const res = await fetch("/api/students/list", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ school_id: targetSchoolId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Erro ao carregar alunos.");
      setStudents(Array.isArray(data.data) ? data.data : []);
    } catch {
      setStudents([]);
    }
  }

  async function loadTeachers(targetSchoolId: string) {
    if (!targetSchoolId) {
      setTeachers([]);
      return;
    }
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token ?? "";
      const res = await fetch("/api/teachers/list", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Erro ao carregar professores.");
      const all = Array.isArray(data.data) ? data.data : [];
      const scoped = all
        .map((row: { id?: unknown; name?: unknown; active?: unknown; school_ids?: unknown }) => ({
          id: String(row.id ?? ""),
          name: String(row.name ?? "").trim(),
          active: !!row.active,
          school_ids: Array.isArray(row.school_ids)
            ? row.school_ids.map((v) => String(v ?? "").trim()).filter(Boolean)
            : [],
        }))
        .filter((row: TeacherOption) => row.active && row.name && row.school_ids.includes(targetSchoolId));
      setTeachers(scoped);
    } catch {
      setTeachers([]);
    }
  }

  async function addStudent() {
    setStudentMsg("");
    if (!reportSchoolId) {
      setStudentMsg("Selecione a escola para cadastrar aluno.");
      return;
    }
    const cleanName = studentName.trim();
    if (!cleanName) {
      setStudentMsg("Informe o nome do aluno.");
      return;
    }
    if (!studentClassId) {
      setStudentMsg("Selecione a turma do aluno.");
      return;
    }
    setStudentLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token ?? "";
      const res = await fetch("/api/students/create", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          school_id: reportSchoolId,
          class_id: studentClassId,
          name: cleanName,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Erro ao cadastrar aluno.");
      setStudentName("");
      await loadStudents(reportSchoolId);
    } catch (err: unknown) {
      setStudentMsg(errorMessage(err, "Erro ao cadastrar aluno."));
    } finally {
      setStudentLoading(false);
    }
  }

  async function loadPublications() {
    setPubLoading(true);
    setPubMsg("");
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token ?? "";
      const query = pubStatusFilter === "all" ? "" : `?status=${encodeURIComponent(pubStatusFilter)}`;
      const res = await fetch(`/api/management/activity-submissions${query}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Erro ao carregar publicações.");
      setPubRows(data.data ?? []);
    } catch (err: unknown) {
      const message = errorMessage(err, "Erro ao carregar publicações.");
      if (!isScopeAccessMessage(message)) {
        setPubRows([]);
        setPubMsg(message);
      }
    } finally {
      setPubLoading(false);
    }
  }

  async function loadOverview() {
    if (!overviewDate) {
      setOverviewMsg("Selecione uma data.");
      return;
    }
    const endDate = overviewEndDate || overviewDate;
    setOverviewLoading(true);
    setOverviewMsg("");
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token ?? "";
      const url = `/api/management/reservations-overview?start_date=${overviewDate}&end_date=${endDate}&school_id=${overviewSchoolId}`;
      const res = await fetch(url, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Erro ao carregar panorama.");
      setOverviewData(data.data ?? {});
      if (!Object.keys(data.data ?? {}).length) {
        setOverviewMsg("Nenhum agendamento encontrado no período.");
      }
    } catch (err: unknown) {
      setOverviewData({});
      setOverviewMsg(errorMessage(err, "Erro ao carregar panorama."));
    } finally {
      setOverviewLoading(false);
    }
  }

  useEffect(() => {
    if (!isAdmin) return;
    loadSubstitutes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    loadMaterials();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, year, month, matPeriod, reportSchoolId]);

  useEffect(() => {
    if (!isAdmin) return;
    loadPrintJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, printLocationFilter, printStatusFilter, printPeriodFilter]);

  useEffect(() => {
    if (!isAdmin) return;
    loadSchools();
  }, [isAdmin]);

  useEffect(() => {
    if (!schools.length) return;
    if (!reportSchoolId || !schools.some((school) => school.id === reportSchoolId)) {
      setReportSchoolId(schools[0].id);
    }
  }, [schools, reportSchoolId]);

  useEffect(() => {
    if (!isAdmin || !reportSchoolId) {
      setClassOptions([]);
      setStudents([]);
      setTeachers([]);
      return;
    }
    void loadClassOptions(reportSchoolId);
    void loadStudents(reportSchoolId);
    void loadTeachers(reportSchoolId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, reportSchoolId, year]);

  useEffect(() => {
    if (!reportSchool?.name) return;
    setMatLocation(reportSchool.name);
  }, [reportSchool?.name]);

  useEffect(() => {
    if (!classOptions.length) {
      setMatClass("");
      setStudentClassId("");
      return;
    }
    if (!matClass || !classOptions.some((c) => c.name === matClass)) {
      setMatClass(classOptions[0].name);
    }
    if (!studentClassId || !classOptions.some((c) => c.id === studentClassId)) {
      setStudentClassId(classOptions[0].id);
    }
  }, [classOptions, matClass, studentClassId]);

  useEffect(() => {
    setMatRecipients((prev) =>
      prev.map((r) => ({
        ...r,
        teacherId: matRecipientType === "professor" ? r.teacherId : "",
        studentId: matRecipientType === "aluno" ? r.studentId : "",
      }))
    );
  }, [matRecipientType]);

  useEffect(() => {
    if (!isAdmin || tab !== "publications") return;
    loadPublications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, tab, pubStatusFilter]);

  useEffect(() => {
    if (!isAdmin) return;

    const nextPeriod = adminScope.defaultPeriod || adminScope.allowedPeriods[0] || "matutino";
    if (adminScope.allowedPeriods.length && !adminScope.allowedPeriods.includes(matPeriod)) {
      setMatPeriod(nextPeriod);
    }
    if (adminScope.allowedPeriods.length && !adminScope.allowedPeriods.includes(printPeriodFilter)) {
      setPrintPeriodFilter(nextPeriod);
    }
    if (
      matPeriodReport &&
      adminScope.allowedPeriods.length &&
      !adminScope.allowedPeriods.includes(matPeriodReport)
    ) {
      setMatPeriodReport(nextPeriod);
    }

    const nextLocation = adminScope.defaultLocation || adminScope.allowedLocations[0] || "";
    if (
      adminScope.allowedLocations.length &&
      (!printLocationFilter || !adminScope.allowedLocations.includes(printLocationFilter))
    ) {
      setPrintLocationFilter(nextLocation);
    }
  }, [
    isAdmin,
    adminScope.allowedPeriods,
    adminScope.allowedLocations,
    adminScope.defaultPeriod,
    adminScope.defaultLocation,
    matPeriod,
    printPeriodFilter,
    matPeriodReport,
    printLocationFilter,
  ]);

  useEffect(() => {
    setPrintPeriodFilter(matPeriod);
  }, [matPeriod]);

  const filteredPrintJobs = useMemo(() => {
    const q = printSearch.trim().toLowerCase();
    if (!q) return printJobs;
    return printJobs.filter((job) =>
      [job.created_by_name, job.title || "", job.file_name]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [printJobs, printSearch]);

  const printPerPage = 15;
  const totalPrintPages = Math.max(1, Math.ceil(filteredPrintJobs.length / printPerPage));
  const pagedPrintJobs = useMemo(() => {
    const start = (printPage - 1) * printPerPage;
    return filteredPrintJobs.slice(start, start + printPerPage);
  }, [filteredPrintJobs, printPage]);

  useEffect(() => {
    const q = printSearch.trim();
    if (!q) return;
    if (filteredPrintJobs.length) {
      printResultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [printSearch, filteredPrintJobs.length]);

  useEffect(() => {
    setPrintPage(1);
  }, [printSearch, printLocationFilter, printStatusFilter, printPeriodFilter]);

  useEffect(() => {
    setMatPage(1);
  }, [matSearch, matSearchDate, matPeriod, reportSchoolId, year, month]);

  const substituteAreas = useMemo(() => {
    const set = new Set<string>();
    subs.forEach((s) => {
      if (s.area) set.add(s.area);
    });
    return Array.from(set).sort();
  }, [subs]);

  const filteredSubs = useMemo(() => {
    const q = subSearch.trim().toLowerCase();
    return subs.filter((s) => {
      const matchName = !q ? true : s.name.toLowerCase().includes(q);
      const matchArea = !subAreaFilter ? true : s.area === subAreaFilter;
      return matchName && matchArea;
    });
  }, [subs, subSearch, subAreaFilter]);

  const subsDisplay = useMemo(
    () => filteredSubs.slice(0, Math.max(10, subsVisibleCount)),
    [filteredSubs, subsVisibleCount]
  );

  const filteredMaterials = useMemo(() => {
    const q = matSearch.trim().toLowerCase();
    const date = matSearchDate.trim();
    return materials.filter((m) => {
      const matchText = !q
        ? true
        : [m.material, m.recipient_name, m.school_class, m.recipient_type, m.location, m.period]
            .join(" ")
            .toLowerCase()
            .includes(q);
      const matchDate = !date ? true : m.delivered_at === date;
      const matchPeriod = !matPeriod ? true : m.period === matPeriod;
      return matchText && matchDate && matchPeriod;
    });
  }, [materials, matSearch, matSearchDate, matPeriod]);

  const matPerPage = 5;
  const totalMatPages = Math.max(1, Math.ceil(filteredMaterials.length / matPerPage));
  const materialsDisplay = useMemo(() => {
    const start = (matPage - 1) * matPerPage;
    return filteredMaterials.slice(start, start + matPerPage);
  }, [filteredMaterials, matPage]);

  useEffect(() => {
    if (matPage > totalMatPages) {
      setMatPage(totalMatPages);
    }
  }, [matPage, totalMatPages]);

  const periodTheme = useMemo(() => {
    if (matPeriod === "vespertino") {
      return {
        label: "Vespertino",
        icon: Sunset,
        wrapper: "bg-gradient-to-br from-sky-50 via-blue-50 to-white",
        overlay:
          "opacity-80 [background:radial-gradient(circle_at_15%_20%,#38bdf8,transparent_45%),radial-gradient(circle_at_85%_15%,#60a5fa,transparent_50%),radial-gradient(circle_at_50%_90%,#bae6fd,transparent_55%)]",
        badge: "bg-sky-100 text-sky-800 ring-1 ring-sky-200",
      };
    }
    if (matPeriod === "noturno") {
      return {
        label: "Noturno",
        icon: MoonStar,
        wrapper: "bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-slate-100",
        overlay:
          "opacity-70 [background:radial-gradient(circle_at_18%_20%,#cbd5f5,transparent_45%),radial-gradient(circle_at_82%_25%,#94a3b8,transparent_50%),radial-gradient(circle_at_50%_85%,#64748b,transparent_60%)]",
        badge: "bg-slate-700 text-slate-100 ring-1 ring-slate-600",
      };
    }
    return {
      label: "Matutino",
      icon: Sun,
      wrapper: "bg-gradient-to-br from-amber-50 via-yellow-50 to-white",
      overlay:
        "opacity-80 [background:radial-gradient(circle_at_15%_20%,#facc15,transparent_45%),radial-gradient(circle_at_85%_15%,#fde047,transparent_50%),radial-gradient(circle_at_50%_90%,#fde68a,transparent_55%)]",
      badge: "bg-amber-100 text-amber-800 ring-1 ring-amber-200",
    };
  }, [matPeriod]);
  const PeriodIcon = periodTheme.icon;
  const loadingCards = (count = 3) => (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={`mgmt-skeleton-${idx}`}
          className="h-20 animate-pulse rounded-2xl border border-slate-200 bg-slate-100/90"
        />
      ))}
    </div>
  );

  useEffect(() => {
    const hasQuery = !!subSearch.trim() || !!subAreaFilter;
    if (!hasQuery) {
      setSubSearchMsg("");
      return;
    }
    if (subsDisplay.length) {
      subsResultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      setSubSearchMsg("");
      return;
    }
    setSubSearchMsg("Nenhum registro encontrado.");
    const t = window.setTimeout(() => setSubSearchMsg(""), 2500);
    return () => window.clearTimeout(t);
  }, [subSearch, subAreaFilter, subsDisplay.length]);

  useEffect(() => {
    setSubsVisibleCount(10);
  }, [subSearch, subAreaFilter]);

  useEffect(() => {
    const hasQuery = !!matSearch.trim() || !!matSearchDate;
    if (!hasQuery) {
      setMatSearchMsg("");
      return;
    }
    if (materialsDisplay.length) {
      matsResultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      setMatSearchMsg("");
      return;
    }
    setMatSearchMsg("Nenhum registro encontrado.");
    const t = window.setTimeout(() => setMatSearchMsg(""), 2500);
    return () => window.clearTimeout(t);
  }, [matSearch, matSearchDate, matPeriod, materialsDisplay.length]);

  async function addSubstitute() {
    setSubsMsg("");
    const areaFinal = subArea === "Outros" ? subAreaOther.trim() : subArea.trim();
    if (!subName.trim() || !areaFinal) {
      setSubsMsg("Informe nome e área.");
      return;
    }
    setSubsLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token ?? "";
      const res = await fetch("/api/management/substitutes", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: subName,
          area: areaFinal,
          phone: subPhone,
          notes: subNotes,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Erro ao salvar.");
      setSubName("");
      setSubArea("");
      setSubAreaOther("");
      setSubPhone("");
      setSubNotes("");
      await loadSubstitutes();
    } catch (err: unknown) {
      setSubsMsg(errorMessage(err, "Erro ao salvar."));
    } finally {
      setSubsLoading(false);
    }
  }

  function clearSubstituteForm() {
    setSubsMsg("");
    setSubName("");
    setSubArea("");
    setSubAreaOther("");
    setSubPhone("");
    setSubNotes("");
  }

  async function deleteSubstitute(id: string) {
    setSubsLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token ?? "";
      const res = await fetch("/api/management/substitutes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Erro ao excluir.");
      await loadSubstitutes();
    } catch (err: unknown) {
      setSubsMsg(errorMessage(err, "Erro ao excluir."));
    } finally {
      setSubsLoading(false);
    }
  }

  async function addMaterial() {
    setMatMsg("");
    if (!reportSchoolId || !matDate || !matRecipientType) {
      setMatMsg("Selecione escola, tipo e data.");
      return;
    }
    const cleanRecipients = matRecipients
      .map((r) => ({
        name: r.name.trim(),
        teacher_id: r.teacherId.trim(),
        student_id: r.studentId.trim(),
        school_class: r.schoolClass.trim(),
        items: r.items
          .map((it) => ({ material: it.material.trim(), qty: Number(it.qty) }))
          .filter((it) => it.material),
      }))
      .filter((r) => r.name && r.items.length);

    if (!cleanRecipients.length) {
      setMatMsg("Informe ao menos uma pessoa com materiais.");
      return;
    }
    if (!matClass.trim() && matRecipientType === "aluno") {
      setMatMsg("Selecione a turma da entrega.");
      return;
    }

    const invalidQty = cleanRecipients.some((r) =>
      r.items.some((it) => !it.qty || it.qty < 1)
    );
    if (invalidQty) {
      setMatMsg("Quantidade inválida.");
      return;
    }
    if (matRecipientType === "professor") {
      const hasUnknownProfessor = cleanRecipients.some((r) => !String(r.teacher_id ?? "").trim());
      if (hasUnknownProfessor) {
        setMatMsg("Selecione um professor cadastrado na lista para registrar a entrega.");
        return;
      }
    }
    setMatLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token ?? "";
      const res = await fetch("/api/management/materials", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          recipients: cleanRecipients,
          recipient_type: matRecipientType,
          school_class: matClass,
          school_id: reportSchoolId,
          location: matLocation,
          period: matPeriod,
          delivered_at: matDate,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Erro ao salvar.");
      setMatRecipients([{ name: "", teacherId: "", studentId: "", schoolClass: "", items: [{ material: "", qty: 1 }] }]);
      setMatClass("");
      setMatDate("");
      await loadMaterials();
    } catch (err: unknown) {
      setMatMsg(errorMessage(err, "Erro ao salvar."));
    } finally {
      setMatLoading(false);
    }
  }

  function clearMaterialForm() {
    setMatMsg("");
    setMatRecipients([{ name: "", teacherId: "", studentId: "", schoolClass: "", items: [{ material: "", qty: 1 }] }]);
    setMatClass(classOptions[0]?.name ?? "");
    setMatRecipientType("");
    setMatDate("");
  }

  async function togglePrinted(id: string, printed: boolean) {
    setPrintMsg("");
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token ?? "";
      const res = await fetch("/api/management/print-jobs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id, printed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Erro ao atualizar impressão.");
      await loadPrintJobs();
    } catch (err: unknown) {
      setPrintMsg(errorMessage(err, "Erro ao atualizar impressão."));
    }
  }

  async function downloadPrintJob(job: PrintJobRow) {
    if (!job.url) {
      setPrintMsg("Arquivo indisponível para download.");
      return;
    }

    setPrintMsg("");
    setPrintDownloadingId(job.id);
    try {
      const res = await fetch(job.url);
      if (!res.ok) throw new Error("Falha ao baixar arquivo.");
      const blob = await res.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = (job.title || job.file_name || "arquivo").trim();
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 1200);
    } catch (err: unknown) {
      setPrintMsg(errorMessage(err, "Erro ao baixar arquivo."));
    } finally {
      setPrintDownloadingId("");
    }
  }

  async function deleteMaterial(id: string) {
    setMatLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token ?? "";
      const res = await fetch("/api/management/materials", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Erro ao excluir.");
      await loadMaterials();
    } catch (err: unknown) {
      setMatMsg(errorMessage(err, "Erro ao excluir."));
    } finally {
      setMatLoading(false);
    }
  }

  async function exportMaterialsPdf() {
    setMatMsg("");
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token ?? "";
      if (!token) {
        setMatMsg("Faça login para exportar.");
        return;
      }
      const res = await fetch(
        `/api/management/materials-report?year=${year}&month=${month}&period=${encodeURIComponent(
          matPeriodReport
        )}&recipientType=${encodeURIComponent(matRecipientTypeReport)}&school_id=${encodeURIComponent(
          reportSchool?.id ?? ""
        )}&school_name=${encodeURIComponent(reportSchoolName)}`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Erro ao gerar PDF.");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");
      window.setTimeout(() => window.URL.revokeObjectURL(url), 10000);
    } catch (err: unknown) {
      setMatMsg(errorMessage(err, "Erro ao gerar PDF."));
    }
  }

  async function updatePublicationStatus(batchId: string, status: PublicationStatus) {
    setPubMsg("");
    try {
      const note = window.prompt("Observação da gestão (opcional):", "") ?? "";
      setPubSavingBatch(batchId);
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token ?? "";
      const res = await fetch("/api/management/activity-submissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ batch_id: batchId, status, review_note: note.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Erro ao atualizar publicação.");
      await loadPublications();
    } catch (err: unknown) {
      setPubMsg(errorMessage(err, "Erro ao atualizar publicação."));
    } finally {
      setPubSavingBatch("");
    }
  }

  async function downloadPublicationBatch(item: GroupedPublication) {
    if (!item.photos.length) {
      setPubMsg("Este envio não possui fotos para baixar.");
      return;
    }

    const safePart = (value: string) =>
      value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9._-]+/g, "_")
        .replace(/^_+|_+$/g, "");

    setPubMsg("");
    setPubDownloadingBatch(item.batchId);
    try {
      const datePart = new Date(item.createdAt).toISOString().slice(0, 10);
      const filesToShare: File[] = [];
      const blobsToDownload: { name: string; blob: Blob }[] = [];

      for (let i = 0; i < item.photos.length; i += 1) {
        const photo = item.photos[i];
        if (!photo.url) continue;
        const res = await fetch(photo.url);
        if (!res.ok) throw new Error("Falha ao baixar uma das fotos.");
        const blob = await res.blob();
        const originalName = photo.photo_name || `foto-${i + 1}.jpg`;
        const fileName = `${safePart(item.createdByName) || "professor"}-${datePart}-${i + 1}-${safePart(
          originalName
        )}`;

        blobsToDownload.push({ name: fileName, blob });
        filesToShare.push(
          new File([blob], fileName, {
            type: blob.type || "application/octet-stream",
            lastModified: Date.now(),
          })
        );
      }

      if (!blobsToDownload.length) {
        throw new Error("Não foi possível baixar as fotos deste envio.");
      }

      // Mobile: usa compartilhamento nativo para salvar todas de uma vez.
      const nav = navigator as Navigator & {
        canShare?: (data?: ShareData) => boolean;
        share?: (data?: ShareData) => Promise<void>;
      };
      const canNativeShareFiles =
        typeof nav.share === "function" &&
        typeof nav.canShare === "function" &&
        nav.canShare({ files: filesToShare });

      if (canNativeShareFiles) {
        await nav.share({
          title: `Fotos da publicação (${item.createdByName})`,
          text: "Salvar fotos da publicação",
          files: filesToShare,
        });
        setPubMsg("Fotos prontas para salvar no menu de compartilhamento.");
        return;
      }

      const isIOS =
        /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      if (isIOS) {
        setPubMsg("No iPhone, use a galeria para abrir e salvar as fotos.");
        openPublicationGallery(item);
        return;
      }

      for (let i = 0; i < blobsToDownload.length; i += 1) {
        const current = blobsToDownload[i];
        const objectUrl = window.URL.createObjectURL(current.blob);
        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = current.name;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 1500);
        await new Promise((resolve) => window.setTimeout(resolve, 220));
      }
      setPubMsg("Download iniciado para todas as fotos do envio.");
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setPubMsg("Compartilhamento cancelado.");
      } else {
        setPubMsg(errorMessage(err, "Erro ao baixar fotos do envio."));
      }
    } finally {
      setPubDownloadingBatch("");
    }
  }

  function openPublicationGallery(item: GroupedPublication) {
    if (!item.photos.length) {
      setPubMsg("Este envio não possui fotos para abrir.");
      return;
    }
    setPubGalleryBatchId(item.batchId);
  }

  const groupedPublications = useMemo(() => {
    const map = new Map<string, GroupedPublication>();
    pubRows.forEach((row) => {
      const existing = map.get(row.batch_id);
      if (existing) {
        existing.photos.push(row);
        return;
      }
      map.set(row.batch_id, {
        batchId: row.batch_id,
        createdAt: row.created_at,
        createdByName: row.created_by_name,
        location: row.location,
        description: row.description,
        status: row.status,
        reviewNote: row.review_note,
        photos: [row],
      });
    });
    return Array.from(map.values());
  }, [pubRows]);
  const publicationsDisplay = useMemo(
    () => groupedPublications.slice(0, Math.max(8, pubVisibleCount)),
    [groupedPublications, pubVisibleCount]
  );
  const activeGalleryPublication = useMemo(
    () => groupedPublications.find((x) => x.batchId === pubGalleryBatchId) ?? null,
    [groupedPublications, pubGalleryBatchId]
  );
  useEffect(() => {
    setPubVisibleCount(8);
  }, [pubStatusFilter, groupedPublications.length]);
  const financeFiltered = useMemo(() => {
    const monthFilter = financeRange === "annual" ? 0 : financeMonth;
    return financeRows.filter((item) => {
      if (!item.date) return false;
      const d = new Date(`${item.date}T00:00:00`);
      const sameYear = d.getFullYear() === financeYear;
      const sameMonth = monthFilter === 0 ? true : d.getMonth() + 1 === monthFilter;
      return sameYear && sameMonth;
    });
  }, [financeRows, financeYear, financeMonth, financeRange]);
  const financeTotals = useMemo(() => {
    return financeFiltered.reduce(
      (acc, item) => {
        const signal = item.type === "entry" ? 1 : -1;
        if (item.type === "entry") acc.entries += item.amount;
        if (item.type === "exit") acc.exits += item.amount;
        if (item.category === "cash") acc.cashBalance += signal * item.amount;
        if (item.category === "school_income") acc.schoolIncome += item.amount;
        if (item.category === "event_income") acc.eventIncome += item.amount;
        if (item.category === "accounts_payable" && !item.paid) acc.openPayables += item.amount;
        return acc;
      },
      { entries: 0, exits: 0, cashBalance: 0, schoolIncome: 0, eventIncome: 0, openPayables: 0 }
    );
  }, [financeFiltered]);
  const financeSorted = useMemo(
    () =>
      [...financeFiltered].sort((a, b) => {
        if (a.date === b.date) return b.createdAt.localeCompare(a.createdAt);
        return b.date.localeCompare(a.date);
      }),
    [financeFiltered]
  );
  const financeVisibleRows = useMemo(
    () => {
      const q = financeTextFilter.trim().toLowerCase();
      return financeSorted.filter((item) => {
        const matchCategory =
          financeCategoryFilter === "all" ? true : item.category === financeCategoryFilter;
        const matchStatus =
          financeStatusFilter === "all"
            ? true
            : financeStatusFilter === "paid"
            ? item.category === "accounts_payable" && item.paid
            : item.category === "accounts_payable" && !item.paid;
        const matchText = !q
          ? true
          : [
              item.description,
              item.method,
              item.notes,
              item.date,
              financeCategoryLabel(item.category, item.customCategory),
              item.category === "accounts_payable" ? (item.paid ? "Paga" : "Pendente") : "",
            ]
              .join(" ")
              .toLowerCase()
              .includes(q);
        return matchCategory && matchStatus && matchText;
      });
    },
    [financeSorted, financeCategoryFilter, financeStatusFilter, financeTextFilter]
  );
  const financeOverduePayables = useMemo(() => {
    const today = new Date();
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    return financeRows.filter((item) => {
      if (item.category !== "accounts_payable" || item.paid || !item.dueDate) return false;
      const due = new Date(`${item.dueDate}T00:00:00`).getTime();
      return due < todayOnly;
    });
  }, [financeRows]);
  const financeOverdueTotal = useMemo(
    () => financeOverduePayables.reduce((sum, item) => sum + item.amount, 0),
    [financeOverduePayables]
  );

  function money(value: number) {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function financeCategoryLabel(category: FinanceCategory, customCategory?: string | null) {
    if (category === "cash") return "Caixa";
    if (category === "school_income") return "Recebimento da escola";
    if (category === "event_income") return "Festa/Evento";
    if (category === "accounts_payable") return "Conta a pagar";
    if (category === "custom") return customCategory?.trim() || "Categoria personalizada";
    return "Despesa";
  }

  async function exportFinancePdf() {
    setFinMsg("");
    setFinExporting(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token ?? "";
      if (!token) {
        setFinMsg("Faça login para exportar o PDF.");
        return;
      }
      const res = await fetch("/api/management/finance-report", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          year: financeYear,
          month: financeRange === "annual" ? 0 : financeMonth,
          school_id: reportSchool?.id ?? "",
          school_name: reportSchoolName,
          rows: financeFiltered,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Erro ao exportar resumo financeiro.");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `financeiro-${financeYear}-${String(
        financeRange === "annual" ? 0 : financeMonth
      ).padStart(2, "0")}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(url), 8000);
    } catch (err: unknown) {
      setFinMsg(errorMessage(err, "Erro ao exportar resumo financeiro."));
    } finally {
      setFinExporting(false);
    }
  }

  async function exportTransparencyPdf() {
    setFinMsg("");
    setFinTransparencyExporting(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token ?? "";
      if (!token) {
        setFinMsg("Faça login para exportar o PDF de transparência.");
        return;
      }
      const res = await fetch("/api/management/finance-transparency-report", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          year: financeYear,
          month: financeRange === "annual" ? 0 : financeMonth,
          school_id: reportSchool?.id ?? "",
          school_name: reportSchoolName,
          rows: financeFiltered,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Erro ao exportar PDF de transparência.");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `transparencia-${financeYear}-${String(
        financeRange === "annual" ? 0 : financeMonth
      ).padStart(2, "0")}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(url), 8000);
    } catch (err: unknown) {
      setFinMsg(errorMessage(err, "Erro ao exportar PDF de transparência."));
    } finally {
      setFinTransparencyExporting(false);
    }
  }

  async function addFinanceRecord() {
    setFinMsg("");
    const amount = Number(finAmount.replace(",", "."));
    if (!finDate || !finDescription.trim() || !amount || amount < 0) {
      setFinMsg("Informe data, descrição e valor válido.");
      return;
    }
    const customName =
      finCategory === "custom"
        ? (finCustomCategory === "__new__" ? finCustomCategoryNew : finCustomCategory).trim()
        : "";
    if (finCategory === "custom" && !customName) {
      setFinMsg("Informe o nome da categoria personalizada.");
      return;
    }
    const effectiveType: FinanceType =
      finCategory === "expense" || finCategory === "accounts_payable"
        ? "exit"
      : finCategory === "school_income" || finCategory === "event_income"
        ? "entry"
        : finType;
    if (finCategory === "custom" && customName) {
      setCustomCategories((prev) => {
        const merged = Array.from(new Set([customName, ...prev.map((x) => x.trim()).filter(Boolean)]));
        return merged.slice(0, 60);
      });
    }
    const next: FinanceRow = {
      id: crypto.randomUUID(),
      date: finDate,
      description: finDescription.trim(),
      amount,
      type: effectiveType,
      category: finCategory,
      method: finMethod.trim() || "Dinheiro",
      notes: finNotes.trim(),
      customCategory: finCategory === "custom" ? customName : null,
      dueDate: finCategory === "accounts_payable" ? finDueDate || null : null,
      paid: finCategory === "accounts_payable" ? finPaid : true,
      createdAt: new Date().toISOString(),
    };
    setFinanceRows((prev) => [next, ...prev]);
    setFinDescription("");
    setFinAmount("");
    setFinNotes("");
    setFinCustomCategory("");
    setFinCustomCategoryNew("");
    setFinPaid(false);
    setFinMsg("Lançamento financeiro registrado.");
  }

  function clearFinanceForm() {
    setFinMsg("");
    setFinDate("");
    setFinDescription("");
    setFinAmount("");
    setFinType("entry");
    setFinCategory("cash");
    setFinMethod("Dinheiro");
    setFinNotes("");
    setFinCustomCategory("");
    setFinCustomCategoryNew("");
    setFinDueDate("");
    setFinPaid(false);
  }

  function removeFinanceRecord(id: string) {
    setFinanceRows((prev) => prev.filter((item) => item.id !== id));
  }

  function toggleFinancePaid(id: string) {
    setFinanceRows((prev) =>
      prev.map((item) => (item.id === id ? { ...item, paid: !item.paid } : item))
    );
  }

  if (authChecking) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-emerald-50 via-sky-50 to-white text-slate-900">
        <HomeTopButton />
        <div className="mx-auto w-full max-w-3xl px-4 py-10">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,0.14)]">
            <div className="text-xs font-extrabold text-slate-500">Gestão</div>
            <div className="text-2xl font-black">Carregando sessão</div>
            <p className="mt-2 text-sm font-bold text-slate-600">
              Aguarde um instante para validar seu acesso.
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-emerald-50 via-sky-50 to-white text-slate-900">
        <HomeTopButton />
        <div className="mx-auto w-full max-w-3xl px-4 py-10">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,0.14)]">
            <div className="text-xs font-extrabold text-slate-500">Acesso restrito</div>
            <div className="text-2xl font-black">Gestão</div>
            <p className="mt-2 text-sm font-bold text-slate-600">
              Apenas admins podem acessar esta área.
            </p>
            <button
              type="button"
              onClick={() => setLoginOpen(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-sky-500 px-4 py-2 text-sm font-black text-white shadow-lg shadow-emerald-500/20 transition-all duration-200 hover:-translate-y-[1px] hover:shadow-xl active:scale-[0.99]"
            >
              <ShieldCheck className="h-4 w-4" />
              Fazer login
            </button>
          </div>
        </div>

        {loginOpen ? (
          <div
            onClick={() => setLoginOpen(false)}
            className="fixed inset-0 z-[9999] grid place-items-center bg-slate-900/55 p-4 backdrop-blur-sm"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.25)]"
            >
              <div className="text-lg font-black text-center">Login</div>
              <div className="mt-4 space-y-3">
                <div>
                  <label className="text-xs font-extrabold text-slate-500">Usuário</label>
                  <input
                    type="text"
                    placeholder="nome.ultimo"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-extrabold outline-none transition-all duration-200 focus:border-sky-300 focus:ring-4 focus:ring-sky-200/40"
                  />
                </div>
                <div>
                  <label className="text-xs font-extrabold text-slate-500">Senha</label>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-extrabold outline-none transition-all duration-200 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-200/40"
                  />
                </div>
                {loginMsg ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-extrabold text-red-700">
                    {loginMsg}
                  </div>
                ) : null}
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setLoginOpen(false)}
                    disabled={loginLoading}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black shadow-sm transition-all duration-200 hover:bg-slate-50 active:scale-[0.99] disabled:opacity-60"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleLogin}
                    disabled={loginLoading}
                    className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-sky-500 px-4 py-2 text-sm font-black text-white shadow-lg shadow-emerald-500/20 transition-all duration-200 hover:-translate-y-[1px] hover:shadow-xl active:scale-[0.99] disabled:opacity-60"
                  >
                    {loginLoading ? "Entrando..." : "Entrar"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    );
  }

  const showMobileActionBar = tab === "substitutes" || tab === "materials" || tab === "finance";

  return (
    <main className={`management-page min-h-screen text-slate-900 relative ${showMobileActionBar ? "pb-28 sm:pb-0" : ""}`}>
      <HomeTopButton />
      <div className={`pointer-events-none fixed inset-0 z-0 ${periodTheme.wrapper}`}>
        <div className={`absolute inset-0 ${periodTheme.overlay}`} />
        {matPeriod === "matutino" ? (
          <div key={`sun-${matPeriod}`} className="absolute inset-0">
            <div className="period-sun" />
            <div className="period-sun-glow" />
          </div>
        ) : null}
        {matPeriod === "vespertino" ? (
          <div key={`clouds-${matPeriod}`} className="absolute inset-0">
            <div className="period-cloud cloud-1" />
            <div className="period-cloud cloud-2" />
            <div className="period-cloud cloud-3" />
          </div>
        ) : null}
        {matPeriod === "noturno" ? (
          <div key={`night-${matPeriod}`} className="absolute inset-0">
            <div className="period-moon" />
            <div className="period-stars stars-1" />
            <div className="period-stars stars-2" />
          </div>
        ) : null}
        <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full bg-emerald-200/40 blur-3xl" />
        <div className="absolute top-24 -right-24 h-96 w-96 rounded-full bg-sky-200/45 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-emerald-100/55 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 py-6 sm:py-8">
        <style jsx global>{`
          @media (max-width: 640px) {
            .management-page button,
            .management-page a.inline-flex {
              min-height: 44px;
            }
          }
          .period-sun {
            position: absolute;
            left: 8%;
            top: 40px;
            width: 220px;
            height: 220px;
            border-radius: 999px;
            background: radial-gradient(circle, #fde68a 0%, #f59e0b 55%, transparent 65%);
            animation: sunrise 2.4s ease-out forwards;
            filter: blur(0.5px);
            opacity: 0;
          }
          .period-sun-glow {
            position: absolute;
            left: 4%;
            top: 10px;
            width: 360px;
            height: 360px;
            border-radius: 999px;
            background: radial-gradient(circle, rgba(253, 224, 71, 0.35) 0%, transparent 70%);
            animation: sunriseGlow 2.6s ease-out forwards;
            opacity: 0;
          }
          .period-cloud {
            position: absolute;
            top: 120px;
            width: 220px;
            height: 80px;
            border-radius: 999px;
            background: rgba(255, 255, 255, 0.75);
            filter: blur(1px);
            animation: cloudDrift 8s ease-in-out infinite;
            box-shadow: 40px 10px 0 rgba(255, 255, 255, 0.65),
              -30px 14px 0 rgba(255, 255, 255, 0.6);
          }
          .period-cloud.cloud-1 {
            left: 8%;
            top: 90px;
            animation-duration: 9s;
          }
          .period-cloud.cloud-2 {
            left: 46%;
            top: 130px;
            animation-duration: 11s;
          }
          .period-cloud.cloud-3 {
            left: 70%;
            top: 70px;
            animation-duration: 10s;
          }
          .period-moon {
            position: absolute;
            right: 12%;
            top: 12%;
            width: 140px;
            height: 140px;
            border-radius: 999px;
            background: radial-gradient(circle, #e2e8f0 0%, #94a3b8 60%, transparent 70%);
            box-shadow: 0 0 60px rgba(226, 232, 240, 0.35);
            animation: moonRise 2.4s ease-out forwards;
            opacity: 0;
          }
          .period-stars {
            position: absolute;
            inset: 0;
            background-image: radial-gradient(#ffffff 1.4px, transparent 1.6px);
            background-size: 60px 60px;
            opacity: 0.55;
            animation: starTwinkle 3s ease-in-out infinite;
          }
          .period-stars.stars-2 {
            background-image: radial-gradient(#ffffff 1px, transparent 1.4px);
            background-size: 120px 120px;
            opacity: 0.35;
            animation-duration: 4s;
          }
          @media (max-width: 768px), (prefers-reduced-motion: reduce) {
            .period-sun,
            .period-sun-glow,
            .period-cloud,
            .period-moon,
            .period-stars {
              display: none !important;
              animation: none !important;
            }
          }
          @keyframes sunrise {
            0% {
              transform: translateY(80px) scale(0.9);
              opacity: 0;
            }
            100% {
              transform: translateY(0) scale(1);
              opacity: 1;
            }
          }
          @keyframes sunriseGlow {
            0% {
              transform: translateY(60px);
              opacity: 0;
            }
            100% {
              transform: translateY(0);
              opacity: 1;
            }
          }
          @keyframes cloudDrift {
            0% {
              transform: translateX(-12px);
              opacity: 0.55;
            }
            50% {
              transform: translateX(18px);
              opacity: 0.85;
            }
            100% {
              transform: translateX(-12px);
              opacity: 0.55;
            }
          }
          @keyframes moonRise {
            0% {
              transform: translateY(40px);
              opacity: 0;
            }
            100% {
              transform: translateY(0);
              opacity: 1;
            }
          }
          @keyframes starTwinkle {
            0%,
            100% {
              opacity: 0.15;
            }
            50% {
              opacity: 0.5;
            }
          }
        `}</style>
        <div
          className="relative overflow-hidden rounded-3xl border border-slate-200/60 bg-white/80 p-4 shadow-[0_18px_55px_rgba(15,23,42,0.14)] backdrop-blur sm:p-6"
          style={{
            backgroundImage: "url(/back-sala2.png)",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm" />
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-100/60 via-white/0 to-sky-100/60" />
          <div className="relative flex flex-col gap-3 text-center sm:flex-row sm:items-start sm:justify-between sm:text-left">
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
              <Link
                href="/portal"
                title="Voltar ao Portal"
                className="grid h-12 w-12 place-items-center rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:bg-slate-50"
              >
                <SchoolLogo size={32} className="h-8 w-8 object-contain" />
              </Link>
              <div>
                <div className="text-2xl font-black text-slate-900">Espaço da Gestão</div>
                <div className="mt-1 text-xs font-extrabold text-slate-500">
                  {authEmail ? authEmail : "Admin"}
                </div>
              </div>
            </div>
            <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
              {showBack ? (
                <Link
                  href="/management"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm transition-all duration-200 hover:bg-slate-50 sm:justify-start"
                >
                  Voltar para Gestão
                </Link>
              ) : null}
              <div className="relative flex w-full items-center sm:w-auto">
                {PeriodIcon ? (
                  <PeriodIcon className="absolute left-3 h-4 w-4 text-slate-900" />
                ) : null}
                <select
                  value={matPeriod}
                  onChange={(e) => {
                    setMatPeriod(e.target.value);
                    setPrintPeriodFilter(e.target.value);
                  }}
                  className={`h-9 w-full appearance-none rounded-full border border-transparent pl-9 pr-8 text-xs font-extrabold text-slate-900 shadow-sm ring-1 ring-slate-200 sm:w-auto ${periodTheme.badge}`}
                  title="Período"
                >
                  {visiblePeriods.includes("matutino") ? <option value="matutino">Matutino</option> : null}
                  {visiblePeriods.includes("vespertino") ? (
                    <option value="vespertino">Vespertino</option>
                  ) : null}
                  {visiblePeriods.includes("noturno") ? <option value="noturno">Noturno</option> : null}
                </select>
                <span className="pointer-events-none absolute right-3 text-xs font-black text-slate-700">
                  ▾
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 -mx-1 flex gap-2 overflow-x-auto px-1 pb-2 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => setTab("materials")}
            className={`shrink-0 snap-start whitespace-nowrap rounded-full px-4 py-2 text-xs font-extrabold ${
              tab === "materials"
                ? "bg-sky-100 text-sky-800 ring-1 ring-sky-200"
                : "bg-white text-slate-600 ring-1 ring-slate-200"
            }`}
          >
            Materiais
          </button>
          <button
            type="button"
            onClick={() => setTab("prints")}
            className={`shrink-0 snap-start whitespace-nowrap rounded-full px-4 py-2 text-xs font-extrabold ${
              tab === "prints"
                ? "bg-amber-100 text-amber-800 ring-1 ring-amber-200"
                : "bg-white text-slate-600 ring-1 ring-slate-200"
            }`}
          >
            Impressões
          </button>
          <button
            type="button"
            onClick={() => setTab("substitutes")}
            className={`shrink-0 snap-start whitespace-nowrap rounded-full px-4 py-2 text-xs font-extrabold ${
              tab === "substitutes"
                ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200"
                : "bg-white text-slate-600 ring-1 ring-slate-200"
            }`}
          >
            Substitutos
          </button>
          <button
            type="button"
            onClick={() => setTab("publications")}
            className={`shrink-0 snap-start whitespace-nowrap rounded-full px-4 py-2 text-xs font-extrabold ${
              tab === "publications"
                ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200"
                : "bg-white text-slate-600 ring-1 ring-slate-200"
            }`}
          >
            Publicações
          </button>
          <button
            type="button"
            onClick={() => setTab("finance")}
            className={`shrink-0 snap-start whitespace-nowrap rounded-full px-4 py-2 text-xs font-extrabold ${
              tab === "finance"
                ? "bg-green-100 text-green-800 ring-1 ring-green-200"
                : "bg-white text-slate-600 ring-1 ring-slate-200"
            }`}
          >
            Financeiro
          </button>
        </div>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-[0_14px_40px_rgba(15,23,42,0.10)] sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-black text-slate-900">Panorama de agendamentos</div>
              <div className="text-xs font-bold text-slate-500">
                Visualize todos os agendamentos por dia e por material.
              </div>
            </div>
            <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => setShowOverviewSearch((prev) => !prev)}
                className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 shadow-sm transition-all duration-200 hover:bg-slate-50"
              >
                {showOverviewSearch ? "Ocultar busca de agendamentos" : "Buscar agendamentos"}
              </button>
              <button
                type="button"
                onClick={loadOverview}
                className="inline-flex h-9 items-center justify-center rounded-xl bg-gradient-to-r from-emerald-500 to-sky-500 px-3 text-xs font-black text-white shadow-sm transition-all duration-200 hover:-translate-y-[1px] hover:shadow-md"
              >
                {overviewLoading ? "Carregando..." : "Atualizar"}
              </button>
            </div>
          </div>

          {showOverviewSearch ? (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="text-xs font-extrabold text-slate-500">Data (dia)</label>
                  <input
                    type="date"
                    value={overviewDate}
                    onChange={(e) => setOverviewDate(e.target.value)}
                    className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-extrabold text-slate-500">Data final (opcional)</label>
                  <input
                    type="date"
                    value={overviewEndDate}
                    onChange={(e) => setOverviewEndDate(e.target.value)}
                    className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-extrabold text-slate-500">Escola</label>
                  <select
                    value={overviewSchoolId}
                    onChange={(e) => setOverviewSchoolId(e.target.value)}
                    className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none"
                  >
                    <option value="">Todas</option>
                    {schools.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={loadOverview}
                    className="h-10 w-full rounded-2xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 shadow-sm transition-all duration-200 hover:bg-slate-50"
                  >
                    Buscar
                  </button>
                </div>
              </div>

              <div className="mt-2 text-xs font-bold text-slate-500">
                Para ver um dia específico, preencha apenas a data inicial.
              </div>
            </>
          ) : null}

          {overviewMsg ? (
            <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3 text-xs font-bold text-slate-600">
              {overviewMsg}
            </div>
          ) : null}

          {Object.keys(overviewData).length ? (
            <div className="mt-4 grid gap-3">
              {Object.entries(overviewData).map(([date, rows]) => (
                <div key={date} className="rounded-2xl border border-slate-200 bg-white p-3">
                  <div className="text-xs font-extrabold text-slate-500">
                    {new Date(date + "T00:00:00").toLocaleDateString("pt-BR")}
                  </div>
                  <div className="mt-2 grid gap-2">
                    {rows.map((r) => (
                      <div
                        key={r.id}
                        className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-bold text-slate-700"
                      >
                        <div className="font-black text-slate-900">{r.who}</div>
                        <div className="mt-1">
                          {r.period} • {r.schoolClass}
                          {r.schoolName ? ` • ${r.schoolName}` : ""}
                        </div>
                        {r.items.length ? (
                          <div className="mt-2 text-[11px] text-slate-600">
                            {r.items.join(" • ")}
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
          ) : null}
        </section>

        {tab === "substitutes" ? (
          <section className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-[0_14px_40px_rgba(15,23,42,0.10)] sm:p-5">
            <div className="relative">
            <h2 className="text-base font-black">Professores substitutos</h2>
            <p className="mt-1 text-xs font-bold text-slate-500">Cadastro e pesquisa por área.</p>

            <div className="mt-4 grid grid-cols-1 gap-3">
              <input
                value={subName}
                onChange={(e) => setSubName(e.target.value)}
                placeholder="Nome"
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-extrabold"
              />
              <select
                value={subArea}
                onChange={(e) => setSubArea(e.target.value)}
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-extrabold"
              >
                <option value="">Selecionar área</option>
                {areaOptions.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
              {subArea === "Outros" ? (
                <input
                  value={subAreaOther}
                  onChange={(e) => setSubAreaOther(e.target.value)}
                  placeholder="Escreva a área"
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-extrabold"
                />
              ) : null}
              <input
                value={subPhone}
                onChange={(e) => setSubPhone(e.target.value)}
                placeholder="Telefone"
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-extrabold"
              />
              <textarea
                value={subNotes}
                onChange={(e) => setSubNotes(e.target.value)}
                placeholder="Observações"
                className="h-24 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-extrabold"
              />
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={addSubstitute}
                  disabled={subsLoading}
                  className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-sky-500 px-3 text-xs font-black text-white shadow-sm shadow-emerald-500/20 transition-all duration-200 hover:-translate-y-[1px] hover:shadow-md active:scale-[0.99] disabled:opacity-60 sm:w-fit"
                >
                  {subsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Salvar
                </button>
              </div>
              {subsMsg ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-extrabold text-red-700">
                  {subsMsg}
                </div>
              ) : null}
            </div>

            <div className="mt-4">
              <button
                type="button"
                onClick={() => setShowSearchSubstitutes((prev) => !prev)}
                className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 shadow-sm transition-all duration-200 hover:bg-slate-50"
              >
                {showSearchSubstitutes ? "Ocultar busca de substitutos" : "Buscar substitutos"}
              </button>
              {showSearchSubstitutes ? (
                <div className="mt-3 space-y-3">
                  <div className="grid grid-cols-1 gap-3">
                    <input
                      value={subSearch}
                      onChange={(e) => setSubSearch(e.target.value)}
                      placeholder="Buscar substitutos por nome"
                      className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-extrabold"
                    />
                    <select
                      value={subAreaFilter}
                      onChange={(e) => setSubAreaFilter(e.target.value)}
                      className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-extrabold"
                    >
                      <option value="">Todas as áreas</option>
                      {substituteAreas.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </select>
                  </div>

                  {subSearchMsg ? (
                    <div className="inline-flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-extrabold text-amber-700 shadow-sm">
                      {subSearchMsg}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div ref={subsResultsRef} className="mt-5 space-y-2">
              {subsLoading ? (
                loadingCards(3)
              ) : subsDisplay.length ? (
                <>
                  {subsDisplay.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3"
                    >
                      <div>
                        <div className="text-sm font-black">{s.name}</div>
                        <div className="text-xs font-extrabold text-slate-600">{s.area}</div>
                        {s.phone ? <div className="text-xs font-bold text-slate-500">{s.phone}</div> : null}
                        {s.notes ? <div className="text-xs font-bold text-slate-500">{s.notes}</div> : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteSubstitute(s.id)}
                        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-2xl border border-red-200 bg-red-50 p-2 text-red-700"
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  {subsDisplay.length < filteredSubs.length ? (
                    <button
                      type="button"
                      onClick={() => setSubsVisibleCount((prev) => prev + 10)}
                      className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 shadow-sm transition-all duration-200 hover:bg-slate-50"
                    >
                      Carregar mais substitutos ({filteredSubs.length - subsDisplay.length} restantes)
                    </button>
                  ) : null}
                </>
              ) : (
                <div className="text-sm font-extrabold text-slate-500">Nenhum substituto cadastrado.</div>
              )}
            </div>
            </div>
          </section>
        ) : null}

        {tab === "materials" ? (
          <section className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-[0_14px_40px_rgba(15,23,42,0.10)] sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-black">Materiais entregues</h2>
                  <p className="mt-1 text-xs font-bold text-slate-500">PDF por mês/ano.</p>
                </div>
              
              </div>

            <div className="mt-4">
              <button
                type="button"
                onClick={() => setShowSearchMaterials((prev) => !prev)}
                className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 shadow-sm transition-all duration-200 hover:bg-slate-50"
              >
                {showSearchMaterials ? "Ocultar busca de materiais" : "Buscar materiais"}
              </button>
              {showSearchMaterials ? (
                <div className="mt-3 space-y-3">
                  <div className="grid grid-cols-1 gap-3">
                    <input
                      value={matSearch}
                      onChange={(e) => setMatSearch(e.target.value)}
                      placeholder="Buscar materiais por nome, material ou turma"
                      className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-extrabold"
                    />
                    <input
                      type="date"
                      value={matSearchDate}
                      onChange={(e) => setMatSearchDate(e.target.value)}
                      className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-extrabold"
                    />
                  </div>

                  {matSearchMsg ? (
                    <div className="inline-flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-extrabold text-amber-700 shadow-sm">
                      {matSearchMsg}
                    </div>
                  ) : null}
                </div>
              ) : null}
              </div>

            <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50/60 p-3">
              <div className="text-xs font-extrabold uppercase tracking-[0.08em] text-sky-800">
                Dados principais da entrega
              </div>
              <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <select
                  value={reportSchoolId}
                  onChange={(e) => setReportSchoolId(e.target.value)}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-extrabold sm:col-span-2"
                >
                  <option value="">Selecionar escola da entrega</option>
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <select
                  value={matClass}
                  onChange={(e) => setMatClass(e.target.value)}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-extrabold"
                >
                  <option value="">Selecionar turma padrão</option>
                  {classOptions.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                      {c.period ? ` • ${c.period}` : ""}
                    </option>
                  ))}
                </select>
                <select
                  value={matRecipientType}
                  onChange={(e) => setMatRecipientType(e.target.value)}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-extrabold"
                >
                  <option value="">Selecione</option>
                  <option value="aluno">Aluno(a)</option>
                  <option value="professor">Professor(a)</option>
                </select>
                <input
                  value={matLocation}
                  readOnly
                  className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-extrabold text-slate-600 sm:col-span-2"
                  placeholder="Local"
                />
                {!classOptions.length ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-extrabold text-amber-700 sm:col-span-2">
                    Cadastre turmas para a escola selecionada para habilitar seleção por turma.
                  </div>
                ) : null}
              </div>
            </div>

            {matRecipientType === "aluno" ? (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3">
                <div className="text-xs font-extrabold text-emerald-800">Cadastro rápido de aluno(a)</div>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_220px_auto]">
                  <input
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="Nome do aluno"
                    className="h-11 rounded-xl border border-emerald-200 bg-white px-3 text-sm font-extrabold"
                  />
                  <select
                    value={studentClassId}
                    onChange={(e) => setStudentClassId(e.target.value)}
                    className="h-11 rounded-xl border border-emerald-200 bg-white px-3 text-sm font-extrabold"
                  >
                    <option value="">Turma do aluno</option>
                    {classOptions.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={addStudent}
                    disabled={studentLoading}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-white px-3 text-xs font-black text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
                  >
                    {studentLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Cadastrar aluno
                  </button>
                </div>
                {studentMsg ? (
                  <div className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-extrabold text-red-700">
                    {studentMsg}
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-extrabold text-slate-500">Pessoas e materiais</div>
                <button
                  type="button"
                  onClick={() =>
                    setMatRecipients((prev) => [
                      ...prev,
                      { name: "", teacherId: "", studentId: "", schoolClass: "", items: [{ material: "", qty: 1 }] },
                    ])
                  }
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100"
                  title="Adicionar pessoa"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3">
                {matRecipients.map((r, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2">
                        {matRecipientType === "aluno" ? (
                          <>
                            <input
                              value={r.name}
                              list={`students-suggestions-${idx}`}
                              onChange={(e) => {
                                const typed = e.target.value;
                                const normalizedTyped = normalizeLookupName(typed);
                                const pool = (studentsByClass.get(r.schoolClass || matClass) ?? students);
                                const selected = pool.find(
                                  (s) => normalizeLookupName(s.name) === normalizedTyped
                                );
                                setMatRecipients((prev) =>
                                  prev.map((it, i) =>
                                    i === idx
                                      ? {
                                          ...it,
                                          studentId: selected?.id ?? "",
                                          name: typed,
                                          schoolClass: selected?.class_name ?? it.schoolClass,
                                        }
                                      : it
                                  )
                                );
                              }}
                              placeholder="Digite para buscar aluno(a)"
                              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-extrabold"
                            />
                            <datalist id={`students-suggestions-${idx}`}>
                              {(studentsByClass.get(r.schoolClass || matClass) ?? students).map((student) => (
                                <option key={student.id} value={student.name} />
                              ))}
                            </datalist>
                          </>
                        ) : matRecipientType === "professor" ? (
                          <>
                            <input
                              value={r.name}
                              list={`teachers-suggestions-${idx}`}
                            onChange={(e) => {
                              const typed = e.target.value;
                              const normalizedTyped = normalizeLookupName(typed);
                              const selected = teachers.find(
                                (t) => normalizeLookupName(t.name) === normalizedTyped
                              );
                              setMatRecipients((prev) =>
                                prev.map((it, i) =>
                                  i === idx
                                    ? {
                                        ...it,
                                        teacherId: selected?.id ?? "",
                                        name: typed,
                                      }
                                    : it
                                )
                              );
                            }}
                            placeholder="Digite para buscar professor(a)"
                            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-extrabold"
                            />
                            <datalist id={`teachers-suggestions-${idx}`}>
                              {teachers.map((teacher) => (
                                <option key={teacher.id} value={teacher.name} />
                              ))}
                            </datalist>
                          </>
                        ) : (
                          <input
                            value={r.name}
                            onChange={(e) =>
                              setMatRecipients((prev) =>
                                prev.map((it, i) =>
                                  i === idx ? { ...it, name: e.target.value } : it
                                )
                              )
                            }
                            placeholder="Nome da pessoa"
                            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-extrabold"
                          />
                        )}
                        {matRecipients.length > 1 ? (
                          <button
                            type="button"
                            onClick={() =>
                              setMatRecipients((prev) => prev.filter((_, i) => i !== idx))
                            }
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                            title="Remover pessoa"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>
                      <select
                        value={r.schoolClass}
                        onChange={(e) =>
                          setMatRecipients((prev) =>
                            prev.map((it, i) =>
                              i === idx ? { ...it, schoolClass: e.target.value } : it
                            )
                          )
                        }
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-extrabold"
                      >
                        <option value="">Usar turma padrão da entrega</option>
                        {classOptions.map((c) => (
                          <option key={c.id} value={c.name}>
                            {c.name}
                            {c.period ? ` • ${c.period}` : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="mt-3 space-y-2">
                      {r.items.map((item, mIdx) => (
                        <div
                          key={mIdx}
                          className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_100px_auto] sm:items-center"
                        >
                          <input
                            value={item.material}
                            onChange={(e) =>
                              setMatRecipients((prev) =>
                                prev.map((it, i) =>
                                  i === idx
                                    ? {
                                        ...it,
                                        items: it.items.map((mi, j) =>
                                          j === mIdx ? { ...mi, material: e.target.value } : mi
                                        ),
                                      }
                                    : it
                                )
                              )
                            }
                            placeholder="Material"
                            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-extrabold"
                          />
                          <input
                            type="number"
                            min={1}
                            value={item.qty}
                            onChange={(e) =>
                              setMatRecipients((prev) =>
                                prev.map((it, i) =>
                                  i === idx
                                    ? {
                                        ...it,
                                        items: it.items.map((mi, j) =>
                                          j === mIdx ? { ...mi, qty: Number(e.target.value) } : mi
                                        ),
                                      }
                                    : it
                                )
                              )
                            }
                            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-extrabold"
                          />
                          {r.items.length > 1 ? (
                            <button
                              type="button"
                              onClick={() =>
                                setMatRecipients((prev) =>
                                  prev.map((it, i) =>
                                    i === idx
                                      ? { ...it, items: it.items.filter((_, j) => j !== mIdx) }
                                      : it
                                  )
                                )
                              }
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                              title="Remover material"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          ) : null}
                        </div>
                      ))}
                    </div>

                    <div className="mt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() =>
                          setMatRecipients((prev) =>
                            prev.map((it, i) =>
                              i === idx
                                ? { ...it, items: [...it.items, { material: "", qty: 1 }] }
                                : it
                            )
                          )
                        }
                        className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 hover:bg-emerald-100"
                      >
                        <Plus className="h-4 w-4" />
                        Adicionar material
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  type="date"
                  value={matDate}
                  onChange={(e) => setMatDate(e.target.value)}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-extrabold"
                />
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={clearMaterialForm}
                  disabled={matLoading}
                  className="inline-flex h-9 w-fit items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 shadow-sm transition-all duration-200 hover:bg-slate-50 disabled:opacity-60"
                >
                  Limpar registro
                </button>
                <button
                  type="button"
                  onClick={addMaterial}
                  disabled={matLoading}
                  className="inline-flex h-9 w-fit items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-sky-500 px-3 text-xs font-black text-white shadow-sm shadow-emerald-500/20 transition-all duration-200 hover:-translate-y-[1px] hover:shadow-md active:scale-[0.99] disabled:opacity-60"
                >
                  {matLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Registrar entrega
                </button>
              </div>
              {matMsg ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-extrabold text-red-700">
                  {matMsg}
                </div>
              ) : null}
            </div>

            <div ref={matsResultsRef} className="mt-5 space-y-2">
              {matLoading ? (
                loadingCards(4)
              ) : materialsDisplay.length ? (
                materialsDisplay.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3"
                  >
                    <div>
                      <div className="text-sm font-black">{m.material}</div>
                      <div className="text-xs font-extrabold text-slate-600">
                        {m.qty} • {m.recipient_name} • {m.recipient_type} • {m.school_class} • {m.location}
                        {m.period ? ` • ${m.period}` : ""}
                      </div>
                      <div className="text-xs font-bold text-slate-500">
                        {new Date(m.delivered_at).toLocaleDateString("pt-BR")}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteMaterial(m.id)}
                      className="inline-flex items-center justify-center rounded-2xl border border-red-200 bg-red-50 p-2 text-red-700"
                      title="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-sm font-extrabold text-slate-500">Nenhuma entrega registrada.</div>
              )}
            </div>

            <div className="mt-3 text-center text-xs font-extrabold text-slate-500">
              Limitados: 5 por página • Página {matPage} / {totalMatPages}
            </div>
            {totalMatPages > 1 ? (
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setMatPage((p) => Math.max(1, p - 1))}
                  className="h-9 rounded-full px-3 text-xs font-extrabold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                  disabled={matPage === 1}
                >
                  Anterior
                </button>
                {Array.from({ length: totalMatPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setMatPage(p)}
                    className={`h-9 w-9 rounded-full text-xs font-extrabold ${
                      p === matPage
                        ? "bg-emerald-500 text-white shadow-sm"
                        : "bg-white text-slate-600 ring-1 ring-slate-200"
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setMatPage((p) => Math.min(totalMatPages, p + 1))}
                  className="h-9 rounded-full px-3 text-xs font-extrabold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                  disabled={matPage === totalMatPages}
                >
                  Próximo
                </button>
              </div>
            ) : null}

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <select
                value={reportSchoolId}
                onChange={(e) => setReportSchoolId(e.target.value)}
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-extrabold sm:col-span-2"
              >
                <option value="">Escola do relatório</option>
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-extrabold"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-extrabold"
              >
                <option value={0}>Todos os meses</option>
                {monthOptions.map((m, idx) => (
                  <option key={m} value={idx + 1}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                value={matPeriodReport}
                onChange={(e) => setMatPeriodReport(e.target.value)}
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-extrabold"
              >
                <option value="">Todos os períodos</option>
                {visiblePeriods.includes("matutino") ? <option value="matutino">Matutino</option> : null}
                {visiblePeriods.includes("vespertino") ? (
                  <option value="vespertino">Vespertino</option>
                ) : null}
                {visiblePeriods.includes("noturno") ? <option value="noturno">Noturno</option> : null}
              </select>
              <select
                value={matRecipientTypeReport}
                onChange={(e) => setMatRecipientTypeReport(e.target.value)}
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-extrabold"
              >
                <option value="geral">Geral</option>
                <option value="aluno">Somente alunos</option>
                <option value="professor">Somente professores</option>
              </select>
              <div className="col-span-2 flex justify-center">
                <button
                  type="button"
                  onClick={exportMaterialsPdf}
                  className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black shadow-sm transition-all duration-200 hover:bg-slate-50 sm:w-fit"
                >
                  <FileDown className="h-4 w-4" />
                  Exportar PDF
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {tab === "finance" ? (
          <section className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-[0_14px_40px_rgba(15,23,42,0.10)] sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-black">Gestão financeira</h2>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  Controle simples de entradas, saídas e contas a pagar.
                </p>
              </div>
              <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center">
                <select
                  value={reportSchoolId}
                  onChange={(e) => setReportSchoolId(e.target.value)}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700"
                  title="Escola do relatório"
                >
                  <option value="">Escola do relatório</option>
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={exportFinancePdf}
                  disabled={finExporting}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm transition-all duration-200 hover:bg-slate-50 disabled:opacity-60"
                >
                  <FileDown className="h-4 w-4" />
                  {finExporting ? "Exportando..." : "Resumo PDF"}
                </button>
                <button
                  type="button"
                  onClick={exportTransparencyPdf}
                  disabled={finTransparencyExporting}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm transition-all duration-200 hover:bg-slate-50 disabled:opacity-60"
                >
                  <FileDown className="h-4 w-4" />
                  {finTransparencyExporting ? "Gerando..." : "PDF Transparência"}
                </button>
              </div>
            </div>

            {financeOverduePayables.length ? (
              <div className="mt-4 rounded-2xl border border-red-300 bg-red-50 p-3 text-red-800">
                <div className="text-sm font-black">Alerta: contas vencidas</div>
                <div className="mt-1 text-xs font-bold">
                  {financeOverduePayables.length} conta(s) vencida(s), total {money(financeOverdueTotal)}.
                </div>
              </div>
            ) : null}

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="text-xs font-extrabold text-slate-500">Resumo rápido</div>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-slate-100 p-3">
                  <div className="text-[11px] font-extrabold text-slate-500">Entradas</div>
                  <div className="mt-1 text-lg font-black text-emerald-700">{money(financeTotals.entries)}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-100 p-3">
                  <div className="text-[11px] font-extrabold text-slate-500">Saídas</div>
                  <div className="mt-1 text-lg font-black text-red-700">{money(financeTotals.exits)}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-100 p-3">
                  <div className="text-[11px] font-extrabold text-slate-500">Saldo em caixa</div>
                  <div className="mt-1 text-lg font-black text-slate-800">{money(financeTotals.cashBalance)}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-100 p-3">
                  <div className="text-[11px] font-extrabold text-slate-500">Contas em aberto</div>
                  <div className="mt-1 text-lg font-black text-rose-700">{money(financeTotals.openPayables)}</div>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="text-xs font-extrabold text-slate-500">Filtro dos lançamentos</div>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <input
                  value={financeTextFilter}
                  onChange={(e) => setFinanceTextFilter(e.target.value)}
                  placeholder="Buscar por descrição, observação ou forma"
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-extrabold text-slate-700"
                />
                <select
                  value={financeCategoryFilter}
                  onChange={(e) => setFinanceCategoryFilter(e.target.value as FinanceCategoryFilter)}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-extrabold text-slate-700"
                >
                  <option value="all">Todas as categorias</option>
                  <option value="cash">Caixa</option>
                  <option value="school_income">Recebimento da escola</option>
                  <option value="event_income">Festa/Evento (arrecadação)</option>
                  <option value="accounts_payable">Contas a pagar</option>
                  <option value="custom">Categoria personalizada</option>
                  <option value="expense">Despesas</option>
                </select>
                <select
                  value={financeStatusFilter}
                  onChange={(e) => setFinanceStatusFilter(e.target.value as FinanceStatusFilter)}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-extrabold text-slate-700"
                >
                  <option value="all">Todos os status</option>
                  <option value="pending">Pendente</option>
                  <option value="paid">Paga</option>
                </select>
                <button
                  type="button"
                  onClick={() => {
                    setFinanceCategoryFilter("all");
                    setFinanceStatusFilter("all");
                    setFinanceTextFilter("");
                  }}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700"
                >
                  Limpar filtro
                </button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <div className="text-xs font-extrabold text-slate-500">Período de análise</div>
              </div>
              <div className="flex items-center gap-2 sm:col-span-2">
                <button
                  type="button"
                  onClick={() => setFinanceRange("monthly")}
                  className={`rounded-full px-3 py-2 text-xs font-extrabold ${
                    financeRange === "monthly"
                      ? "bg-sky-100 text-sky-800 ring-1 ring-sky-200"
                      : "bg-white text-slate-600 ring-1 ring-slate-200"
                  }`}
                >
                  Mensal
                </button>
                <button
                  type="button"
                  onClick={() => setFinanceRange("annual")}
                  className={`rounded-full px-3 py-2 text-xs font-extrabold ${
                    financeRange === "annual"
                      ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200"
                      : "bg-white text-slate-600 ring-1 ring-slate-200"
                  }`}
                >
                  Anual
                </button>
              </div>
              <select
                value={financeYear}
                onChange={(e) => setFinanceYear(Number(e.target.value))}
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-extrabold"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              {financeRange === "monthly" ? (
                <select
                  value={financeMonth}
                  onChange={(e) => setFinanceMonth(Number(e.target.value))}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-extrabold"
                >
                  {monthOptions.map((m, idx) => (
                    <option key={m} value={idx + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="flex h-11 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-extrabold text-slate-600">
                  Visão anual (janeiro a dezembro)
                </div>
              )}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3">
              <div className="text-xs font-extrabold text-slate-500">Novo lançamento financeiro</div>
              <input
                type="date"
                value={finDate}
                onChange={(e) => setFinDate(e.target.value)}
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-extrabold"
              />
              <input
                value={finDescription}
                onChange={(e) => setFinDescription(e.target.value)}
                placeholder="Descrição (ex: mensalidade, energia, compra de material)"
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-extrabold"
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <select
                  value={finCategory}
                  onChange={(e) => {
                    const next = e.target.value as FinanceCategory;
                    setFinCategory(next);
                    if (next === "school_income" || next === "event_income") {
                      setFinType("entry");
                    } else if (next === "expense" || next === "accounts_payable") {
                      setFinType("exit");
                    }
                    if (next === "accounts_payable") setFinPaid(false);
                  }}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-extrabold"
                >
                  <option value="cash">Caixa</option>
                  <option value="school_income">Recebimento da escola</option>
                  <option value="event_income">Festa/Evento (arrecadação)</option>
                  <option value="expense">Despesa da escola</option>
                  <option value="accounts_payable">Conta a pagar</option>
                  <option value="custom">Categoria personalizada</option>
                </select>
                <input
                  value={finAmount}
                  onChange={(e) => setFinAmount(e.target.value)}
                  placeholder="Valor (ex: 350.90)"
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-extrabold"
                />
              </div>
              {finCategory === "custom" ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <select
                    value={finCustomCategory}
                    onChange={(e) => setFinCustomCategory(e.target.value)}
                    className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-extrabold"
                  >
                    <option value="">Selecionar categoria personalizada</option>
                    {customCategories.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                    <option value="__new__">+ Cadastrar nova categoria</option>
                  </select>
                  {finCustomCategory === "__new__" ? (
                    <input
                      value={finCustomCategoryNew}
                      onChange={(e) => setFinCustomCategoryNew(e.target.value)}
                      placeholder="Digite o nome da nova categoria"
                      className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-extrabold"
                    />
                  ) : (
                    <div className="flex h-11 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-extrabold text-slate-600">
                      Selecione uma categoria acima ou escolha “Cadastrar nova categoria”.
                    </div>
                  )}
                </div>
              ) : null}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <select
                  value={finType}
                  onChange={(e) => setFinType(e.target.value as FinanceType)}
                  disabled={finCategory !== "cash" && finCategory !== "custom"}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-extrabold disabled:opacity-60"
                >
                  <option value="entry">Entrada</option>
                  <option value="exit">Saída</option>
                </select>
                <select
                  value={finMethod}
                  onChange={(e) => setFinMethod(e.target.value)}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-extrabold"
                >
                  <option value="Dinheiro">Dinheiro</option>
                  <option value="Pix">Pix</option>
                  <option value="Transferência">Transferência</option>
                  <option value="Boleto">Boleto</option>
                  <option value="Cartão de débito">Cartão de débito</option>
                  <option value="Cartão de crédito">Cartão de crédito</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>
              {finCategory === "accounts_payable" ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <input
                    type="date"
                    value={finDueDate}
                    onChange={(e) => setFinDueDate(e.target.value)}
                    className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-extrabold"
                  />
                  <label className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-extrabold text-slate-700">
                    <input
                      type="checkbox"
                      checked={finPaid}
                      onChange={(e) => setFinPaid(e.target.checked)}
                      className="h-4 w-4"
                    />
                    Já foi paga
                  </label>
                </div>
              ) : null}
              <textarea
                value={finNotes}
                onChange={(e) => setFinNotes(e.target.value)}
                placeholder="Observações (opcional)"
                className="h-24 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-extrabold"
              />
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={addFinanceRecord}
                  className="inline-flex h-9 w-full items-center justify-center rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 px-4 text-xs font-black text-white shadow-sm transition-all duration-200 hover:-translate-y-[1px] hover:shadow-md sm:w-fit"
                >
                  Registrar lançamento
                </button>
              </div>
              {finMsg ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm font-extrabold text-slate-700">
                  {finMsg}
                </div>
              ) : null}
            </div>

            <div className="mt-5 space-y-2">
              <div className="text-xs font-extrabold text-slate-500">Lançamentos do período selecionado</div>
              {!financeVisibleRows.length ? (
                <div className="text-sm font-extrabold text-slate-500">
                  Nenhum lançamento financeiro no período selecionado.
                </div>
              ) : (
                financeVisibleRows.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-start sm:justify-between"
                    >
                      <div>
                        <div className="text-sm font-black text-slate-900">{item.description}</div>
                        <div className="text-xs font-extrabold text-slate-600">
                          {new Date(`${item.date}T00:00:00`).toLocaleDateString("pt-BR")} •{" "}
                          {financeCategoryLabel(item.category, item.customCategory)}{" "}
                          • {item.type === "entry" ? "Entrada" : "Saída"} • {item.method}
                        </div>
                        {item.category === "accounts_payable" && item.dueDate ? (
                          <div className="mt-1 text-xs font-bold text-slate-500">
                            Vencimento: {new Date(`${item.dueDate}T00:00:00`).toLocaleDateString("pt-BR")}
                          </div>
                        ) : null}
                        {item.notes ? (
                          <div className="mt-1 text-xs font-bold text-slate-500">{item.notes}</div>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-extrabold ${
                            item.type === "entry"
                              ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200"
                              : "bg-red-100 text-red-700 ring-1 ring-red-200"
                          }`}
                        >
                          {item.type === "entry" ? "+" : "-"} {money(item.amount)}
                        </span>
                        {item.category === "accounts_payable" ? (
                          <button
                            type="button"
                            onClick={() => toggleFinancePaid(item.id)}
                            className={`rounded-full px-3 py-1 text-xs font-extrabold ${
                              item.paid
                                ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200"
                                : "bg-rose-100 text-rose-700 ring-1 ring-rose-200"
                            }`}
                          >
                            {item.paid ? "Paga" : "Pendente"}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => removeFinanceRecord(item.id)}
                          className="inline-flex items-center justify-center rounded-2xl border border-red-200 bg-red-50 p-2 text-red-700"
                          title="Excluir lançamento"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </section>
        ) : null}

        {tab === "prints" ? (
          <section className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-[0_14px_40px_rgba(15,23,42,0.10)] sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-black">Controle de impressão</h2>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  Arquivos enviados pelos professores.
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-extrabold text-amber-800 ring-1 ring-amber-200">
                <Printer className="h-4 w-4" />
                Gestão
              </div>
            </div>

            <div className="mt-4 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {visiblePrintLocations.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() =>
                    setPrintLocationFilter((prev) =>
                      adminScope.allowedLocations.length ? loc : prev === loc ? "" : loc
                    )
                  }
                  className={`shrink-0 whitespace-nowrap rounded-full px-3 py-2 text-xs font-extrabold ${
                    printLocationFilter === loc
                      ? "bg-sky-100 text-sky-800 ring-1 ring-sky-200"
                      : "bg-white text-slate-600 ring-1 ring-slate-200"
                  }`}
                >
                  {loc}
                </button>
              ))}
              <div className="flex w-full shrink-0 flex-col items-stretch gap-2 sm:ml-auto sm:w-auto sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() => setPrintStatusFilter("pending")}
                  className={`whitespace-nowrap rounded-full px-3 py-2 text-xs font-extrabold ${
                    printStatusFilter === "pending"
                      ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200"
                      : "bg-white text-slate-600 ring-1 ring-slate-200"
                  }`}
                >
                  Pendentes
                </button>
                <button
                  type="button"
                  onClick={() => setPrintStatusFilter("printed")}
                  className={`whitespace-nowrap rounded-full px-3 py-2 text-xs font-extrabold ${
                    printStatusFilter === "printed"
                      ? "bg-slate-200 text-slate-700 ring-1 ring-slate-300"
                      : "bg-white text-slate-600 ring-1 ring-slate-200"
                  }`}
                >
                  Impressos
                </button>
              </div>
            </div>

            <div className="mt-4">
              <button
                type="button"
                onClick={() => setShowSearchPrints((prev) => !prev)}
                className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 shadow-sm transition-all duration-200 hover:bg-slate-50"
              >
                {showSearchPrints ? "Ocultar busca de impressões" : "Buscar impressões"}
              </button>
              {showSearchPrints ? (
                <div className="relative mt-3">
                  <input
                    value={printSearch}
                    onChange={(e) => setPrintSearch(e.target.value)}
                    placeholder="Buscar impressões por professor ou arquivo"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 pr-10 text-sm font-extrabold"
                  />
                  {printSearch ? (
                    <button
                      type="button"
                      onClick={() => setPrintSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      title="Limpar busca"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>

            {printMsg ? (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-extrabold text-red-700">
                {printMsg}
              </div>
            ) : null}

            <div ref={printResultsRef} className="mt-4 space-y-2">
              {printLoading ? (
                loadingCards(4)
              ) : pagedPrintJobs.length ? (
                pagedPrintJobs.map((job) => (
                  <div
                    key={job.id}
                    className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="text-sm font-black">
                        {(() => {
                          const label = job.title || job.file_name;
                          const q = printSearch.trim();
                          if (!q) return label;
                          const lower = label.toLowerCase();
                          const idx = lower.indexOf(q.toLowerCase());
                          if (idx === -1) return label;
                          return (
                            <>
                              {label.slice(0, idx)}
                              <span className="rounded bg-amber-200/60 px-1">
                                {label.slice(idx, idx + q.length)}
                              </span>
                              {label.slice(idx + q.length)}
                            </>
                          );
                        })()}
                      </div>
                      <div className="text-xs font-extrabold text-slate-600">
                        {(() => {
                          const text = `${job.created_by_name} • ${job.location}${
                            job.period ? ` • ${job.period}` : ""
                          }`;
                          const q = printSearch.trim();
                          if (!q) return text;
                          const lower = text.toLowerCase();
                          const idx = lower.indexOf(q.toLowerCase());
                          if (idx === -1) return text;
                          return (
                            <>
                              {text.slice(0, idx)}
                              <span className="rounded bg-amber-200/60 px-1">
                                {text.slice(idx, idx + q.length)}
                              </span>
                              {text.slice(idx + q.length)}
                            </>
                          );
                        })()}
                      </div>
                      <div className="text-xs font-bold text-slate-500">
                        {new Date(job.created_at).toLocaleString("pt-BR")}
                      </div>
                    </div>
                    <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:gap-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-extrabold ${
                          job.printed
                            ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200"
                            : "bg-red-100 text-red-700 ring-1 ring-red-200"
                        }`}
                      >
                        {job.printed ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <X className="h-3.5 w-3.5" />
                        )}
                        {job.printed ? "Impresso" : "Pendente"}
                      </span>
                      <label className="inline-flex items-center gap-2 text-xs font-extrabold text-slate-600">
                        <input
                          type="checkbox"
                          checked={job.printed}
                          onChange={(e) => togglePrinted(job.id, e.target.checked)}
                          className="h-4 w-4"
                        />
                        Impresso
                      </label>
                      {job.url ? (
                        <a
                          href={`/print-file?url=${encodeURIComponent(job.url)}&name=${encodeURIComponent(
                            job.title || job.file_name
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black shadow-sm transition-all duration-200 hover:bg-slate-50 sm:w-auto"
                        >
                          Abrir
                        </a>
                      ) : null}
                      {job.url ? (
                        <button
                          type="button"
                          onClick={() => downloadPrintJob(job)}
                          disabled={printDownloadingId === job.id}
                          className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black shadow-sm transition-all duration-200 hover:bg-slate-50 disabled:opacity-60 sm:w-auto"
                        >
                          {printDownloadingId === job.id ? "Baixando..." : "Baixar envio"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm font-extrabold text-slate-500">
                  Nenhum arquivo encontrado.
                </div>
              )}
            </div>

            {totalPrintPages > 1 ? (
              <div className="mt-4 flex items-center justify-start gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:justify-center">
                <button
                  type="button"
                  onClick={() => setPrintPage((p) => Math.max(1, p - 1))}
                  className="h-9 shrink-0 rounded-full px-3 text-xs font-extrabold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                  disabled={printPage === 1}
                >
                  Anterior
                </button>
                {Array.from({ length: totalPrintPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPrintPage(p)}
                    className={`h-9 w-9 shrink-0 rounded-full text-xs font-extrabold ${
                      p === printPage
                        ? "bg-emerald-500 text-white shadow-sm"
                        : "bg-white text-slate-600 ring-1 ring-slate-200"
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPrintPage((p) => Math.min(totalPrintPages, p + 1))}
                  className="h-9 shrink-0 rounded-full px-3 text-xs font-extrabold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                  disabled={printPage === totalPrintPages}
                >
                  Próximo
                </button>
              </div>
            ) : null}
          </section>
        ) : null}

        {tab === "publications" ? (
          <section className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-[0_14px_40px_rgba(15,23,42,0.10)] sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-black">Publicações da escola</h2>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  Fotos enviadas pelos professores para análise da gestão.
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-extrabold text-emerald-800 ring-1 ring-emerald-200">
                <Check className="h-4 w-4" />
                Revisão
              </div>
            </div>

            <div className="mt-4 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button
                type="button"
                onClick={() => setPubStatusFilter("pending")}
                className={`shrink-0 whitespace-nowrap rounded-full px-3 py-2 text-xs font-extrabold ${
                  pubStatusFilter === "pending"
                    ? "bg-amber-100 text-amber-800 ring-1 ring-amber-200"
                    : "bg-white text-slate-600 ring-1 ring-slate-200"
                }`}
              >
                Pendentes
              </button>
              <button
                type="button"
                onClick={() => setPubStatusFilter("published")}
                className={`shrink-0 whitespace-nowrap rounded-full px-3 py-2 text-xs font-extrabold ${
                  pubStatusFilter === "published"
                    ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200"
                    : "bg-white text-slate-600 ring-1 ring-slate-200"
                }`}
              >
                Publicadas
              </button>
              <button
                type="button"
                onClick={() => setPubStatusFilter("rejected")}
                className={`shrink-0 whitespace-nowrap rounded-full px-3 py-2 text-xs font-extrabold ${
                  pubStatusFilter === "rejected"
                    ? "bg-red-100 text-red-700 ring-1 ring-red-200"
                    : "bg-white text-slate-600 ring-1 ring-slate-200"
                }`}
              >
                Rejeitadas
              </button>
              <button
                type="button"
                onClick={() => setPubStatusFilter("all")}
                className={`shrink-0 whitespace-nowrap rounded-full px-3 py-2 text-xs font-extrabold ${
                  pubStatusFilter === "all"
                    ? "bg-slate-200 text-slate-700 ring-1 ring-slate-300"
                    : "bg-white text-slate-600 ring-1 ring-slate-200"
                }`}
              >
                Todas
              </button>
            </div>

            {pubMsg ? (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-extrabold text-red-700">
                {pubMsg}
              </div>
            ) : null}

            <div className="mt-4 space-y-3">
              {pubLoading ? (
                loadingCards(4)
              ) : groupedPublications.length ? (
                publicationsDisplay.map((item) => (
                  <div key={item.batchId} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-black text-slate-900">
                          {new Date(item.createdAt).toLocaleString("pt-BR")}
                        </div>
                        <div className="text-xs font-extrabold text-slate-600">{item.createdByName}</div>
                        <div className="text-[11px] font-bold text-slate-500">
                          {item.location || "Unidade não informada"}
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-extrabold ${
                          item.status === "published"
                            ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200"
                            : item.status === "rejected"
                            ? "bg-red-100 text-red-700 ring-1 ring-red-200"
                            : "bg-amber-100 text-amber-800 ring-1 ring-amber-200"
                        }`}
                      >
                        {item.status === "published"
                          ? "Publicada"
                          : item.status === "rejected"
                          ? "Rejeitada"
                          : "Em análise"}
                      </span>
                    </div>

                    <p className="mt-2 text-sm font-bold text-slate-700">{item.description}</p>
                    {item.reviewNote ? (
                      <div className="mt-2 rounded-xl border border-slate-200 bg-white p-2 text-xs font-bold text-slate-600">
                        Observação: {item.reviewNote}
                      </div>
                    ) : null}

                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
                      {item.photos.map((photo) => (
                        <a
                          key={photo.id}
                          href={photo.url}
                          target="_blank"
                          rel="noreferrer"
                          className="overflow-hidden rounded-xl border border-slate-200 bg-white"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={photo.url}
                            alt={photo.photo_name}
                            className="h-28 w-full object-cover"
                            loading="lazy"
                          />
                        </a>
                      ))}
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center">
                      <button
                        type="button"
                        onClick={() => downloadPublicationBatch(item)}
                        disabled={pubDownloadingBatch === item.batchId}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 disabled:opacity-60 sm:w-auto"
                      >
                        {pubDownloadingBatch === item.batchId ? "Baixando..." : "Baixar fotos"}
                      </button>
                      <button
                        type="button"
                        onClick={() => openPublicationGallery(item)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 sm:w-auto"
                      >
                        Abrir galeria do envio
                      </button>
                      <button
                        type="button"
                        onClick={() => updatePublicationStatus(item.batchId, "published")}
                        disabled={pubSavingBatch === item.batchId}
                        className="w-full rounded-xl bg-emerald-500 px-3 py-2 text-xs font-black text-white disabled:opacity-60 sm:w-auto"
                      >
                        Publicar
                      </button>
                      <button
                        type="button"
                        onClick={() => updatePublicationStatus(item.batchId, "rejected")}
                        disabled={pubSavingBatch === item.batchId}
                        className="w-full rounded-xl bg-red-500 px-3 py-2 text-xs font-black text-white disabled:opacity-60 sm:w-auto"
                      >
                        Rejeitar
                      </button>
                      <button
                        type="button"
                        onClick={() => updatePublicationStatus(item.batchId, "pending")}
                        disabled={pubSavingBatch === item.batchId}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 disabled:opacity-60 sm:w-auto"
                      >
                        Voltar para análise
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm font-extrabold text-slate-500">Nenhuma atividade encontrada.</div>
              )}
              {!pubLoading && publicationsDisplay.length < groupedPublications.length ? (
                <button
                  type="button"
                  onClick={() => setPubVisibleCount((prev) => prev + 8)}
                  className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 shadow-sm transition-all duration-200 hover:bg-slate-50"
                >
                  Carregar mais publicações ({groupedPublications.length - publicationsDisplay.length} restantes)
                </button>
              ) : null}
            </div>
          </section>
        ) : null}
      </div>
      {showMobileActionBar ? (
        <div className="fixed inset-x-2 bottom-2 z-[90] grid grid-cols-3 gap-2 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-[0_14px_36px_rgba(15,23,42,0.22)] backdrop-blur sm:hidden">
          <Link
            href="/portal"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-2 text-xs font-black text-slate-700"
          >
            Voltar
          </Link>
          <button
            type="button"
            onClick={() => {
              if (tab === "substitutes") clearSubstituteForm();
              if (tab === "materials") clearMaterialForm();
              if (tab === "finance") clearFinanceForm();
            }}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-2 text-xs font-black text-slate-700"
          >
            Limpar
          </button>
          <button
            type="button"
            onClick={() => {
              if (tab === "substitutes") void addSubstitute();
              if (tab === "materials") void addMaterial();
              if (tab === "finance") void addFinanceRecord();
            }}
            disabled={subsLoading || matLoading}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-gradient-to-r from-emerald-500 to-sky-500 px-2 text-xs font-black text-white disabled:opacity-60"
          >
            Salvar
          </button>
        </div>
      ) : null}

      {activeGalleryPublication ? (
        <div
          className="fixed inset-0 z-[9999] bg-slate-900/55 p-2 backdrop-blur-sm sm:p-4"
          onClick={() => setPubGalleryBatchId(null)}
        >
          <div
            className="mx-auto mt-2 max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_20px_60px_rgba(15,23,42,0.25)] sm:mt-6 sm:max-h-[88vh] sm:rounded-3xl sm:p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
              <div>
                <div className="text-lg font-black text-slate-900">Galeria do envio</div>
                <div className="text-xs font-bold text-slate-500">
                  Toque e segure na foto para salvar.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPubGalleryBatchId(null)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 sm:w-auto"
              >
                Fechar
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {activeGalleryPublication.photos.map((photo) => (
                <a
                  key={photo.id}
                  href={photo.url}
                  target="_blank"
                  rel="noreferrer"
                  className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt={photo.photo_name}
                    className="h-36 w-full object-cover"
                    loading="lazy"
                  />
                </a>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
