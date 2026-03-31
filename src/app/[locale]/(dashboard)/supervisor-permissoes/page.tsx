"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Link2, Unlink, Plus, ShieldCheck, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { Utilizador, UtilizadorListResponse } from "@/types/utilizador";
import type { Organizacao } from "@/types/organizacao";

const ORG_KEY = "ca.selected.organization";

type OrganizacaoPermissao = {
  id: number;
  organizacao_id: number;
  efetivo_id: number;
  efetivo?: Utilizador | null;
};

type OrganizacaoPermissaoListResponse = {
  data: OrganizacaoPermissao[];
  total: number;
};

export default function Page() {
  const t = useTranslations("supervisorPermissoesPage");
  const { http, user } = useAuth();

  const [organizacaoId, setOrganizacaoId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshingOrgs, setRefreshingOrgs] = useState(false);
  const [refreshingSups, setRefreshingSups] = useState(false);
  const [rows, setRows] = useState<OrganizacaoPermissao[]>([]);
  const [supervisores, setSupervisores] = useState<Utilizador[]>([]);
  const [organizacoes, setOrganizacoes] = useState<Organizacao[]>([]);
  const [selectedOrganizacaoId, setSelectedOrganizacaoId] = useState("");
  const [selectedSupervisorId, setSelectedSupervisorId] = useState("");
  const [toast, setToast] = useState<{ message: string; isError?: boolean } | null>(null);

  const canManage = Number(user?.nivel) == 1 || Number(user?.nivel) == 2;

  const showToast = useCallback((message: string, isError?: boolean) => {
    setToast({ message, isError });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const fetchRows = useCallback(async () => {
    const alvoOrgId = Number(selectedOrganizacaoId || organizacaoId);
    if (!alvoOrgId) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await http.get<OrganizacaoPermissaoListResponse>(
        `/organizacoes/${alvoOrgId}/supervisores`,
      );
      setRows(res.data?.data ?? []);
    } catch {
      setRows([]);
      showToast(t("toast.loadError"), true);
    } finally {
      setLoading(false);
    }
  }, [http, selectedOrganizacaoId, organizacaoId, showToast, t]);

  const fetchSupervisores = useCallback(async () => {
    try {
      // Prefer global supervisors list (independent from selected organization).
      const res = await http.get<UtilizadorListResponse & { utilizadores?: Utilizador[] }>("/utilizadores", {
        params: { nivel: 5, per_page: 500, page: 1 },
      });
      const payload = res.data;
      const rows = Array.isArray(payload?.utilizadores)
        ? payload.utilizadores
        : Array.isArray(payload?.data)
          ? payload.data
          : [];
      setSupervisores(rows);
    } catch {
      // Backward compatibility: if the API only supports org-scoped users.
      if (!organizacaoId) {
        setSupervisores([]);
        return;
      }
      try {
        const fallback = await http.get<UtilizadorListResponse>(`/utilizadores/${organizacaoId}`, {
          params: { nivel: 5, per_page: 500, page: 1 },
        });
        setSupervisores(Array.isArray(fallback.data?.data) ? fallback.data.data : []);
      } catch {
        setSupervisores([]);
      }
    }
  }, [http, organizacaoId]);

  const fetchOrganizacoes = useCallback(async () => {
    try {
      const res = await http.get<{ data: Organizacao[] }>("/organizacoes", {
        params: { estado: 1 },
      });
      const list = Array.isArray(res.data?.data) ? res.data.data : [];
      setOrganizacoes(list);
    } catch {
      setOrganizacoes([]);
    }
  }, [http]);

  const handleRefreshOrganizacoes = useCallback(async () => {
    setRefreshingOrgs(true);
    try {
      await fetchOrganizacoes();
    } finally {
      setRefreshingOrgs(false);
    }
  }, [fetchOrganizacoes]);

  const handleRefreshSupervisores = useCallback(async () => {
    setRefreshingSups(true);
    try {
      await fetchSupervisores();
    } finally {
      setRefreshingSups(false);
    }
  }, [fetchSupervisores]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ORG_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { id?: number | string };
      const id = typeof parsed?.id == "number" ? parsed.id : Number(parsed?.id);
      if (Number.isFinite(id) && id > 0) setOrganizacaoId(id);
    } catch {
      // noop
    }
  }, []);

  useEffect(() => {
    if (!organizacaoId) return;
    setSelectedOrganizacaoId(String(organizacaoId));
  }, [organizacaoId]);

  useEffect(() => {
    void fetchRows();
    void fetchSupervisores();
    void fetchOrganizacoes();
  }, [fetchRows, fetchSupervisores, fetchOrganizacoes]);

  const linkedSupervisorIds = useMemo(() => new Set(rows.map((r) => r.efetivo_id)), [rows]);

  const handleLink = async () => {
    if (!canManage) {
      showToast(t("toast.forbidden"), true);
      return;
    }
    const alvoOrgId = Number(selectedOrganizacaoId || organizacaoId);
    if (!alvoOrgId) {
      showToast(t("toast.orgRequired"), true);
      return;
    }
    const chosen = selectedSupervisorId.trim();
    const id = Number(chosen);
    if (!Number.isFinite(id) || id <= 0) {
      showToast(t("toast.supervisorRequired"), true);
      return;
    }
    setSaving(true);
    try {
      await http.post(`/organizacoes/${alvoOrgId}/supervisores`, { efetivo_id: id });
      setSelectedSupervisorId("");
      showToast(t("toast.linked"));
      await fetchRows();
    } catch (err: unknown) {
      const msg =
        err && typeof err == "object" && "response" in err
          ? ((err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }).response
              ?.data?.message ??
            Object.values(
              (err as { response?: { data?: { errors?: Record<string, string[]> } } }).response?.data?.errors ?? {},
            )
              .flat()
              .join(" "))
          : "";
      showToast(msg || t("toast.linkError"), true);
    } finally {
      setSaving(false);
    }
  };

  const handleUnlink = async (efetivoId: number) => {
    const alvoOrgId = Number(selectedOrganizacaoId || organizacaoId);
    if (!canManage || !alvoOrgId) return;
    if (!confirm(t("confirm.unlink"))) return;
    setSaving(true);
    try {
      await http.delete(`/organizacoes/${alvoOrgId}/supervisores/${efetivoId}`);
      showToast(t("toast.unlinked"));
      await fetchRows();
    } catch {
      showToast(t("toast.unlinkError"), true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {toast ? (
        <div
          className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[220] max-w-[90vw] px-4 py-2 rounded-xl shadow-lg text-sm ${
            toast.isError
              ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200"
              : "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200"
          }`}
        >
          {toast.message}
        </div>
      ) : null}

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold">{t("title")}</h1>
          <p className="text-sm ca-muted">{t("subtitle")}</p>
        </div>
      </div>

      {!canManage ? (
        <div className="ca-card p-4 text-sm ca-muted">{t("forbidden")}</div>
      ) : (
        <>
          <div className="ca-card p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <ShieldCheck size={16} />
              {t("linkForm.title")}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="flex items-center gap-2">
                <select
                  className="ca-input flex-1"
                  value={selectedOrganizacaoId}
                  onChange={(e) => setSelectedOrganizacaoId(e.target.value)}
                  disabled={saving || refreshingOrgs}
                >
                  <option value="">{t("linkForm.selectOrganization")}</option>
                  {organizacoes.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.designacao}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="ca-icon-btn shrink-0"
                  title={t("linkForm.refreshOrganizations")}
                  onClick={() => void handleRefreshOrganizacoes()}
                  disabled={saving || refreshingOrgs}
                >
                  {refreshingOrgs ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <select
                  className="ca-input flex-1"
                  value={selectedSupervisorId}
                  onChange={(e) => setSelectedSupervisorId(e.target.value)}
                  disabled={saving || refreshingSups}
                >
                  <option value="">{t("linkForm.selectSupervisor")}</option>
                  {supervisores.map((s) => (
                    <option key={s.id} value={s.id} disabled={linkedSupervisorIds.has(s.id)}>
                      {s.name} · #{s.id}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="ca-icon-btn shrink-0"
                  title={t("linkForm.refreshSupervisors")}
                  onClick={() => void handleRefreshSupervisores()}
                  disabled={saving || refreshingSups}
                >
                  {refreshingSups ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                </button>
              </div>

              <button type="button" className="ca-btn flex items-center justify-center gap-2" onClick={handleLink}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                {t("linkForm.submit")}
              </button>
            </div>
          </div>

          <div className="ca-card overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : rows.length == 0 ? (
              <div className="py-10 text-center text-sm ca-muted">{t("table.empty")}</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/40">
                  <tr>
                    <th className="px-4 py-3 text-left">{t("table.supervisor")}</th>
                    <th className="px-4 py-3 text-left">{t("table.email")}</th>
                    <th className="px-4 py-3 text-left">{t("table.id")}</th>
                    <th className="px-4 py-3 text-right">{t("table.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y ca-border">
                  {rows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="px-4 py-3">
                        <div className="font-medium">{row.efetivo?.name ?? "—"}</div>
                      </td>
                      <td className="px-4 py-3 ca-muted">{row.efetivo?.email ?? "—"}</td>
                      <td className="px-4 py-3">#{row.efetivo_id}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          className="ca-icon-btn text-red-600"
                          title={t("actions.unlink")}
                          onClick={() => void handleUnlink(row.efetivo_id)}
                          disabled={saving}
                        >
                          {saving ? <Loader2 size={16} className="animate-spin" /> : <Unlink size={16} />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      <div className="text-xs ca-muted flex items-center gap-2">
        <Link2 size={14} />
        {t("hint")}
      </div>
    </div>
  );
}
