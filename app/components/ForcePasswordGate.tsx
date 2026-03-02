"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { supabase } from "../../lib/supabaseClient";

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

function isPublicAuthPath(pathname: string) {
  return pathname === "/auth/reset" || pathname === "/auth/reset-request";
}

export default function ForcePasswordGate() {
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const [locked, setLocked] = useState(false);
  const [loginUser, setLoginUser] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginMsg, setLoginMsg] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const shouldBypass = useMemo(() => isPublicAuthPath(pathname || ""), [pathname]);

  useEffect(() => {
    if (shouldBypass) {
      setLocked(false);
      setChecking(false);
      return;
    }

    let mounted = true;
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user ?? null;
      if (!mounted) return;

      if (user?.user_metadata?.force_password_change && window.location.pathname !== "/auth/first-login") {
        window.location.href = "/auth/first-login";
        return;
      }

      setLocked(!user);
      setChecking(false);
    };
    check();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null;
      if (user?.user_metadata?.force_password_change && window.location.pathname !== "/auth/first-login") {
        window.location.href = "/auth/first-login";
        return;
      }

      setLocked(!user);
      setChecking(false);
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [shouldBypass]);

  useEffect(() => {
    if (shouldBypass || !locked) {
      document.body.style.overflow = "";
      return;
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [locked, shouldBypass]);

  useEffect(() => {
    if (shouldBypass || !locked || typeof document === "undefined") return;

    const exitIfFullscreen = () => {
      if (document.fullscreenElement) {
        void document.exitFullscreen().catch(() => {});
      }
    };

    exitIfFullscreen();
    document.addEventListener("fullscreenchange", exitIfFullscreen);
    return () => {
      document.removeEventListener("fullscreenchange", exitIfFullscreen);
    };
  }, [locked, shouldBypass]);

  async function handleLogin() {
    setLoginMsg("");
    const rawLogin = loginUser.trim();
    const email = rawLogin.includes("@") ? rawLogin.toLowerCase() : `${normalizeUsername(rawLogin)}@local.eeav`;
    if (!email || email.startsWith("@") || !loginPassword.trim()) {
      setLoginMsg("Informe usuário e senha.");
      return;
    }

    setLoginLoading(true);
    try {
      const { data: signInData, error } = await supabase.auth.signInWithPassword({
        email,
        password: loginPassword,
      });
      if (error) throw error;

      if (signInData.session?.user?.user_metadata?.force_password_change) {
        window.location.href = "/auth/first-login";
        return;
      }

      setLocked(false);
      setLoginPassword("");
      setShowPassword(false);
      setLoginMsg("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Falha no login.";
      setLoginMsg(message || "Falha no login.");
    } finally {
      setLoginLoading(false);
    }
  }

  if (shouldBypass || (!checking && !locked)) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Login obrigatório"
      className="fixed inset-0 z-[99999] grid place-items-center bg-emerald-950/45 p-4 backdrop-blur-md"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-emerald-300/35 blur-3xl" />
        <div className="absolute -right-24 top-8 h-96 w-96 rounded-full bg-teal-300/30 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-emerald-200/30 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-emerald-100/90 bg-white/88 p-5 shadow-[0_30px_80px_rgba(4,120,87,0.35)] backdrop-blur-xl sm:p-6">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-emerald-50 via-white to-teal-50" />
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 via-teal-400 to-sky-400" />

        <div className="mb-4 flex flex-col items-center gap-3 text-center">
          <Image
            src="/favicon-loop.png"
            alt="Logo do sistema"
            width={58}
            height={58}
            className="h-14 w-14 rounded-2xl border border-emerald-100 bg-white p-1.5 shadow-md"
          />
          <h2 className="text-2xl font-black tracking-tight text-slate-900">Bem vindo(a)! Faça login para continuar.</h2>
        </div>

        <label className="mb-3 block">
          <div className="mb-1 text-xs font-extrabold text-slate-600">Usuário ou e-mail</div>
          <input
            value={loginUser}
            onChange={(e) => setLoginUser(e.target.value)}
            autoComplete="username"
            placeholder="nome.sobrenome ou email@escola.com"
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-extrabold text-slate-800 outline-none transition-all duration-200 focus:border-sky-300 focus:ring-4 focus:ring-sky-200/40"
          />
        </label>

        <label className="block">
          <div className="mb-1 text-xs font-extrabold text-slate-600">Senha</div>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              autoComplete="current-password"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !loginLoading) {
                  void handleLogin();
                }
              }}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 pr-20 text-sm font-extrabold text-slate-800 outline-none transition-all duration-200 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-200/40"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              title={showPassword ? "Ocultar senha" : "Mostrar senha"}
              className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 transition-all duration-200 hover:bg-slate-100"
            >
              {showPassword ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                  <circle cx="12" cy="12" r="2.8" stroke="currentColor" strokeWidth="1.8" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                  <circle cx="12" cy="12" r="2.8" stroke="currentColor" strokeWidth="1.8" />
                  <path d="m4 4 16 16" stroke="currentColor" strokeWidth="1.8" />
                </svg>
              )}
            </button>
          </div>
        </label>

        <div className="mt-2 flex justify-end">
          <a
            href="/auth/reset-request"
            className="text-xs font-extrabold text-sky-700 underline decoration-sky-300 underline-offset-2 hover:text-sky-800"
          >
            Esqueci minha senha
          </a>
        </div>

        {loginMsg ? (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-2 text-sm font-extrabold text-red-700">
            {loginMsg}
          </div>
        ) : null}

        <div className="mt-4">
          <button
            type="button"
            onClick={() => void handleLogin()}
            disabled={loginLoading}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[28px_14px_30px_12px] bg-gradient-to-r from-emerald-500 to-sky-500 text-sm font-black text-white shadow-lg shadow-emerald-500/20 transition-all duration-200 hover:-translate-y-[1px] hover:shadow-xl active:scale-[0.99] disabled:cursor-wait disabled:opacity-70"
          >
            {loginLoading ? "Entrando..." : "Entrar"}
          </button>
        </div>
      </div>
    </div>
  );
}
