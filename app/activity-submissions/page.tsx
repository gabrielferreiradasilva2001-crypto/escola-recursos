"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";
import ProfessorHeader from "../components/ProfessorHeader";
import HomeTopButton from "../components/HomeTopButton";

type SubmissionPhoto = {
  id: string;
  batch_id: string;
  created_at: string;
  created_by_name: string;
  location: string | null;
  description: string;
  status: "pending" | "published" | "rejected";
  review_note: string | null;
  photo_name: string;
  url: string;
};

type GroupedSubmission = {
  batchId: string;
  createdAt: string;
  createdByName: string;
  location: string | null;
  description: string;
  status: "pending" | "published" | "rejected";
  reviewNote: string | null;
  photos: SubmissionPhoto[];
};

type SchoolOption = {
  id: string;
  name: string;
  active?: boolean;
};

const LEGACY_LOCATIONS = ["EEAV - Sede", "EEAV - Extensão"] as const;
const DRAFT_KEY = "mutare_teacher_publication_draft_v1";

function resolveTeacherName(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
} | null) {
  if (!user) return "";
  const byName = String(user.user_metadata?.name ?? "").trim();
  if (byName) return byName;
  const byUsername = String(user.user_metadata?.username ?? "").trim();
  if (byUsername) return byUsername.replace(/\./g, " ");
  const mail = String(user.email ?? "").trim();
  if (!mail) return "";
  return mail.endsWith("@local.eeav") ? mail.replace("@local.eeav", "") : mail;
}

