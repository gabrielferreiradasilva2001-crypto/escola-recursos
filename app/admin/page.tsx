"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import HomeTopButton from "../components/HomeTopButton";

export default function AdminPage() {
  function errorMessage(err: unknown, fallback: string) {
    return err instanceof Error ? err.message : fallback;
  }

  const periodOptions = ["matutino", "vespertino", "noturno"];
  const locationOptions = ["Antonio Valadares - SED", "Antonio Valadares - Extensão"];
  const [userId, setUserId] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [purgeMsg, setPurgeMsg] = useState("");
  const [purgeLoading, setPurgeLoading] = useState(false);
  const [purgeConfirm, setPurgeConfirm] = useState("");
  const [admins, setAdmins] = useState<
    {
      user_id: string;
      is_primary: boolean;
      allowed_periods: string[];
      allowed_locations: string[];
      default_period: string | null;
      default_location: string | null;
    }[]
  >([]);
  const [adminUserId, setAdminUserId] = useState("");
  const [adminPeriods, setAdminPeriods] = useState<string[]>(["matutino"]);
  const [adminLocations, setAdminLocations] = useState<string[]>(["Antonio Valadares - SED"]);
  const [adminDefaultPeriod, setAdminDefaultPeriod] = useState("matutino");
  const [adminDefaultLocation, setAdminDefaultLocation] = useState("Antonio Valadares - SED");
  const [adminMsg, setAdminMsg] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminRemovingId, setAdminRemovingId] = useState("");

  useEffect(() => {
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      const id = String(session.session?.user?.id ?? "").trim();
      setCurrentUserId(id);
      await loadAdmins();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadAdmins() {
    setAdminMsg("");
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token ?? "";
      if (!token) return;
      const res = await fetch("/api/admin/users", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Erro ao carregar admins.");
      setAdmins(Array.isArray(data?.data) ? data.data : []);
    } catch (err: unknown) {
      setAdminMsg(errorMessage(err, "Erro ao carregar admins."));
    }
  }

  async function save() {
    setMsg("");
    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token ?? "";
      if (!token) {
        setMsg("Faça login para continuar.");
        setLoading(false);
        return;
      }
      const res = await fetch("/api/admin/set", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ admin_user_id: userId.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data?.error ?? "Erro ao salvar.");
        setLoading(false);
        return;
      }
      setMsg("Admin principal atualizado com sucesso.");
    } catch {
      setMsg("Erro ao salvar.");
    } finally {
      setLoading(false);
    }
  }

  async function purgeAllRecords() {
    setPurgeMsg("");
    setPurgeLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token ?? "";
      if (!token) {
        setPurgeMsg("Faça login para continuar.");
        setPurgeLoading(false);
        return;
      }
      const ok = window.confirm(
        "Isso vai apagar TODOS os registros de agendamentos e impressões. Esta ação não pode ser desfeita. Deseja continuar?"
      );
      if (!ok) {
        setPurgeLoading(false);
        return;
      }
      const res = await fetch("/api/admin/purge-records", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ confirm: purgeConfirm.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPurgeMsg(data?.error ?? "Erro ao apagar registros.");
        setPurgeLoading(false);
        return;
      }
      setPurgeConfirm("");
      setPurgeMsg("Registros apagados com sucesso.");
    } catch {
      setPurgeMsg("Erro ao apagar registros.");
    } finally {
      setPurgeLoading(false);
    }
  }

  async function saveAdminAccess() {
    setAdminMsg("");
    setAdminLoading(true);
    try {
      const normalizedUserId = adminUserId.trim();
      if (!normalizedUserId) {
        setAdminMsg("Informe o user_id do admin.");
        setAdminLoading(false);
        return;
      }
      if (!adminPeriods.length) {
        setAdminMsg("Selecione ao menos um período.");
        setAdminLoading(false);
        return;
      }
      if (!adminLocations.length) {
        setAdminMsg("Selecione ao menos uma escola/local.");
        setAdminLoading(false);
        return;
      }
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token ?? "";
      if (!token) {
        setAdminMsg("Faça login para continuar.");
        setAdminLoading(false);
        return;
      }
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          user_id: normalizedUserId,
          allowed_periods: adminPeriods,
          allowed_locations: adminLocations,
          default_period: adminDefaultPeriod,
          default_location: adminDefaultLocation,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAdminMsg(data?.error ?? "Erro ao salvar admin.");
        setAdminLoading(false);
        return;
      }
      setAdminMsg("Admin salvo com permissões.");
      await loadAdmins();
    } catch {
      setAdminMsg("Erro ao salvar admin.");
    } finally {
      setAdminLoading(false);
    }
  }

  async function removeAdmin(targetUserId: string) {
    const ok = window.confirm("Remover este admin? Ele perderá acesso à gestão.");
    if (!ok) return;
    setAdminRemovingId(targetUserId);
    setAdminMsg("");
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token ?? "";
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ user_id: targetUserId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Erro ao remover admin.");
      setAdminMsg("Admin removido.");
      await loadAdmins();
    } catch (err: unknown) {
      setAdminMsg(errorMessage(err, "Erro ao remover admin."));
    } finally {
      setAdminRemovingId("");
    }
  }

  function togglePeriod(period: string) {
    setAdminPeriods((prev) => {
      const next = prev.includes(period) ? prev.filter((p) => p !== period) : [...prev, period];
      if (!next.length) return prev;
      if (!next.includes(adminDefaultPeriod)) {
        setAdminDefaultPeriod(next[0]);
      }
      return next;
    });
  }

  function toggleLocation(location: string) {
    setAdminLocations((prev) => {
      const next = prev.includes(location) ? prev.filter((p) => p !== location) : [...prev, location];
      if (!next.length) return prev;
      if (!next.includes(adminDefaultLocation)) {
        setAdminDefaultLocation(next[0]);
      }
      return next;
    });
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 via-sky-50 to-white text-slate-900">
      <HomeTopButton />
      <div className="mx-auto w-full max-w-2xl px-4 py-10">
        <div className="rounded-3xl border border-slate-200/60 bg-slate-50/80 p-6 shadow-[0_14px_40px_rgba(15,23,42,0.10)] backdrop-blur">
          <h1 className="text-xl font-black">Admin principal</h1>
          <p className="mt-2 text-sm font-bold text-slate-600">
            Informe o <b>user_id</b> do usuário que será o único admin com permissão total.
          </p>

          <div className="mt-5">
            <label className="text-xs font-extrabold text-slate-500">User ID</label>
            <input
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="ex: 056a5311-81d5-4ee8-aa6b-926d4bf8abd2"
              className="mt-1 h-12 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-extrabold outline-none transition-all duration-200 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-200/40"
            />
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-600">
              <button
                type="button"
                onClick={() => {
                  if (currentUserId) setUserId(currentUserId);
                }}
                disabled={!currentUserId}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-black text-slate-700 hover:bg-white disabled:opacity-60"
              >
                Usar meu user_id
              </button>
              {currentUserId ? (
                <span>Seu user_id: {currentUserId}</span>
              ) : (
                <span>Faça login para ver seu user_id.</span>
              )}
            </div>
          </div>

          {msg ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm font-extrabold text-slate-700">
              {msg}
            </div>
          ) : null}

          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={save}
              disabled={loading || !userId.trim()}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-sky-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-emerald-500/20 transition-all duration-200 hover:-translate-y-[1px] hover:shadow-xl active:scale-[0.99] disabled:opacity-60"
            >
              {loading ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-slate-200/60 bg-slate-50/80 p-6 shadow-[0_14px_40px_rgba(15,23,42,0.10)] backdrop-blur">
          <h2 className="text-lg font-black">Cadastro de admins e permissões</h2>
          <p className="mt-2 text-sm font-bold text-slate-600">
            Defina quais períodos e escolas cada admin pode acessar na gestão.
          </p>

          <div className="mt-4">
            <label className="text-xs font-extrabold text-slate-500">User ID do admin</label>
            <input
              value={adminUserId}
              onChange={(e) => setAdminUserId(e.target.value)}
              placeholder="ex: 056a5311-81d5-4ee8-aa6b-926d4bf8abd2"
              className="mt-1 h-12 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-extrabold outline-none transition-all duration-200 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-200/40"
            />
          </div>

          <div className="mt-4">
            <div className="text-xs font-extrabold text-slate-500">Períodos permitidos</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {periodOptions.map((period) => (
                <button
                  key={period}
                  type="button"
                  onClick={() => togglePeriod(period)}
                  className={`rounded-full px-3 py-2 text-xs font-black ${
                    adminPeriods.includes(period)
                      ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200"
                      : "bg-white text-slate-600 ring-1 ring-slate-200"
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
            <label className="mt-3 block text-xs font-extrabold text-slate-500">Período padrão</label>
            <select
              value={adminDefaultPeriod}
              onChange={(e) => setAdminDefaultPeriod(e.target.value)}
              className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-extrabold"
            >
              {adminPeriods.map((period) => (
                <option key={period} value={period}>
                  {period}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4">
            <div className="text-xs font-extrabold text-slate-500">Escolas/Locais permitidos</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {locationOptions.map((location) => (
                <button
                  key={location}
                  type="button"
                  onClick={() => toggleLocation(location)}
                  className={`rounded-full px-3 py-2 text-xs font-black ${
                    adminLocations.includes(location)
                      ? "bg-sky-100 text-sky-800 ring-1 ring-sky-200"
                      : "bg-white text-slate-600 ring-1 ring-slate-200"
                  }`}
                >
                  {location}
                </button>
              ))}
            </div>
            <label className="mt-3 block text-xs font-extrabold text-slate-500">Escola/Local padrão</label>
            <select
              value={adminDefaultLocation}
              onChange={(e) => setAdminDefaultLocation(e.target.value)}
              className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-extrabold"
            >
              {adminLocations.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
          </div>

          {adminMsg ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm font-extrabold text-slate-700">
              {adminMsg}
            </div>
          ) : null}

          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={saveAdminAccess}
              disabled={adminLoading}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-sky-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-emerald-500/20 transition-all duration-200 hover:-translate-y-[1px] hover:shadow-xl active:scale-[0.99] disabled:opacity-60"
            >
              {adminLoading ? "Salvando..." : "Salvar admin"}
            </button>
          </div>

          <div className="mt-5 space-y-2">
            {admins.length ? (
              admins.map((admin) => (
                <div key={admin.user_id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-black text-slate-900">{admin.user_id}</div>
                      <div className="text-xs font-bold text-slate-600">
                        Períodos: {admin.allowed_periods.join(", ")} • Local:{" "}
                        {admin.allowed_locations.join(", ")}
                      </div>
                      <div className="text-xs font-bold text-slate-500">
                        Padrão: {admin.default_period || "-"} • {admin.default_location || "-"}
                      </div>
                    </div>
                    {admin.is_primary ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-black text-emerald-700 ring-1 ring-emerald-200">
                        Admin principal
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => removeAdmin(admin.user_id)}
                        disabled={adminRemovingId === admin.user_id}
                        className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-700 disabled:opacity-60"
                      >
                        {adminRemovingId === admin.user_id ? "Removendo..." : "Remover"}
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm font-bold text-slate-500">Nenhum admin cadastrado na lista auxiliar.</div>
            )}
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-rose-200/60 bg-slate-50/80 p-6 shadow-[0_14px_40px_rgba(15,23,42,0.10)] backdrop-blur">
          <h2 className="text-lg font-black text-rose-700">Limpeza total de registros</h2>
          <p className="mt-2 text-sm font-bold text-rose-700/90">
            Apaga TODOS os registros de agendamentos e impressões. Esta ação é definitiva.
          </p>

          <div className="mt-4">
            <label className="text-xs font-extrabold text-rose-600">Digite APAGAR_TUDO para confirmar</label>
            <input
              value={purgeConfirm}
              onChange={(e) => setPurgeConfirm(e.target.value)}
              placeholder="APAGAR_TUDO"
              className="mt-1 h-12 w-full rounded-2xl border border-rose-200 bg-white px-3 text-sm font-extrabold text-rose-700 outline-none transition-all duration-200 focus:border-rose-300 focus:ring-4 focus:ring-rose-200/40"
            />
          </div>

          {purgeMsg ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm font-extrabold text-rose-700">
              {purgeMsg}
            </div>
          ) : null}

          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={purgeAllRecords}
              disabled={purgeLoading || purgeConfirm.trim() !== "APAGAR_TUDO"}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-rose-500 to-red-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-rose-500/20 transition-all duration-200 hover:-translate-y-[1px] hover:shadow-xl active:scale-[0.99] disabled:opacity-60"
            >
              {purgeLoading ? "Apagando..." : "Apagar todos os registros"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
