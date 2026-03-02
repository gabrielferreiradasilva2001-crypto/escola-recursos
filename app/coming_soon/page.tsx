"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";

export default function ComingSoonPage() {
  const [feature, setFeature] = useState<string>("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        window.location.href = "/";
        return;
      }
      if (data.session.user?.user_metadata?.force_password_change) {
        window.location.href = "/auth/first-login";
        return;
      }

      const params = new URLSearchParams(window.location.search);
      setFeature(params.get("f") ?? "");
    })();
  }, []);

  const titleMap: Record<string, string> = {
    chamados: "Chamados (TI / Manutenção)",
    impressao: "Solicitar Impressões",
    salas: "Solicitar Sala / Espaço",
    documentos: "Documentos e Formulários",
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-2xl border p-6 shadow-sm">
        <h1 className="text-2xl font-bold">Em breve</h1>
        <p className="text-sm text-gray-600 mt-2">
          {titleMap[feature] ?? "Este módulo"} ainda está em construção.
        </p>

        <div className="mt-6 flex gap-3">
          <Link
            href="/portal"
            className="rounded-xl bg-black text-white px-4 py-2"
          >
            Voltar ao Portal
          </Link>

          <Link href="/calendar" className="rounded-xl border px-4 py-2">
            Ir para Reservas
          </Link>
        </div>
      </div>
    </main>
  );
}
