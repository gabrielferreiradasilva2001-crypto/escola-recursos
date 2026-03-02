"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "../../../lib/supabaseClient";

export default function ResetRequestPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);

  async function handleSend() {
    const nextEmail = email.trim().toLowerCase();
    if (!nextEmail || !nextEmail.includes("@")) {
      setMsg("Informe um e-mail válido.");
      setOk(false);
      return;
    }
    setLoading(true);
    setMsg("");
    setOk(false);
    try {
      const redirectTo = `${window.location.origin}/auth/reset`;
      const { error } = await supabase.auth.resetPasswordForEmail(nextEmail, { redirectTo });
      if (error) {
        setMsg("Não foi possível enviar o e-mail de recuperação.");
        setOk(false);
      } else {
        setMsg("Se o e-mail existir no sistema, enviaremos o link de redefinição.");
        setOk(true);
      }
    } catch {
      setMsg("Falha ao solicitar recuperação.");
      setOk(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen mutare-page-bg p-6 text-slate-900">
      <div className="mx-auto max-w-lg rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-[0_18px_44px_rgba(15,23,42,0.12)]">
        <h1 className="text-xl font-black">Recuperar senha</h1>
        <p className="mt-2 text-sm font-semibold text-slate-600">
          Digite seu e-mail para receber o link de redefinição.
        </p>

        <label className="mt-4 grid gap-1 text-xs font-bold text-slate-700">
          E-mail
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-sky-300"
            placeholder="voce@escola.com"
          />
        </label>

        {msg ? (
          <p className={`mt-3 text-xs font-black ${ok ? "text-emerald-700" : "text-rose-700"}`}>{msg}</p>
        ) : null}

        <div className="mt-4 flex items-center justify-between gap-2">
          <Link
            href="/portal"
            className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"
          >
            Voltar
          </Link>
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={loading}
            className="rounded-xl bg-sky-600 px-4 py-2 text-xs font-black text-white hover:bg-sky-700 disabled:opacity-60"
          >
            {loading ? "Enviando..." : "Enviar link"}
          </button>
        </div>
      </div>
    </main>
  );
}
