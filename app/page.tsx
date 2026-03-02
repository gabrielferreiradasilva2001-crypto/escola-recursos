"use client";

import { useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export default function Home() {
  useEffect(() => {
    // Acesso público: login só é necessário para admin na tela Usuários
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        window.location.href = "/portal";
        return;
      }
      window.location.href = "/portal";
    });
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="rounded-2xl border p-6">Carregando...</div>
    </main>
  );
}
