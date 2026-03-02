"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";

export default function ResetPasswordPage() {
  const [ready, setReady] = useState(false);
  const [msg, setMsg] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    if (!hash) {
      queueMicrotask(() => {
        setMsg("Abra este link a partir do email de recuperação.");
        setReady(true);
      });
      return;
    }

    const params = new URLSearchParams(hash.replace(/^#/, ""));
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const type = params.get("type");

    if (!accessToken || !refreshToken || type !== "recovery") {
      queueMicrotask(() => {
        setMsg("Link inválido ou expirado.");
        setReady(true);
      });
      return;
    }

    supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => {
        if (error) {
          setMsg("Link inválido ou expirado.");
        } else {
          setMsg("");
        }
      })
      .finally(() => {
        setReady(true);
      });
  }, []);

  async function handleUpdate() {
    if (!password || password.length < 6) {
      setMsg("Senha deve ter pelo menos 6 caracteres.");
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
      window.location.href = "/";
    }, 1200);
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: 20,
        backgroundImage:
          "linear-gradient(180deg, rgba(241,245,249,1), rgba(226,232,240,1)), url(\"/bg-escola.png\")",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
        color: "#0f172a",
        fontFamily:
          '"IBM Plex Sans", "Inter", "Plus Jakarta Sans", ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial',
      }}
    >
      <div
        style={{
          maxWidth: 520,
          margin: "0 auto",
          background: "rgba(255,255,255,0.94)",
          border: "1px solid rgba(15,23,42,0.10)",
          borderRadius: 18,
          padding: 18,
          boxShadow: "0 18px 44px rgba(15,23,42,0.12)",
          display: "grid",
          gap: 12,
        }}
      >
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 1000 }}>Redefinir senha</h1>

        {msg ? (
          <div style={{ fontSize: 12, fontWeight: 900, color: "#b91c1c" }}>{msg}</div>
        ) : null}

        {!ready ? (
          <div style={{ fontSize: 12, fontWeight: 900, color: "#64748b" }}>
            Validando link...
          </div>
        ) : null}

        {ready && !msg ? (
          <>
            <div style={{ fontSize: 12, fontWeight: 900, color: "#64748b" }}>Nova senha</div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite a nova senha"
              style={{
                width: "100%",
                height: 44,
                borderRadius: 12,
                border: "1px solid rgba(15,23,42,0.12)",
                padding: "0 12px",
                fontWeight: 900,
                background: "rgba(255,255,255,0.95)",
              }}
            />
            <button
              type="button"
              onClick={handleUpdate}
              disabled={saving}
              style={{
                height: 42,
                padding: "0 12px",
                borderRadius: 10,
                border: "1px solid rgba(16,185,129,0.35)",
                background: "linear-gradient(135deg, rgba(16,185,129,0.95), rgba(22,163,74,0.92))",
                color: "white",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              {saving ? "Salvando..." : "Atualizar senha"}
            </button>
          </>
        ) : null}
      </div>
    </main>
  );
}
