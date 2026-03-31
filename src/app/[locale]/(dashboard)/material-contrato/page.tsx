"use client";
/* eslint-disable @next/next/no-img-element -- imagens servidas pelo storage da API Laravel */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import axios from "axios";
import {
  ClipboardList,
  Clock,
  Loader2,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { Material, MaterialListResponse } from "@/types/material";
import type {
  MaterialContratoApi,
  MaterialContratoListResponse,
  MaterialContratoShowResponse,
} from "@/types/material-contrato";

const API_PREFIX = "/material-contrato";
const MATERIAIS_PREFIX = "/materiais";
const ORG_KEY = "ca.selected.organization";

const NIVEIS_GESTAO = [1, 2] as const;

const REGIMES = [1, 2, 3, 4, 5, 6, 7, 8] as const;

type MaterialLookup = { id: number; label: string };

function materialImagePublicUrl(apiBaseUrl: string, filename: string | null | undefined): string | null {
  if (!filename) return null;
  const base = apiBaseUrl.replace(/\/$/, "");
  const name = String(filename).replace(/^\/+/, "");
  if (name.startsWith("http://") || name.startsWith("https://")) return name;
  return `${base}/storage/materiais/${encodeURIComponent(name)}`;
}

function qtyWithUnit(qty: number, unidade?: string | null): string {
  const q = Math.max(0, Math.floor(Number(qty) || 0));
  const u = typeof unidade == "string" ? unidade.trim() : "";
  return u ? `${q}\u00A0${u}` : String(q);
}

function materialLabel(m?: Pick<Material, "designacao" | "modelo" | "marca"> | null): string {
  if (!m) return "—";
  const d = typeof m.designacao == "string" ? m.designacao.trim() : "";
  if (d) return d;
  const parts = [m.marca, m.modelo].filter((x) => typeof x == "string" && x.trim());
  if (parts.length) return parts.map((x) => String(x).trim()).join(" · ");
  return "—";
}

function extractErrorMessage(err: unknown, fallback: string): string {
  if (!err || typeof err != "object" || !("response" in err)) return fallback;
  const res = (err as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } })
    .response?.data;
  if (res?.errors) {
    const flat = Object.values(res.errors).flat();
    if (flat.length) return flat.join(" ");
  }
  if (typeof res?.message == "string" && res.message.trim()) return res.message.trim();
  return fallback;
}

