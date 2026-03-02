"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../lib/supabaseClient";
import HomeTopButton from "../../components/HomeTopButton";

type SubmissionPhoto = {
  id: string;
  batch_id: string;
  created_at: string;
  created_by_name: string;
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
  description: string;
  status: "pending" | "published" | "rejected";
  reviewNote: string | null;
  photos: SubmissionPhoto[];
};

export default function ManagementActivitySubmissionsPage() {
  const [authChecking, setAuthChecking] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [rows, setRows] = useState<SubmissionPhoto[]>([]);
  const [statusFilter, setStatusFilter] = useState<"pending" | "published" | "rejected" | "all">(
    "pending"
  );
  const [savingBatchId, setSavingBatchId] = useState("");

  useEffect(() => {
    let active = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      const session = data.session;
      const user = session?.user ?? null;

      if (!user) {
        setIsLoggedIn(false);
        setIsAdmin(false);
        setAuthChecking(false);
        return;
      }

      if (user.user_metadata?.force_password_change) {
        window.location.href = "/auth/first-login";
        return;
      }

      const token = session?.access_token ?? "";
      setIsLoggedIn(true);
      const adminOk = await checkAdmin(token);
      setIsAdmin(adminOk);
      if (adminOk) {
        await loadRows(token, statusFilter);
      }
      if (!active) return;
      setAuthChecking(false);
    })();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user ?? null;
      if (!user) {
        setIsLoggedIn(false);
        setIsAdmin(false);
        setRows([]);
        setAuthChecking(false);
        return;
      }
      if (user.user_metadata?.force_password_change) {
        window.location.href = "/auth/first-login";
        return;
      }

      const token = session?.access_token ?? "";
      setIsLoggedIn(true);
      const adminOk = await checkAdmin(token);
      setIsAdmin(adminOk);
      if (adminOk) {
        await loadRows(token, statusFilter);
      }
      setAuthChecking(false);
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    void loadRows(undefined, statusFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, isAdmin]);

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
        description: row.description,
        status: row.status,
        reviewNote: row.review_note,
        photos: [row],
      });
    });
    return Array.from(map.values());
  }, [rows]);

  function statusLabel(status: GroupedSubmission["status"]) {
    if (status === "published") return "Publicado";
    if (status === "rejected") return "Rejeitado";
    return "Em análise";
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

  async function checkAdmin(tokenFromCaller?: string) {
    const token = tokenFromCaller || (await getAccessToken());
    if (!token) return false;

    try {
      const res = await fetch("/api/admin/me", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      return !!data?.isAdmin;
    } catch {
      return false;
    }
  }

  async function loadRows(tokenFromCaller?: string, filter: typeof statusFilter = statusFilter) {
    const token = tokenFromCaller || (await getAccessToken());
    if (!token) return;

    setLoading(true);
    setMessage("");
    try {
      const query = filter === "all" ? "" : `?status=${encodeURIComponent(filter)}`;
      const res = await fetch(`/api/management/activity-submissions${query}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Erro ao carregar fila de publicações.");
      }
      setRows(Array.isArray(data?.data) ? data.data : []);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Erro ao carregar fila de publicações.");
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(batchId: string, status: "pending" | "published" | "rejected") {
    const token = await getAccessToken();
    if (!token) {
      setMessage("Faça login para continuar.");
      return;
    }

    const note = window.prompt("Observação da gestão (opcional):", "") ?? "";
    setSavingBatchId(batchId);
    setMessage("");

    try {
      const res = await fetch("/api/management/activity-submissions", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ batch_id: batchId, status, review_note: note.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Falha ao atualizar status.");
      }
      await loadRows(token, statusFilter);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Falha ao atualizar status.");
    } finally {
      setSavingBatchId("");
    }
  }

  if (authChecking) {
    return (
      <main className="management-activity-page min-h-screen bg-slate-100 px-4 py-10 text-slate-900">
        <HomeTopButton />
        <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
          <h1 className="text-2xl font-black">Fila de publicações</h1>
          <p className="mt-2 text-sm font-semibold text-slate-600">Carregando sua sessão...</p>
        </div>
      </main>
    );
  }

  if (!isLoggedIn) {
    return (
      <main className="management-activity-page min-h-screen bg-slate-100 px-4 py-10 text-slate-900">
        <HomeTopButton />
        <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
          <h1 className="text-2xl font-black">Fila de publicações</h1>
          <p className="mt-2 text-sm font-semibold text-slate-600">
            Faça login para acessar a revisão de fotos enviadas pelos professores.
          </p>
          <Link
            href="/portal"
            className="mt-5 inline-flex rounded-2xl bg-gradient-to-r from-emerald-500 to-sky-500 px-4 py-2 text-sm font-black text-white"
          >
            Ir para o Portal
          </Link>
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="management-activity-page min-h-screen bg-slate-100 px-4 py-10 text-slate-900">
        <HomeTopButton />
        <div className="mx-auto max-w-3xl rounded-3xl border border-rose-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-black text-rose-700">Acesso restrito</h1>
          <p className="mt-2 text-sm font-semibold text-slate-600">
            Somente coordenação/gestão com perfil admin pode revisar e publicar as atividades.
          </p>
          <Link
            href="/portal"
            className="mt-5 inline-flex rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-700"
          >
            Voltar ao Portal
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="management-activity-page min-h-screen bg-gradient-to-b from-slate-50 via-sky-50 to-white px-4 py-8 text-slate-900">
      <HomeTopButton />
      <div className="mx-auto max-w-7xl rounded-3xl border border-slate-200 bg-slate-50/95 p-6 shadow-[0_14px_35px_rgba(15,23,42,0.08)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black">Fila de fotos para publicação</h1>
            <p className="mt-1 text-sm font-semibold text-slate-600">
              Revise as atividades enviadas e marque como publicadas ou rejeitadas.
            </p>
          </div>
          <a
            href="/activity-submissions"
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-black text-slate-700"
          >
            Abrir tela do professor
          </a>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          {[
            { label: "Pendentes", value: "pending" as const },
            { label: "Publicadas", value: "published" as const },
            { label: "Rejeitadas", value: "rejected" as const },
            { label: "Todas", value: "all" as const },
          ].map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setStatusFilter(tab.value)}
              className={`rounded-xl border px-3 py-2 text-xs font-black ${
                statusFilter === tab.value
                  ? "border-sky-400 bg-sky-100 text-sky-700"
                  : "border-slate-200 bg-white text-slate-600"
              }`}
            >
              {tab.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => loadRows()}
            disabled={loading}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 disabled:opacity-60"
          >
            {loading ? "Atualizando..." : "Atualizar"}
          </button>
        </div>

        {message ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700">
            {message}
          </div>
        ) : null}

        {!grouped.length ? (
          <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-7 text-sm font-bold text-slate-500">
            Nenhuma atividade na fila.
          </div>
        ) : (
          <div className="mt-5 grid gap-4">
            {grouped.map((item) => (
              <article key={item.batchId} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-black text-slate-800">{formatDate(item.createdAt)}</div>
                    <div className="mt-1 text-xs font-bold text-slate-600">Professor: {item.createdByName}</div>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs font-black ${statusClasses(item.status)}`}>
                    {statusLabel(item.status)}
                  </span>
                </div>

                <p className="mt-2 text-sm font-semibold text-slate-700">{item.description}</p>

                {item.reviewNote ? (
                  <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
                    Observação: {item.reviewNote}
                  </div>
                ) : null}

                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                  {item.photos.map((photo) => (
                    <a
                      key={photo.id}
                      href={photo.url || "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.url || ""}
                        alt={photo.photo_name}
                        className="h-24 w-full object-cover"
                        loading="lazy"
                      />
                    </a>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => updateStatus(item.batchId, "published")}
                    disabled={savingBatchId === item.batchId}
                    className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-black text-white disabled:opacity-60"
                  >
                    Publicar
                  </button>
                  <button
                    type="button"
                    onClick={() => updateStatus(item.batchId, "rejected")}
                    disabled={savingBatchId === item.batchId}
                    className="rounded-xl bg-rose-500 px-3 py-2 text-xs font-black text-white disabled:opacity-60"
                  >
                    Rejeitar
                  </button>
                  <button
                    type="button"
                    onClick={() => updateStatus(item.batchId, "pending")}
                    disabled={savingBatchId === item.batchId}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 disabled:opacity-60"
                  >
                    Voltar para análise
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
