"use client";
/* eslint-disable @next/next/no-img-element -- imagens servidas pelo storage da API Laravel */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell,
  AlertTriangle,
  Info,
  Plus,
  X,
  Eye,
  Pencil,
  Trash2,
  Loader2,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/hooks/useAuth";
import type { Aviso, AvisoBroadcast, AvisoListResponse, AvisoShowResponse } from "@/types/aviso";

const API_PREFIX = "/avisos";
const ORG_KEY = "ca.selected.organization";

const NIVEIS_LISTAR = [1, 2, 3, 4, 5, 6];
const NIVEIS_EDITAR = [1, 2, 3, 5, 6];
const NIVEIS_ELIMINAR = [1, 2];

function parseApiErrors(err: unknown, fallback: string): string {
  if (err && typeof err == "object" && "response" in err) {
    const data = (err as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } })
      .response?.data;
    if (data?.errors) {
      return Object.values(data.errors)
        .flat()
        .join(" ");
    }
    if (typeof data?.message == "string") return data.message;
  }
  return fallback;
}

function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocalValue(v: string): string {
  if (!v) return "";
  return v.replace("T", " ") + ":00";
}

function formatPublished(iso: string | null | undefined, locale: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function avisoImagePublicUrl(apiBaseUrl: string, filename: string | null | undefined): string | null {
  if (!filename) return null;
  const base = apiBaseUrl.replace(/\/$/, "");
  const name = filename.replace(/^\/+/, "");
  return `${base}/storage/avisos/${encodeURIComponent(name)}`;
}

function broadcastSummary(b: AvisoBroadcast, t: (k: string) => string): string {
  const g = b.grupo;
  if (g === 1) return t("broadcasts.all");
  const id = b.receptor_id != null ? `#${b.receptor_id}` : "—";
  if (g === 2) return `${t("broadcasts.department")} ${id}`;
  if (g === 3) return `${t("broadcasts.residence")} ${id}`;
  if (g === 4) return `${t("broadcasts.resident")} ${id}`;
  return `—`;
}

export default function Page() {
  const t = useTranslations("notices");
  const locale = useLocale();
  const { http, user, api_base_url } = useAuth();

  const nivel = user?.nivel ?? 0;
  const canList = NIVEIS_LISTAR.includes(nivel);
  const canEdit = NIVEIS_EDITAR.includes(nivel);
  const canDelete = NIVEIS_ELIMINAR.includes(nivel);

  const [organizacaoId, setOrganizacaoId] = useState<number | null>(null);

  const [list, setList] = useState<Aviso[]>([]);
  const [total, setTotal] = useState(0);
  const [perPage, setPerPage] = useState(15);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [statActive, setStatActive] = useState(0);
  const [statHigh, setStatHigh] = useState(0);
  const [statInfo, setStatInfo] = useState(0);
  const [statsLoading, setStatsLoading] = useState(false);

  const [toast, setToast] = useState<{ message: string; isError?: boolean } | null>(null);

  const [draftQ, setDraftQ] = useState("");
  const [draftCategoria, setDraftCategoria] = useState("");
  const [draftPrioridade, setDraftPrioridade] = useState("");
  const [draftEstado, setDraftEstado] = useState("");
  const [draftData1, setDraftData1] = useState("");
  const [draftData2, setDraftData2] = useState("");

  const [appliedQ, setAppliedQ] = useState("");
  const [appliedCategoria, setAppliedCategoria] = useState("");
  const [appliedPrioridade, setAppliedPrioridade] = useState("");
  const [appliedEstado, setAppliedEstado] = useState("");
  const [appliedData1, setAppliedData1] = useState("");
  const [appliedData2, setAppliedData2] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  /** Nome do ficheiro já guardado no servidor (só em edição), para pré-visualizar quando não há ficheiro novo */
  const [formExistingImageName, setFormExistingImageName] = useState<string | null>(null);
  const [formImageObjectUrl, setFormImageObjectUrl] = useState<string | null>(null);
  const [formFileInputKey, setFormFileInputKey] = useState(0);
  const [form, setForm] = useState({
    titulo: "",
    descricao: "",
    categoria: 1,
    prioridade: "" as "" | "1" | "2",
    data_publicacao: "",
    estado: 1,
    imagem: null as File | null,
    sendToAll: true,
  });

  const [viewing, setViewing] = useState<Aviso | null>(null);
  const [viewLoading, setViewLoading] = useState(false);

  const showToast = useCallback((message: string, isError?: boolean) => {
    setToast({ message, isError });
    setTimeout(() => setToast(null), 4000);
  }, []);

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
    if (!form.imagem) {
      setFormImageObjectUrl(null);
      return;
    }
    const url = URL.createObjectURL(form.imagem);
    setFormImageObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [form.imagem]);

  const formImagePreviewSrc = useMemo(() => {
    if (formImageObjectUrl) return formImageObjectUrl;
    if (formExistingImageName) return avisoImagePublicUrl(api_base_url, formExistingImageName);
    return null;
  }, [formImageObjectUrl, formExistingImageName, api_base_url]);

  const fetchStats = useCallback(async () => {
    if (!organizacaoId || !canList) return;
    setStatsLoading(true);
    try {
      const base = { per_page: 1, page: 1 };
      const [r1, r2, r3] = await Promise.all([
        http.get<AvisoListResponse>(`${API_PREFIX}/${organizacaoId}`, { params: { ...base, estado: 1 } }),
        http.get<AvisoListResponse>(`${API_PREFIX}/${organizacaoId}`, { params: { ...base, prioridade: 1 } }),
        http.get<AvisoListResponse>(`${API_PREFIX}/${organizacaoId}`, { params: { ...base, categoria: 3 } }),
      ]);
      setStatActive(r1.data?.total ?? 0);
      setStatHigh(r2.data?.total ?? 0);
      setStatInfo(r3.data?.total ?? 0);
    } catch {
      setStatActive(0);
      setStatHigh(0);
      setStatInfo(0);
    } finally {
      setStatsLoading(false);
    }
  }, [http, organizacaoId, canList]);

  const fetchList = useCallback(async () => {
    let loadingTimeout: ReturnType<typeof setTimeout> | null = null;
    if (!organizacaoId || !canList) {
      setList([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    loadingTimeout = setTimeout(() => setLoading(false), 12000);
    try {
      const params: Record<string, string | number> = {
        per_page: perPage,
        page: currentPage,
      };
      if (appliedQ.trim()) params.q = appliedQ.trim();
      if (appliedCategoria === "1" || appliedCategoria === "2" || appliedCategoria === "3") {
        params.categoria = Number(appliedCategoria);
      }
      if (appliedPrioridade === "1" || appliedPrioridade === "2") {
        params.prioridade = Number(appliedPrioridade);
      }
      if (appliedEstado === "1" || appliedEstado === "2") {
        params.estado = Number(appliedEstado);
      }
      if (appliedData1) params.data1 = appliedData1;
      if (appliedData2) params.data2 = appliedData2;

      const res = await http.get<AvisoListResponse>(`${API_PREFIX}/${organizacaoId}`, { params });
      setList(res.data?.data ?? []);
      setTotal(res.data?.total ?? 0);
      setPerPage(res.data?.per_page ?? 15);
      setCurrentPage(res.data?.current_page ?? 1);
    } catch {
      showToast(t("toast.loadError"), true);
      setList([]);
      setTotal(0);
    } finally {
      if (loadingTimeout) clearTimeout(loadingTimeout);
      setLoading(false);
    }
  }, [
    http,
    organizacaoId,
    canList,
    perPage,
    currentPage,
    appliedQ,
    appliedCategoria,
    appliedPrioridade,
    appliedEstado,
    appliedData1,
    appliedData2,
    showToast,
    t,
  ]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  const statsCards = useMemo(
    () => [
      {
        label: t("stats.active"),
        value: statActive,
        icon: Bell,
        color: "text-blue-600",
        bg: "bg-blue-100/60 dark:bg-blue-900/20",
      },
      {
        label: t("stats.highPriority"),
        value: statHigh,
        icon: AlertTriangle,
        color: "text-red-600",
        bg: "bg-red-100/60 dark:bg-red-900/20",
      },
      {
        label: t("stats.informative"),
        value: statInfo,
        icon: Info,
        color: "text-slate-600",
        bg: "bg-slate-100/60 dark:bg-slate-800/40",
      },
    ],
    [t, statActive, statHigh, statInfo],
  );

  const applyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedQ(draftQ);
    setAppliedCategoria(draftCategoria);
    setAppliedPrioridade(draftPrioridade);
    setAppliedEstado(draftEstado);
    setAppliedData1(draftData1);
    setAppliedData2(draftData2);
    setCurrentPage(1);
  };

  const openNew = () => {
    setEditingId(null);
    setFormExistingImageName(null);
    setFormFileInputKey((k) => k + 1);
    setForm({
      titulo: "",
      descricao: "",
      categoria: 1,
      prioridade: "",
      data_publicacao: "",
      estado: 1,
      imagem: null,
      sendToAll: true,
    });
    setShowForm(true);
  };

  const openEdit = (row: Aviso) => {
    setEditingId(row.id);
    const nome = row.imagem?.trim() || null;
    setFormExistingImageName(nome);
    setFormFileInputKey((k) => k + 1);
    setForm({
      titulo: row.titulo ?? "",
      descricao: row.descricao ?? "",
      categoria: row.categoria ?? 1,
      prioridade:
        row.prioridade === 1 || row.prioridade === 2 ? (String(row.prioridade) as "1" | "2") : "",
      data_publicacao: toDatetimeLocalValue(row.data_publicacao ?? undefined),
      estado: row.estado === 2 ? 2 : 1,
      imagem: null,
      sendToAll: Array.isArray(row.broadcasts) && row.broadcasts.some((b) => b.grupo === 1),
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormExistingImageName(null);
  };

  const openView = async (row: Aviso) => {
    if (!organizacaoId) return;
    setViewLoading(true);
    setViewing(row);
    try {
      const res = await http.get<AvisoShowResponse>(`${API_PREFIX}/${organizacaoId}/${row.id}`);
      if (res.data?.data) setViewing(res.data.data);
    } catch {
      showToast(t("toast.loadError"), true);
      setViewing(null);
    } finally {
      setViewLoading(false);
    }
  };

  const closeView = () => setViewing(null);

  const appendAvisoFormFields = (fd: FormData) => {
    fd.append("titulo", form.titulo.trim());
    fd.append("descricao", form.descricao.trim());
    fd.append("categoria", String(form.categoria));
    if (form.prioridade === "1" || form.prioridade === "2") {
      fd.append("prioridade", form.prioridade);
    }
    if (form.data_publicacao) {
      fd.append("data_publicacao", fromDatetimeLocalValue(form.data_publicacao));
    }
    fd.append("estado", String(form.estado));
    if (form.imagem) fd.append("imagem", form.imagem);
    if (form.sendToAll) {
      fd.append("broadcasts", JSON.stringify([{ grupo: 1 }]));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizacaoId) {
      showToast(t("toast.orgRequired"), true);
      return;
    }
    if (!form.titulo.trim()) return;

    setFormSubmitting(true);
    const config = { headers: { "Content-Type": undefined as unknown as string } };
    try {
      if (editingId != null) {
        if (form.imagem) {
          const fd = new FormData();
          appendAvisoFormFields(fd);
          fd.append("_method", "PUT");
          await http.post(`${API_PREFIX}/${organizacaoId}/${editingId}`, fd, config as never);
        } else {
          const body: Record<string, unknown> = {
            titulo: form.titulo.trim(),
            descricao: form.descricao.trim() || null,
            categoria: form.categoria,
            estado: form.estado,
          };
          if (form.prioridade === "1" || form.prioridade === "2") {
            body.prioridade = Number(form.prioridade);
          } else {
            body.prioridade = null;
          }
          body.data_publicacao = form.data_publicacao
            ? fromDatetimeLocalValue(form.data_publicacao)
            : null;
          if (form.sendToAll) {
            body.broadcasts = [{ grupo: 1, receptor_id: null }];
          }
          await http.put(`${API_PREFIX}/${organizacaoId}/${editingId}`, body);
        }
        showToast(t("toast.updated"));
      } else {
        const fd = new FormData();
        appendAvisoFormFields(fd);
        await http.post<{ data: Aviso }>(`${API_PREFIX}/${organizacaoId}`, fd, config as never);
        showToast(t("toast.created"));
      }
      closeForm();
      fetchList();
      fetchStats();
    } catch (err: unknown) {
      showToast(parseApiErrors(err, t("toast.saveError")), true);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!organizacaoId || !confirm(t("confirm.delete"))) return;
    try {
      await http.delete(`${API_PREFIX}/${organizacaoId}/${id}`);
      showToast(t("toast.deleted"));
      if (viewing?.id === id) setViewing(null);
      fetchList();
      fetchStats();
    } catch (err: unknown) {
      showToast(parseApiErrors(err, t("toast.deleteError")), true);
    }
  };

  const categoryLabel = (c: number) => {
    if (c === 1) return t("categories.maintenance");
    if (c === 2) return t("categories.meeting");
    if (c === 3) return t("categories.information");
    return "—";
  };

  const auditActorLabel = useCallback((row: unknown, kind: "registado" | "atualizado") => {
    const raw = row as Record<string, unknown> | null | undefined;
    const id =
      Number(
        raw?.[`${kind}_por`] ??
          (kind == "registado" ? raw?.registadoPorId : raw?.atualizadoPorId) ??
          0,
      ) || null;
    const rel = (raw?.[kind == "registado" ? "registadoPor" : "atualizadoPor"] ??
      raw?.[`${kind}_por_user`] ??
      null) as
      | { id?: number | string; name?: string | null; email?: string | null }
      | null;
    const relId = rel?.id != null ? Number(rel.id) : null;
    const finalId = relId && Number.isFinite(relId) ? relId : id;
    const name = rel?.name?.trim() || rel?.email?.trim() || "";
    if (name && finalId) return `${name} (#${finalId})`;
    if (name) return name;
    if (finalId) return `#${finalId}`;
    return "—";
  }, []);

  if (!canList) {
    return (
      <div className="p-4 md:p-6">
        <div className="ca-card p-6 text-sm ca-muted">{t("noPermission")}</div>
      </div>
    );
  }

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
        {canEdit && (
          <button type="button" onClick={openNew} className="ca-btn flex items-center gap-2">
            <Plus size={18} />
            {t("newNotice")}
          </button>
        )}
      </div>

      {!organizacaoId && <div className="ca-card p-4 text-sm ca-muted">{t("noOrg")}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {statsCards.map((item) => (
          <div key={item.label} className="ca-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm ca-muted">{item.label}</div>
                <div className="text-2xl font-semibold mt-1 flex items-center gap-2">
                  {statsLoading ? <Loader2 className="h-6 w-6 animate-spin text-slate-400" /> : item.value}
                </div>
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
          onSubmit={applyFilters}
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3"
        >
          <input
            className="ca-input xl:col-span-2"
            placeholder={t("filters.search")}
            value={draftQ}
            onChange={(e) => setDraftQ(e.target.value)}
          />
          <select
            className="ca-input"
            value={draftCategoria}
            onChange={(e) => setDraftCategoria(e.target.value)}
          >
            <option value="">{t("filters.category")}</option>
            <option value="1">{t("categories.maintenance")}</option>
            <option value="2">{t("categories.meeting")}</option>
            <option value="3">{t("categories.information")}</option>
          </select>
          <select
            className="ca-input"
            value={draftPrioridade}
            onChange={(e) => setDraftPrioridade(e.target.value)}
          >
            <option value="">{t("filters.priority")}</option>
            <option value="1">{t("priority.high")}</option>
            <option value="2">{t("priority.normal")}</option>
          </select>
          <select
            className="ca-input"
            value={draftEstado}
            onChange={(e) => setDraftEstado(e.target.value)}
          >
            <option value="">{t("filters.status")}</option>
            <option value="1">{t("status.active")}</option>
            <option value="2">{t("status.closed")}</option>
          </select>
          <div className="flex flex-col gap-2 md:col-span-2 xl:col-span-3">
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                className="ca-input"
                value={draftData1}
                onChange={(e) => setDraftData1(e.target.value)}
                title={t("filters.dateFrom")}
              />
              <input
                type="date"
                className="ca-input"
                value={draftData2}
                onChange={(e) => setDraftData2(e.target.value)}
                title={t("filters.dateTo")}
              />
            </div>
          </div>
          <button type="submit" className="ca-btn md:col-span-2 xl:col-span-6">
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
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/40">
                <tr>
                  <th className="py-3 px-4 text-left">{t("table.title")}</th>
                  <th className="py-3 px-4 text-left">{t("table.category")}</th>
                  <th className="py-3 px-4 text-left">{t("table.priority")}</th>
                  <th className="py-3 px-4 text-left">{t("table.published")}</th>
                  <th className="py-3 px-4 text-left">{t("table.status")}</th>
                  <th className="py-3 px-4 text-right">{t("table.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y ca-border">
                {list.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-3 font-medium max-w-[220px] truncate" title={row.titulo}>
                      {row.titulo}
                    </td>
                    <td className="px-4 py-3">{categoryLabel(row.categoria)}</td>
                    <td className="px-4 py-3">
                      <PrioridadeBadge prioridade={row.prioridade ?? null} t={t} />
                    </td>
                    <td className="px-4 py-3">{formatPublished(row.data_publicacao ?? null, locale)}</td>
                    <td className="px-4 py-3">
                      <EstadoBadge estado={row.estado} t={t} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className="ca-icon-btn"
                          title={t("actions.view")}
                          onClick={() => openView(row)}
                        >
                          <Eye size={16} />
                        </button>
                        {canEdit && (
                          <button
                            type="button"
                            className="ca-icon-btn"
                            title={t("actions.edit")}
                            onClick={() => openEdit(row)}
                          >
                            <Pencil size={16} />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            className="ca-icon-btn text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
                            title={t("actions.remove")}
                            onClick={() => handleDelete(row.id)}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {list.length === 0 && !loading && (
              <div className="py-8 text-center ca-muted text-sm">{t("empty")}</div>
            )}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t ca-border">
                <span className="text-sm ca-muted">
                  {total} {t("pagination.results")} · {t("pagination.page")} {currentPage} / {totalPages}
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

      {showForm && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={closeForm} />
          <div className="relative ml-auto h-full w-full max-w-lg ca-panel shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b ca-border">
              <h2 className="text-lg font-semibold">
                {editingId ? t("form.editTitle") : t("form.title")}
              </h2>
              <button type="button" onClick={closeForm}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="p-4 space-y-4 flex-1 overflow-y-auto ca-scroll">
                <input
                  className="ca-input"
                  placeholder={t("form.titlePlaceholder")}
                  value={form.titulo}
                  onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
                  required
                />
                <select
                  className="ca-input"
                  value={form.categoria}
                  onChange={(e) => setForm((f) => ({ ...f, categoria: Number(e.target.value) }))}
                >
                  <option value={1}>{t("categories.maintenance")}</option>
                  <option value={2}>{t("categories.meeting")}</option>
                  <option value={3}>{t("categories.information")}</option>
                </select>
                <select
                  className="ca-input"
                  value={form.prioridade}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      prioridade: e.target.value as "" | "1" | "2",
                    }))
                  }
                >
                  <option value="">{t("form.priorityOptional")}</option>
                  <option value="1">{t("priority.high")}</option>
                  <option value="2">{t("priority.normal")}</option>
                </select>
                <input
                  type="datetime-local"
                  className="ca-input"
                  value={form.data_publicacao}
                  onChange={(e) => setForm((f) => ({ ...f, data_publicacao: e.target.value }))}
                  title={t("form.publicationDate")}
                />
                {editingId != null && (
                  <select
                    className="ca-input"
                    value={form.estado}
                    onChange={(e) => setForm((f) => ({ ...f, estado: Number(e.target.value) }))}
                  >
                    <option value={1}>{t("status.active")}</option>
                    <option value={2}>{t("status.closed")}</option>
                  </select>
                )}
                <textarea
                  className="ca-input"
                  placeholder={t("form.message")}
                  rows={6}
                  value={form.descricao}
                  onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                />
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.sendToAll}
                    onChange={(e) => setForm((f) => ({ ...f, sendToAll: e.target.checked }))}
                  />
                  {t("form.sendToAll")}
                </label>
                <div>
                  <label className="text-xs ca-muted block mb-1">{t("form.image")}</label>
                  <input
                    key={formFileInputKey}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="ca-input text-sm file:mr-2"
                    onChange={(e) =>
                      setForm((f) => ({ ...f, imagem: e.target.files?.[0] ?? null }))
                    }
                  />
                  {formImagePreviewSrc && (
                    <div className="mt-3 space-y-2">
                      <div className="relative rounded-xl border ca-border overflow-hidden bg-slate-50 dark:bg-slate-900">
                        <img
                          src={formImagePreviewSrc}
                          alt=""
                          className="w-full max-h-56 object-contain"
                        />
                      </div>
                      {form.imagem && (
                        <button
                          type="button"
                          className="text-xs text-slate-600 dark:text-slate-400 hover:underline"
                          onClick={() => {
                            setForm((f) => ({ ...f, imagem: null }));
                            setFormImageObjectUrl(null);
                            setFormFileInputKey((k) => k + 1);
                          }}
                        >
                          {t("form.discardNewImage")}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 border-t ca-border flex justify-end gap-2">
                <button
                  type="button"
                  className="px-4 py-2 rounded-xl border ca-border"
                  onClick={closeForm}
                >
                  {t("cancel")}
                </button>
                <button type="submit" className="ca-btn flex items-center gap-2" disabled={formSubmitting}>
                  {formSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : editingId ? (
                    t("form.save")
                  ) : (
                    t("form.publish")
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewing && (
        <div className="fixed inset-0 z-[60] flex">
          <div className="absolute inset-0 bg-black/60" onClick={closeView} />
          <div className="relative ml-auto h-full w-full max-w-lg ca-panel shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b ca-border">
              <h2 className="text-lg font-semibold pr-2">{viewing.titulo}</h2>
              <button type="button" onClick={closeView}>
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-4 flex-1 overflow-y-auto ca-scroll">
              {viewLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <EstadoBadge estado={viewing.estado} t={t} />
                    <PrioridadeBadge prioridade={viewing.prioridade ?? null} t={t} />
                    <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-medium">
                      {categoryLabel(viewing.categoria)}
                    </span>
                  </div>
                  <p className="text-sm ca-muted">
                    {t("table.published")}: {formatPublished(viewing.data_publicacao ?? null, locale)}
                  </p>
                  <p className="text-sm">
                    <span className="ca-muted">Registado por:</span> {auditActorLabel(viewing, "registado")}
                  </p>
                  <p className="text-sm">
                    <span className="ca-muted">Atualizado por:</span> {auditActorLabel(viewing, "atualizado")}
                  </p>
                  {(() => {
                    const url = avisoImagePublicUrl(api_base_url, viewing.imagem);
                    return url ? (
                      <img src={url} alt="" className="w-full rounded-xl border ca-border max-h-56 object-contain bg-slate-50 dark:bg-slate-900" />
                    ) : null;
                  })()}
                  <div className="text-sm whitespace-pre-wrap">{viewing.descricao || "—"}</div>
                  {Array.isArray(viewing.broadcasts) && viewing.broadcasts.length > 0 && (
                    <div>
                      <div className="text-xs font-medium ca-muted mb-2">{t("detail.recipients")}</div>
                      <ul className="text-sm space-y-1 list-disc pl-4">
                        {viewing.broadcasts.map((b) => (
                          <li key={b.id ?? `${b.grupo}-${b.receptor_id}`}>{broadcastSummary(b, t)}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PrioridadeBadge({
  prioridade,
  t,
}: {
  prioridade: number | null;
  t: (key: string) => string;
}) {
  if (prioridade === 1) {
    return (
      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
        {t("priority.high")}
      </span>
    );
  }
  if (prioridade === 2) {
    return (
      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
        {t("priority.normal")}
      </span>
    );
  }
  return <span className="text-xs ca-muted">—</span>;
}

function EstadoBadge({ estado, t }: { estado: number; t: (key: string) => string }) {
  if (estado === 1) {
    return (
      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
        {t("status.active")}
      </span>
    );
  }
  return (
    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
      {t("status.closed")}
    </span>
  );
}
