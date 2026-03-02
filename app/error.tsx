"use client";

import { useEffect } from "react";
import { reportClientError } from "../lib/monitoring";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    void reportClientError({
      message: error.message || "App route error",
      stack: error.stack,
      source: "app/error.tsx",
      pathname: typeof window !== "undefined" ? window.location.pathname : "",
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      context: { digest: error.digest ?? "" },
    });
  }, [error]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 p-6 text-slate-900">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-black">Ocorreu um erro inesperado</h2>
        <p className="mt-2 text-sm font-semibold text-slate-600">
          Tente novamente. Se persistir, informe a equipe de gestão.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-gradient-to-r from-emerald-500 to-sky-500 px-4 text-sm font-black text-white"
        >
          Tentar novamente
        </button>
      </div>
    </main>
  );
}