export default function Page() {
  const t = useTranslations("materialContratoPage");
  const tRegimes = useTranslations("materialContratoPage.regimes");
  const { http, user, api_base_url } = useAuth();
  const nivel = Number(user?.nivel);
  const canAccess =
    Number.isFinite(nivel) && NIVEIS_GESTAO.includes(nivel as (typeof NIVEIS_GESTAO)[number]);

  const [organizacaoId, setOrganizacaoId] = useState<number | null>(null);
  const [list, setList] = useState<MaterialContratoApi[]>([]);
  const [total, setTotal] = useState(0);
  const [perPage, setPerPage] = useState(15);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; isError?: boolean } | null>(null);

  const [draftMaterialId, setDraftMaterialId] = useState("");
  const [draftRegime, setDraftRegime] = useState<string>("all");
  const [appliedMaterialId, setAppliedMaterialId] = useState("");
  const [appliedRegime, setAppliedRegime] = useState<string>("all");

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const [showPanel, setShowPanel] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingMaterialSnapshot, setEditingMaterialSnapshot] = useState<MaterialContratoApi | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [panelLoading, setPanelLoading] = useState(false);
  const [materiais, setMateriais] = useState<MaterialLookup[]>([]);
  const [lookupLoading, setLookupLoading] = useState(false);

  const [form, setForm] = useState({
    material_id: "",
    qtd_contrato: 0,
    qtd_turno: 0,
    regime_trabalho: 1,
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ORG_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { id?: number | string };
      const id = typeof parsed?.id == "number" ? parsed.id : Number(parsed?.id);
      if (Number.isFinite(id) && id > 0) setOrganizacaoId(id);
    } catch {
      /* noop */
    }
  }, []);

  const showToast = useCallback((message: string, isError?: boolean) => {
    setToast({ message, isError });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const fetchMateriais = useCallback(async () => {
    if (!organizacaoId || !canAccess) {
      setMateriais([]);
      return;
    }
    setLookupLoading(true);
    try {
      const collected: Material[] = [];
      let page = 1;
      const per = 100;
      for (;;) {
        const res = await http.get<MaterialListResponse>(`${MATERIAIS_PREFIX}/${organizacaoId}`, {
          params: { per_page: per, page },
        });
        const chunk = res.data?.data ?? [];
        collected.push(...chunk);
        const tot = res.data?.total ?? collected.length;
        if (collected.length >= tot || chunk.length == 0) break;
        page += 1;
        if (page > 100) break;
      }
      const map = new Map<number, string>();
      for (const m of collected) {
        const label = materialLabel(m);
        if (label != "—") map.set(m.id, label);
      }
      setMateriais(
        Array.from(map.entries())
          .map(([id, label]) => ({ id, label }))
          .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" })),
      );
    } catch {
      setMateriais([]);
      showToast(t("toast.materiaisLoadError"), true);
    } finally {
      setLookupLoading(false);
    }
  }, [http, organizacaoId, canAccess, showToast, t]);

  useEffect(() => {
    void fetchMateriais();
  }, [fetchMateriais]);

  const fetchList = useCallback(async () => {
    if (!organizacaoId || !canAccess) {
      setList([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    const loadingTimeout = setTimeout(() => setLoading(false), 12000);
    try {
      const params: Record<string, string | number> = {
        per_page: perPage,
        page: currentPage,
      };
      if (appliedMaterialId.trim()) {
        const mid = Number(appliedMaterialId);
        if (Number.isFinite(mid) && mid > 0) params.material_id = mid;
      }
      if (appliedRegime != "all") {
        const r = Number(appliedRegime);
        if (REGIMES.includes(r as (typeof REGIMES)[number])) params.regime_trabalho = r;
      }

      const res = await http.get<MaterialContratoListResponse>(`${API_PREFIX}/${organizacaoId}`, {
        params,
      });
      setList(res.data?.data ?? []);
      setTotal(res.data?.total ?? 0);
      setPerPage(res.data?.per_page ?? 15);
      setCurrentPage(res.data?.current_page ?? 1);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 403) {
        showToast(t("toast.forbidden"), true);
      } else {
        showToast(t("toast.loadError"), true);
      }
      setList([]);
      setTotal(0);
    } finally {
      clearTimeout(loadingTimeout);
      setLoading(false);
    }
  }, [
    http,
    organizacaoId,
    canAccess,
    perPage,
    currentPage,
    appliedMaterialId,
    appliedRegime,
    showToast,
    t,
  ]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    setSelectedIds([]);
  }, [list]);

  const materialOptions = useMemo(() => {
    const map = new Map<number, string>();
    for (const m of materiais) map.set(m.id, m.label);
    if (editingMaterialSnapshot?.material) {
      const id = editingMaterialSnapshot.material_id;
      const label = materialLabel(editingMaterialSnapshot.material);
      if (id && label != "—" && !map.has(id)) map.set(id, label);
    }
    return Array.from(map.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
  }, [materiais, editingMaterialSnapshot]);

  const stats = useMemo(() => {
    const sumC = list.reduce((acc, r) => acc + (Number(r.qtd_contrato) || 0), 0);
    const sumT = list.reduce((acc, r) => acc + (Number(r.qtd_turno) || 0), 0);
    return { rows: list.length, contracts: sumC, shifts: sumT };
  }, [list]);

  const openNew = () => {
    setEditingId(null);
    setEditingMaterialSnapshot(null);
    setForm({
      material_id: "",
      qtd_contrato: 0,
      qtd_turno: 0,
      regime_trabalho: 1,
    });
    setShowPanel(true);
    void fetchMateriais();
  };

  const openEdit = async (row: MaterialContratoApi) => {
    if (!organizacaoId) {
      showToast(t("toast.orgRequired"), true);
      return;
    }
    setEditingId(row.id);
    setEditingMaterialSnapshot(row);
    setForm({
      material_id: String(row.material_id),
      qtd_contrato: row.qtd_contrato ?? 0,
      qtd_turno: row.qtd_turno ?? 0,
      regime_trabalho: row.regime_trabalho ?? 1,
    });
    setShowPanel(true);
    void fetchMateriais();
    setPanelLoading(true);
    try {
      const res = await http.get<MaterialContratoShowResponse>(`${API_PREFIX}/${organizacaoId}/${row.id}`);
      const fresh = res.data?.data;
      if (fresh) {
        setEditingMaterialSnapshot(fresh);
        setForm({
          material_id: String(fresh.material_id),
          qtd_contrato: fresh.qtd_contrato ?? 0,
          qtd_turno: fresh.qtd_turno ?? 0,
          regime_trabalho: fresh.regime_trabalho ?? 1,
        });
      }
    } catch {
      showToast(t("toast.showError"), true);
    } finally {
      setPanelLoading(false);
    }
  };

  const closePanel = () => {
    setShowPanel(false);
    setEditingId(null);
    setEditingMaterialSnapshot(null);
    setPanelLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizacaoId) {
      showToast(t("toast.orgRequired"), true);
      return;
    }
    const materialId = Number(form.material_id);
    if (!Number.isFinite(materialId) || materialId <= 0) {
      showToast(t("toast.materialRequired"), true);
      return;
    }

    setFormSubmitting(true);
    try {
      const payload = {
        material_id: materialId,
        qtd_contrato: Math.max(0, Math.floor(Number(form.qtd_contrato) || 0)),
        qtd_turno: Math.max(0, Math.floor(Number(form.qtd_turno) || 0)),
        regime_trabalho: form.regime_trabalho,
      };

      if (editingId) {
        await http.put(`${API_PREFIX}/${organizacaoId}/${editingId}`, payload);
        showToast(t("toast.updated"));
      } else {
        await http.post(`${API_PREFIX}/${organizacaoId}`, payload);
        showToast(t("toast.created"));
      }
      closePanel();
      fetchList();
    } catch (err: unknown) {
      showToast(extractErrorMessage(err, t("toast.saveError")), true);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t("confirm.deleteOne"))) return;
    if (!organizacaoId) {
      showToast(t("toast.orgRequired"), true);
      return;
    }
    try {
      await http.delete(`${API_PREFIX}/${organizacaoId}/${id}`);
      showToast(t("toast.deleted"));
      fetchList();
    } catch {
      showToast(t("toast.deleteError"), true);
    }
  };

  const handleBulkDelete = async () => {
    if (!organizacaoId) {
      showToast(t("toast.orgRequired"), true);
      return;
    }
    if (selectedIds.length == 0) {
      showToast(t("toast.selectAtLeastOne"), true);
      return;
    }
    if (!confirm(t("confirm.deleteBulk"))) return;
    setBulkDeleting(true);
    try {
      await http.post(`${API_PREFIX}/${organizacaoId}/eliminar-bulk`, { ids: selectedIds });
      showToast(t("toast.bulkDeleted"));
      setSelectedIds([]);
      fetchList();
    } catch (err: unknown) {
      showToast(extractErrorMessage(err, t("toast.bulkError")), true);
    } finally {
      setBulkDeleting(false);
    }
  };

  const allSelected = list.length > 0 && list.every((row) => selectedIds.includes(row.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(list.map((row) => row.id));
  };

  const toggleRowSelection = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x != id) : [...prev, id]));
  };

  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, perPage)));

  const regimeLabel = (n: number) => tRegimes(String(n));

  if (!canAccess) {
    return (
      <div className="p-4 md:p-6">
        <p className="text-sm ca-muted">{t("toast.forbidden")}</p>
      </div>
    );
  }

  const statCards = [
    {
      label: t("stats.rows"),
      value: stats.rows,
      icon: ClipboardList,
      color: "text-blue-600",
      bg: "bg-blue-100/60 dark:bg-blue-900/20",
    },
    {
      label: t("stats.contracts"),
      value: stats.contracts,
      icon: Package,
      color: "text-emerald-600",
      bg: "bg-emerald-100/60 dark:bg-emerald-900/20",
    },
    {
      label: t("stats.shifts"),
      value: stats.shifts,
      icon: Clock,
      color: "text-violet-600",
      bg: "bg-violet-100/60 dark:bg-violet-900/20",
    },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      {toast && (
        <div
          className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[220] max-w-[90vw] px-4 py-2 rounded-xl shadow-lg text-sm ${
            toast.isError
              ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200"
              : "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200"
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold">{t("title")}</h1>
          <p className="text-sm ca-muted">{t("subtitle")}</p>
        </div>
        <button type="button" onClick={openNew} className="ca-btn flex items-center gap-2">
          <Plus size={18} />
          {t("new")}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {statCards.map((item) => (
          <div key={item.label} className="ca-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm ca-muted">{item.label}</div>
                <div className="text-2xl font-semibold mt-1">{item.value}</div>
              </div>
              <div className={`h-11 w-11 rounded-2xl flex items-center justify-center ${item.bg}`}>
                <item.icon className={item.color} size={20} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="ca-card p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setAppliedMaterialId(draftMaterialId);
            setAppliedRegime(draftRegime);
            setCurrentPage(1);
          }}
          className="grid grid-cols-1 md:grid-cols-3 gap-3"
        >
          <select
            className="ca-input"
            value={draftMaterialId}
            onChange={(e) => setDraftMaterialId(e.target.value)}
          >
            <option value="">{t("filters.materialAll")}</option>
            {materiais.map((m) => (
              <option key={m.id} value={String(m.id)}>
                {m.label}
              </option>
            ))}
          </select>
          <select
            className="ca-input"
            value={draftRegime}
            onChange={(e) => setDraftRegime(e.target.value)}
          >
            <option value="all">{t("filters.regimeAll")}</option>
            {REGIMES.map((r) => (
              <option key={r} value={String(r)}>
                {regimeLabel(r)}
              </option>
            ))}
          </select>
          <button type="submit" className="ca-btn md:col-span-3">
            {t("filters.apply")}
          </button>
        </form>
      </div>

      <div className="ca-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : (
          <>
            <div className="px-4 py-3 border-b ca-border flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm ca-muted">
                {selectedIds.length} {t("bulk.selected")}
              </span>
              <button
                type="button"
                className="ca-btn text-sm"
                disabled={selectedIds.length == 0 || bulkDeleting}
                onClick={() => void handleBulkDelete()}
              >
                <span className="inline-flex items-center gap-2">
                  {bulkDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  {t("bulk.delete")}
                </span>
              </button>
            </div>

            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/40">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">
                    <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
                  </th>
                  <th className="px-4 py-3 text-left font-medium">#</th>
                  <th className="px-4 py-3 text-left font-medium w-20">{t("table.image")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("table.material")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("table.qtdContrato")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("table.qtdTurno")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("table.regime")}</th>
                  <th className="px-4 py-3 text-right font-medium">{t("table.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y ca-border">
                {list.map((row, index) => {
                  const rowLabel = materialLabel(row.material);
                  const imgSrc = materialImagePublicUrl(api_base_url, row.material?.imagem);
                  return (
                  <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(row.id)}
                        onChange={() => toggleRowSelection(row.id)}
                      />
                    </td>
                    <td className="px-4 py-3 font-medium">{(currentPage - 1) * perPage + index + 1}</td>
                    <td className="px-4 py-3 align-middle">
                      {imgSrc ? (
                        <img
                          src={imgSrc}
                          alt={rowLabel == "—" ? "" : rowLabel}
                          className="h-11 w-11 rounded-lg object-cover border ca-border bg-slate-100 dark:bg-slate-800"
                          loading="lazy"
                        />
                      ) : (
                        <span className="text-xs ca-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium">{rowLabel}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {qtyWithUnit(row.qtd_contrato, row.material?.unidade)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {qtyWithUnit(row.qtd_turno, row.material?.unidade)}
                    </td>
                    <td className="px-4 py-3 ca-muted">{regimeLabel(row.regime_trabalho)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className="ca-icon-btn"
                          title={t("actions.edit")}
                          onClick={() => void openEdit(row)}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          className="ca-icon-btn text-red-600"
                          title={t("actions.remove")}
                          onClick={() => void handleDelete(row.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>

            {list.length == 0 && !loading && (
              <div className="py-8 text-center ca-muted text-sm">{t("empty")}</div>
            )}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t ca-border">
                <span className="text-sm ca-muted">
                  {t("pagination.totalResults", { total })} ·{" "}
                  {t("pagination.pageOf", { current: currentPage, total: totalPages })}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="ca-btn text-sm"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  >
                    {t("pagination.prev")}
                  </button>
                  <button
                    type="button"
                    className="ca-btn text-sm"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  >
                    {t("pagination.next")}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showPanel && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={closePanel} aria-hidden />
          <div className="relative ml-auto h-full w-full max-w-md ca-panel shadow-2xl flex flex-col">
            <div className="flex items-center justify-between gap-3 p-4 border-b ca-border">
              <div className="flex items-center gap-2 min-w-0">
                <h2 className="text-lg font-semibold truncate">
                  {editingId ? t("form.edit") : t("form.new")}
                </h2>
                <button
                  type="button"
                  className="ca-icon-btn shrink-0"
                  onClick={() => void fetchMateriais()}
                  disabled={lookupLoading}
                  title={t("form.reloadMateriais")}
                  aria-label={t("form.reloadMateriais")}
                >
                  <RefreshCw size={18} className={lookupLoading ? "animate-spin" : ""} />
                </button>
              </div>
              <button type="button" onClick={closePanel} aria-label={t("cancel")}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col flex-1 min-h-0">
              <div className="p-4 space-y-4 flex-1 overflow-y-auto ca-scroll relative">
                {panelLoading && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 dark:bg-slate-900/70">
                    <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium ca-muted mb-1">{t("form.material")}</label>
                  <select
                    className="ca-input w-full"
                    value={form.material_id}
                    onChange={(e) => setForm((f) => ({ ...f, material_id: e.target.value }))}
                    required
                    disabled={(lookupLoading && materialOptions.length == 0) || panelLoading}
                  >
                    <option value="">
                      {lookupLoading ? t("form.loadingMateriais") : t("form.materialPlaceholder")}
                    </option>
                    {materialOptions.map((m) => (
                      <option key={m.id} value={String(m.id)}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium ca-muted mb-1">{t("form.qtdContrato")}</label>
                  <input
                    type="number"
                    min={0}
                    className="ca-input w-full"
                    value={form.qtd_contrato}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, qtd_contrato: Number(e.target.value) || 0 }))
                    }
                    required
                    disabled={panelLoading}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium ca-muted mb-1">{t("form.qtdTurno")}</label>
                  <input
                    type="number"
                    min={0}
                    className="ca-input w-full"
                    value={form.qtd_turno}
                    onChange={(e) => setForm((f) => ({ ...f, qtd_turno: Number(e.target.value) || 0 }))}
                    required
                    disabled={panelLoading}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium ca-muted mb-1">{t("form.regime")}</label>
                  <select
                    className="ca-input w-full"
                    value={form.regime_trabalho}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, regime_trabalho: Number(e.target.value) || 1 }))
                    }
                    disabled={panelLoading}
                  >
                    {REGIMES.map((r) => (
                      <option key={r} value={r}>
                        {regimeLabel(r)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-4 border-t ca-border flex justify-end gap-2">
                <button type="button" className="px-4 py-2 rounded-xl border ca-border" onClick={closePanel}>
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  className="ca-btn flex items-center gap-2"
                  disabled={formSubmitting || panelLoading}
                >
                  {formSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : editingId ? (
                    t("form.update")
                  ) : (
                    t("form.register")
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
