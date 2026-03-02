"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "../../lib/supabaseClient";
import { APP_BRAND_NAME } from "../../lib/branding";
import { resolvePortalRole, type PortalRole } from "../../lib/portalRoles";
import HomeTopButton from "../components/HomeTopButton";
import SchoolLogo from "../components/SchoolLogo";

type Shortcut = {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  tone?: "blue" | "green" | "slate";
  kind?: "module" | "pdf";
};

export default function PortalPage() {
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
  const [email, setEmail] = useState<string>("");
  const [userName, setUserName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [userRole, setUserRole] = useState<PortalRole>("professor");
  const [needsLogin, setNeedsLogin] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginUser, setLoginUser] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginMsg, setLoginMsg] = useState("");
  const [loginOk, setLoginOk] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedSchoolId] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("mutare_selected_school_id") ?? "" : ""
  );

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
        setUserName("");
        setAvatarUrl("");
        setUserRole("professor");
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
      setNeedsLogin(false);
    })();
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) {
          setNeedsLogin(true);
          setEmail("");
          setUserName("");
          setAvatarUrl("");
          setUserRole("professor");
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
        setNeedsLogin(false);
      }
    );
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

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

    setEmail(session?.user?.email ?? email);
    setUserName(resolveUserName(session?.user ?? null));
    setAvatarUrl(String(session?.user?.user_metadata?.avatar_url ?? "").trim());
    setUserRole(resolvePortalRole(session?.user ?? null));
    if (rememberMe) {
      localStorage.removeItem("eeav_temp_session");
      sessionStorage.removeItem("eeav_temp_session");
    } else {
      localStorage.setItem("eeav_temp_session", "1");
      sessionStorage.setItem("eeav_temp_session", "1");
    }
    setNeedsLogin(false);
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

  const allShortcuts: Shortcut[] = [
    {
      title: "Espaço do Professor(a)",
      description: "Acompanhar atividades e recursos pedagógicos.",
      href: "/teacher-space",
      icon: <IconTeacher />,
      tone: "blue",
      kind: "module",
    },
    {
      title: "Calendário",
      description: "Visualizar agenda e uso dos materiais por período.",
      href: "/calendar",
      icon: <IconGrid />,
      tone: "slate",
      kind: "module",
    },
    {
      title: "Nova Reserva",
      description: "Registrar rapidamente um novo agendamento.",
      href: "/calendar",
      icon: <IconPlus />,
      tone: "green",
      kind: "module",
    },
    {
      title: "Relatórios",
      description: "Acessar painéis e exportações de indicadores.",
      href: "/reports",
      icon: <IconDoc />,
      tone: "blue",
      kind: "module",
    },
    {
      title: "Calendário Escolar",
      description: "Abrir calendário por escola vinculada.",
      href: selectedSchoolId
        ? `/api/schools/calendar?school_id=${encodeURIComponent(selectedSchoolId)}`
        : "/api/schools/calendar",
      icon: <IconGrid />,
      tone: "slate",
      kind: "pdf",
    },
    {
      title: "Usuários",
      description: "Gerenciar cadastro de usuários e escolas.",
      href: "/portal/teachers",
      icon: <IconUsers />,
      tone: "slate",
      kind: "module",
    },
  ];
  const shortcuts =
    userRole === "estagiario"
      ? allShortcuts.filter((shortcut) => shortcut.title === "Calendário" || shortcut.title === "Nova Reserva")
      : allShortcuts;

  const hasUser = email.trim().length > 0;
  const headerStyle: React.CSSProperties = {
    background:
      "linear-gradient(90deg, rgba(14,116,144,0.70), rgba(14,165,233,0.62), rgba(56,189,248,0.64))",
    borderColor: "rgba(255,255,255,0.32)",
  };

  return (
    <div className="min-h-screen mutare-page-bg">
      <HomeTopButton />
      {needsLogin ? (
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="rounded-2xl border bg-white p-6">
            <h1 className="text-xl font-extrabold">Login necessário</h1>
            <p className="mt-2 text-sm text-slate-600">
              Faça login para acessar o portal.
            </p>
            <button
              type="button"
              className="mt-4 rounded-[26px_14px_30px_12px] bg-gradient-to-r from-emerald-500 to-sky-500 px-4 py-2 text-sm font-black text-white shadow-md"
              onClick={() => {
                setLoginMsg("");
                setLoginOpen(true);
              }}
            >
              Fazer login
            </button>
          </div>
        </div>
      ) : (
      <>
      <header className="relative overflow-hidden border-b" style={headerStyle}>
        <div className="pointer-events-none absolute -left-20 -top-24 h-44 w-44 rounded-full bg-white/20 blur-2xl" />
        <div className="pointer-events-none absolute -right-16 -bottom-20 h-40 w-40 rounded-full bg-cyan-200/30 blur-2xl" />
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-5">
          <div className="grid grid-cols-[1fr_auto] items-center gap-4 md:grid-cols-[1fr_74px]">
            <div className="flex flex-col items-start text-white">
              <Image
                src="/mutare-logo.png"
                alt="Logo Loop"
                width={140}
                height={64}
                className="mb-2 h-9 w-auto object-contain sm:h-10"
                priority
              />
              <p className="inline-flex items-center rounded-full border border-white/40 bg-white/15 px-3 py-1 text-[10px] font-black tracking-[0.14em] opacity-95 shadow-sm backdrop-blur-sm sm:px-4 sm:text-[11px] sm:tracking-[0.18em]">
                {APP_BRAND_NAME.toUpperCase()}
              </p>
            </div>
            <Link href="/portal" title="Voltar ao Portal" className="justify-self-end">
              <SchoolLogo size={48} className="rounded-xl bg-white/15 p-1 drop-shadow sm:h-14 sm:w-14" />
            </Link>
          </div>
          <div className="pointer-events-none mt-3 h-1.5 w-24 -rotate-1 rounded-full bg-white/35 blur-[1px] sm:w-32" />
          <div
            className={`mt-3 relative flex flex-col items-center gap-3 md:-mt-1 md:min-h-[42px] md:flex-row ${
              hasUser ? "md:justify-center" : "md:justify-start"
            }`}
          >
            <div className="flex items-center justify-center text-white">
              <p className="inline-flex max-w-full items-center rounded-full border border-white/45 bg-white/18 px-3 py-1.5 text-xs font-black shadow-sm backdrop-blur-sm sm:px-4 sm:text-sm">
                {hasUser ? (
                  <>
                    <span className="mr-2 grid h-10 w-10 place-items-center overflow-hidden rounded-full border border-white/40 bg-white/25 text-sm font-black shadow-sm sm:h-12 sm:w-12">
                      {avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={avatarUrl} alt="Foto do perfil" className="h-full w-full object-cover" />
                      ) : (
                        <span>{(userName || "U").charAt(0).toUpperCase()}</span>
                      )}
                    </span>
                    <span className="mr-1 whitespace-nowrap">Bem-vindo(a),</span>
                    <span className="max-w-[190px] truncate sm:max-w-[260px] md:max-w-[320px]">{userName || "Usuário"}</span>
                  </>
                ) : (
                  <span className="whitespace-nowrap">Acesse o sistema</span>
                )}
              </p>
            </div>
            <div className="inline-flex items-center justify-center rounded-full border border-white/40 bg-white/18 px-3 py-1 text-[10px] font-black text-white/95 shadow-sm backdrop-blur-sm sm:text-[11px]">
              {selectedSchoolId ? "Escola atual definida" : "Escopo geral"}
            </div>
            <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:items-center sm:justify-center md:absolute md:right-0 md:top-1/2 md:-translate-y-1/2">
              <Link
                href="/calendar"
                className="inline-flex h-10 items-center justify-center rounded-xl bg-white px-3 py-2 text-xs font-black text-sky-800 shadow-sm hover:bg-sky-50"
              >
                Nova reserva
              </Link>
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  window.location.href = "/";
                }}
                className="h-10 rounded-xl border border-white/45 bg-white/10 px-3 py-2 text-xs font-black text-white hover:bg-white/20"
              >
                Sair
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
              {shortcuts.map((shortcut) => (
                <ShortcutCard key={shortcut.title} {...shortcut} />
              ))}
            </div>
          </div>
        </div>

        <footer className="mt-10 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} • {APP_BRAND_NAME} • Portal de Gestão
        </footer>
      </main>
      </>
      )}

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
                className="login-btn-fun rounded-[26px_14px_30px_12px] border border-slate-200 bg-white px-4 py-2 text-sm font-black shadow-sm"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleLogin}
                disabled={loginLoading}
                className="login-btn-fun rounded-[26px_14px_30px_12px] bg-gradient-to-r from-emerald-500 to-sky-500 px-4 py-2 text-sm font-black text-white shadow-lg"
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

