"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function BackgroundCustomizer() {
  const [open, setOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const body = document.body;
    body.classList.remove("mutare-dark");
    body.classList.remove("mutare-high-contrast");
    body.classList.remove("mutare-large-text");
    body.classList.remove("mutare-reduced-motion");
  }, []);

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      setIsLoggedIn(Boolean(data.session?.user));
    };
    void check();
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Abrir configurações"
        className="fixed bottom-6 right-6 z-40 grid h-11 w-11 place-items-center rounded-full border border-slate-300 bg-white/95 text-slate-800 shadow-lg ring-2 ring-white/70 backdrop-blur hover:bg-white"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z" stroke="currentColor" strokeWidth="1.8" />
          <path
            d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a1.2 1.2 0 0 1 0 1.7l-1.6 1.6a1.2 1.2 0 0 1-1.7 0l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9v.3a1.2 1.2 0 0 1-1.2 1.2h-2.2a1.2 1.2 0 0 1-1.2-1.2V20a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a1.2 1.2 0 0 1-1.7 0l-1.6-1.6a1.2 1.2 0 0 1 0-1.7l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H3.8a1.2 1.2 0 0 1-1.2-1.2v-2.2a1.2 1.2 0 0 1 1.2-1.2H4a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a1.2 1.2 0 0 1 0-1.7l1.6-1.6a1.2 1.2 0 0 1 1.7 0l.1.1a1 1 0 0 0 1.1.2H9a1 1 0 0 0 .6-.9V3.8a1.2 1.2 0 0 1 1.2-1.2h2.2a1.2 1.2 0 0 1 1.2 1.2V4a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a1.2 1.2 0 0 1 1.7 0l1.6 1.6a1.2 1.2 0 0 1 0 1.7l-.1.1a1 1 0 0 0-.2 1.1v.1a1 1 0 0 0 .9.6h.3a1.2 1.2 0 0 1 1.2 1.2v2.2a1.2 1.2 0 0 1-1.2 1.2H20a1 1 0 0 0-.6.1Z"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open ? (
        <div className="fixed bottom-20 right-6 z-40 w-[min(94vw,360px)] rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_20px_40px_rgba(15,23,42,0.18)]">
          <div className="text-sm font-black text-slate-900">Configurações</div>
          <p className="mt-1 text-xs font-semibold text-slate-500">Acesse suas opções de conta.</p>

          <div className="mt-3 grid gap-2">
            <Link
              href="/profile/settings"
              onClick={() => setOpen(false)}
              className="inline-flex items-center justify-center rounded-xl bg-sky-600 px-3 py-2 text-xs font-black text-white hover:bg-sky-700"
            >
              Abrir configurações do usuário
            </Link>
            <button
              type="button"
              onClick={async () => {
                await supabase.auth.signOut({ scope: "local" });
                window.location.href = "/";
              }}
              disabled={!isLoggedIn}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Sair da conta
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
