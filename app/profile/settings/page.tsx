"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import HomeTopButton from "../../components/HomeTopButton";
import { supabase } from "../../../lib/supabaseClient";

type Toast = { type: "ok" | "err"; text: string } | null;
type Prefs = { emailNotifications: boolean };
const PREFS_KEY = "mutare_user_prefs_v1";

function readPrefs(): Prefs {
  if (typeof window === "undefined") return { emailNotifications: true };
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return { emailNotifications: true };
    const parsed = JSON.parse(raw) as Partial<Prefs>;
    return { emailNotifications: parsed.emailNotifications !== false };
  } catch {
    return { emailNotifications: true };
  }
}

export default function UserSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [prefs, setPrefs] = useState<Prefs>({ emailNotifications: true });
  const [saving, setSaving] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [toast, setToast] = useState<Toast>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user ?? null;
      if (!user) {
        window.location.href = "/portal";
        return;
      }
      const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
      setName(String(metadata.full_name ?? metadata.name ?? "").trim());
      setEmail(user.email ?? "");
      setAvatarUrl(String(metadata.avatar_url ?? "").trim());
      setPrefs(readPrefs());
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(t);
  }, [toast]);

  async function saveAccount() {
    setSaving(true);
    try {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) {
        setToast({ type: "err", text: "Sessão expirada. Faça login novamente." });
        setSaving(false);
        return;
      }

      const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
      const payload: { data?: Record<string, unknown>; email?: string; password?: string } = {
        data: { ...metadata, full_name: name.trim() },
      };
      const nextEmail = email.trim().toLowerCase();
      if (nextEmail && nextEmail !== (user.email ?? "").toLowerCase()) {
        payload.email = nextEmail;
      }
      if (newPassword.trim()) {
        if (newPassword.trim().length < 6) {
          setToast({ type: "err", text: "A senha precisa ter pelo menos 6 caracteres." });
          setSaving(false);
          return;
        }
        payload.password = newPassword.trim();
      }

      const { error } = await supabase.auth.updateUser(payload);
      if (error) {
        setToast({ type: "err", text: error.message });
      } else {
        setNewPassword("");
        setToast({ type: "ok", text: "Dados atualizados com sucesso." });
      }
    } catch {
      setToast({ type: "err", text: "Não foi possível salvar agora." });
    } finally {
      setSaving(false);
    }
  }

  async function savePreferences() {
    setSavingPrefs(true);
    try {
      window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (user) {
        const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
        await supabase.auth.updateUser({
          data: { ...metadata, email_notifications: prefs.emailNotifications },
        });
      }
      setToast({ type: "ok", text: "Preferências salvas." });
    } catch {
      setToast({ type: "err", text: "Erro ao salvar preferências." });
    } finally {
      setSavingPrefs(false);
    }
  }

  async function signOutAll() {
    try {
      await supabase.auth.signOut({ scope: "global" });
      window.location.href = "/";
    } catch {
      setToast({ type: "err", text: "Não foi possível encerrar todas as sessões." });
    }
  }

  async function uploadAvatar() {
    if (!avatarFile) {
      setToast({ type: "err", text: "Selecione uma foto antes de enviar." });
      return;
    }
    if (!avatarFile.type.startsWith("image/")) {
      setToast({ type: "err", text: "Arquivo inválido. Use uma imagem." });
      return;
    }
    setUploadingAvatar(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token ?? "";
      if (!token) {
        setToast({ type: "err", text: "Sessão expirada. Faça login novamente." });
        setUploadingAvatar(false);
        return;
      }

      const form = new FormData();
      form.append("file", avatarFile);
      const res = await fetch("/api/profile/avatar", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const payload = (await res.json().catch(() => ({}))) as { avatarUrl?: string; error?: string };
      if (!res.ok) {
        setToast({ type: "err", text: payload.error || "Não foi possível enviar a foto." });
        return;
      }

      const nextAvatar = String(payload.avatarUrl ?? "").trim();
      setAvatarUrl(nextAvatar);
      setAvatarFile(null);
      setToast({ type: "ok", text: "Foto de perfil atualizada." });
      await supabase.auth.refreshSession();
    } catch {
      setToast({ type: "err", text: "Falha no upload da foto." });
    } finally {
      setUploadingAvatar(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen mutare-page-bg p-6 text-slate-900">
        <HomeTopButton />
        <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-slate-50/90 p-6 shadow-sm">
          Carregando configurações...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen mutare-page-bg p-6 text-slate-900">
      <HomeTopButton />
      {toast ? (
        <div
          className={`fixed right-6 top-6 z-[9998] rounded-2xl border px-4 py-3 text-sm font-black shadow-lg ${
            toast.type === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {toast.text}
        </div>
      ) : null}

      <div className="mx-auto max-w-3xl space-y-4">
        <div className="rounded-3xl border border-slate-200 bg-slate-50/95 p-5 shadow-[0_14px_35px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h1 className="text-xl font-black">Configurações do usuário</h1>
              <p className="mt-1 text-sm font-semibold text-slate-600">Atualize seus dados e preferências.</p>
            </div>
            <Link
              href="/portal"
              className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"
            >
              Voltar
            </Link>
          </div>
        </div>

        <section className="rounded-3xl border border-slate-200 bg-slate-50/95 p-5 shadow-[0_14px_35px_rgba(15,23,42,0.08)] backdrop-blur">
          <h2 className="text-sm font-black text-slate-900">Foto de perfil</h2>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-lg font-black text-slate-600">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="Foto de perfil" className="h-full w-full object-cover" />
                ) : (
                  <span>{(name || email || "U").trim().charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className="text-xs font-semibold text-slate-600">
                JPG, PNG ou WEBP. Tamanho máximo de 4MB.
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex cursor-pointer items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50">
                Escolher foto
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
                />
              </label>
              <button
                type="button"
                onClick={() => void uploadAvatar()}
                disabled={uploadingAvatar || !avatarFile}
                className="rounded-xl bg-sky-600 px-4 py-2 text-xs font-black text-white hover:bg-sky-700 disabled:opacity-60"
              >
                {uploadingAvatar ? "Enviando..." : "Salvar foto"}
              </button>
            </div>
          </div>
          {avatarFile ? (
            <p className="mt-2 text-xs font-semibold text-slate-500">Arquivo selecionado: {avatarFile.name}</p>
          ) : null}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-slate-50/95 p-5 shadow-[0_14px_35px_rgba(15,23,42,0.08)] backdrop-blur">
          <h2 className="text-sm font-black text-slate-900">Dados da conta</h2>
          <div className="mt-3 grid gap-3">
            <label className="grid gap-1 text-xs font-bold text-slate-700">
              Nome
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-sky-300"
              />
            </label>
            <label className="grid gap-1 text-xs font-bold text-slate-700">
              E-mail
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-sky-300"
              />
            </label>
            <label className="grid gap-1 text-xs font-bold text-slate-700">
              Nova senha (opcional)
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-sky-300"
              />
            </label>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => void saveAccount()}
              disabled={saving}
              className="rounded-xl bg-sky-600 px-4 py-2 text-xs font-black text-white hover:bg-sky-700 disabled:opacity-60"
            >
              {saving ? "Salvando..." : "Salvar dados"}
            </button>
          </div>
        </section>

        <section className="rounded-3xl border border-amber-200 bg-slate-50/95 p-5 shadow-[0_14px_35px_rgba(15,23,42,0.08)] backdrop-blur">
          <h2 className="text-sm font-black text-amber-800">Recuperação de acesso</h2>
          <div className="mt-3 space-y-2 text-xs font-semibold text-slate-700">
            <p>Esqueceu a senha? Use o link oficial de redefinição.</p>
            <Link
              href="/auth/reset-request"
              className="inline-flex items-center rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 font-black text-amber-800 hover:bg-amber-100"
            >
              Redefinir minha senha
            </Link>
            <p className="text-slate-500">
              Para segurança, a recuperação sem e-mail não é automática.
            </p>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-slate-50/95 p-5 shadow-[0_14px_35px_rgba(15,23,42,0.08)] backdrop-blur">
          <h2 className="text-sm font-black text-slate-900">Preferências</h2>
          <label className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-bold text-slate-800">
            Receber notificações por e-mail
            <input
              type="checkbox"
              checked={prefs.emailNotifications}
              onChange={(e) => setPrefs((prev) => ({ ...prev, emailNotifications: e.target.checked }))}
              className="h-4 w-4"
            />
          </label>
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => void savePreferences()}
              disabled={savingPrefs}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {savingPrefs ? "Salvando..." : "Salvar preferências"}
            </button>
          </div>
        </section>

        <section className="rounded-3xl border border-rose-200 bg-slate-50/95 p-5 shadow-[0_14px_35px_rgba(15,23,42,0.08)] backdrop-blur">
          <h2 className="text-sm font-black text-rose-800">Segurança</h2>
          <p className="mt-1 text-xs font-semibold text-slate-600">Encerrar sessões em outros dispositivos.</p>
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => void signOutAll()}
              className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-black text-rose-700 hover:bg-rose-100"
            >
              Sair de todos os dispositivos
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
