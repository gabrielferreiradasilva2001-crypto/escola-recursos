"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Plus, X, Clock3 } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import ProfessorHeader from "../components/ProfessorHeader";
import HomeTopButton from "../components/HomeTopButton";

type Reservation = {
  id: string;
  use_date: string;
  start_period: number;
  end_period: number;
  school_class: string;
  teacher_email: string;
  status: string;
  created_at: string;
};
type ReservationDbRow = Reservation & { user_id: string };

type ReservationItem = {
  reservation_id: string;
  qty: number;
  items: {
    name: string;
    category: string;
  } | null;
};
type PrintJob = {
  id: string;
  created_at: string;
  file_name: string;
  title: string | null;
  location: string;
  period: string | null;
  printed: boolean;
  url: string;
};

export default function MyReservationsPage() {
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
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [rows, setRows] = useState<
    { r: Reservation; materials: ReservationItem[] }[]
  >([]);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginUser, setLoginUser] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginMsg, setLoginMsg] = useState("");
  const [loginOk, setLoginOk] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [printEntries, setPrintEntries] = useState<
    { file: File | null; title: string; period: string }[]
  >([{ file: null, title: "", period: "matutino" }]);
  const [printLocation, setPrintLocation] = useState("Antonio Valadares - SED");
  const [printMsg, setPrintMsg] = useState("");
  const [printLoading, setPrintLoading] = useState(false);
  const [showAllPrintJobs, setShowAllPrintJobs] = useState(false);
  const [printJobs, setPrintJobs] = useState<
    PrintJob[]
  >([]);
  const [resPage, setResPage] = useState(1);
  const [selectedYear, setSelectedYear] = useState(2026);
  const [teacherName, setTeacherName] = useState("");
  const [teacherEmail, setTeacherEmail] = useState("");
  const [teacherAvatarUrl, setTeacherAvatarUrl] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterMaterial, setFilterMaterial] = useState("");
  const [toast, setToast] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  function resolveTeacherName(user: {
    email?: string | null;
    user_metadata?: Record<string, unknown> | null;
  } | null) {
    if (!user) return "";
    const byName = String(user.user_metadata?.name ?? "").trim();
    if (byName) return byName;
    const byUsername = String(user.user_metadata?.username ?? "").trim();
    if (byUsername) return byUsername.replace(/\./g, " ");
    const mail = String(user.email ?? "").trim();
    if (!mail) return "";
    return mail.endsWith("@local.eeav") ? mail.replace("@local.eeav", "") : mail;
  }

  useEffect(() => {
    (async () => {
      const tempSession = localStorage.getItem("eeav_temp_session");
      if (tempSession && !sessionStorage.getItem("eeav_temp_session")) {
        await supabase.auth.signOut({ scope: "local" });
        localStorage.removeItem("eeav_temp_session");
      }
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setNeedsLogin(true);
        setLoading(false);
        return;
      }
      setTeacherEmail(data.session.user?.email ?? "");
      setTeacherName(resolveTeacherName(data.session.user ?? null));
      setTeacherAvatarUrl(String(data.session.user?.user_metadata?.avatar_url ?? "").trim());
      if (data.session.user?.user_metadata?.force_password_change) {
        window.location.href = "/auth/first-login";
        return;
      }
      setNeedsLogin(false);
      await load();
      await loadPrintJobs();
    })();
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) {
          setNeedsLogin(true);
          setLoading(false);
          setTeacherEmail("");
          setTeacherName("");
          setTeacherAvatarUrl("");
          return;
        }
        setTeacherEmail(session.user?.email ?? "");
        setTeacherName(resolveTeacherName(session.user ?? null));
        setTeacherAvatarUrl(String(session.user?.user_metadata?.avatar_url ?? "").trim());
        if (session.user?.user_metadata?.force_password_change) {
          window.location.href = "/auth/first-login";
          return;
        }
        setNeedsLogin(false);
        void load();
        void loadPrintJobs();
      }
    );
    return () => {
      authListener.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setSelectedYear(picked);
  }, [searchParams]);

  useEffect(() => {
    if (needsLogin) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("eeav_year", String(selectedYear));
  }, [selectedYear]);

  async function load() {
    setLoading(true);
    setMsg("");

    const { data: session } = await supabase.auth.getSession();
    const user = session.session?.user;
    if (!user) {
      window.location.href = "/";
      return;
    }

    // minhas reservas (pelo user_id)
    const startDate = `${selectedYear}-01-01`;
    const endDate = `${selectedYear}-12-31`;
    const { data: reservations, error: rErr } = await supabase
      .from("reservations")
      .select("id,use_date,start_period,end_period,school_class,teacher_email,status,created_at,user_id")
      .gte("use_date", startDate)
      .lte("use_date", endDate)
      .eq("user_id", user.id)
      .order("use_date", { ascending: false })
      .order("start_period", { ascending: true });

    if (rErr) {
      setLoading(false);
      setMsg("Erro ao carregar reservas: " + rErr.message);
      return;
    }

    const ids = (reservations ?? []).map((r: ReservationDbRow) => r.id);

    let items: ReservationItem[] = [];
    if (ids.length) {
      const { data: ris, error: riErr } = await supabase
        .from("reservation_items")
        .select("reservation_id,qty,items(name,category)")
        .in("reservation_id", ids);

      if (riErr) {
        setLoading(false);
        setMsg("Erro ao carregar materiais: " + riErr.message);
        return;
      }

      items = ris ?? [];
    }

    const byRes: Record<string, ReservationItem[]> = {};
    items.forEach((x: ReservationItem) => {
      byRes[x.reservation_id] ??= [];
      byRes[x.reservation_id].push(x);
    });

    const result = (reservations ?? []).map((r: ReservationDbRow) => ({
      r,
      materials: byRes[r.id] ?? [],
    }));

    setRows(result);
    setLoading(false);
  }

  async function loadPrintJobs() {
    setPrintMsg("");
    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token ?? "";
    if (!token) return;
    const res = await fetch("/api/print-jobs", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      setPrintMsg(payload?.error ?? "Erro ao carregar envios.");
      return;
    }
    setPrintJobs(payload?.data ?? []);
  }

  useEffect(() => {
    if (printLocation !== "Antonio Valadares - Extensão") return;
    setPrintEntries((prev) =>
      prev.map((entry) => ({ ...entry, period: "vespertino" }))
    );
  }, [printLocation]);

  const resPerPage = 5;
  const sortedPrintJobs = useMemo(
    () =>
      [...printJobs]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [printJobs]
  );
  const visiblePrintJobs = useMemo(
    () => (showAllPrintJobs ? sortedPrintJobs : sortedPrintJobs.slice(0, 4)),
    [showAllPrintJobs, sortedPrintJobs]
  );
  const filteredRows = useMemo(() => {
    const query = filterMaterial.trim().toLowerCase();
    return rows.filter(({ r, materials }) => {
      const byDate = !filterDate || r.use_date === filterDate;
      const byStatus = filterStatus === "all" || r.status === filterStatus;
      const byMaterial =
        !query ||
        materials.some((m) =>
          `${m.items?.category ?? ""} ${m.items?.name ?? ""}`.toLowerCase().includes(query)
        );
      return byDate && byStatus && byMaterial;
    });
  }, [rows, filterDate, filterStatus, filterMaterial]);
  const totalResPages = Math.max(1, Math.ceil(filteredRows.length / resPerPage));
  const pagedRows = filteredRows.slice((resPage - 1) * resPerPage, resPage * resPerPage);

  const printStats = useMemo(() => {
    const pending = printJobs.filter((job) => !job.printed).length;
    const done = printJobs.filter((job) => job.printed).length;
    return {
      total: printJobs.length,
      pending,
      done,
    };
  }, [printJobs]);

  function getReservationStatusLabel(status: string) {
    if (status === "active") return "Aprovada";
    if (status === "pending") return "Pendente";
    if (status === "cancelled") return "Cancelado";
    return status || "Sem status";
  }

  function getReservationStatusClass(status: string) {
    if (status === "active") return "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200";
    if (status === "pending") return "bg-amber-100 text-amber-800 ring-1 ring-amber-200";
    if (status === "cancelled") return "bg-rose-100 text-rose-700 ring-1 ring-rose-200";
    return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
  }

  const printMsgIsError = /erro|inválid|falha|selecione/i.test(printMsg);
  const printMsgClasses = printMsgIsError
    ? "border-rose-200 bg-rose-50 text-rose-700"
    : "border-emerald-200 bg-emerald-50 text-emerald-700";

  useEffect(() => {
    setResPage(1);
  }, [rows.length, filterDate, filterStatus, filterMaterial]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(t);
  }, [toast]);

  async function cancelReservation(reservationId: string) {
    setMsg("");

    const { error } = await supabase
      .from("reservations")
      .update({ status: "cancelled" })
      .eq("id", reservationId);

    if (error) {
      setMsg("Erro ao cancelar: " + error.message);
      setToast({ type: "err", text: "Não foi possível cancelar a reserva." });
      return;
    }

    await load();
    setToast({ type: "ok", text: "Reserva cancelada com sucesso." });
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

    const session = signInData?.session ?? null;
    if (session?.user?.user_metadata?.force_password_change) {
      setLoginLoading(false);
      setLoginOpen(false);
      window.location.href = "/auth/first-login";
      return;
    }

    if (rememberMe) {
      localStorage.removeItem("eeav_temp_session");
      sessionStorage.removeItem("eeav_temp_session");
    } else {
      localStorage.setItem("eeav_temp_session", "1");
      sessionStorage.setItem("eeav_temp_session", "1");
    }
    setLoginMsg("Login realizado!");
    setLoginOk(true);
    setNeedsLogin(false);
    void load();
    void loadPrintJobs();
    window.setTimeout(() => {
      setLoginLoading(false);
      setLoginOpen(false);
      setLoginPassword("");
      setLoginUser("");
      setLoginMsg("");
      setLoginOk(false);
    }, 400);
  }

  return (
    <main className="min-h-screen mutare-page-bg p-6 text-slate-900">
      <HomeTopButton />
      <div className="max-w-5xl mx-auto space-y-6">
        {toast ? (
          <div
            className={`fixed right-6 top-6 z-[9998] rounded-2xl border px-4 py-3 text-sm font-black shadow-lg ${
              toast.type === "ok"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-rose-200 bg-rose-50 text-rose-700"
            }`}
          >
            {toast.text}
          </div>
        ) : null}

        <ProfessorHeader
          title="Meus agendamentos"
          subtitle="Área do professor"
          teacherName={teacherName || "Professor(a)"}
          teacherEmail={teacherEmail}
          teacherAvatarUrl={teacherAvatarUrl}
          backHref="/portal"
          backLabel="Voltar ao Portal"
          rightSlot={
            <Link
              href="/calendar"
              className="inline-flex items-center rounded-xl bg-gradient-to-r from-emerald-500 to-sky-500 px-3 py-2 text-xs font-black text-white shadow-lg shadow-emerald-500/20 transition-all duration-200 hover:-translate-y-[1px] hover:shadow-xl active:scale-[0.99]"
            >
              Novo agendamento
            </Link>
          }
        />

        {needsLogin && (
          <div className="mt-4 rounded-3xl border border-slate-200/70 bg-slate-50/85 p-5 text-sm shadow-[0_12px_30px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="font-black text-slate-900">Login necessário</div>
            <div className="mt-1 font-semibold text-slate-600">
              Faça login para ver seus agendamentos.
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-sky-500 px-4 py-2 text-sm font-extrabold text-white shadow-lg shadow-emerald-500/20 transition-all duration-200 hover:-translate-y-[1px] hover:shadow-xl active:scale-[0.99]"
                onClick={() => {
                  setLoginMsg("");
                  setLoginOpen(true);
                }}
              >
                Fazer login
              </button>
            </div>
          </div>
        )}

        {msg ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm font-extrabold text-rose-700">
            {msg}
          </div>
        ) : null}

        {!needsLogin ? (
          <section className="rounded-2xl border border-sky-200 bg-sky-50/70 p-4 text-xs font-bold text-sky-900">
            Como usar: filtre por data, status e material para localizar reservas mais rápido.
          </section>
        ) : null}

        {!needsLogin ? (
          <section className="rounded-3xl border border-slate-200/60 bg-white/75 p-4 shadow-[0_14px_40px_rgba(15,23,42,0.10)] backdrop-blur sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-black">Meus envios para impressão</h2>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  Envie documentos para a gestão. Cada arquivo pode ter período diferente.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-extrabold text-emerald-800 ring-1 ring-emerald-200">
                <Clock3 className="h-3.5 w-3.5" />
                {printStats.pending} pendente(s)
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/85 p-3 sm:p-4">
              <div className="text-xs font-black uppercase tracking-[0.06em] text-slate-500">Unidade de entrega</div>
              <select
                value={printLocation}
                onChange={(e) => setPrintLocation(e.target.value)}
                className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-extrabold outline-none focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
              >
                <option value="Antonio Valadares - SED">Antonio Valadares - SED</option>
                <option value="Antonio Valadares - Extensão">Antonio Valadares - Extensão</option>
              </select>

              <div className="mt-4 space-y-3">
                {printEntries.map((entry, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 sm:grid-cols-[1fr_1fr_170px_auto]"
                  >
                    <input
                      type="file"
                      onChange={(e) =>
                        setPrintEntries((prev) =>
                          prev.map((it, i) =>
                            i === idx ? { ...it, file: e.target.files?.[0] ?? null } : it
                          )
                        )
                      }
                      className="h-11 w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-3 text-sm font-extrabold file:mr-3 file:rounded-xl file:border-0 file:bg-gradient-to-r file:from-emerald-500 file:to-sky-500 file:px-3 file:py-2 file:text-xs file:font-black file:text-white hover:file:opacity-95"
                    />
                    <input
                      value={entry.title}
                      onChange={(e) =>
                        setPrintEntries((prev) =>
                          prev.map((it, i) =>
                            i === idx ? { ...it, title: e.target.value } : it
                          )
                        )
                      }
                      placeholder="Nome do arquivo (opcional)"
                      className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-extrabold outline-none focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
                    />
                    <select
                      value={entry.period}
                      onChange={(e) =>
                        setPrintEntries((prev) =>
                          prev.map((it, i) =>
                            i === idx ? { ...it, period: e.target.value } : it
                          )
                        )
                      }
                      className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-extrabold"
                      disabled={printLocation === "Antonio Valadares - Extensão"}
                    >
                      {printLocation === "Antonio Valadares - Extensão" ? (
                        <option value="vespertino">Vespertino</option>
                      ) : (
                        <>
                          <option value="matutino">Matutino</option>
                          <option value="vespertino">Vespertino</option>
                          <option value="noturno">Noturno</option>
                        </>
                      )}
                    </select>
                    {printEntries.length > 1 ? (
                      <button
                        type="button"
                        onClick={() =>
                          setPrintEntries((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-3 text-xs font-black text-slate-600 hover:bg-slate-50"
                        title="Remover"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setPrintEntries((prev) => [
                      ...prev,
                      {
                        file: null,
                        title: "",
                        period:
                          printLocation === "Antonio Valadares - Extensão"
                            ? "vespertino"
                            : "matutino",
                      },
                    ])
                  }
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 hover:bg-emerald-100 sm:w-auto"
                >
                  <Plus className="h-4 w-4" />
                  Adicionar arquivo
                </button>
              </div>
            </div>

            <div className="mt-3 flex justify-center">
              <button
                type="button"
                disabled={printLoading}
                onClick={async () => {
                  const filesToSend = printEntries.filter((e) => e.file);
                  if (!filesToSend.length) {
                    setPrintMsg("Selecione ao menos um arquivo.");
                    return;
                  }
                  setPrintMsg("");
                  setPrintLoading(true);
                  try {
                    const { data: session } = await supabase.auth.getSession();
                    const token = session.session?.access_token ?? "";
                    for (const entry of filesToSend) {
                      const form = new FormData();
                      form.append("file", entry.file as File);
                      form.append("location", printLocation);
                      if (entry.title.trim()) form.append("title", entry.title.trim());
                      form.append("period", entry.period);
                      const res = await fetch("/api/print-jobs", {
                        method: "POST",
                        headers: { Authorization: `Bearer ${token}` },
                        body: form,
                      });
                      const payload = await res.json().catch(() => ({}));
                      if (!res.ok) throw new Error(payload?.error ?? "Erro ao enviar.");
                    }
                    setPrintEntries([{ file: null, title: "", period: "matutino" }]);
                    await loadPrintJobs();
                    setPrintMsg("Arquivo(s) enviado(s) com sucesso para impressão.");
                    setToast({ type: "ok", text: "Arquivos enviados para impressão." });
                  } catch (err: unknown) {
                    setPrintMsg(err instanceof Error ? err.message : "Erro ao enviar.");
                    setToast({ type: "err", text: "Erro ao enviar para impressão." });
                  } finally {
                    setPrintLoading(false);
                  }
                }}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-sky-500 px-3 text-xs font-black text-white shadow-sm shadow-emerald-500/20 transition-all duration-200 hover:-translate-y-[1px] hover:shadow-md active:scale-[0.99] disabled:opacity-60 sm:h-9 sm:w-fit"
              >
                {printLoading ? "Enviando..." : "Enviar para impressão"}
              </button>
            </div>

            {printMsg ? (
              <div className={`mt-3 rounded-2xl border p-3 text-sm font-extrabold ${printMsgClasses}`}>
                {printMsg}
              </div>
            ) : null}

            <div className="mt-5 space-y-2">
              {visiblePrintJobs.length ? (
                visiblePrintJobs.map((job) => (
                  <div
                    key={job.id}
                    className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/90 p-4 shadow-sm sm:flex-row sm:items-center"
                  >
                    <div>
                      <div className="text-sm font-black text-slate-900">{job.title || job.file_name}</div>
                      <div className="mt-1 text-xs font-extrabold text-slate-600">
                        {job.location}
                        {job.period ? ` • ${job.period}` : ""}
                      </div>
                      <div className="mt-1 text-xs font-bold text-slate-500">
                        {new Date(job.created_at).toLocaleString("pt-BR")}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-[11px] font-extrabold ${
                          job.printed
                            ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200"
                            : "bg-amber-100 text-amber-800 ring-1 ring-amber-200"
                        }`}
                      >
                        {job.printed ? "Impresso" : "Pendente"}
                      </span>
                      {job.url ? (
                        <a
                          href={`/print-file?url=${encodeURIComponent(job.url)}&name=${encodeURIComponent(
                            job.title || job.file_name
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-black shadow-sm transition-all duration-200 hover:-translate-y-[1px] hover:bg-slate-50"
                        >
                          Abrir
                        </a>
                      ) : null}
                      {!job.printed ? (
                        <button
                          type="button"
                          onClick={async () => {
                            setPrintMsg("");
                            try {
                              const { data: session } = await supabase.auth.getSession();
                              const token = session.session?.access_token ?? "";
                              const res = await fetch("/api/print-jobs", {
                                method: "DELETE",
                                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                                body: JSON.stringify({ id: job.id }),
                              });
                              const payload = await res.json().catch(() => ({}));
                              if (!res.ok) throw new Error(payload?.error ?? "Erro ao cancelar.");
                              await loadPrintJobs();
                              setToast({ type: "ok", text: "Envio cancelado com sucesso." });
                            } catch (err: unknown) {
                              setPrintMsg(err instanceof Error ? err.message : "Erro ao cancelar.");
                              setToast({ type: "err", text: "Não foi possível cancelar o envio." });
                            }
                          }}
                          className="inline-flex items-center justify-center rounded-full border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-700 shadow-sm transition-all duration-200 hover:-translate-y-[1px] hover:bg-red-100"
                        >
                          Cancelar
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm font-extrabold text-slate-500">
                  Nenhum envio encontrado.
                </div>
              )}
            </div>
            {printJobs.length > 4 ? (
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                <div className="text-center text-xs font-bold text-slate-500">
                  {showAllPrintJobs ? "Exibindo todos os envios." : "Exibindo os 4 últimos envios."}
                </div>
                <button
                  type="button"
                  onClick={() => setShowAllPrintJobs((prev) => !prev)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-700 transition hover:bg-slate-50"
                >
                  {showAllPrintJobs ? "Ver apenas 4 últimos" : "Ver tudo"}
                </button>
              </div>
            ) : null}
          </section>
        ) : null}

        {needsLogin ? null : (
          <>
        <div className="rounded-3xl border border-slate-200/60 bg-slate-50/80 shadow-[0_14px_40px_rgba(15,23,42,0.10)] backdrop-blur overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 bg-slate-50/80 p-4">
            <div>
              <h2 className="text-lg font-black text-slate-900">Minhas reservas</h2>
              <div className="mt-1 text-xs font-bold text-slate-500">
                {loading ? "Carregando..." : `${filteredRows.length} agendamento(s) encontrado(s)`}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-black uppercase tracking-[0.06em] text-slate-500">Ano</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 outline-none focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
              >
                {Array.from({ length: Math.max(1, new Date().getFullYear() - 2026 + 1) }, (_, i) => 2026 + i)
                  .reverse()
                  .map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="grid gap-2 border-b border-slate-200/70 bg-white/70 p-3 sm:p-4 md:grid-cols-3">
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
            >
              <option value="all">Todos os status</option>
              <option value="active">Aprovada/Ativa</option>
              <option value="pending">Pendente</option>
              <option value="cancelled">Cancelada</option>
            </select>
            <input
              value={filterMaterial}
              onChange={(e) => setFilterMaterial(e.target.value)}
              placeholder="Buscar material..."
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
            />
          </div>

          {!loading && filteredRows.length === 0 && (
            <div className="p-5 text-sm font-bold text-slate-500">Você ainda não tem agendamentos.</div>
          )}

          <div className="divide-y">
            {pagedRows.map(({ r, materials }) => (
              <div
                key={r.id}
                className="p-4 transition-all duration-200 hover:bg-slate-50"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-black text-slate-900">
                      {r.use_date} • Tempos {r.start_period}–{r.end_period}
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-600">
                      Turma: <b>{r.school_class}</b> • Professor: <b>{r.teacher_name || r.teacher_email}</b>
                    </div>
                    <div className="mt-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-[11px] font-extrabold ${getReservationStatusClass(
                          r.status
                        )}`}
                      >
                        {getReservationStatusLabel(r.status)}
                      </span>
                    </div>
                  </div>

                  {r.status === "active" ? (
                    <button
                      onClick={() => cancelReservation(r.id)}
                      className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-black text-red-700 shadow-sm transition-all duration-200 hover:-translate-y-[1px] hover:bg-red-100 active:scale-[0.99] sm:w-auto"
                    >
                      Cancelar
                    </button>
                  ) : (
                    <span className="text-sm text-slate-400">—</span>
                  )}
                </div>

                  <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 text-sm">
                    <div className="mb-1 text-xs font-black uppercase tracking-[0.05em] text-slate-500">Materiais</div>
                  {materials.length === 0 ? (
                    <div className="font-semibold text-slate-500">Nenhum material encontrado.</div>
                  ) : (
                    <ul className="list-disc ml-5 font-semibold text-slate-700">
                      {materials.map((m, i) => (
                        <li key={i}>
                          {m.items?.category} — {m.items?.name} • qtd: <b>{m.qty}</b>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ))}
          </div>
          {filteredRows.length > resPerPage ? (
            <div className="p-4 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setResPage((p) => Math.max(1, p - 1))}
                className="h-9 rounded-full px-3 text-xs font-extrabold text-slate-600 ring-1 ring-slate-200 transition-all duration-200 hover:bg-slate-50 hover:-translate-y-[1px] active:scale-[0.99]"
                disabled={resPage === 1}
              >
                Anterior
              </button>
            {Array.from({ length: totalResPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setResPage(p)}
                className={`h-9 w-9 rounded-full text-xs font-extrabold ${
                  p === resPage
                    ? "bg-emerald-500 text-white shadow-sm"
                    : "bg-white text-slate-600 ring-1 ring-slate-200"
                }`}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setResPage((p) => Math.min(totalResPages, p + 1))}
              className="h-9 rounded-full px-3 text-xs font-extrabold text-slate-600 ring-1 ring-slate-200 transition-all duration-200 hover:bg-slate-50 hover:-translate-y-[1px] active:scale-[0.99]"
              disabled={resPage === totalResPages}
            >
              Próximo
            </button>
            </div>
          ) : null}
        </div>
          </>
        )}
      </div>

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
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm transition-all duration-200 hover:bg-slate-50 active:scale-[0.99] disabled:opacity-60"
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
      ) : null}
    </main>
  );
}
