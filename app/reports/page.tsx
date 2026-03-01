"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import HomeTopButton from "../components/HomeTopButton";
import SchoolLogo from "../components/SchoolLogo";
import {
  FileDown,
  ShieldCheck,
  LogIn,
  LogOut,
  Loader2,
  AlertTriangle,
  Trash2,
  CalendarDays,
  BarChart3,
  Trophy,
  School,
  FileText,
} from "lucide-react";

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

type School = {
  id: string;
  name: string;
  active: boolean;
};

export default function ReportsPage() {
  const searchParams = useSearchParams();
  const today = new Date();
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState(() =>
    typeof window !== "undefined"
      ? localStorage.getItem("mutare_selected_school_id") ??
        localStorage.getItem("mutare_cadastros_focus_school") ??
        ""
      : ""
  );
  const [schoolsLoading, setSchoolsLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<{
    items: { id: string; name: string; category: string }[];
    overall: { key: string; name: string; count: number }[];
    perItem: Record<string, { key: string; name: string; count: number }[]>;
  } | null>(null);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const [globalNotice, setGlobalNotice] = useState("");
  const [globalNoticeOpen, setGlobalNoticeOpen] = useState(false);
  const globalNoticeTimer = useRef<number | null>(null);
  const globalNoticeCloseTimer = useRef<number | null>(null);
  const [reportsTick, setReportsTick] = useState(0);

  const [loginOpen, setLoginOpen] = useState(false);
  const [loginUser, setLoginUser] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginMsg, setLoginMsg] = useState("");
  const [loginOk, setLoginOk] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const [authEmail, setAuthEmail] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [leadersHistory, setLeadersHistory] = useState<
    { month: number; leader_name: string; leader_count: number }[]
  >([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [occurrenceItemId, setOccurrenceItemId] = useState("");
  const [occurrenceText, setOccurrenceText] = useState("");
  const [occurrenceLoading, setOccurrenceLoading] = useState(false);
  const [occurrenceMsg, setOccurrenceMsg] = useState("");
  const [occurrenceList, setOccurrenceList] = useState<
    {
      id: string;
      item_id: string;
      observation: string;
      created_at: string;
      created_by_email: string | null;
      status: string;
      resolved_at?: string | null;
      diagnosis?: string | null;
    }[]
  >([]);
  const [occurrenceListLoading, setOccurrenceListLoading] = useState(false);
  const [occurrenceResolvedCount, setOccurrenceResolvedCount] = useState(0);
  const [occurrenceTotalCount, setOccurrenceTotalCount] = useState(0);
  const [showResolved, setShowResolved] = useState(false);
  const [occurrenceActionId, setOccurrenceActionId] = useState("");
  const [occurrenceResolveId, setOccurrenceResolveId] = useState("");
  const [occurrenceDiagnosisText, setOccurrenceDiagnosisText] = useState("");
  const [occurrenceBulkPdfLoading, setOccurrenceBulkPdfLoading] = useState(false);
  const [overallPage, setOverallPage] = useState(1);
  const [perItemPage, setPerItemPage] = useState(1);
  const [occurrencePage, setOccurrencePage] = useState(1);
  const reportsPageSize = 10;

  const years = useMemo(() => {
    const current = new Date().getFullYear();
    const start = 2026;
    const end = Math.max(current, start);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, []);

  const monthLabel = MONTHS_PT[month - 1] ?? "";
  const headerSubtitle = `${monthLabel} • ${year}`;

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
    if (!selectedSchoolId) return;
    localStorage.setItem("mutare_selected_school_id", selectedSchoolId);
  }, [selectedSchoolId]);

  useEffect(() => {
    let active = true;
    setSchoolsLoading(true);
    (async () => {
      const token = await getAccessToken();
      if (!token) {
        if (!active) return;
        setSchools([]);
        setSchoolsLoading(false);
        return;
      }
      fetch("/api/schools/list", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      })
        .then((res) => res.json())
        .then((payload) => {
          if (!active) return;
          const list = (payload?.data ?? []) as School[];
          setSchools(list);
          if (!selectedSchoolId && list.length) {
            const preferred = list.find((s) => s.name.toLowerCase().includes("extens"));
            const chosen = preferred ?? list[0];
            setSelectedSchoolId(chosen.id);
          }
        })
        .catch(() => {
          if (!active) return;
          setSchools([]);
        })
        .finally(() => {
          if (!active) return;
          setSchoolsLoading(false);
        });
    })();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function percent(part: number, total: number) {
    if (!total) return 0;
    return Math.round((part / total) * 100);
  }

  function medalForIndex(i: number) {
    if (i === 0) return "🥇";
    if (i === 1) return "🥈";
    if (i === 2) return "🥉";
    return "";
  }

  function SkeletonRow() {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="h-4 w-2/3 rounded bg-slate-100 animate-pulse" />
        <div className="mt-3 h-2 w-full rounded bg-slate-100 animate-pulse" />
      </div>
    );
  }

  function displayUserLabel(value: string) {
    return value.endsWith("@local.eeav") ? value.replace("@local.eeav", "") : value;
  }

  function extractDiagnosisFromObservation(text: string) {
    const match = text.match(/Diagnóstico \(resolução\):\s*([^\n]+)/i);
    return match?.[1]?.trim() ?? "";
  }

  async function getAccessToken() {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user?.user_metadata?.force_password_change) {
      window.location.href = "/auth/first-login";
      return "";
    }
    return data.session?.access_token ?? "";
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    (async () => {
      const token = await getAccessToken();
      if (!token) {
        if (!active) return;
        setError("Faça login para ver os relatórios.");
        setData(null);
        setLoading(false);
        return;
      }

      fetch("/api/reports/teacher-usage", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ year, month, school_id: selectedSchoolId || null }),
      })
        .then((res) => res.json())
        .then((payload) => {
          if (!active) return;
          if (!payload?.ok) {
            setError(payload?.error ?? "Erro ao carregar dados.");
            setData(null);
            return;
          }
          setData(payload);
        })
        .catch(() => {
          if (!active) return;
          setError("Erro ao carregar dados.");
          setData(null);
        })
        .finally(() => {
          if (!active) return;
          setLoading(false);
      });
    })();

    return () => {
      active = false;
    };
  }, [year, month, selectedSchoolId, reportsTick]);

  useEffect(() => {
    let active = true;
    setHistoryLoading(true);

    (async () => {
      const token = await getAccessToken();
      if (!token) {
        if (!active) return;
        setLeadersHistory([]);
        setHistoryLoading(false);
        return;
      }

      fetch("/api/reports/leaders-history", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ year, school_id: selectedSchoolId || null }),
      })
        .then((res) => res.json())
        .then((payload) => {
          if (!active) return;
          if (!payload?.ok) {
            setLeadersHistory([]);
            return;
          }
          setLeadersHistory(payload?.data ?? []);
        })
        .catch(() => {
          if (!active) return;
          setLeadersHistory([]);
        })
        .finally(() => {
          if (!active) return;
          setHistoryLoading(false);
        });
    })();

    return () => {
      active = false;
    };
  }, [year, selectedSchoolId, reportsTick]);

  async function refreshAdmin(session?: { access_token?: string } | null) {
    const token = session?.access_token ?? "";
    if (!token) {
      setIsAdmin(false);
      setIsSuperAdmin(false);
      return;
    }
    try {
      const res = await fetch("/api/admin/me", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      setIsAdmin(!!data?.isAdmin);
      setIsSuperAdmin(!!data?.isSuperAdmin);
    } catch {
      setIsAdmin(false);
      setIsSuperAdmin(false);
    }
  }

  useEffect(() => {
    let active = true;
    (async () => {
      const tempSession = localStorage.getItem("eeav_temp_session");
      if (tempSession && !sessionStorage.getItem("eeav_temp_session")) {
        await supabase.auth.signOut({ scope: "local" });
        localStorage.removeItem("eeav_temp_session");
      }
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      setIsLoggedIn(!!data.session);
      setAuthEmail(data.session?.user?.email ?? "");
      await refreshAdmin(data.session);
    })();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setIsLoggedIn(!!session);
        setAuthEmail(session?.user?.email ?? "");
        refreshAdmin(session);
      }
    );

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!data?.items?.length) return;
    if (selectedItemId) return;
    setSelectedItemId(data.items[0].id);
  }, [data, selectedItemId]);

  useEffect(() => {
    if (!data?.items?.length) return;
    if (occurrenceItemId) return;
    setOccurrenceItemId(data.items[0].id);
  }, [data, occurrenceItemId]);

  const loadOccurrences = useCallback(async (itemId: string) => {
    setOccurrenceListLoading(true);
    setOccurrenceMsg("");
    let { data: rows, error: occErr } = await supabase
      .from("item_occurrences")
      .select("id,item_id,observation,created_at,created_by_email,status,resolved_at,diagnosis")
      .eq("item_id", itemId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (occErr) {
      const msg = String(occErr.message ?? "").toLowerCase();
      const canFallback = msg.includes("diagnosis");
      if (canFallback) {
        const fallback = await supabase
          .from("item_occurrences")
          .select("id,item_id,observation,created_at,created_by_email,status,resolved_at")
          .eq("item_id", itemId)
          .order("created_at", { ascending: false })
          .limit(100);
        rows = fallback.data as typeof rows;
        occErr = fallback.error;
      }
    }

    if (occErr) {
      setOccurrenceMsg("Erro ao carregar ocorrências.");
      setOccurrenceList([]);
      setOccurrenceResolvedCount(0);
      setOccurrenceTotalCount(0);
    } else {
      const list = (rows ?? []).map((row) => ({
        ...row,
        diagnosis:
          typeof row.diagnosis === "string" && row.diagnosis.trim()
            ? row.diagnosis.trim()
            : extractDiagnosisFromObservation(String(row.observation ?? "")),
      }));
      setOccurrenceTotalCount(list.length);
      setOccurrenceResolvedCount(list.filter((r) => r.status === "resolved").length);
      setOccurrenceList(
        showResolved ? list : list.filter((r) => r.status !== "resolved")
      );
    }
    setOccurrenceListLoading(false);
  }, [showResolved]);

  useEffect(() => {
    if (!occurrenceItemId) return;
    void loadOccurrences(occurrenceItemId);
  }, [occurrenceItemId, loadOccurrences]);

  async function exportPdf() {
    const token = await getAccessToken();
    if (!token) {
      openLoginModal();
      return;
    }

    const schoolParam = selectedSchoolId ? `&school_id=${selectedSchoolId}` : "";
    const url = `/api/export/pdf?year=${year}&month=${month}${schoolParam}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      setError("Erro ao exportar PDF.");
      return;
    }

    const blob = await res.blob();
    const link = document.createElement("a");
    const objectUrl = URL.createObjectURL(blob);
    link.href = objectUrl;
    link.download = `relatorio-agendamentos-${year}-${String(month).padStart(2, "0")}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
  }

  function applyRelativeMonth(offset: number) {
    const base = new Date();
    base.setMonth(base.getMonth() + offset);
    const nextYear = Math.max(2026, base.getFullYear());
    setYear(nextYear);
    setMonth(base.getMonth() + 1);
  }

  const items = useMemo(() => data?.items ?? [], [data?.items]);
  const overall = useMemo(() => data?.overall ?? [], [data?.overall]);
  const overallTotal = overall.reduce((sum, row) => sum + row.count, 0);
  const top3 = [...overall].sort((a, b) => b.count - a.count).slice(0, 3);
  const perItemRows = useMemo(
    () => (selectedItemId ? data?.perItem?.[selectedItemId] ?? [] : []),
    [data?.perItem, selectedItemId]
  );
  const perItemTotal = perItemRows.reduce((sum, row) => sum + row.count, 0);
  const top3PerItem = [...perItemRows].sort((a, b) => b.count - a.count).slice(0, 3);
  const selectedItem = items.find((x) => x.id === selectedItemId);
  const selectedItemLabel = selectedItem ? `${selectedItem.category} — ${selectedItem.name}` : "";
  const activeTeachersCount = overall.length;
  const leaderName = top3[0]?.name ?? "Sem dados";
  const openOccurrencesCount = Math.max(occurrenceTotalCount - occurrenceResolvedCount, 0);
  const selectedSchoolName =
    schools.find((s) => s.id === selectedSchoolId)?.name ?? "Todas as escolas";
  const sortedOverallRows = useMemo(() => [...overall].sort((a, b) => b.count - a.count), [overall]);
  const overallTotalPages = useMemo(
    () => Math.max(1, Math.ceil(sortedOverallRows.length / reportsPageSize)),
    [sortedOverallRows.length]
  );
  const pagedOverallRows = useMemo(() => {
    const safePage = Math.min(overallPage, overallTotalPages);
    const start = (safePage - 1) * reportsPageSize;
    return sortedOverallRows.slice(start, start + reportsPageSize);
  }, [overallPage, overallTotalPages, sortedOverallRows]);

  const sortedPerItemRows = useMemo(() => [...perItemRows].sort((a, b) => b.count - a.count), [perItemRows]);
  const perItemTotalPages = useMemo(
    () => Math.max(1, Math.ceil(sortedPerItemRows.length / reportsPageSize)),
    [sortedPerItemRows.length]
  );
  const pagedPerItemRows = useMemo(() => {
    const safePage = Math.min(perItemPage, perItemTotalPages);
    const start = (safePage - 1) * reportsPageSize;
    return sortedPerItemRows.slice(start, start + reportsPageSize);
  }, [perItemPage, perItemTotalPages, sortedPerItemRows]);

  const occurrenceTotalPages = useMemo(
    () => Math.max(1, Math.ceil(occurrenceList.length / reportsPageSize)),
    [occurrenceList.length]
  );
  const pagedOccurrenceList = useMemo(() => {
    const safePage = Math.min(occurrencePage, occurrenceTotalPages);
    const start = (safePage - 1) * reportsPageSize;
    return occurrenceList.slice(start, start + reportsPageSize);
  }, [occurrenceList, occurrencePage, occurrenceTotalPages]);

  useEffect(() => {
    setOverallPage(1);
  }, [year, month, selectedSchoolId]);

  useEffect(() => {
    if (overallPage > overallTotalPages) setOverallPage(overallTotalPages);
  }, [overallPage, overallTotalPages]);

  useEffect(() => {
    setPerItemPage(1);
  }, [selectedItemId, year, month, selectedSchoolId]);

  useEffect(() => {
    if (perItemPage > perItemTotalPages) setPerItemPage(perItemTotalPages);
  }, [perItemPage, perItemTotalPages]);

  useEffect(() => {
    setOccurrencePage(1);
  }, [occurrenceItemId, showResolved]);

  useEffect(() => {
    if (occurrencePage > occurrenceTotalPages) setOccurrencePage(occurrenceTotalPages);
  }, [occurrencePage, occurrenceTotalPages]);

  function openLoginModal() {
    setLoginMsg("");
    setLoginOpen(true);
  }

  async function exportOccurrencePdf(params: {
    occurrenceId?: string;
    itemId?: string;
    observation?: string;
    status?: string;
    createdAt?: string;
    createdByEmail?: string | null;
    diagnosis?: string | null;
    resolvedAt?: string | null;
  }) {
    const token = await getAccessToken();
    if (!token) {
      openLoginModal();
      return;
    }
    const res = await fetch("/api/reports/occurrence-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        occurrence_id: params.occurrenceId,
        item_id: params.itemId ?? occurrenceItemId,
        observation: params.observation ?? occurrenceText,
        status: params.status ?? "open",
        created_at: params.createdAt,
        created_by_email: params.createdByEmail ?? authEmail,
        diagnosis: params.diagnosis ?? null,
        resolved_at: params.resolvedAt ?? null,
        school_id: selectedSchoolId || null,
        school_name: schools.find((s) => s.id === selectedSchoolId)?.name ?? "",
      }),
    });

    if (!res.ok) {
      setOccurrenceMsg("Não foi possível gerar PDF da ocorrência.");
      return;
    }
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = `ocorrencia-material-${new Date().toISOString().slice(0, 10)}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
  }

  async function exportOpenOccurrencesPdf() {
    const token = await getAccessToken();
    if (!token) {
      openLoginModal();
      return;
    }

    setOccurrenceBulkPdfLoading(true);
    setOccurrenceMsg("");
    try {
      const res = await fetch("/api/reports/occurrences-open-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          school_id: selectedSchoolId || null,
          school_name: schools.find((s) => s.id === selectedSchoolId)?.name ?? "",
        }),
      });

      if (!res.ok) {
        setOccurrenceMsg("Não foi possível gerar o PDF de ocorrências em aberto.");
        return;
      }

      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `registro-ocorrencias-manutencao-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } finally {
      setOccurrenceBulkPdfLoading(false);
    }
  }

  function startGlobalNoticeAutoClose(delayMs = 2500) {
    if (globalNoticeTimer.current) window.clearTimeout(globalNoticeTimer.current);
    globalNoticeTimer.current = window.setTimeout(() => {
      setGlobalNoticeOpen(false);
      if (globalNoticeCloseTimer.current) window.clearTimeout(globalNoticeCloseTimer.current);
      globalNoticeCloseTimer.current = window.setTimeout(() => {
        setGlobalNotice("");
      }, 200);
      globalNoticeTimer.current = null;
    }, delayMs);
  }

  async function handleLogin() {
    setLoginMsg("");
    setLoginOk(false);
    setLoginLoading(true);

    const rawLogin = loginUser.trim();
    const email = rawLogin.includes("@")
      ? rawLogin.toLowerCase()
      : `${rawLogin
          .trim()
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/\s+/g, ".")
          .replace(/[^a-z0-9._-]/g, "")
          .replace(/\.+/g, ".")
          .replace(/^\.|\.$/g, "")}@local.eeav`;

    const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
      email,
      password: loginPassword,
    });

    if (signInErr) {
      setLoginMsg("Login inválido.");
      setLoginLoading(false);
      return;
    }

    const session = signInData?.session ?? null;
    if (session?.user?.user_metadata?.force_password_change) {
      setLoginLoading(false);
      setLoginOpen(false);
      window.location.href = "/auth/first-login";
      return;
    }

    setIsLoggedIn(!!session);
    setAuthEmail(session?.user?.email ?? email);
    if (rememberMe) {
      localStorage.removeItem("eeav_temp_session");
      sessionStorage.removeItem("eeav_temp_session");
    } else {
      localStorage.setItem("eeav_temp_session", "1");
      sessionStorage.setItem("eeav_temp_session", "1");
    }
    setLoginMsg("Login realizado!");
    setLoginOk(true);
    window.setTimeout(() => {
      setLoginLoading(false);
      setLoginOpen(false);
      setLoginPassword("");
      setLoginUser("");
      setLoginMsg("");
      setLoginOk(false);
    }, 400);
  }

  async function handleLogout() {
    try {
      await supabase.auth.signOut({ scope: "local" });
    } finally {
      setIsLoggedIn(false);
      setAuthEmail("");
      setIsAdmin(false);
    }
  }

  async function handleAddOccurrence() {
    if (!occurrenceItemId) {
      setOccurrenceMsg("Selecione um item.");
      return;
    }
    if (!occurrenceText.trim()) {
      setOccurrenceMsg("Digite a observação.");
      return;
    }

    setOccurrenceMsg("");
    setOccurrenceLoading(true);

    try {
      const { data: session } = await supabase.auth.getSession();
      const createdByEmail = session.session?.user?.email ?? null;

      const { error: insErr } = await supabase.from("item_occurrences").insert({
        item_id: occurrenceItemId,
        observation: occurrenceText.trim(),
        created_by_email: createdByEmail,
      });
      if (insErr) throw insErr;

      setOccurrenceText("");
      await loadOccurrences(occurrenceItemId);
    } catch {
      setOccurrenceMsg("Erro ao registrar ocorrência.");
    } finally {
      setOccurrenceLoading(false);
    }
  }

  async function handleResolveOccurrence(id: string) {
    if (!isAdmin) return;
    const diagnosis = occurrenceDiagnosisText.trim();
    if (!diagnosis) {
      setOccurrenceMsg("Digite o diagnóstico antes de resolver.");
      return;
    }

    setOccurrenceActionId(id);
    setOccurrenceMsg("");
    try {
      const { data: session } = await supabase.auth.getSession();
      const resolvedBy = session.session?.user?.email ?? null;
      const resolvedAt = new Date().toISOString();

      const { error: upErr } = await supabase
        .from("item_occurrences")
        .update({ status: "resolved", resolved_at: resolvedAt })
        .eq("id", id);
      if (upErr) throw upErr;

      let diagnosisSaved = false;
      const { error: diagErr } = await supabase
        .from("item_occurrences")
        .update({
          diagnosis,
          ...(resolvedBy ? { resolved_by_email: resolvedBy } : {}),
        })
        .eq("id", id);

      if (!diagErr) {
        diagnosisSaved = true;
      } else {
        const { data: current } = await supabase
          .from("item_occurrences")
          .select("observation")
          .eq("id", id)
          .maybeSingle();

        const previousObservation = String((current as { observation?: string } | null)?.observation ?? "").trim();
        const marker = `Diagnóstico (resolução): ${diagnosis}`;
        const observation = previousObservation.includes(marker)
          ? previousObservation
          : `${previousObservation}\n\n${marker}`.trim();

        const { error: fallbackErr } = await supabase
          .from("item_occurrences")
          .update({ observation })
          .eq("id", id);
        diagnosisSaved = !fallbackErr;
      }

      if (!diagnosisSaved) {
        setOccurrenceMsg("Ocorrência resolvida, mas o diagnóstico não pôde ser salvo.");
      }

      setOccurrenceResolveId("");
      setOccurrenceDiagnosisText("");
      await loadOccurrences(occurrenceItemId);
    } catch {
      setOccurrenceMsg("Erro ao marcar como resolvido.");
    } finally {
      setOccurrenceActionId("");
    }
  }

  async function handleDeleteOccurrence(id: string) {
    if (!isAdmin) return;
    const ok = window.confirm("Excluir ocorrência?");
    if (!ok) return;
    setOccurrenceActionId(id);
    try {
      const { error: delErr } = await supabase
        .from("item_occurrences")
        .delete()
        .eq("id", id);
      if (delErr) throw delErr;
      await loadOccurrences(occurrenceItemId);
    } catch {
      setOccurrenceMsg("Erro ao excluir ocorrência.");
    } finally {
      setOccurrenceActionId("");
    }
  }

  return (
    <main className="mutare-page-bg min-h-screen text-slate-900">
      <HomeTopButton />
      {globalNotice ? (
        <div
          className={`fixed left-1/2 top-4 z-[9999] -translate-x-1/2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-800 shadow-lg transition-all duration-300 ${
            globalNoticeOpen
              ? "animate-[toastFadeIn_200ms_ease-out]"
              : "animate-[toastFadeOut_200ms_ease-in] opacity-0"
          }`}
          onMouseEnter={() => {
            if (globalNoticeTimer.current) window.clearTimeout(globalNoticeTimer.current);
            if (globalNoticeCloseTimer.current) window.clearTimeout(globalNoticeCloseTimer.current);
          }}
          onMouseLeave={() => {
            if (globalNoticeOpen) startGlobalNoticeAutoClose(4000);
          }}
        >
          <div className="flex items-center gap-3">
            <span>{globalNotice}</span>
            <button
              type="button"
              onClick={() => {
                setGlobalNoticeOpen(false);
                if (globalNoticeCloseTimer.current) window.clearTimeout(globalNoticeCloseTimer.current);
                globalNoticeCloseTimer.current = window.setTimeout(() => {
                  setGlobalNotice("");
                }, 200);
              }}
              className="rounded-[14px_8px_16px_7px] border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-black text-slate-600 transition hover:-rotate-1 hover:bg-slate-100"
              title="Fechar"
            >
              Fechar
            </button>
          </div>
        </div>
      ) : null}
      <style jsx global>{`
        @keyframes toastFadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes toastFadeOut {
          from {
            opacity: 1;
          }
          to {
            opacity: 0;
          }
        }
      `}</style>
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full bg-emerald-200/40 blur-3xl" />
        <div className="absolute top-24 -right-24 h-96 w-96 rounded-full bg-sky-200/45 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-emerald-100/55 blur-3xl" />
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-10">
        <div className="sticky top-3 z-20">
          <div className="relative overflow-hidden rounded-3xl border border-slate-200/60 bg-white/75 p-4 sm:p-7 shadow-[0_18px_55px_rgba(15,23,42,0.14)] backdrop-blur">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-100/60 via-white/0 to-sky-100/60" />
            <div className="absolute inset-0 opacity-[0.12] [background:radial-gradient(circle_at_20%_20%,#34d399,transparent_45%),radial-gradient(circle_at_80%_20%,#38bdf8,transparent_45%),radial-gradient(circle_at_50%_80%,#a7f3d0,transparent_50%)]" />

            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <Link
                  href="/portal"
                  title="Voltar ao Portal"
                  className="grid h-12 w-12 place-items-center rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:bg-slate-50"
                >
                  <SchoolLogo size={32} className="h-8 w-8 object-contain" />
                </Link>
                <div>
                  <div className="text-xs font-extrabold tracking-wide text-slate-500">
                    Relatórios institucionais
                  </div>
                  <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
                    Painel de Relatórios
                  </h1>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-extrabold text-slate-700">
                      <CalendarDays className="h-4 w-4" />
                      {headerSubtitle}
                    </div>

                    {isAdmin ? (
                      <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-extrabold text-slate-700 ring-1 ring-slate-200">
                        <ShieldCheck className="h-4 w-4" /> Admin
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-extrabold text-slate-700 ring-1 ring-slate-200">
                        <School className="h-4 w-4" /> Usuário
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-start gap-2 sm:items-end">
                <button
                  type="button"
                  onClick={() => (isLoggedIn ? handleLogout() : openLoginModal())}
                  className="inline-flex items-center gap-2 rounded-[32px_18px_34px_14px] border border-slate-200 bg-white px-4 py-2 text-sm font-extrabold shadow-sm transition-all duration-200 hover:-translate-y-[2px] hover:-rotate-2 hover:shadow-md active:scale-[0.99] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-200/50"
                  title={authEmail || (isLoggedIn ? "Logado" : "Entrar")}
                >
                  {isLoggedIn ? (
                    <>
                      <LogOut className="h-4 w-4" /> Sair
                    </>
                  ) : (
                    <>
                      <LogIn className="h-4 w-4" /> Entrar
                    </>
                  )}
                </button>

                {authEmail ? (
                  <div className="max-w-[280px] truncate text-xs font-bold text-slate-500">
                    {displayUserLabel(authEmail)}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <section className="mt-6 rounded-3xl border border-slate-200/60 bg-slate-50/80 p-4 shadow-[0_14px_40px_rgba(15,23,42,0.10)] backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-slate-900">Resumo rápido</h2>
              <p className="mt-1 text-xs font-bold text-slate-500">
                Visão simples para tomada de decisão rápida.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setReportsTick((t) => t + 1)}
                disabled={loading || historyLoading}
                className="inline-flex items-center gap-2 rounded-[24px_12px_28px_10px] border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm transition-all duration-200 hover:bg-slate-50 disabled:opacity-60"
              >
                {(loading || historyLoading) ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Atualizar dados
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-3">
              <div className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-slate-500">Escola</div>
              <div className="mt-1 text-sm font-black text-slate-900">{selectedSchoolName}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-3">
              <div className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-slate-500">Agendamentos</div>
              <div className="mt-1 text-sm font-black text-slate-900">{overallTotal}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-3">
              <div className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-slate-500">Professores ativos</div>
              <div className="mt-1 text-sm font-black text-slate-900">{activeTeachersCount}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-3">
              <div className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-slate-500">Ocorrências abertas</div>
              <div className="mt-1 text-sm font-black text-slate-900">{openOccurrencesCount}</div>
              <div className="mt-1 text-[11px] font-bold text-slate-500">Líder do mês: {leaderName}</div>
            </div>
          </div>
        </section>

        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <section className="rounded-3xl border border-slate-200/60 bg-white/75 p-4 sm:p-6 shadow-[0_14px_40px_rgba(15,23,42,0.10)] backdrop-blur">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black">Período</h2>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-1">
              <div>
                <label className="text-xs font-extrabold text-slate-500">Ano</label>
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-extrabold outline-none transition-all duration-200 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-200/40"
                >
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-500">Mês</label>
                <select
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-extrabold outline-none transition-all duration-200 focus:border-sky-300 focus:ring-4 focus:ring-sky-200/40"
                >
                  {MONTHS_PT.map((label, idx) => (
                    <option key={label} value={idx + 1}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2 md:col-span-1">
                <label className="text-xs font-extrabold text-slate-500">Selecionar escola</label>
                <select
                  value={selectedSchoolId}
                  onChange={(e) => setSelectedSchoolId(e.target.value)}
                  className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-extrabold outline-none transition-all duration-200 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-200/40"
                >
                  {schoolsLoading ? (
                    <option value="">Carregando...</option>
                  ) : (
                    <>
                      {isSuperAdmin ? <option value="">Todas as escolas</option> : null}
                      {schools.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </>
                  )}
                </select>
                <div className="mt-2 text-[11px] font-extrabold text-slate-500">
                  Escola atual: <span className="text-slate-700">{selectedSchoolName}</span>
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => applyRelativeMonth(0)}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-black text-slate-700 hover:bg-slate-50"
              >
                Mês atual
              </button>
              <button
                type="button"
                onClick={() => applyRelativeMonth(-1)}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-black text-slate-700 hover:bg-slate-50"
              >
                Mês anterior
              </button>
              <button
                type="button"
                onClick={() => {
                  const current = new Date();
                  setYear(Math.max(2026, current.getFullYear()));
                  setMonth(1);
                }}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-black text-slate-700 hover:bg-slate-50"
              >
                Janeiro
              </button>
            </div>

            <button
              type="button"
              onClick={exportPdf}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-[32px_18px_34px_14px] bg-gradient-to-r from-emerald-500 to-sky-500 px-4 py-3 text-sm font-black text-white shadow-lg shadow-emerald-500/20 transition-all duration-200 hover:-translate-y-[2px] hover:-rotate-2 hover:shadow-xl active:scale-[0.99] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200/50"
            >
              <FileDown className="h-5 w-5" />
              Exportar PDF do mês
            </button>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              {loading ? (
                <div className="flex items-center gap-2 text-sm font-extrabold text-slate-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando dados...
                </div>
              ) : error ? (
                <div className="flex items-center gap-2 text-sm font-extrabold text-red-700">
                  <AlertTriangle className="h-4 w-4" />
                  {error}
                </div>
              ) : (
                <div className="text-sm font-extrabold text-slate-700">
                  Total no mês: <span className="text-slate-900">{overallTotal}</span>
                </div>
              )}
            </div>
          </section>

          

          <section className="rounded-3xl border border-slate-200/60 bg-white/75 p-4 sm:p-6 shadow-[0_14px_40px_rgba(15,23,42,0.10)] backdrop-blur">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-black">Panorama geral (por professor)</h2>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  Apenas agendamentos ativos no mês selecionado.
                </p>
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-emerald-400/15 to-sky-400/15 p-2 ring-1 ring-slate-200">
                <BarChart3 className="h-5 w-5 text-slate-800" />
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {loading ? (
                <div className="space-y-3">
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </div>
              ) : error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-extrabold text-red-700">
                  {error}
                </div>
              ) : overallTotal === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-extrabold text-slate-600">
                  Nenhum agendamento ativo no mês selecionado.
                </div>
              ) : (
                pagedOverallRows.map((row, idx) => {
                    const globalIdx = (overallPage - 1) * reportsPageSize + idx;
                    const pct = percent(row.count, overallTotal);
                    const medal = medalForIndex(globalIdx);
                    return (
                      <div
                        key={row.key}
                        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md hover:border-emerald-200"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 text-sm font-black text-slate-900">
                            {medal ? <span className="text-lg">{medal}</span> : null}
                            {row.name}
                          </div>
                          <div className="text-xs font-extrabold text-slate-600">
                            {row.count} • {pct}%
                          </div>
                        </div>

                        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-sky-400 to-emerald-400 transition-[width] duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
            {overallTotal > 0 ? (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <div className="text-[11px] font-extrabold text-slate-500">
                  Página {overallPage} de {overallTotalPages} ({sortedOverallRows.length} registros)
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setOverallPage((p) => Math.max(1, p - 1))}
                    disabled={overallPage <= 1}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-700 disabled:opacity-50"
                  >
                    ← Anterior
                  </button>
                  {Array.from({ length: overallTotalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={`overall-page-${p}`}
                      type="button"
                      onClick={() => setOverallPage(p)}
                      className={`rounded-xl border px-3 py-1 text-xs font-black ${
                        p === overallPage
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : "border-slate-200 bg-white text-slate-700"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setOverallPage((p) => Math.min(overallTotalPages, p + 1))}
                    disabled={overallPage >= overallTotalPages}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-700 disabled:opacity-50"
                  >
                    Próxima →
                  </button>
                </div>
              </div>
            ) : null}
          </section>

          <section className="rounded-3xl border border-slate-200/60 bg-white/75 p-4 sm:p-6 shadow-[0_14px_40px_rgba(15,23,42,0.10)] backdrop-blur md:col-span-2 lg:col-span-1">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-black">Por recurso (ranking por professor)</h2>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  Selecione um recurso para ver o ranking.
                </p>
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-sky-400/15 to-emerald-400/15 p-2 ring-1 ring-slate-200">
                <FileText className="h-5 w-5 text-slate-800" />
              </div>
            </div>

            <div className="mt-4 rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-sky-50 p-4">
              <div className="text-xs font-extrabold text-slate-600">Top 3 do recurso</div>
              <div className="mt-1 text-sm font-black text-slate-900">
                {selectedItemLabel || "Selecione um recurso"}
              </div>

              {top3PerItem.length ? (
                <div className="mt-3 grid grid-cols-1 gap-2">
                  {top3PerItem.map((row, idx) => (
                    <div
                      key={row.key}
                      className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3"
                    >
                      <div className="flex items-center gap-2 font-black text-slate-900">
                        <span className="text-lg">{medalForIndex(idx)}</span>
                        {row.name}
                      </div>
                      <div className="text-xs font-extrabold text-slate-600">{row.count}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-3 text-sm font-extrabold text-slate-600">
                  Sem dados para este recurso.
                </div>
              )}
            </div>

            <div className="mt-4">
              <select
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-extrabold outline-none transition-all duration-200 focus:border-sky-300 focus:ring-4 focus:ring-sky-200/40"
              >
                {items.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.category} — {it.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4 space-y-3">
              {loading ? (
                <div className="space-y-3">
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </div>
              ) : error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-extrabold text-red-700">
                  {error}
                </div>
              ) : perItemTotal === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-extrabold text-slate-600">
                  Nenhum agendamento ativo para este recurso no mês selecionado.
                </div>
              ) : (
                pagedPerItemRows.map((row, idx) => {
                    const globalIdx = (perItemPage - 1) * reportsPageSize + idx;
                    const pct = percent(row.count, perItemTotal);
                    const medal = medalForIndex(globalIdx);
                    return (
                      <div
                        key={row.key}
                        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md hover:border-sky-200"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 text-sm font-black text-slate-900">
                            {medal ? <span className="text-lg">{medal}</span> : null}
                            {row.name}
                          </div>
                          <div className="text-xs font-extrabold text-slate-600">
                            {row.count} • {pct}%
                          </div>
                        </div>

                        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-sky-400 transition-[width] duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
            {perItemTotal > 0 ? (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <div className="text-[11px] font-extrabold text-slate-500">
                  Página {perItemPage} de {perItemTotalPages} ({sortedPerItemRows.length} registros)
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setPerItemPage((p) => Math.max(1, p - 1))}
                    disabled={perItemPage <= 1}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-700 disabled:opacity-50"
                  >
                    ← Anterior
                  </button>
                  {Array.from({ length: perItemTotalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={`per-item-page-${p}`}
                      type="button"
                      onClick={() => setPerItemPage(p)}
                      className={`rounded-xl border px-3 py-1 text-xs font-black ${
                        p === perItemPage
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : "border-slate-200 bg-white text-slate-700"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPerItemPage((p) => Math.min(perItemTotalPages, p + 1))}
                    disabled={perItemPage >= perItemTotalPages}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-700 disabled:opacity-50"
                  >
                    Próxima →
                  </button>
                </div>
              </div>
            ) : null}
          </section>
        </div>

        {/* TOP 3 Professores */}
        <section className="mt-6 rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-sky-50 p-4 sm:p-6 shadow-[0_14px_40px_rgba(15,23,42,0.10)]">
          <h2 className="mb-4 flex items-center gap-2 text-base font-black text-slate-900">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
              <Trophy className="h-5 w-5 text-emerald-600 animate-bounce" />
            </span>
            Top 3 professores mais ativos no uso de mídias no mês
          </h2>

            {top3.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm font-extrabold text-slate-600">
                Nenhum agendamento no período selecionado.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:justify-center">
                {top3.map((row, index) => {
                  const medals = ["🥇", "🥈", "🥉"];
                  const pct = percent(row.count, overallTotal);

                  return (
                    <div
                      key={row.key}
                      className="rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm transition-all duration-200 hover:-translate-y-[2px] hover:shadow-lg hover:border-emerald-300"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-2xl">{medals[index]}</span>
                        <span className="text-xs font-extrabold text-slate-500">{pct}%</span>
                      </div>

                      <div className="text-sm font-black text-slate-900">{row.name}</div>

                      <div className="mt-1 text-xs font-extrabold text-slate-600">
                        {row.count} agendamentos
                      </div>

                      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-sky-400 transition-[width] duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
        </section>

        <section className="mt-6 rounded-3xl border border-slate-200/60 bg-white/75 p-4 sm:p-6 shadow-[0_14px_40px_rgba(15,23,42,0.10)] backdrop-blur">
              <h2 className="flex items-center gap-2 text-base font-black">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400/15 to-sky-400/15 ring-1 ring-slate-200">
                  <CalendarDays className="h-5 w-5 text-slate-800" />
                </span>
                Histórico do líder por mês ({year})
              </h2>

              {historyLoading ? (
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </div>
              ) : leadersHistory.length ? (
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {leadersHistory.map((m) => (
                    <div
                      key={m.month}
                      className="rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm"
                    >
                      <div className="text-xs font-extrabold text-slate-500">
                        {MONTHS_PT[m.month - 1]}
                      </div>
                      <div className="mt-1 text-sm font-black text-slate-900">
                        {m.leader_name}
                      </div>
                      <div className="mt-1 text-xs font-extrabold text-slate-600">
                        {m.leader_count} agendamentos
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-extrabold text-slate-600">
                  Sem dados no ano selecionado.
                </div>
              )}
        </section>

        <section className="mt-6 rounded-3xl border border-slate-200/60 bg-white/75 p-4 sm:p-6 shadow-[0_14px_40px_rgba(15,23,42,0.10)] backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-black">Registro de ocorrências por item</h2>
              <p className="mt-1 text-xs font-bold text-slate-500">
                Relate problemas como: “Notebook 4 com teclado falhando”.
              </p>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-emerald-400/15 to-sky-400/15 p-2 ring-1 ring-slate-200">
              <AlertTriangle className="h-5 w-5 text-slate-800" />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.2fr]">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
              <label className="text-xs font-extrabold text-slate-500">Item</label>
              <select
                value={occurrenceItemId}
                onChange={(e) => setOccurrenceItemId(e.target.value)}
                className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-extrabold outline-none transition-all duration-200 focus:border-sky-300 focus:ring-4 focus:ring-sky-200/40"
              >
                {items.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.category} — {it.name}
                  </option>
                ))}
              </select>

              <label className="mt-4 block text-xs font-extrabold text-slate-500">Observação</label>
              <textarea
                value={occurrenceText}
                onChange={(e) => setOccurrenceText(e.target.value)}
                placeholder="Ex: Notebook 4 com teclado falhando."
                className="mt-1 min-h-[110px] w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 outline-none transition-all duration-200 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-200/40"
              />

              {occurrenceMsg ? (
                <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-extrabold text-red-700">
                  {occurrenceMsg}
                </div>
              ) : null}

              <button
                type="button"
                onClick={handleAddOccurrence}
                disabled={occurrenceLoading}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-[32px_18px_34px_14px] bg-gradient-to-r from-emerald-500 to-sky-500 px-4 py-3 text-sm font-black text-white shadow-lg shadow-emerald-500/20 transition-all duration-200 hover:-translate-y-[2px] hover:-rotate-2 hover:shadow-xl active:scale-[0.99] disabled:opacity-60"
              >
                {occurrenceLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
                Registrar ocorrência
              </button>
              <button
                type="button"
                onClick={() =>
                  void exportOccurrencePdf({
                    itemId: occurrenceItemId,
                    observation: occurrenceText,
                    status: "open",
                    createdAt: new Date().toISOString(),
                    createdByEmail: authEmail || null,
                  })
                }
                disabled={!occurrenceItemId || !occurrenceText.trim()}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-[24px_12px_28px_10px] border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-black text-sky-900 transition-all duration-200 hover:bg-sky-100 disabled:opacity-60"
              >
                <FileDown className="h-4 w-4" />
                Gerar PDF do rascunho
              </button>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
              <div className="text-xs font-extrabold text-slate-500">Histórico do item</div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-extrabold text-slate-600">
                <span>Total: {occurrenceTotalCount}</span>
                <span>•</span>
                <span className="text-emerald-700">Resolvidas: {occurrenceResolvedCount}</span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-extrabold text-slate-700">
                  <input
                    type="checkbox"
                    checked={showResolved}
                    onChange={(e) => setShowResolved(e.target.checked)}
                    className="h-4 w-4 accent-emerald-500"
                  />
                  Ver resolvidas
                </label>
                <button
                  type="button"
                  onClick={() => void exportOpenOccurrencesPdf()}
                  disabled={occurrenceBulkPdfLoading || openOccurrencesCount <= 0}
                  className="inline-flex items-center gap-2 rounded-[22px_12px_26px_10px] border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-800 transition-all duration-200 hover:bg-amber-100 disabled:opacity-60"
                >
                  {occurrenceBulkPdfLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <FileDown className="h-3.5 w-3.5" />
                  )}
                  Registro para manutenção (PDF)
                </button>
              </div>
              {occurrenceListLoading ? (
                <div className="mt-3 flex items-center gap-2 text-sm font-extrabold text-slate-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando histórico...
                </div>
              ) : occurrenceList.length ? (
                <div className="mt-3 space-y-2">
                  {pagedOccurrenceList.map((row) => (
                    <div
                      key={row.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-700"
                    >
                      <div className="text-xs font-extrabold text-slate-500">
                        {new Date(row.created_at).toLocaleString("pt-BR")}
                        {row.created_by_email ? ` • ${row.created_by_email}` : ""}
                      </div>
                      <div className="mt-1 text-sm font-extrabold text-slate-900">{row.observation}</div>
                      {row.status === "resolved" && row.diagnosis ? (
                        <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 p-2 text-xs font-extrabold text-emerald-800">
                          Diagnóstico: {row.diagnosis}
                        </div>
                      ) : null}
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            void exportOccurrencePdf({
                              occurrenceId: row.id,
                              itemId: row.item_id,
                              observation: row.observation,
                              status: row.status,
                              createdAt: row.created_at,
                              createdByEmail: row.created_by_email,
                              diagnosis: row.diagnosis ?? null,
                              resolvedAt: row.resolved_at ?? null,
                            })
                          }
                          className="inline-flex items-center gap-2 rounded-[24px_12px_28px_10px] border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-black text-sky-800 transition-all duration-200 hover:-rotate-1 hover:bg-sky-100 active:scale-[0.99]"
                        >
                          <FileDown className="h-3.5 w-3.5" />
                          PDF
                        </button>
                        {isAdmin ? (
                          <>
                            {row.status !== "resolved" ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setOccurrenceResolveId(row.id);
                                  setOccurrenceDiagnosisText("");
                                  setOccurrenceMsg("");
                                }}
                                disabled={occurrenceActionId === row.id}
                                className="inline-flex items-center gap-2 rounded-[24px_12px_28px_10px] border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-800 transition-all duration-200 hover:-rotate-1 hover:bg-emerald-100 active:scale-[0.99] disabled:opacity-60"
                              >
                                <ShieldCheck className="h-3.5 w-3.5" />
                                Resolver com diagnóstico
                              </button>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => handleDeleteOccurrence(row.id)}
                              disabled={occurrenceActionId === row.id}
                              className="inline-flex items-center gap-2 rounded-[22px_12px_26px_10px] border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-800 transition-all duration-200 hover:-rotate-1 hover:bg-red-100 active:scale-[0.99] disabled:opacity-60"
                            >
                              {occurrenceActionId === row.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                              Excluir
                            </button>
                          </>
                        ) : null}
                      </div>
                      {isAdmin && occurrenceResolveId === row.id ? (
                        <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3">
                          <label className="text-xs font-extrabold text-emerald-800">Diagnóstico</label>
                          <textarea
                            value={occurrenceDiagnosisText}
                            onChange={(e) => setOccurrenceDiagnosisText(e.target.value)}
                            placeholder="Ex: Troca de teclado e limpeza interna."
                            className="mt-1 min-h-[86px] w-full resize-none rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-emerald-300 focus:ring-4 focus:ring-emerald-200/40"
                          />
                          <div className="mt-2 flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleResolveOccurrence(row.id)}
                              disabled={occurrenceActionId === row.id || !occurrenceDiagnosisText.trim()}
                              className="inline-flex items-center gap-2 rounded-[24px_12px_28px_10px] border border-emerald-300 bg-emerald-600 px-3 py-2 text-xs font-black text-white transition-all duration-200 hover:bg-emerald-700 disabled:opacity-60"
                            >
                              {occurrenceActionId === row.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <ShieldCheck className="h-3.5 w-3.5" />
                              )}
                              Confirmar resolução
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setOccurrenceResolveId("");
                                setOccurrenceDiagnosisText("");
                              }}
                              className="inline-flex items-center gap-2 rounded-[22px_12px_26px_10px] border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-700 transition-all duration-200 hover:bg-slate-100"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm font-extrabold text-slate-600">
                  Nenhuma ocorrência registrada para este item.
                </div>
              )}
              {occurrenceList.length ? (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[11px] font-extrabold text-slate-500">
                    Página {occurrencePage} de {occurrenceTotalPages} ({occurrenceList.length} registros)
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setOccurrencePage((p) => Math.max(1, p - 1))}
                      disabled={occurrencePage <= 1}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-700 disabled:opacity-50"
                    >
                      ← Anterior
                    </button>
                    {Array.from({ length: occurrenceTotalPages }, (_, i) => i + 1).map((p) => (
                      <button
                        key={`occurrence-page-${p}`}
                        type="button"
                        onClick={() => setOccurrencePage(p)}
                        className={`rounded-xl border px-3 py-1 text-xs font-black ${
                          p === occurrencePage
                            ? "border-emerald-500 bg-emerald-500 text-white"
                            : "border-slate-200 bg-white text-slate-700"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setOccurrencePage((p) => Math.min(occurrenceTotalPages, p + 1))}
                      disabled={occurrencePage >= occurrenceTotalPages}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-700 disabled:opacity-50"
                    >
                      Próxima →
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </div>

      {loginOpen ? (
        <div
          onClick={() => setLoginOpen(false)}
          className="fixed inset-0 z-[9999] grid place-items-center bg-slate-900/55 p-4 backdrop-blur-sm"
          style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            background: "rgba(15,23,42,0.55)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-[0_20px_60px_rgba(15,23,42,0.25)]"
            style={{
              marginLeft: "auto",
              marginRight: "auto",
              background:
                "linear-gradient(180deg, rgba(52,211,153,0.35), rgba(56,189,248,0.25))",
            }}
          >
            <div className="flex flex-col items-center gap-2 text-center">
              <div
                className="text-lg font-black text-slate-900"
                style={{ textShadow: "0 0 16px rgba(56,189,248,0.5)" }}
              >
                Login
              </div>
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-extrabold text-emerald-800 ring-1 ring-emerald-200">
                <ShieldCheck className="h-4 w-4" /> Admin
              </span>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-extrabold text-slate-900 text-center">
                  Email
                </label>
                <input
                  type="email"
                  value={loginUser}
                  onChange={(e) => setLoginUser(e.target.value)}
                  placeholder="seuemail@escola.com"
                  className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-extrabold outline-none transition-all duration-200 focus:border-sky-300 focus:ring-4 focus:ring-sky-200/40"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-900 text-center">
                  Senha
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 pr-10 text-sm font-extrabold outline-none transition-all duration-200 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-200/40"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-black"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
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
                  className={`rounded-2xl border p-3 text-sm font-extrabold ${
                    loginOk
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-red-200 bg-red-50 text-red-700"
                  }`}
                >
                  {loginMsg}
                </div>
              ) : null}

              <label className="mt-1 inline-flex items-center gap-2 text-xs font-extrabold text-slate-900">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-400"
                />
                Manter conectado
              </label>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setLoginOpen(false)}
                  disabled={loginLoading}
                  className="login-btn-fun rounded-[26px_14px_30px_12px] border border-slate-200 bg-white px-4 py-2 text-sm font-black shadow-sm transition-all duration-200 hover:-rotate-2 hover:bg-slate-50 active:scale-[0.99] disabled:opacity-60"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleLogin}
                  disabled={loginLoading}
                  className="login-btn-fun inline-flex items-center gap-2 rounded-[26px_14px_30px_12px] bg-gradient-to-r from-emerald-500 to-sky-500 px-4 py-2 text-sm font-black text-white shadow-lg shadow-emerald-500/20 transition-all duration-200 hover:-translate-y-[2px] hover:-rotate-2 hover:shadow-xl active:scale-[0.99] disabled:opacity-60"
                >
                  {loginLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4" />
                      Entrar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
