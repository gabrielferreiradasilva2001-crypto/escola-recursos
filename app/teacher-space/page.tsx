"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Image as ImageIcon } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import ProfessorHeader from "../components/ProfessorHeader";
import HomeTopButton from "../components/HomeTopButton";

type ActionCard = {
  title: string;
  desc: string;
  href: string;
  accent: "emerald" | "sky";
  kpi: string;
};

const actions: ActionCard[] = [
  {
    title: "Minhas reservas",
    desc: "Consulte histórico, cancele e acompanhe suas reservas em andamento.",
    href: "/my_reservations",
    accent: "sky",
    kpi: "Agenda",
  },
  {
    title: "Publicações",
    desc: "Envie fotos e legenda das atividades para revisão da coordenação/gestão.",
    href: "/activity-submissions",
    accent: "emerald",
    kpi: "Projetos",
  },
];

function resolveTeacherName(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
} | null) {
  if (!user) return "";
  const byName = String(user.user_metadata?.name ?? "").trim();
  if (byName) return byName;
  const byUsername = String(user.user_metadata?.username ?? "").trim();
  if (byUsername) return byUsername.replace(/\./g, " ");
  return "";
}

export default function TeacherSpacePage() {
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
  const [checking, setChecking] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [teacherName, setTeacherName] = useState("");
  const [teacherAvatarUrl, setTeacherAvatarUrl] = useState("");
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginUser, setLoginUser] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginMsg, setLoginMsg] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [weekSummary, setWeekSummary] = useState<{ date: string; label: string; count: number }[]>([]);

  const loadTeacherDashboard = useCallback(async (userId: string) => {
    const today = new Date();
    const day = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const mondayIso = monday.toISOString().slice(0, 10);
    const sundayIso = sunday.toISOString().slice(0, 10);

    const { data: reservations } = await supabase
      .from("reservations")
      .select("use_date,status,user_id")
      .eq("user_id", userId)
      .gte("use_date", mondayIso)
      .lte("use_date", sundayIso);

    const nextWeek = Array.from({ length: 7 }, (_, idx) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + idx);
      const iso = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });
      const count = (reservations ?? []).filter((r: { use_date?: string; status?: string }) => r.use_date === iso && r.status !== "cancelled").length;
      return { date: iso, label, count };
    });
    setWeekSummary(nextWeek);
  }, []);

  const resolveRegisteredTeacherName = useCallback(
    async (token: string, fallback: string) => {
      try {
        const res = await fetch("/api/teachers/me", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({}),
        });
        const payload = await res.json().catch(() => ({}));
        const fromRegistry = String(payload?.data?.name ?? "").trim();
        return fromRegistry || fallback;
      } catch {
        return fallback;
      }
    },
    []
  );

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  }, []);

  useEffect(() => {
    let active = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      const user = data.session?.user ?? null;
      if (user?.user_metadata?.force_password_change) {
        window.location.href = "/auth/first-login";
        return;
      }
      setLoggedIn(!!user);
      const fallbackName = resolveTeacherName(user);
      const token = data.session?.access_token ?? "";
      const resolvedName = token ? await resolveRegisteredTeacherName(token, fallbackName) : fallbackName;
      setTeacherName(resolvedName);
      setTeacherAvatarUrl(String(user?.user_metadata?.avatar_url ?? "").trim());
      if (user) {
        await loadTeacherDashboard(user.id);
      }
      setChecking(false);
    })();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null;
      if (user?.user_metadata?.force_password_change) {
        window.location.href = "/auth/first-login";
        return;
      }
      setLoggedIn(!!user);
      const fallbackName = resolveTeacherName(user);
      setTeacherAvatarUrl(String(user?.user_metadata?.avatar_url ?? "").trim());
      if (user) {
        const token = session?.access_token ?? "";
        void resolveRegisteredTeacherName(token, fallbackName).then((name) => setTeacherName(name));
        void loadTeacherDashboard(user.id);
      } else {
        setTeacherName("");
        setWeekSummary([]);
      }
      setChecking(false);
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, [loadTeacherDashboard, resolveRegisteredTeacherName]);

  async function handleLogin() {
    setLoginMsg("");
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
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: loginPassword,
    });
    if (error) {
      setLoginMsg("Login inválido.");
      setLoginLoading(false);
      return;
    }
    if (rememberMe) {
      localStorage.removeItem("eeav_temp_session");
      sessionStorage.removeItem("eeav_temp_session");
    } else {
      localStorage.setItem("eeav_temp_session", "1");
      sessionStorage.setItem("eeav_temp_session", "1");
    }
    setLoginPassword("");
    setLoginUser("");
    setLoginOpen(false);
    setLoginLoading(false);
  }

  if (checking) {
    return (
      <main className="min-h-screen mutare-page-bg px-4 py-10 text-slate-900">
        <HomeTopButton />
        <div className="mx-auto max-w-5xl rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">Carregando...</div>
      </main>
    );
  }

  if (!loggedIn) {
    return (
      <main className="min-h-screen mutare-page-bg px-4 py-8 text-slate-900">
        <HomeTopButton />
        <div className="mx-auto max-w-6xl">
          <ProfessorHeader
            title="Espaço do Professor(a)"
            subtitle="Acesso de reservas e publicações"
            teacherName=""
            teacherEmail=""
            teacherAvatarUrl=""
            backHref="/portal"
            backLabel="Ir para o Portal"
          />

          <section className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-slate-50/95 p-6 shadow-[0_16px_40px_rgba(15,23,42,0.10)] backdrop-blur">
            <div className="grid gap-5 md:grid-cols-[1.15fr_0.85fr]">
              <div>
                <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-black text-sky-700">
                  Espaço Profissional
                </span>
                <h2 className="mt-3 text-xl font-black">Faça login para continuar</h2>
                <p className="mt-2 text-sm font-semibold text-slate-600">
                  O acesso ao Espaço do Professor(a) exige autenticação no portal.
                </p>
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setLoginMsg("");
                      setLoginOpen(true);
                    }}
                    className="login-btn-fun inline-flex items-center gap-2 rounded-[26px_14px_30px_12px] bg-gradient-to-r from-emerald-500 to-sky-500 px-4 py-2 text-sm font-black text-white shadow-lg shadow-emerald-500/20 transition-all duration-200 hover:-translate-y-[2px] hover:-rotate-2 hover:shadow-xl active:scale-[0.99]"
                  >
                    Fazer login
                  </button>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4">
                <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Recursos</div>
                <div className="mt-2 grid gap-2 text-sm font-semibold text-slate-700">
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">Reservas por período</div>
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">Envio de publicações</div>
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">Fluxo simples e rápido</div>
                </div>
              </div>
            </div>
          </section>

          {loginOpen ? (
            <div
              onClick={() => setLoginOpen(false)}
              className="fixed inset-0 z-[9999] grid place-items-center bg-slate-900/55 p-4 backdrop-blur-sm"
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md rounded-3xl border border-slate-200 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.25)]"
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
                    Acesso
                  </span>
                </div>
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="text-xs font-extrabold text-slate-900">Usuário</label>
                    <input
                      type="text"
                      placeholder="nome.ultimo"
                      value={loginUser}
                      onChange={(e) => setLoginUser(e.target.value)}
                      className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-extrabold outline-none transition-all duration-200 focus:border-sky-300 focus:ring-4 focus:ring-sky-200/40"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-extrabold text-slate-900">Senha</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
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
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-extrabold text-red-700">
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
                      {loginLoading ? "Entrando..." : "Entrar"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen mutare-page-bg px-4 py-8 text-slate-900">
      <HomeTopButton />
      <div className="mx-auto max-w-6xl">
        <ProfessorHeader
          title="Espaço do Professor(a)"
          subtitle="Suas funções em um só lugar"
          teacherName={`${greeting}, ${teacherName || "Professor(a)"}`}
          teacherEmail=""
          teacherAvatarUrl={teacherAvatarUrl}
          backHref="/portal"
          backLabel="Voltar ao Portal"
        />

        <section className="mt-5 rounded-3xl border border-slate-200 bg-slate-50/95 p-4 shadow-[0_12px_35px_rgba(15,23,42,0.08)] backdrop-blur sm:p-5">
          <div className="mt-1 rounded-2xl border border-slate-200 bg-white p-3 sm:mt-4">
            <div className="text-xs font-black uppercase tracking-[0.1em] text-slate-500">Calendário da semana</div>
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-3 sm:overflow-visible lg:grid-cols-7">
              {weekSummary.map((d) => (
                <div
                  key={d.date}
                  className="min-w-[112px] flex-none rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-center sm:min-w-0"
                >
                  <div className="text-[10px] font-black text-slate-600 sm:text-[11px]">{d.label}</div>
                  <div className="mt-1 text-sm font-black text-slate-900 sm:text-base">{d.count}</div>
                  <div className="text-[10px] font-bold text-slate-500">reserva(s)</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-slate-50/95 p-6 shadow-[0_16px_42px_rgba(15,23,42,0.10)] backdrop-blur">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-black">Painel do Professor(a)</h2>
              <p className="mt-1 text-sm font-semibold text-slate-600">
                Escolha uma área para continuar.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {actions.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className={`group relative overflow-hidden rounded-2xl border p-5 shadow-sm transition-all duration-200 hover:-translate-y-[4px] hover:shadow-[0_20px_42px_rgba(15,23,42,0.16)] focus-visible:outline-none focus-visible:ring-4 ${
                  item.accent === "emerald"
                    ? "border-emerald-300 bg-gradient-to-br from-emerald-100/95 via-emerald-50 to-white focus-visible:ring-emerald-300"
                    : "border-sky-300 bg-gradient-to-br from-sky-100/95 via-cyan-50 to-white focus-visible:ring-sky-300"
                }`}
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border shadow-sm transition-transform duration-200 group-hover:scale-105 ${
                      item.accent === "emerald"
                        ? "border-emerald-300 bg-emerald-200 text-emerald-800"
                        : "border-sky-300 bg-sky-200 text-sky-800"
                    }`}
                  >
                    {item.accent === "emerald" ? (
                      <ImageIcon className="h-5 w-5" />
                    ) : (
                      <CalendarDays className="h-5 w-5" />
                    )}
                  </div>
                  <span className="rounded-full border border-white/70 bg-slate-50/85 px-2 py-1 text-[10px] font-black text-slate-700 shadow-sm">
                    {item.kpi}
                  </span>
                </div>
                <div className="text-lg font-black text-slate-900">{item.title}</div>
                <div className="mt-2 text-sm font-semibold text-slate-600">{item.desc}</div>
                <div
                  className={`mt-4 inline-flex items-center rounded-xl px-3 py-2 text-xs font-black text-white shadow-sm transition-all group-hover:translate-x-[2px] ${
                    item.accent === "emerald"
                      ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                      : "bg-gradient-to-r from-sky-500 to-cyan-500"
                  }`}
                >
                  Acessar
                </div>
                <div
                  className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full blur-2xl transition-opacity ${
                    item.accent === "emerald" ? "bg-emerald-300/55" : "bg-sky-300/55"
                  }`}
                />
              </a>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
