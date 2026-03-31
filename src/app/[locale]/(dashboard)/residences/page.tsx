"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Home,
  CheckCircle2,
  CircleOff,
  RefreshCw,
  Plus,
  X,
  Eye,
  Pencil,
  Trash2,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

type Bloco = {
  id: number;
  designacao?: string | null;
  nome?: string | null;
  descricao?: string | null;
};

type Residencia = {
  id: number;
  designacao: string;
  bloco_id?: number | null;
  bloco?: Bloco | null;
  descricao?: string | null;
  estado?: number;
  ocupada?: number;
  moradores_count?: number;
  imagem?: string | null;
  organizacao_id?: number;
};

type ResidenciaListResponse = {
  data: Residencia[];
  total: number;
  per_page: number;
  current_page: number;
};

const API_PREFIX = "/residencias";
const ORG_KEY = "ca.selected.organization";

function EstadoBadge({ estado, t }: { estado?: number; t: (key: string) => string }) {
  if (estado == 1) {
    return (
      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
        {t("status.active")}
      </span>
    );
  }
  return (
    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
      {t("status.inactive")}
    </span>
  );
}

function OcupacaoBadge({ ocupada, t }: { ocupada?: number; t: (key: string) => string }) {
  if (ocupada == 1) {
    return (
      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
        {t("occupation.occupied")}
      </span>
    );
  }
  return (
    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300">
      {t("occupation.free")}
    </span>
  );
}