function ShortcutCard({ title, description, href, icon, kind = "module" }: Shortcut) {
  const iconToneClass = "bg-sky-50 border-sky-200 text-sky-700";
  const cardAccentClass = "hover:border-sky-300";

  const content = (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-start gap-3">
        <div className={`grid h-11 w-11 place-items-center rounded-xl border ${iconToneClass}`}>{icon}</div>
      </div>
      <div className="min-w-0">
        <p className="text-sm font-black text-slate-900">{title}</p>
        <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-600">{description}</p>
        <p className="mt-3 text-xs font-black text-slate-500">
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
        className={`group rounded-2xl border border-sky-200 bg-sky-50 p-5 shadow-[0_8px_22px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-1 hover:bg-sky-100 hover:shadow-[0_18px_36px_rgba(15,23,42,0.14)] ${cardAccentClass}`}
      >
        {content}
      </a>
    );
  }

  return (
    <Link
      href={href}
      className={`group rounded-2xl border border-sky-200 bg-sky-50 p-5 shadow-[0_8px_22px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-1 hover:bg-sky-100 hover:shadow-[0_18px_36px_rgba(15,23,42,0.14)] ${cardAccentClass}`}
    >
      {content}
    </Link>
  );
}

/* ÍCONES (SVG simples, leves e profissionais) */
function IconGrid() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M4 4h7v7H4V4ZM13 4h7v7h-7V4ZM4 13h7v7H4v-7ZM13 13h7v7h-7v-7Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
    </svg>
  );
}
function IconPlus() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}
function IconDoc() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
      <path d="M14 3v5h5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
      <path d="M8 13h8M8 17h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}
function IconUsers() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M9.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

function IconTeacher() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M3 7l9-4 9 4-9 4-9-4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M7 10v4c0 1.66 2.24 3 5 3s5-1.34 5-3v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M21 9v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
