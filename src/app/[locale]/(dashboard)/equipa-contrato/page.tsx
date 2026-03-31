"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import axios from "axios";
import {
  ClipboardList,
  Clock,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type {
  EquipaContratoApi,
  EquipaContratoCargo,
  EquipaContratoListResponse,
} from "@/types/equipa-contrato";

const API_PREFIX = "/equipa-contrato";
const CARGOS_ATIVADOS = "/cargos";
const ORG_KEY = "ca.selected.organization";

const NIVEIS_GESTAO = [1, 2] as const;

const REGIMES = [1, 2, 3, 4, 5, 6, 7, 8] as const;

type LookupItem = { id: number; nome: string };

function parseLookupItems(payload: unknown): LookupItem[] {
  const root = payload as
    | { data?: unknown }
    | { cargos?: unknown }
    | { data?: { data?: unknown } }
    | unknown[];
  const arr = Array.isArray(root)
    ? root
    : Array.isArray((root as { data?: unknown })?.data)
      ? ((root as { data: unknown[] }).data ?? [])
      : Array.isArray((root as { cargos?: unknown })?.cargos)
        ? ((root as { cargos: unknown[] }).cargos ?? [])
        : Array.isArray((root as { data?: { data?: unknown[] } })?.data?.data)
          ? ((root as { data: { data: unknown[] } }).data.data ?? [])
          : [];

  return arr
    .map((item) => {
      const raw = item as {
        id?: number | string;
        nome?: string;
        name?: string;
        designacao?: string;
        descricao?: string;
      };
      const id = typeof raw.id == "number" ? raw.id : Number(raw.id);
      const nome =
        typeof raw.nome == "string"
          ? raw.nome.trim()
          : typeof raw.designacao == "string"
            ? raw.designacao.trim()
            : typeof raw.descricao == "string"
              ? raw.descricao.trim()
              : typeof raw.name == "string"
                ? raw.name.trim()
                : "";
      if (!Number.isFinite(id) || id <= 0 || !nome) return null;
      return { id, nome };
    })
    .filter((v): v is LookupItem => v != null);
}

function cargoLabel(c?: EquipaContratoCargo | null): string {
  if (!c) return "—";
  return (typeof c.designacao == "string" && c.designacao.trim()) ||
    (typeof c.nome == "string" && c.nome.trim())
    ? (c.designacao ?? c.nome ?? "").trim()
    : "—";
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
  const t = useTranslations("equipaContratoPage");
  const tRegimes = useTranslations("equipaContratoPage.regimes");
  const { http, user } = useAuth();
  const nivel = Number(user?.nivel);
  const canAccess =
    Number.isFinite(nivel) && NIVEIS_GESTAO.includes(nivel as (typeof NIVEIS_GESTAO)[number]);

  const [organizacaoId, setOrganizacaoId] = useState<number | null>(null);
  const [list, setList] = useState<EquipaContratoApi[]>([]);
  const [total, setTotal] = useState(0);
  const [perPage, setPerPage] = useState(15);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; isError?: boolean } | null>(null);

  const [draftCargoId, setDraftCargoId] = useState("");
  const [draftRegime, setDraftRegime] = useState<string>("all");
  const [appliedCargoId, setAppliedCargoId] = useState("");
  const [appliedRegime, setAppliedRegime] = useState<string>("all");

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const [showPanel, setShowPanel] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingCargoSnapshot, setEditingCargoSnapshot] = useState<EquipaContratoApi | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [cargosAtivos, setCargosAtivos] = useState<LookupItem[]>([]);
  const [lookupLoading, setLookupLoading] = useState(false);

  const [form, setForm] = useState({
    cargo_id: "",
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

  const fetchCargos = useCallback(async () => {
    if (!organizacaoId || !canAccess) {
      setCargosAtivos([]);
      return;
    }
    setLookupLoading(true);
    try {
      const res = await http.get(`${CARGOS_ATIVADOS}/${organizacaoId}/ativados`);
      setCargosAtivos(parseLookupItems(res.data));
    } catch {
      setCargosAtivos([]);
      showToast(t("toast.cargosLoadError"), true);
    } finally {
      setLookupLoading(false);
    }
  }, [http, organizacaoId, canAccess, showToast, t]);

  useEffect(() => {
    void fetchCargos();
  }, [fetchCargos]);

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
      if (appliedCargoId.trim()) {
        const cid = Number(appliedCargoId);
        if (Number.isFinite(cid) && cid > 0) params.cargo_id = cid;
      }
      if (appliedRegime != "all") {
        const r = Number(appliedRegime);
        if (REGIMES.includes(r as (typeof REGIMES)[number])) params.regime_trabalho = r;
      }

      const res = await http.get<EquipaContratoListResponse>(`${API_PREFIX}/${organizacaoId}`, {
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
    appliedCargoId,
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

  const cargoOptions = useMemo(() => {
    const map = new Map<number, string>();
    for (const c of cargosAtivos) map.set(c.id, c.nome);
    if (editingCargoSnapshot?.cargo) {
      const id = editingCargoSnapshot.cargo_id;
      const label = cargoLabel(editingCargoSnapshot.cargo);
      if (id && label != "—" && !map.has(id)) map.set(id, label);
    }
    return Array.from(map.entries())
      .map(([id, nome]) => ({ id, nome }))
      .sort((a, b) => a.nome.localeCompare(b.nome, undefined, { sensitivity: "base" }));
  }, [cargosAtivos, editingCargoSnapshot]);

  const stats = useMemo(() => {
    const sumC = list.reduce((acc, r) => acc + (Number(r.qtd_contrato) || 0), 0);
    const sumT = list.reduce((acc, r) => acc + (Number(r.qtd_turno) || 0), 0);
    return { rows: list.length, contracts: sumC, shifts: sumT };
  }, [list]);

  const openNew = () => {
    setEditingId(null);
    setEditingCargoSnapshot(null);
    setForm({
      cargo_id: "",
      qtd_contrato: 0,
      qtd_turno: 0,
      regime_trabalho: 1,
    });
    setShowPanel(true);
    void fetchCargos();
  };

  const openEdit = (row: EquipaContratoApi) => {
    setEditingId(row.id);
    setEditingCargoSnapshot(row);
    setForm({
      cargo_id: String(row.cargo_id),
      qtd_contrato: row.qtd_contrato ?? 0,
      qtd_turno: row.qtd_turno ?? 0,
      regime_trabalho: row.regime_trabalho ?? 1,
    });
    setShowPanel(true);
    void fetchCargos();
  };

  const closePanel = () => {
    setShowPanel(false);
    setEditingId(null);
    setEditingCargoSnapshot(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizacaoId) {
      showToast(t("toast.orgRequired"), true);
      return;
    }
    const cargoId = Number(form.cargo_id);
    if (!Number.isFinite(cargoId) || cargoId <= 0) {
      showToast(t("toast.cargoRequired"), true);
      return;
    }

    setFormSubmitting(true);
    try {
      const payload = {
        cargo_id: cargoId,
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
      icon: Users,
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
            setAppliedCargoId(draftCargoId);
            setAppliedRegime(draftRegime);
            setCurrentPage(1);
          }}
          className="grid grid-cols-1 md:grid-cols-3 gap-3"
        >
          <select
            className="ca-input"
            value={draftCargoId}
            onChange={(e) => setDraftCargoId(e.target.value)}
          >
            <option value="">{t("filters.cargoAll")}</option>
            {cargosAtivos.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.nome}
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
                  <th className="px-4 py-3 text-left font-medium">{t("table.cargo")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("table.qtdContrato")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("table.qtdTurno")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("table.regime")}</th>
                  <th className="px-4 py-3 text-right font-medium">{t("table.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y ca-border">
                {list.map((row, index) => (
                  <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(row.id)}
                        onChange={() => toggleRowSelection(row.id)}
                      />
                    </td>
                    <td className="px-4 py-3 font-medium">{(currentPage - 1) * perPage + index + 1}</td>
                    <td className="px-4 py-3 font-medium">{cargoLabel(row.cargo)}</td>
                    <td className="px-4 py-3">{row.qtd_contrato}</td>
                    <td className="px-4 py-3">{row.qtd_turno}</td>
                    <td className="px-4 py-3 ca-muted">{regimeLabel(row.regime_trabalho)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className="ca-icon-btn"
                          title={t("actions.edit")}
                          onClick={() => openEdit(row)}
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
                ))}
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
                  onClick={() => void fetchCargos()}
                  disabled={lookupLoading}
                  title={t("form.reloadCargos")}
                  aria-label={t("form.reloadCargos")}
                >
                  <RefreshCw size={18} className={lookupLoading ? "animate-spin" : ""} />
                </button>
              </div>
              <button type="button" onClick={closePanel} aria-label={t("cancel")}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col flex-1 min-h-0">
              <div className="p-4 space-y-4 flex-1 overflow-y-auto ca-scroll">
                <div>
                  <label className="block text-xs font-medium ca-muted mb-1">{t("form.cargo")}</label>
                  <select
                    className="ca-input w-full"
                    value={form.cargo_id}
                    onChange={(e) => setForm((f) => ({ ...f, cargo_id: e.target.value }))}
                    required
                    disabled={lookupLoading && cargoOptions.length == 0}
                  >
                    <option value="">{lookupLoading ? t("form.loadingCargos") : t("form.cargoPlaceholder")}</option>
                    {cargoOptions.map((c) => (
                      <option key={c.id} value={String(c.id)}>
                        {c.nome}
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
                <button type="submit" className="ca-btn flex items-center gap-2" disabled={formSubmitting}>
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