export default function Page() {
  const t = useTranslations("residencesPage");
  const { http, api_base_url } = useAuth();
  const [organizacaoId, setOrganizacaoId] = useState<number | null>(null);

  const [list, setList] = useState<Residencia[]>([]);
  const [total, setTotal] = useState(0);
  const [perPage, setPerPage] = useState(15);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; isError?: boolean } | null>(null);

  const [filtroDesignacao, setFiltroDesignacao] = useState("");
  const [filtroBlocoId, setFiltroBlocoId] = useState<string>("");
  const [filtroEstado, setFiltroEstado] = useState<string>("all");
  const [filtroOcupada, setFiltroOcupada] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState<
    "ativar" | "desativar" | "ocupar" | "libertar" | "eliminar" | null
  >(null);

  const [showModal, setShowModal] = useState(false);
  const [showDetails, setShowDetails] = useState<Residencia | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [blocosAtivos, setBlocosAtivos] = useState<Bloco[]>([]);
  const [departamentosLoading, setDepartamentosLoading] = useState(false);
  const [imagemUpload, setImagemUpload] = useState<File | null>(null);
  const [imagemPreviewUrl, setImagemPreviewUrl] = useState<string | null>(null);
  const [imagemAtualUrl, setImagemAtualUrl] = useState<string | null>(null);
  const [form, setForm] = useState({
    designacao: "",
    bloco_id: "",
    descricao: "",
    estado: 1,
    ocupada: 0,
  });

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

  const showToast = useCallback((message: string, isError?: boolean) => {
    setToast({ message, isError });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const getBlocoLabel = useCallback(
    (bloco?: Bloco | null) => bloco?.designacao ?? bloco?.nome ?? bloco?.descricao ?? t("table.noBlock"),
    [t],
  );

  const buildImageUrl = useCallback(
    (residencia: Residencia) => {
      const path = residencia.imagem;
      if (!path) return null;
      if (path.startsWith("http://") || path.startsWith("https://")) return path;
      const base = api_base_url.replace(/\/$/, "");
      const normalized = path.trim();
      let p = "";
      if (normalized.startsWith("/")) {
        p = normalized;
      } else if (normalized.includes("/")) {
        p = normalized.startsWith("storage/") ? `/${normalized}` : `/storage/${normalized}`;
      } else {
        // API currently stores only filename in public/residencias
        p = `/storage/residencias/${normalized}`;
      }
      return `${base}${p}`;
    },
    [api_base_url],
  );

  const fetchBlocosAtivos = useCallback(async () => {
    if (!organizacaoId) {
      setBlocosAtivos([]);
      return;
    }
    setDepartamentosLoading(true);
    try {
      const res = await http.get(`/departamentos/${organizacaoId}/ativados`);
      const payload = res.data as { data?: unknown };
      const arr = Array.isArray(payload?.data) ? payload.data : [];
      const blocosParsed = arr
        .map((item) => item as Bloco)
        .filter((item) => typeof item?.id == "number" && item.id > 0);
      setBlocosAtivos(blocosParsed);
    } catch {
      setBlocosAtivos([]);
    } finally {
      setDepartamentosLoading(false);
    }
  }, [http, organizacaoId]);

  const fetchList = useCallback(async () => {
    let loadingTimeout: ReturnType<typeof setTimeout> | null = null;
    if (!organizacaoId) {
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
      if (filtroDesignacao.trim()) params.designacao = filtroDesignacao.trim();
      if (filtroBlocoId.trim()) params.bloco_id = Number(filtroBlocoId);
      if (filtroEstado == "0" || filtroEstado == "1") params.estado = Number(filtroEstado);
      if (filtroOcupada == "0" || filtroOcupada == "1") params.ocupada = Number(filtroOcupada);

      const res = await http.get<ResidenciaListResponse>(`${API_PREFIX}/${organizacaoId}`, { params });
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
    currentPage,
    filtroBlocoId,
    filtroDesignacao,
    filtroEstado,
    filtroOcupada,
    http,
    organizacaoId,
    perPage,
    showToast,
    t,
  ]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    fetchBlocosAtivos();
  }, [fetchBlocosAtivos]);

  useEffect(() => {
    setSelectedIds([]);
  }, [list]);

  const openNew = () => {
    setEditingId(null);
    setForm({
      designacao: "",
      bloco_id: "",
      descricao: "",
      estado: 1,
      ocupada: 0,
    });
    setImagemUpload(null);
    setImagemAtualUrl(null);
    setImagemPreviewUrl(null);
    setShowModal(true);
  };

  const openEdit = (r: Residencia) => {
    setEditingId(r.id);
    setForm({
      designacao: r.designacao ?? "",
      bloco_id: r.bloco_id ? String(r.bloco_id) : "",
      descricao: r.descricao ?? "",
      estado: r.estado ?? 1,
      ocupada: r.ocupada ?? 0,
    });
    const currentImage = buildImageUrl(r);
    setImagemUpload(null);
    setImagemAtualUrl(currentImage);
    setImagemPreviewUrl(currentImage);
    setShowModal(true);
  };

  const closeModal = () => {
    if (imagemPreviewUrl && imagemPreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(imagemPreviewUrl);
    }
    setImagemUpload(null);
    setImagemAtualUrl(null);
    setImagemPreviewUrl(null);
    setShowModal(false);
    setEditingId(null);
  };

  const onFileChange = (file: File | null) => {
    if (imagemPreviewUrl && imagemPreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(imagemPreviewUrl);
    }
    setImagemUpload(file);
    if (!file) {
      setImagemPreviewUrl(imagemAtualUrl);
      return;
    }
    setImagemPreviewUrl(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizacaoId) {
      showToast(t("toast.orgRequired"), true);
      return;
    }
    if (!form.designacao.trim()) return;

    setFormSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("designacao", form.designacao.trim());
      if (form.bloco_id) formData.append("bloco_id", form.bloco_id);
      if (form.descricao.trim()) formData.append("descricao", form.descricao.trim());
      formData.append("estado", String(form.estado));
      formData.append("ocupada", String(form.ocupada));
      if (imagemUpload) formData.append("imagem", imagemUpload);

      const config = { headers: { "Content-Type": undefined } };
      if (editingId) {
        formData.append("_method", "PUT");
        await http.post(`${API_PREFIX}/${organizacaoId}/${editingId}`, formData, config as never);
        showToast(t("toast.updated"));
      } else {
        await http.post(`${API_PREFIX}/${organizacaoId}`, formData, config as never);
        showToast(t("toast.created"));
      }

      closeModal();
      fetchList();
    } catch (err: unknown) {
      const msg =
        err && typeof err == "object" && "response" in err
          ? (err as { response?: { data?: { errors?: Record<string, string[]> } } }).response?.data?.errors
            ? Object.values(
                (err as { response: { data: { errors: Record<string, string[]> } } }).response.data.errors,
              )
                .flat()
                .join(" ")
            : t("toast.saveError")
          : t("toast.saveError");
      showToast(msg, true);
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

  const handleBulkAction = async (action: "ativar" | "desativar" | "ocupar" | "libertar" | "eliminar") => {
    if (!organizacaoId) {
      showToast(t("toast.orgRequired"), true);
      return;
    }
    if (selectedIds.length == 0) {
      showToast(t("toast.selectAtLeastOne"), true);
      return;
    }
    if (action == "eliminar" && !confirm(t("confirm.deleteBulk"))) return;

    const endpointByAction = {
      ativar: `${API_PREFIX}/${organizacaoId}/ativar-bulk`,
      desativar: `${API_PREFIX}/${organizacaoId}/desativar-bulk`,
      ocupar: `${API_PREFIX}/${organizacaoId}/ocupar-bulk`,
      libertar: `${API_PREFIX}/${organizacaoId}/libertar-bulk`,
      eliminar: `${API_PREFIX}/${organizacaoId}/eliminar-bulk`,
    };

    try {
      setBulkActionLoading(action);
      await http.post(endpointByAction[action], { ids: selectedIds });
      if (action == "ativar") showToast(t("toast.bulkActivated"));
      if (action == "desativar") showToast(t("toast.bulkDeactivated"));
      if (action == "ocupar") showToast(t("toast.bulkOccupied"));
      if (action == "libertar") showToast(t("toast.bulkFreed"));
      if (action == "eliminar") showToast(t("toast.bulkDeleted"));
      setSelectedIds([]);
      fetchList();
    } catch {
      showToast(t("toast.bulkError"), true);
    } finally {
      setBulkActionLoading(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const cardsStats = useMemo(() => {
    const ativos = list.filter((r) => r.estado == 1).length;
    const inativos = list.filter((r) => r.estado == 0).length;
    const ocupadas = list.filter((r) => r.ocupada == 1).length;
    const desocupadas = list.filter((r) => r.ocupada == 0).length;
    return {
      total: list.length,
      ativos,
      inativos,
      ocupadas,
      desocupadas,
    };
  }, [list]);

  const statCards = [
    {
      label: t("stats.total"),
      value: cardsStats.total,
      icon: Home,
      color: "text-blue-600",
      bg: "bg-blue-100/60 dark:bg-blue-900/20",
    },
    {
      label: t("stats.active"),
      value: cardsStats.ativos,
      icon: CheckCircle2,
      color: "text-green-600",
      bg: "bg-green-100/60 dark:bg-green-900/20",
    },
    {
      label: t("stats.inactive"),
      value: cardsStats.inativos,
      icon: CircleOff,
      color: "text-slate-600",
      bg: "bg-slate-100/60 dark:bg-slate-800/40",
    },
    {
      label: t("stats.occupied"),
      value: cardsStats.ocupadas,
      icon: Home,
      color: "text-amber-600",
      bg: "bg-amber-100/60 dark:bg-amber-900/20",
    },
    {
      label: t("stats.free"),
      value: cardsStats.desocupadas,
      icon: Home,
      color: "text-cyan-600",
      bg: "bg-cyan-100/60 dark:bg-cyan-900/20",
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
        <button onClick={openNew} className="ca-btn flex items-center gap-2">
          <Plus size={18} />
          {t("new")}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
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
            setCurrentPage(1);
            fetchList();
          }}
          className="grid grid-cols-1 md:grid-cols-4 gap-3"
        >
          <input
            className="ca-input"
            placeholder={t("filters.designation")}
            value={filtroDesignacao}
            onChange={(e) => setFiltroDesignacao(e.target.value)}
          />
          <select className="ca-input" value={filtroBlocoId} onChange={(e) => setFiltroBlocoId(e.target.value)}>
            <option value="">{t("filters.block")}</option>
            {blocosAtivos.map((bloco) => (
              <option key={bloco.id} value={bloco.id}>
                {getBlocoLabel(bloco)}
              </option>
            ))}
          </select>
          <select className="ca-input" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
            <option value="all">{t("filters.status")}</option>
            <option value="1">{t("status.active")}</option>
            <option value="0">{t("status.inactive")}</option>
          </select>
          <select className="ca-input" value={filtroOcupada} onChange={(e) => setFiltroOcupada(e.target.value)}>
            <option value="all">{t("filters.occupation")}</option>
            <option value="1">{t("occupation.occupied")}</option>
            <option value="0">{t("occupation.free")}</option>
          </select>
          <button type="submit" className="ca-btn md:col-span-4">
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
              <div className="flex gap-2">
                <button
                  type="button"
                  className="ca-btn text-sm"
                  disabled={selectedIds.length == 0 || bulkActionLoading != null}
                  onClick={() => handleBulkAction("ativar")}
                >
                  <span className="inline-flex items-center gap-2">
                    {bulkActionLoading == "ativar" ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    {t("bulk.activate")}
                  </span>
                </button>
                <button
                  type="button"
                  className="ca-btn text-sm"
                  disabled={selectedIds.length == 0 || bulkActionLoading != null}
                  onClick={() => handleBulkAction("desativar")}
                >
                  <span className="inline-flex items-center gap-2">
                    {bulkActionLoading == "desativar" ? <Loader2 size={14} className="animate-spin" /> : <CircleOff size={14} />}
                    {t("bulk.deactivate")}
                  </span>
                </button>
                <button
                  type="button"
                  className="ca-btn text-sm"
                  disabled={selectedIds.length == 0 || bulkActionLoading != null}
                  onClick={() => handleBulkAction("eliminar")}
                >
                  <span className="inline-flex items-center gap-2">
                    {bulkActionLoading == "eliminar" ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    {t("bulk.delete")}
                  </span>
                </button>
                <button
                  type="button"
                  className="ca-btn text-sm"
                  disabled={selectedIds.length == 0 || bulkActionLoading != null}
                  onClick={() => handleBulkAction("ocupar")}
                >
                  <span className="inline-flex items-center gap-2">
                    {bulkActionLoading == "ocupar" ? <Loader2 size={14} className="animate-spin" /> : <Home size={14} />}
                    {t("bulk.occupy")}
                  </span>
                </button>
                <button
                  type="button"
                  className="ca-btn text-sm"
                  disabled={selectedIds.length == 0 || bulkActionLoading != null}
                  onClick={() => handleBulkAction("libertar")}
                >
                  <span className="inline-flex items-center gap-2">
                    {bulkActionLoading == "libertar" ? <Loader2 size={14} className="animate-spin" /> : <Home size={14} />}
                    {t("bulk.free")}
                  </span>
                </button>
              </div>
            </div>

            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/40">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">
                    <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
                  </th>
                  <th className="px-4 py-3 text-left font-medium">#</th>
                  <th className="px-4 py-3 text-left font-medium">{t("table.image")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("table.designation")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("table.block")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("table.status")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("table.occupation")}</th>
                  <th className="px-4 py-3 text-right font-medium">{t("table.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y ca-border">
                {list.map((row, index) => {
                  const imgUrl = buildImageUrl(row);
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
                      <td className="px-4 py-3">
                        <div className="h-12 w-16 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                          {imgUrl ? (
                            <img
                              src={imgUrl}
                              alt={row.designacao}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = "";
                                (e.target as HTMLImageElement).style.display = "none";
                                const parent = (e.target as HTMLImageElement).nextElementSibling;
                                if (parent) (parent as HTMLElement).style.display = "flex";
                              }}
                            />
                          ) : null}
                          <span
                            className="h-full w-full items-center justify-center text-slate-500"
                            style={{ display: imgUrl ? "none" : "flex" }}
                          >
                            <ImageIcon size={18} />
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium">{row.designacao}</td>
                      <td className="px-4 py-3">{getBlocoLabel(row.bloco)}</td>
                      <td className="px-4 py-3">
                        <EstadoBadge estado={row.estado} t={t} />
                      </td>
                      <td className="px-4 py-3">
                        <OcupacaoBadge ocupada={row.ocupada} t={t} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            className="ca-icon-btn"
                            title={t("actions.view")}
                            onClick={() => setShowDetails(row)}
                          >
                            <Eye size={16} />
                          </button>
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
                            onClick={() => handleDelete(row.id)}
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

            {list.length == 0 && !loading && <div className="py-8 text-center ca-muted text-sm">{t("empty")}</div>}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t ca-border">
                <span className="text-sm ca-muted">
                  {total} resultado(s) · página {currentPage} de {totalPages}
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

      {showDetails && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowDetails(null)} />
          <div className="relative m-auto w-full max-w-lg ca-panel shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b ca-border">
              <h2 className="text-lg font-semibold">
                {t("details.title")} {showDetails.designacao}
              </h2>
              <button onClick={() => setShowDetails(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div className="text-sm">
                <span className="ca-muted">{t("details.id")}:</span> {showDetails.id}
              </div>
              <div className="text-sm">
                <span className="ca-muted">{t("details.block")}:</span> {getBlocoLabel(showDetails.bloco)}
              </div>
              <div className="text-sm">
                <span className="ca-muted">{t("details.status")}:</span>{" "}
                {showDetails.estado == 1 ? t("status.active") : t("status.inactive")}
              </div>
              <div className="text-sm">
                <span className="ca-muted">{t("details.occupation")}:</span>{" "}
                {showDetails.ocupada == 1 ? t("occupation.occupied") : t("occupation.free")}
              </div>
              <div className="text-sm">
                <span className="ca-muted">{t("details.residents")}:</span> {showDetails.moradores_count ?? 0}
              </div>
              <div className="text-sm">
                <span className="ca-muted">{t("details.description")}:</span>{" "}
                {showDetails.descricao?.trim() ? showDetails.descricao : "—"}
              </div>
            </div>
            <div className="p-4 border-t ca-border flex justify-end">
              <button className="px-4 py-2 rounded-xl border ca-border" onClick={() => setShowDetails(null)}>
                {t("close")}
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={closeModal} />
          <div className="relative ml-auto h-full w-full max-w-md ca-panel shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b ca-border">
              <h2 className="text-lg font-semibold">{editingId ? t("form.edit") : t("form.new")}</h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="ca-icon-btn"
                  title={t("actions.refreshDepartments")}
                  onClick={fetchBlocosAtivos}
                  disabled={departamentosLoading}
                >
                  <RefreshCw size={16} className={departamentosLoading ? "animate-spin" : ""} />
                </button>
                <button type="button" onClick={closeModal}>
                  <X size={20} />
                </button>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="p-4 space-y-4 flex-1 overflow-y-auto ca-scroll">
                <input
                  className="ca-input"
                  placeholder={t("form.designation")}
                  value={form.designacao}
                  onChange={(e) => setForm((f) => ({ ...f, designacao: e.target.value }))}
                  required
                />
                <select
                  className="ca-input"
                  value={form.bloco_id}
                  onChange={(e) => setForm((f) => ({ ...f, bloco_id: e.target.value }))}
                >
                  <option value="">{t("form.noBlock")}</option>
                  {blocosAtivos.map((bloco) => (
                    <option key={bloco.id} value={bloco.id}>
                      {getBlocoLabel(bloco)}
                    </option>
                  ))}
                </select>
                <textarea
                  className="ca-input"
                  placeholder={t("form.description")}
                  rows={3}
                  value={form.descricao}
                  onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                />
                <input
                  type="file"
                  accept="image/*"
                  className="ca-input"
                  onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
                />
                {imagemPreviewUrl ? (
                  <img
                    src={imagemPreviewUrl}
                    alt={t("form.imagePreviewAlt")}
                    className="h-24 w-full rounded-xl object-cover border ca-border"
                  />
                ) : (
                  <div className="h-24 w-full rounded-xl border ca-border flex items-center justify-center text-sm ca-muted">
                    {t("form.noImagePreview")}
                  </div>
                )}
                <select
                  className="ca-input"
                  value={form.estado}
                  onChange={(e) => setForm((f) => ({ ...f, estado: Number(e.target.value) }))}
                >
                    <option value={1}>{t("status.active")}</option>
                    <option value={0}>{t("status.inactive")}</option>
                </select>
                <select
                  className="ca-input"
                  value={form.ocupada}
                  onChange={(e) => setForm((f) => ({ ...f, ocupada: Number(e.target.value) }))}
                >
                    <option value={1}>{t("occupation.occupied")}</option>
                    <option value={0}>{t("occupation.free")}</option>
                </select>
              </div>
              <div className="p-4 border-t ca-border flex justify-end gap-2">
                <button
                  type="button"
                  className="px-4 py-2 rounded-xl border ca-border"
                  onClick={closeModal}
                >
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
