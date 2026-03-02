"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "../../lib/supabaseClient";
import { APP_BRAND_NAME } from "../../lib/branding";
import { resolvePortalRole, type PortalRole } from "../../lib/portalRoles";
import HomeTopButton from "../components/HomeTopButton";
import SchoolLogo from "../components/SchoolLogo";

type Shortcut = {
  label: string;
  desc: string;
  href: string;
  icon: React.ReactNode;
  tone?: "blue" | "green" | "slate";
  kind?: "module" | "pdf";
};

type LoginResult = Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>;

export default function PortalPage() {
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

  function resolveUserName(user: { email?: string | null; user_metadata?: Record<string, unknown> | null } | null) {
    if (!user) return "";
    const byFullName = String(user.user_metadata?.full_name ?? "").trim();
    if (byFullName) return byFullName;
    const byName = String(user.user_metadata?.name ?? "").trim();
    if (byName) return byName;
    const byUsername = String(user.user_metadata?.username ?? "").trim();
    if (byUsername) return byUsername.replace(/\./g, " ");
    const mail = String(user.email ?? "").trim();
    if (!mail) return "";
    return mail.includes("@") ? mail.split("@")[0].replace(/\./g, " ") : mail;
  }

  const [email, setEmail] = useState<string>("");
  const [userName, setUserName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [userRole, setUserRole] = useState<PortalRole>("professor");
  const [loggedOut, setLoggedOut] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginUser, setLoginUser] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginMsg, setLoginMsg] = useState("");
  const [loginOk, setLoginOk] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [birthdays, setBirthdays] = useState<{ name: string; birth_day: number | null; birth_month: number | null }[]>(
    []
  );
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedSchoolId] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("mutare_selected_school_id") ?? "" : ""
  );

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    (async () => {
      const tempSession = localStorage.getItem("eeav_temp_session");
      if (tempSession && !sessionStorage.getItem("eeav_temp_session")) {
        await supabase.auth.signOut({ scope: "local" });
        localStorage.removeItem("eeav_temp_session");
      }
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setEmail("");
        setUserName("");
        setAvatarUrl("");
        setUserRole("professor");
        setLoggedOut(true);
        return;
      }
      if (data.session.user?.user_metadata?.force_password_change) {
        window.location.href = "/auth/first-login";
        return;
      }
      setEmail(data.session.user.email ?? "");
      setUserName(resolveUserName(data.session.user));
      setAvatarUrl(String(data.session.user.user_metadata?.avatar_url ?? "").trim());
      setUserRole(resolvePortalRole(data.session.user));
      setLoggedOut(false);
    })();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setEmail("");
        setUserName("");
        setAvatarUrl("");
        setUserRole("professor");
        setLoggedOut(true);
        return;
      }
      if (session.user?.user_metadata?.force_password_change) {
        window.location.href = "/auth/first-login";
        return;
      }
      setEmail(session.user.email ?? "");
      setUserName(resolveUserName(session.user));
      setAvatarUrl(String(session.user.user_metadata?.avatar_url ?? "").trim());
      setUserRole(resolvePortalRole(session.user));
      setLoggedOut(false);
    });
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = Number(localStorage.getItem("eeav_year") ?? "");
    const current = new Date().getFullYear();
    if (Number.isFinite(stored) && stored >= 2026) {
      setSelectedYear(Math.min(stored, current));
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("eeav_year", String(selectedYear));
  }, [selectedYear]);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token ?? "";
      if (!token) {
        if (!active) return;
        setBirthdays([]);
        return;
      }
      fetch("/api/teachers/birthdays", { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => res.json())
        .then((payload) => {
          if (!active) return;
          setBirthdays(Array.isArray(payload?.data) ? payload.data : []);
        })
        .catch(() => {
          if (!active) return;
          setBirthdays([]);
        });
    })();
    return () => {
      active = false;
    };
  }, []);

  const todayBirthdays = useMemo(() => {
    if (!birthdays.length) return [];
    const today = new Date();
    const d = today.getDate();
    const m = today.getMonth() + 1;
    return birthdays.filter((b) => b.birth_day === d && b.birth_month === m).map((b) => b.name);
  }, [birthdays]);

  const tomorrowBirthdays = useMemo(() => {
    if (!birthdays.length) return [];
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const d = tomorrow.getDate();
    const m = tomorrow.getMonth() + 1;
    return birthdays.filter((b) => b.birth_day === d && b.birth_month === m).map((b) => b.name);
  }, [birthdays]);

  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    const start = 2026;
    const end = Math.max(current, start);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, []);

  async function handleLogin() {
    setLoginMsg("");
    setLoginOk(false);
    setLoginLoading(true);
    const rawLogin = loginUser.trim();
    const loginEmail = rawLogin.includes("@") ? rawLogin.toLowerCase() : `${normalizeUsername(rawLogin)}@local.eeav`;
    if (!loginEmail || loginEmail.startsWith("@")) {
      setLoginMsg("Usuário inválido.");
      setLoginLoading(false);
      return;
    }

    let signInData: LoginResult["data"] | null = null;
    let error: LoginResult["error"] | null = null;
    try {
      const timeoutPromise = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 10000));
      const result = await Promise.race<LoginResult>([
        supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword }),
        timeoutPromise,
      ]);
      signInData = result?.data ?? null;
      error = result?.error ?? null;
    } catch {
      setLoginMsg("Conexão lenta. Tente novamente.");
      setLoginLoading(false);
      return;
    }

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

    setEmail(session?.user.email ?? loginEmail);
    setUserName(resolveUserName(session?.user ?? null));
    setAvatarUrl(String(session?.user.user_metadata?.avatar_url ?? "").trim());
    setUserRole(resolvePortalRole(session?.user ?? null));
    if (rememberMe) {
      localStorage.removeItem("eeav_temp_session");
      sessionStorage.removeItem("eeav_temp_session");
    } else {
      localStorage.setItem("eeav_temp_session", "1");
      sessionStorage.setItem("eeav_temp_session", "1");
    }
    setLoggedOut(false);
    setLoginMsg("Login realizado!");
    setLoginOk(true);
    window.setTimeout(() => {
      setLoginPassword("");
      setLoginUser("");
      setLoginOpen(false);
      setLoginLoading(false);
      setLoginMsg("");
      setLoginOk(false);
    }, 400);
  }

  function withYear(href: string) {
    if (!href.startsWith("/") || href.includes(".pdf")) return href;
    const joiner = href.includes("?") ? "&" : "?";
    return `${href}${joiner}year=${selectedYear}`;
  }
  function withCalendarPdf(href: string) {
    if (href !== "/api/schools/calendar") return href;
    return selectedSchoolId
      ? `${href}?school_id=${encodeURIComponent(selectedSchoolId)}`
      : href;
  }

  async function doLogout() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("eeav_admin_pass");
    }
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      if (typeof window !== "undefined") {
        for (const k of Object.keys(localStorage)) {
          if (k.startsWith("sb-") || k.includes("supabase") || k.includes("auth-token")) {
            localStorage.removeItem(k);
          }
        }
      }
    } finally {
      setEmail("");
      setUserName("");
      setAvatarUrl("");
      setUserRole("professor");
      setLoggedOut(true);
    }
  }

  const allShortcuts: Shortcut[] = [
    {
      label: "Agendamentos",
      desc: "Ver reservas do dia e consultas rápidas.",
      href: "/calendar",
      icon: <IconCalendar />,
      tone: "blue",
      kind: "module",
    },
    {
      label: "Calendário Escolar",
      desc: "Abrir calendário por escola vinculada.",
      href: "/api/schools/calendar",
      icon: <IconGrid />,
      tone: "slate",
      kind: "pdf",
    },
    {
      label: "Espaço do Professor(a)",
      desc: "Reservas, publicações e ações pedagógicas.",
      href: "/teacher-space",
      icon: <IconTeacher />,
      tone: "green",
      kind: "module",
    },
    {
      label: "Relatórios",
      desc: "Resumo geral e exportações de indicadores.",
      href: "/reports",
      icon: <IconDoc />,
      tone: "blue",
      kind: "module",
    },
    {
      label: "Cadastros",
      desc: "Usuários, turmas e permissões de acesso.",
      href: "/portal/teachers",
      icon: <IconUsers />,
      tone: "slate",
      kind: "module",
    },
    {
      label: "Gestão",
      desc: "Substitutos, materiais e revisões da gestão.",
      href: "/management",
      icon: <IconManage />,
      tone: "slate",
      kind: "module",
    },
  ];
  const shortcuts =
    userRole === "estagiario"
      ? allShortcuts.filter((shortcut) => shortcut.label === "Agendamentos" || shortcut.label === "Calendário Escolar")
      : allShortcuts;

  const hasUser = email.trim().length > 0;
  const headerStyle: React.CSSProperties = {
    background:
      "linear-gradient(90deg, rgba(14,116,144,0.70), rgba(14,165,233,0.62), rgba(56,189,248,0.64))",
    borderColor: "rgba(255,255,255,0.32)",
  };

  if (!hydrated) {
    return <main className="min-h-screen bg-white" aria-label="Carregando portal" />;
  }

  return (
    <div className="min-h-screen mutare-page-bg">
      <HomeTopButton />

      <header className="relative overflow-hidden border-b" style={headerStyle}>
        <div className="pointer-events-none absolute -left-20 -top-24 h-44 w-44 rounded-full bg-white/20 blur-2xl" />
        <div className="pointer-events-none absolute -right-16 -bottom-20 h-40 w-40 rounded-full bg-cyan-200/30 blur-2xl" />
        <div className="mx-auto max-w-6xl px-4 py-3 max-[380px]:px-3 sm:px-6 sm:py-5">
          <div className="grid grid-cols-[1fr_auto] items-center gap-4 md:grid-cols-[1fr_74px]">
            <div className="flex flex-col items-start text-white">
              <Image
                src="/mutare-logo.png"
                alt="Logo Loop"
                width={140}
                height={64}
                className="mb-2 h-9 w-auto object-contain max-[380px]:h-8 sm:h-10"
                priority
              />
              <p className="inline-flex items-center rounded-full border border-white/40 bg-white/15 px-3 py-1 text-[10px] font-black tracking-[0.14em] opacity-95 shadow-sm backdrop-blur-sm max-[380px]:hidden sm:px-4 sm:text-[11px] sm:tracking-[0.18em]">
                {APP_BRAND_NAME.toUpperCase()}
              </p>
            </div>
            <Link href="/portal" title="Voltar ao Portal" className="justify-self-end">
              <SchoolLogo size={48} className="rounded-xl bg-white/15 p-1 drop-shadow sm:h-14 sm:w-14" />
            </Link>
          </div>
          <div className="pointer-events-none mt-3 h-1.5 w-24 -rotate-1 rounded-full bg-white/35 blur-[1px] sm:w-32" />

          <div
            className={`mt-2 relative flex flex-col items-center gap-2 md:-mt-1 md:flex-row ${
              hasUser ? "md:min-h-[74px]" : "md:min-h-[42px]"
            } ${
              hasUser ? "md:justify-center" : "md:justify-start"
            }`}
          >
            <div className="flex items-center justify-center text-white">
              <div className="flex flex-col items-center gap-2">
                {hasUser ? (
                  <>
                    <span className="grid h-10 w-10 place-items-center overflow-hidden rounded-full border border-white/40 bg-white/25 text-sm font-black shadow-sm sm:h-12 sm:w-12">
                      {avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={avatarUrl} alt="Foto do perfil" className="h-full w-full object-cover" />
                      ) : (
                        <span>{(userName || "U").charAt(0).toUpperCase()}</span>
                      )}
                    </span>
                    <p className="inline-flex max-w-full items-center rounded-full border border-white/45 bg-white/18 px-3 py-1.5 text-xs font-black shadow-sm backdrop-blur-sm max-[380px]:px-2.5 max-[380px]:text-[11px] sm:px-4 sm:text-sm">
                      <span className="mr-1 whitespace-nowrap">Bem-vindo(a),</span>
                      <span className="max-w-[160px] truncate max-[380px]:max-w-[120px] sm:max-w-[260px] md:max-w-[320px]">{userName || "Usuário"}</span>
                    </p>
                    <span className="inline-flex items-center justify-center rounded-full border border-white/40 bg-white/18 px-3 py-1 text-[10px] font-black text-white/95 shadow-sm backdrop-blur-sm sm:text-[11px]">
                      {selectedSchoolId ? "Escola atual definida" : "Escopo geral"}
                    </span>
                  </>
                ) : (
                  <p className="inline-flex max-w-full items-center rounded-full border border-white/45 bg-white/18 px-4 py-1.5 text-xs font-black shadow-sm backdrop-blur-sm sm:text-sm">
                    <span className="whitespace-nowrap">Acesse o sistema</span>
                  </p>
                )}
              </div>
            </div>
            <div className="flex w-full items-center gap-2 overflow-x-auto pb-1 max-[380px]:gap-1 sm:w-auto sm:flex-wrap sm:justify-center sm:overflow-visible sm:pb-0 md:absolute md:right-0 md:top-1/2 md:-translate-y-1/2">
              <div className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/45 bg-white/10 px-2 py-1 text-xs font-black text-white max-[380px]:h-9 max-[380px]:text-[11px] sm:h-auto sm:justify-start">
                Ano
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="rounded-lg border-none bg-white px-2 py-1 text-xs font-black text-sky-900 outline-none max-[380px]:text-[11px]"
                >
                  {yearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
              <Link href={withYear("/calendar")} className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-white px-3 py-2 text-xs font-black text-sky-800 shadow-sm hover:bg-sky-50 max-[380px]:h-10 max-[380px]:px-2.5 max-[380px]:text-[11px] sm:h-10">
                Nova reserva
              </Link>
              <button
                onClick={() => {
                  if (loggedOut) {
                    setLoginMsg("");
                    setLoginOpen(true);
                    return;
                  }
                  void doLogout();
                }}
                className="h-11 shrink-0 rounded-xl border border-white/45 bg-white/10 px-3 py-2 text-xs font-black text-white hover:bg-white/20 max-[380px]:h-10 max-[380px]:px-2.5 max-[380px]:text-[11px] sm:h-10"
              >
                {loggedOut ? "Entrar" : "Sair"}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="md:grid md:grid-cols-[74px_1fr]">
          <div className="hidden md:block" />
          <div className="rounded-3xl border border-sky-100 bg-slate-50/85 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.08)] sm:p-5">
            <div className="expressive-grid grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {shortcuts.map((shortcut) => {
                const href =
                  shortcut.kind === "pdf"
                    ? withCalendarPdf(shortcut.href)
                    : withYear(shortcut.href);
                return <ShortcutCard key={shortcut.label} {...shortcut} href={href} />;
              })}
            </div>

            {(todayBirthdays.length || tomorrowBirthdays.length) && (
              <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div className="text-xs font-black uppercase tracking-[0.12em] text-amber-800">Aniversários</div>
                {todayBirthdays.length ? (
                  <div className="mt-2 text-sm font-bold text-amber-900">
                    Hoje: <span className="font-black">{todayBirthdays.join(", ")}</span>
                  </div>
                ) : null}
                {tomorrowBirthdays.length ? (
                  <div className="mt-1 text-sm font-bold text-amber-900">
                    Amanhã: <span className="font-black">{tomorrowBirthdays.join(", ")}</span>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>

        <footer className="mt-10 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} • {APP_BRAND_NAME} • Portal de Gestão
        </footer>
      </main>

      {loginOpen ? (
        <div
          onClick={() => setLoginOpen(false)}
          className="fixed inset-0 z-[9999] grid place-items-center bg-slate-900/55 p-4 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl border border-slate-200 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.25)]"
            style={{ background: "linear-gradient(180deg, rgba(52,211,153,0.35), rgba(56,189,248,0.25))" }}
          >
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="text-lg font-black text-slate-900">Login</div>
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
                    placeholder="••••••••"
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
                <div
                  className={`rounded-2xl border p-3 text-sm font-extrabold ${
                    loginOk ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"
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
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setLoginOpen(false)}
                disabled={loginLoading}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black shadow-sm transition-all duration-200 hover:bg-slate-50 disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleLogin}
                disabled={loginLoading}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-sky-500 px-4 py-2 text-sm font-black text-white shadow-lg shadow-emerald-500/20 transition-all duration-200 hover:-translate-y-[2px] hover:shadow-xl disabled:opacity-60"
              >
                {loginLoading ? "Entrando..." : "Entrar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ShortcutCard({ label, desc, href, icon, kind = "module" }: Shortcut) {
  const iconToneClass = "bg-sky-100/90 border-sky-300 text-black";
  const cardAccentClass = "hover:border-sky-300";

  const content = (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className={`grid h-10 w-10 place-items-center rounded-xl border shadow-sm ${iconToneClass}`}>{icon}</div>
      </div>
      <div className="min-w-0">
        <p className="text-lg font-black text-black tracking-[-0.01em] md:text-[1.15rem]">{label}</p>
        <p className="mt-1 text-[13px] font-semibold leading-relaxed text-black">{desc}</p>
        <p className="mt-2 text-xs font-black text-black">
          Acessar <span className="inline-block transition group-hover:translate-x-0.5">→</span>
        </p>
      </div>
    </div>
  );

  if (kind === "pdf") {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`group rounded-[26px_14px_28px_16px] border border-sky-200 bg-sky-50 p-4 shadow-[0_9px_20px_rgba(15,23,42,0.10)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-sky-100 hover:shadow-[0_16px_30px_rgba(14,165,233,0.18)] ${cardAccentClass}`}
      >
        {content}
      </a>
    );
  }

  return (
    <Link
      href={href}
      className={`group rounded-[26px_14px_28px_16px] border border-sky-200 bg-sky-50 p-4 shadow-[0_9px_20px_rgba(15,23,42,0.10)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-sky-100 hover:shadow-[0_16px_30px_rgba(14,165,233,0.18)] ${cardAccentClass}`}
    >
      {content}
    </Link>
  );
}

function IconCalendar() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M7 3v3M17 3v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 8h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M6 6h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M8 12h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 16h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconGrid() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M4 4h7v7H4V4ZM13 4h7v7h-7V4ZM4 13h7v7H4v-7ZM13 13h7v7h-7v-7Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function IconDoc() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M14 3v5h5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M8 13h8M8 17h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M9.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconManage() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M12 3l2.2 2.2 3.1-.6.8 3 2.7 1.5-1.5 2.7 1.5 2.7-2.7 1.5-.8 3-3.1-.6L12 21l-2.2-2.2-3.1.6-.8-3-2.7-1.5 1.5-2.7-1.5-2.7 2.7-1.5.8-3 3.1.6L12 3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function IconTeacher() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M3 7l9-4 9 4-9 4-9-4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M7 10v4c0 1.66 2.24 3 5 3s5-1.34 5-3v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M21 9v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