export default function ActivitySubmissionsPage() {
  const [authChecking, setAuthChecking] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [teacherName, setTeacherName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [teacherAvatarUrl, setTeacherAvatarUrl] = useState("");
  const [description, setDescription] = useState("");
  const [activityLocation, setActivityLocation] = useState("EEAV - Sede");
  const [schoolOptions, setSchoolOptions] = useState<SchoolOption[]>([]);
  const [schoolsLoading, setSchoolsLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [rows, setRows] = useState<SubmissionPhoto[]>([]);
  const [selectedPreviewUrls, setSelectedPreviewUrls] = useState<string[]>([]);
  const [activePreviewIndex, setActivePreviewIndex] = useState<number | null>(null);
  const [activeSubmissionBatchId, setActiveSubmissionBatchId] = useState<string | null>(null);
  const [deletingBatchId, setDeletingBatchId] = useState("");
  const [showAllSubmissions, setShowAllSubmissions] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [toast, setToast] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    let active = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      const session = data.session;
      const user = session?.user ?? null;

      if (!user) {
        setIsLoggedIn(false);
        setTeacherName("");
        setAuthEmail("");
        setTeacherAvatarUrl("");
        setAuthChecking(false);
        return;
      }

      if (user.user_metadata?.force_password_change) {
        window.location.href = "/auth/first-login";
        return;
      }

      setIsLoggedIn(true);
      setTeacherName(resolveTeacherName(user));
      setAuthEmail(user.email ?? "");
      setTeacherAvatarUrl(String(user.user_metadata?.avatar_url ?? "").trim());
      await loadSubmissions(session?.access_token ?? "");
      await loadSchools(session?.access_token ?? "");
      if (!active) return;
      setAuthChecking(false);
    })();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user ?? null;
      if (!user) {
        setIsLoggedIn(false);
        setTeacherName("");
        setAuthEmail("");
        setTeacherAvatarUrl("");
        setRows([]);
        setAuthChecking(false);
        return;
      }
      if (user.user_metadata?.force_password_change) {
        window.location.href = "/auth/first-login";
        return;
      }
      setIsLoggedIn(true);
      setTeacherName(resolveTeacherName(user));
      setAuthEmail(user.email ?? "");
      setTeacherAvatarUrl(String(user.user_metadata?.avatar_url ?? "").trim());
      await loadSubmissions(session?.access_token ?? "");
      await loadSchools(session?.access_token ?? "");
      setAuthChecking(false);
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as { description?: string; activityLocation?: string };
      if (parsed.description) setDescription(String(parsed.description));
      if (parsed.activityLocation) setActivityLocation(String(parsed.activityLocation));
    } catch {
      // ignore invalid draft
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ description, activityLocation })
    );
  }, [description, activityLocation]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(t);
  }, [toast]);

  const grouped = useMemo(() => {
    const map = new Map<string, GroupedSubmission>();
    rows.forEach((row) => {
      const existing = map.get(row.batch_id);
      if (existing) {
        existing.photos.push(row);
        return;
      }
      map.set(row.batch_id, {
        batchId: row.batch_id,
        createdAt: row.created_at,
        createdByName: row.created_by_name,
        location: row.location,
        description: row.description,
        status: row.status,
        reviewNote: row.review_note,
        photos: [row],
      });
    });
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [rows]);

  const activeSubmission = useMemo(
    () => grouped.find((item) => item.batchId === activeSubmissionBatchId) ?? null,
    [grouped, activeSubmissionBatchId]
  );
  const visibleSubmissions = useMemo(
    () => (showAllSubmissions ? grouped : grouped.slice(0, 2)),
    [grouped, showAllSubmissions]
  );

  useEffect(() => {
    const urls = selectedFiles.map((file) => URL.createObjectURL(file));
    setSelectedPreviewUrls(urls);
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [selectedFiles]);

  function statusLabel(status: GroupedSubmission["status"]) {
    if (status === "published") return "Aprovado";
    if (status === "rejected") return "Recusado";
    return "Enviado • Em revisão";
  }

  function statusClasses(status: GroupedSubmission["status"]) {
    if (status === "published") return "border-emerald-200 bg-emerald-50 text-emerald-700";
    if (status === "rejected") return "border-rose-200 bg-rose-50 text-rose-700";
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  function formatDate(value: string) {
    const d = new Date(value);
    return d.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  async function getAccessToken() {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? "";
  }

  async function loadSchools(tokenFromCaller?: string) {
    const token = tokenFromCaller || (await getAccessToken());
    if (!token) {
      setSchoolOptions([]);
      return;
    }
    setSchoolsLoading(true);
    try {
      const res = await fetch("/api/schools/list", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Erro ao carregar escolas.");

      const rows = Array.isArray(data?.data) ? data.data : [];
      const normalized = rows
        .map((row) => ({
          id: String(row?.id ?? "").trim(),
          name: String(row?.name ?? "").trim(),
          active: Boolean(row?.active),
        }))
        .filter((row) => row.id && row.name && row.active !== false);

      setSchoolOptions(normalized);
    } catch {
      setSchoolOptions([]);
    } finally {
      setSchoolsLoading(false);
    }
  }

  async function loadSubmissions(tokenFromCaller?: string, options?: { preserveMessage?: boolean }) {
    const token = tokenFromCaller || (await getAccessToken());
    if (!token) {
      setRows([]);
      return;
    }

    setLoading(true);
    if (!options?.preserveMessage) {
      setMessage("");
    }
    try {
      const res = await fetch("/api/activity-submissions", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Erro ao carregar envios.");
      }
      setRows(Array.isArray(data?.data) ? data.data : []);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Erro ao carregar envios.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const options = schoolOptions.length ? schoolOptions.map((s) => s.name) : [...LEGACY_LOCATIONS];
    if (!options.includes(activityLocation)) {
      setActivityLocation(options[0] || "EEAV - Sede");
    }
  }, [schoolOptions, activityLocation]);

  async function submitPhotos() {
    setMessage("");

    if (!description.trim() || description.trim().length < 5) {
      setMessage("Descreva a atividade com pelo menos 5 caracteres.");
      return;
    }
    if (!selectedFiles.length) {
      setMessage("Selecione ao menos uma foto.");
      return;
    }

    const token = await getAccessToken();
    if (!token) {
      setMessage("Faça login para enviar fotos.");
      return;
    }

    setSubmitting(true);
    try {
      const form = new FormData();
      form.append("description", description.trim());
      form.append("location", activityLocation);
      selectedFiles.forEach((file) => form.append("photos", file));

      const res = await fetch("/api/activity-submissions", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Falha ao enviar atividade.");
      }

      setDescription("");
      setSelectedFiles([]);
      setActivePreviewIndex(null);
      if (inputRef.current) inputRef.current.value = "";
      const sentCount = Number(data?.count ?? 0);
      setMessage(
        `Obrigado, Prof(a)! Atividade enviada com ${sentCount} foto(s). A gestão já recebeu seu envio. Obrigado!`
      );
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(DRAFT_KEY);
      }
      setToast({ type: "ok", text: "Publicação enviada com sucesso." });
      await loadSubmissions(token, { preserveMessage: true });
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Falha ao enviar atividade.");
      setToast({ type: "err", text: "Não foi possível enviar a publicação." });
    } finally {
      setSubmitting(false);
    }
  }

  function removeSelectedFile(targetIndex: number) {
    setSelectedFiles((prev) => prev.filter((_, index) => index !== targetIndex));
    setActivePreviewIndex(null);
  }

  function clearSelectedFiles() {
    setSelectedFiles([]);
    setActivePreviewIndex(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function deleteMySubmission(batchId: string) {
    const ok = window.confirm("Excluir este envio? Esta ação não pode ser desfeita.");
    if (!ok) return;

    const token = await getAccessToken();
    if (!token) {
      setMessage("Faça login para continuar.");
      return;
    }

    setDeletingBatchId(batchId);
    setMessage("");
    try {
      const res = await fetch("/api/activity-submissions", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ batch_id: batchId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Erro ao excluir envio.");
      }
      if (activeSubmissionBatchId === batchId) {
        setActiveSubmissionBatchId(null);
      }
      setMessage("Envio excluído com sucesso.");
      setToast({ type: "ok", text: "Envio excluído com sucesso." });
      await loadSubmissions(token);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Erro ao excluir envio.");
      setToast({ type: "err", text: "Erro ao excluir envio." });
    } finally {
      setDeletingBatchId("");
    }
  }

  const isSuccessMessage = message.startsWith("Obrigado");
  const isNeutralMessage = message === "Envio excluído com sucesso.";
  const messageClasses = isSuccessMessage
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : isNeutralMessage
      ? "border-sky-200 bg-sky-50 text-sky-700"
      : "border-rose-200 bg-rose-50 text-rose-700";

  if (authChecking) {
    return (
      <main className="min-h-screen mutare-page-bg px-4 py-8 text-slate-900">
        <HomeTopButton />
        <div className="mx-auto max-w-6xl rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-[0_14px_35px_rgba(15,23,42,0.08)]">
          <p className="text-sm font-bold text-slate-600">Carregando sua sessão...</p>
        </div>
      </main>
    );
  }

  if (!isLoggedIn) {
    return (
      <main className="min-h-screen mutare-page-bg px-4 py-8 text-slate-900">
        <HomeTopButton />
        <div className="mx-auto max-w-6xl">
          <ProfessorHeader
            title="Publicações"
            subtitle="Envio de fotos para revisão"
            teacherName=""
            teacherEmail=""
            teacherAvatarUrl=""
            backHref="/portal"
            backLabel="Ir para o Portal"
          />

          <section className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-[0_14px_35px_rgba(15,23,42,0.08)]">
            <h2 className="text-2xl font-black">Faça login para enviar fotos</h2>
            <p className="mt-2 text-sm font-semibold text-slate-600">
              Essa área é exclusiva para professores autenticados.
            </p>
            <div className="mt-4">
              <Link
                href="/portal"
                className="inline-flex items-center rounded-xl bg-gradient-to-r from-emerald-500 to-sky-500 px-4 py-2 text-sm font-black text-white shadow-lg shadow-emerald-500/20 transition-all duration-200 hover:-translate-y-[1px] hover:shadow-xl"
              >
                Fazer login
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen mutare-page-bg px-4 py-8 text-slate-900">
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
      <div className="mx-auto max-w-6xl">
        <ProfessorHeader
          title="Publicações"
          subtitle="Envie as evidências da atividade para aprovação"
          teacherName={teacherName || "Professor(a)"}
          teacherEmail={authEmail}
          teacherAvatarUrl={teacherAvatarUrl}
          backHref="/teacher-space"
          backLabel="Espaço do Professor(a)"
          rightSlot={
            <button
              type="button"
              onClick={() => loadSubmissions()}
              disabled={loading}
              className="inline-flex items-center rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 transition-all duration-200 hover:bg-emerald-100 disabled:opacity-60"
            >
              {loading ? "Atualizando..." : "Atualizar"}
            </button>
          }
        />

        <section className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-[0_14px_35px_rgba(15,23,42,0.08)]">
          <div className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="mb-3 text-sm font-black text-slate-800">Nova publicação</div>
              <label className="text-xs font-black uppercase tracking-[0.05em] text-slate-700">Descrição da atividade</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex.: Aula prática de ciências sobre germinação com o 7º ano."
                className="mt-2 min-h-32 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
              />

              <label className="mt-4 block text-xs font-black uppercase tracking-[0.05em] text-slate-700">Escola</label>
              <select
                value={activityLocation}
                onChange={(e) => setActivityLocation(e.target.value)}
                className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
              >
                {(schoolOptions.length ? schoolOptions.map((s) => s.name) : [...LEGACY_LOCATIONS]).map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              {schoolsLoading ? (
                <div className="mt-2 text-[11px] font-bold text-slate-500">
                  Carregando escolas cadastradas...
                </div>
              ) : null}

              <label className="mt-4 block text-xs font-black uppercase tracking-[0.05em] text-slate-700">Fotos da atividade</label>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => setSelectedFiles(Array.from(e.target.files ?? []))}
                className="mt-2 w-full rounded-2xl border border-dashed border-slate-300 bg-white px-3 py-2 text-sm font-semibold"
              />

              <div className="mt-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600">
                {selectedFiles.length
                  ? `${selectedFiles.length} foto(s) selecionada(s)`
                  : "Nenhuma foto selecionada"}
              </div>
              <div className="mt-2 text-[11px] font-bold text-slate-500">
                Rascunho salvo automaticamente (descrição e escola).
              </div>

              {selectedFiles.length ? (
                <div className="mt-3">
                  <div className="mb-2 flex justify-between gap-2">
                    <span className="text-[11px] font-semibold text-slate-500">Galeria de pré-visualização</span>
                    <button
                      type="button"
                      onClick={clearSelectedFiles}
                      className="rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-[11px] font-black text-red-700 transition hover:bg-red-100"
                    >
                      Excluir todas
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                    {selectedFiles.map((file, index) => (
                      <div
                        key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
                        className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                      >
                        <button
                          type="button"
                          onClick={() => setActivePreviewIndex(index)}
                          className="relative block w-full"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={selectedPreviewUrls[index] || ""}
                            alt={file.name}
                            className="h-28 w-full object-cover transition duration-200 group-hover:scale-[1.03]"
                            loading="lazy"
                          />
                          <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900/60 to-transparent px-2 pb-1 pt-3 text-left text-[10px] font-black text-white opacity-0 transition group-hover:opacity-100">
                            Clique para ampliar
                          </span>
                        </button>
                        <div className="flex items-center justify-between gap-2 border-t border-slate-200 px-2 py-1.5">
                          <span className="max-w-[130px] truncate text-[11px] font-black text-slate-700">
                            {file.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeSelectedFile(index)}
                            className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-red-200 bg-red-50 text-[10px] text-red-700 hover:bg-red-100"
                            title="Excluir esta foto"
                            aria-label={`Excluir ${file.name}`}
                          >
                            X
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 text-[11px] font-semibold text-slate-500">
                    Clique em uma imagem para visualizar em tamanho maior.
                  </div>
                </div>
              ) : null}

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={submitPhotos}
                  disabled={submitting}
                  className="inline-flex rounded-2xl bg-gradient-to-r from-emerald-500 to-sky-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-emerald-500/20 disabled:opacity-60"
                >
                  {submitting ? "Enviando atividade..." : "Enviar atividade"}
                </button>
              </div>

              {message ? (
                <div className={`mt-4 rounded-2xl border px-3 py-2 text-sm font-bold ${messageClasses}`}>
                  {message}
                </div>
              ) : null}

              {activePreviewIndex !== null &&
              selectedPreviewUrls[activePreviewIndex] &&
              selectedFiles[activePreviewIndex] ? (
                <div
                  className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-sm"
                  onClick={() => setActivePreviewIndex(null)}
                >
                  <div
                    className="max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-white/15 bg-slate-900"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between border-b border-white/15 px-3 py-2">
                      <div className="max-w-[70%] truncate text-xs font-black text-slate-100">
                        {selectedFiles[activePreviewIndex].name}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => removeSelectedFile(activePreviewIndex)}
                          className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-black text-red-700 hover:bg-red-100"
                        >
                          Excluir
                        </button>
                        <button
                          type="button"
                          onClick={() => setActivePreviewIndex(null)}
                          className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-[11px] font-black text-slate-700 hover:bg-slate-50"
                        >
                          Fechar
                        </button>
                      </div>
                    </div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selectedPreviewUrls[activePreviewIndex]}
                      alt={selectedFiles[activePreviewIndex].name}
                      className="max-h-[82vh] w-full object-contain"
                    />
                  </div>
                </div>
              ) : null}
            </div>

            <aside className="space-y-4">
              <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-black text-slate-900">Resumo do envio</div>
                <div className="mt-3 rounded-xl border border-white bg-white px-3 py-2">
                  <div className="text-[11px] font-bold uppercase tracking-[0.05em] text-slate-500">Escola</div>
                  <div className="text-sm font-black text-slate-800">{activityLocation}</div>
                </div>
                <div className="mt-2 rounded-xl border border-white bg-white px-3 py-2">
                  <div className="text-[11px] font-bold uppercase tracking-[0.05em] text-slate-500">Fotos</div>
                  <div className="text-sm font-black text-slate-800">{selectedFiles.length} selecionada(s)</div>
                </div>
                <div className="mt-2 rounded-xl border border-white bg-white px-3 py-2">
                  <div className="text-[11px] font-bold uppercase tracking-[0.05em] text-slate-500">Descrição</div>
                  <div className="text-sm font-black text-slate-800">
                    {description.trim().length ? `${description.trim().length} caracteres` : "Ainda não preenchida"}
                  </div>
                </div>
              </article>

              <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-black text-slate-900">Boas práticas</div>
                <ul className="mt-2 space-y-2 text-xs font-semibold text-slate-600">
                  <li>Use fotos nítidas e sem dados sensíveis dos alunos.</li>
                  <li>Descreva o contexto pedagógico da atividade.</li>
                  <li>Agrupe fotos da mesma atividade no mesmo envio.</li>
                  <li>Após análise da gestão, o status será atualizado aqui.</li>
                </ul>
              </article>
            </aside>
          </div>
        </section>

        <section className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-[0_14px_35px_rgba(15,23,42,0.08)]">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-black">Meus envios</h2>
              <p className="mt-1 text-sm font-semibold text-slate-600">
                Acompanhe o status de cada atividade enviada.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-600">
              {visibleSubmissions.length} de {grouped.length} envio(s)
            </div>
          </div>
          <p className="sr-only">
            Acompanhe o status de cada atividade enviada.
          </p>

          {!grouped.length ? (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm font-bold text-slate-500">
              Nenhuma atividade enviada ainda.
            </div>
          ) : (
            <div className="mt-4 grid gap-4">
              {visibleSubmissions.map((item) => (
                <article
                  key={item.batchId}
                  className="rounded-2xl border border-slate-200 bg-gradient-to-r from-white to-slate-50 p-4 transition hover:border-slate-300"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-black text-slate-800">{formatDate(item.createdAt)}</div>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-black ${statusClasses(item.status)}`}
                    >
                      {statusLabel(item.status)}
                    </span>
                  </div>

                  <p className="mt-2 text-sm font-semibold text-slate-700">{item.description}</p>
                  <div className="mt-2 text-xs font-extrabold text-slate-500">
                    Unidade: {item.location || "Não informada"}
                  </div>

                  {item.reviewNote ? (
                    <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
                      Observação da gestão: {item.reviewNote}
                    </div>
                  ) : null}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <div className="text-xs font-extrabold text-slate-500">
                      {item.photos.length} foto(s) enviada(s)
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveSubmissionBatchId(item.batchId)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-100"
                    >
                      Ver envio
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteMySubmission(item.batchId)}
                      disabled={deletingBatchId === item.batchId}
                      className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-700 transition hover:bg-red-100 disabled:opacity-60"
                    >
                      {deletingBatchId === item.batchId ? "Excluindo..." : "Excluir envio"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}

          {grouped.length ? (
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAllSubmissions((prev) => !prev)}
                disabled={grouped.length <= 2}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {showAllSubmissions ? "Ver apenas os 2 últimos" : "Ver todos os envios"}
              </button>
            </div>
          ) : null}
        </section>

        {activeSubmission ? (
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-sm"
            onClick={() => setActiveSubmissionBatchId(null)}
          >
            <div
              className="max-h-[92vh] w-full max-w-5xl overflow-auto rounded-2xl border border-white/15 bg-white p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <div>
                  <div className="text-sm font-black text-slate-900">
                    Envio de {formatDate(activeSubmission.createdAt)}
                  </div>
                  <div className="text-xs font-bold text-slate-500">
                    {activeSubmission.photos.length} foto(s)
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSubmissionBatchId(null)}
                  className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-[11px] font-black text-slate-700 hover:bg-slate-50"
                >
                  Fechar
                </button>
              </div>

              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
                {activeSubmission.description}
              </div>
              <div className="mt-2 text-xs font-extrabold text-slate-500">
                Unidade: {activeSubmission.location || "Não informada"}
              </div>

              {activeSubmission.reviewNote ? (
                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
                  Observação da gestão: {activeSubmission.reviewNote}
                </div>
              ) : null}

              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {activeSubmission.photos.map((photo) => (
                  <a
                    key={photo.id}
                    href={photo.url || "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="group overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.url || ""}
                      alt={photo.photo_name}
                      className="h-32 w-full object-cover transition duration-200 group-hover:scale-[1.02]"
                      loading="lazy"
                    />
                  </a>
                ))}
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => deleteMySubmission(activeSubmission.batchId)}
                  disabled={deletingBatchId === activeSubmission.batchId}
                  className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-700 transition hover:bg-red-100 disabled:opacity-60"
                >
                  {deletingBatchId === activeSubmission.batchId ? "Excluindo..." : "Excluir envio"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
