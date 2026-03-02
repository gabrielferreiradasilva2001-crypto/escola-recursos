"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../lib/supabaseClient";
import SchoolLogo from "../../components/SchoolLogo";

export default function FirstLoginPage() {
  const [ready, setReady] = useState(false);
  const [msg, setMsg] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user ?? null;
      if (!user) {
        window.location.href = "/portal";
        return;
      }
      if (!user.user_metadata?.force_password_change) {
        window.location.href = "/portal";
        return;
      }
      const metaName = String(user.user_metadata?.name ?? "").trim();
      const fallback = user.email?.split("@")[0] ?? "";
      setUserName(metaName || fallback || "professor(a)");
      setReady(true);
    })();
  }, []);

  async function handleUpdate() {
    if (!password || password.length < 8) {
      setMsg("Senha deve ter pelo menos 8 caracteres.");
      return;
    }
    setSaving(true);
    setMsg("");
    const { error } = await supabase.auth.updateUser({
      password,
      data: { force_password_change: false },
    });
    if (error) {
      setMsg("Não foi possível atualizar a senha.");
      setSaving(false);
      return;
    }
    setSaving(false);
    setMsg("Senha atualizada. Redirecionando...");
    setPassword("");
    setTimeout(() => {
      window.location.href = "/portal";
    }, 1200);
  }

  async function handleExit() {
    await supabase.auth.signOut({ scope: "local" });
    window.location.href = "/";
  }

  return (
    <main className="relative min-h-screen bg-gradient-to-b from-emerald-50 via-sky-50 to-white text-slate-900">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full bg-emerald-200/40 blur-3xl" />
        <div className="absolute top-24 -right-24 h-96 w-96 rounded-full bg-sky-200/45 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-emerald-100/55 blur-3xl" />
      </div>

      <div className="mx-auto flex min-h-screen w-full max-w-2xl items-center px-4 py-10">
        <div className="w-full rounded-3xl border border-slate-200/70 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.18)] backdrop-blur sm:p-8">
          <div className="flex items-center gap-3">
            <Link
              href="/portal"
              title="Voltar ao Portal"
              className="grid h-12 w-12 place-items-center rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:bg-slate-50"
            >
              <SchoolLogo size={32} className="h-8 w-8 object-contain" />
            </Link>
            <div>
              <div className="text-xs font-extrabold text-slate-500">Primeiro acesso</div>
              <h1 className="text-2xl font-black">
                Bem-vindo(a), {userName}
              </h1>
              <p className="mt-1 text-xs font-bold text-slate-500">
                Defina uma senha para continuar.
              </p>
            </div>
          </div>

          {msg ? (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-extrabold text-red-700">
              {msg}
            </div>
          ) : null}

          {ready ? (
            <div className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-extrabold text-slate-500">Nova senha</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite a nova senha"
                  className="mt-1 h-12 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-extrabold outline-none transition-all duration-200 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-200/40"
                />
                <div className="mt-2 text-[11px] font-bold text-slate-500">
                  Mínimo de 8 caracteres.
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleExit}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-extrabold text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-[1px] hover:shadow-md active:scale-[0.99]"
                >
                  Sair
                </button>
                <button
                  type="button"
                  onClick={handleUpdate}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-[26px_14px_30px_12px] bg-gradient-to-r from-emerald-500 to-sky-500 px-4 py-2 text-sm font-black text-white shadow-lg shadow-emerald-500/20 transition-all duration-200 hover:-translate-y-[2px] hover:-rotate-2 hover:shadow-xl active:scale-[0.99] disabled:opacity-60"
                >
                  {saving ? "Salvando..." : "Atualizar senha"}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
