"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Video,
  Wifi,
  WifiOff,
  RefreshCw,
  Plus,
  X,
  Pencil,
  Trash2,
  MapPin,
  Loader2,
  CheckCircle2,
  CircleOff,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

type Camera = {
  id: number;
  designacao: string;
  bloco_id?: number | null;
  estado?: number;
  imagem?: string | null;
  organizacao_id?: number;
  bloco?: { id: number; designacao?: string | null } | null;
};

type CameraListResponse = {
  data: Camera[];
  total: number;
  per_page: number;
  current_page: number;
};

type Departamento = {
  id: number;
  designacao: string;
};

type DepartamentoListResponse = {
  data: Departamento[];
};

const API_PREFIX = "/cameras";
const DEPARTAMENTOS_API_PREFIX = "/departamentos";
const ORG_KEY = "ca.selected.organization";

function EstadoBadge({ estado, t }: { estado?: number; t: ReturnType<typeof useTranslations> }) {
  const active = estado == 1;
  return (
    <span className="flex items-center gap-1 text-xs font-medium">
      <span className={`h-2 w-2 rounded-full ${active ? "bg-green-600" : "bg-red-600"}`} />
      {active ? t("status.active") : t("status.inactive")}
    </span>
  );
}

export default function Page() {
  const t = useTranslations("camerasPage");
  const { http, api_base_url } = useAuth();
  const [organizacaoId, setOrganizacaoId] = useState<number | null>(null);

  const [list, setList] = useState<Camera[]>([]);
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [total, setTotal] = useState(0);
  const [perPage, setPerPage] = useState(15);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; isError?: boolean } | null>(null);

  const [filtroDesignacao, setFiltroDesignacao] = useState("");
  const [filtroBlocoId, setFiltroBlocoId] = useState("all");
  const [filtroEstado, setFiltroEstado] = useState("all");

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState<"ativar" | "desativar" | "eliminar" | null>(
    null,
  );

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [departamentosLoading, setDepartamentosLoading] = useState(false);
  const [showCameraPreview, setShowCameraPreview] = useState(false);
  const [previewCamera, setPreviewCamera] = useState<Camera | null>(null);
  const [cameraPreviewError, setCameraPreviewError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const [form, setForm] = useState({
    designacao: "",
    bloco_id: "",
    estado: 1,
    imagem: null as File | null,
    imagemPreviewUrl: "",
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

  const getImageUrl = useCallback(
    (imageName?: string | null) => {
      if (!imageName) return "/cameras/placeholder.jpg";
      if (/^https?:\/\//i.test(imageName)) return imageName;
      const base = api_base_url.replace(/\/$/, "");
      return `${base}/storage/cameras/${imageName}`;
    },
    [api_base_url],
  );

  const fetchDepartamentos = useCallback(async () => {
    if (!organizacaoId) {
      setDepartamentos([]);
      return;
    }
    setDepartamentosLoading(true);
    try {
      const res = await http.get<DepartamentoListResponse>(`${DEPARTAMENTOS_API_PREFIX}/${organizacaoId}`, {
        params: { per_page: 100 },
      });
      setDepartamentos(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch {
      setDepartamentos([]);
      showToast(t("toast.loadBlocksError"), true);
    } finally {
      setDepartamentosLoading(false);
    }
  }, [http, organizacaoId, showToast, t]);

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
      const params: Record<string, string | number> = { per_page: perPage, page: currentPage };
      if (filtroDesignacao.trim()) params.designacao = filtroDesignacao.trim();
      if (filtroBlocoId != "all") params.bloco_id = Number(filtroBlocoId);
      if (filtroEstado == "0" || filtroEstado == "1") params.estado = Number(filtroEstado);

      const res = await http.get<CameraListResponse>(`${API_PREFIX}/${organizacaoId}`, { params });
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
  }, [currentPage, filtroBlocoId, filtroDesignacao, filtroEstado, http, organizacaoId, perPage, showToast, t]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    fetchDepartamentos();
  }, [fetchDepartamentos]);

  useEffect(() => {
    setSelectedIds([]);
  }, [list]);

  const openNew = () => {
    setEditingId(null);
    setForm({
      designacao: "",
      bloco_id: "",
      estado: 1,
      imagem: null,
      imagemPreviewUrl: "",
    });
    setShowModal(true);
  };

  const openEdit = (row: Camera) => {
    setEditingId(row.id);
    setForm({
      designacao: row.designacao ?? "",
      bloco_id: row.bloco_id ? String(row.bloco_id) : "",
      estado: row.estado ?? 1,
      imagem: null,
      imagemPreviewUrl: getImageUrl(row.imagem),
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
  };

  const onSelectImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) {
      setForm((prev) => ({ ...prev, imagem: null, imagemPreviewUrl: prev.imagemPreviewUrl || "" }));
      return;
    }
    setForm((prev) => ({
      ...prev,
      imagem: file,
      imagemPreviewUrl: URL.createObjectURL(file),
    }));
  };

  const stopPreviewStream = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const openCameraPreview = (cam: Camera) => {
    setPreviewCamera(cam);
    setCameraPreviewError(null);
    setShowCameraPreview(true);
  };

  const closeCameraPreview = useCallback(() => {
    setShowCameraPreview(false);
    setPreviewCamera(null);
    setCameraPreviewError(null);
    stopPreviewStream();
  }, [stopPreviewStream]);

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
      formData.append("estado", String(form.estado));
      if (form.bloco_id) formData.append("bloco_id", String(Number(form.bloco_id)));
      if (form.imagem) formData.append("imagem", form.imagem);

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
            ? Object.values((err as { response: { data: { errors: Record<string, string[]> } } }).response.data.errors)
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

  const handleToggleEstado = async (row: Camera) => {
    if (!organizacaoId) {
      showToast(t("toast.orgRequired"), true);
      return;
    }
    const endpoint = row.estado == 1 ? "desativar" : "ativar";
    try {
      await http.post(`${API_PREFIX}/${organizacaoId}/${row.id}/${endpoint}`);
      showToast(row.estado == 1 ? t("toast.deactivated") : t("toast.activated"));
      fetchList();
    } catch {
      showToast(t("toast.statusError"), true);
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

  const handleBulkAction = async (action: "ativar" | "desativar" | "eliminar") => {
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
      eliminar: `${API_PREFIX}/${organizacaoId}/eliminar-bulk`,
    };
    const successByAction = {
      ativar: t("toast.bulkActivated"),
      desativar: t("toast.bulkDeactivated"),
      eliminar: t("toast.bulkDeleted"),
    };

    try {
      setBulkActionLoading(action);
      await http.post(endpointByAction[action], { ids: selectedIds });
      showToast(successByAction[action]);
      setSelectedIds([]);
      fetchList();
    } catch {
      showToast(t("toast.bulkError"), true);
    } finally {
      setBulkActionLoading(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const camerasStats = useMemo(() => {
    const ativos = list.filter((c) => c.estado == 1).length;
    const inativos = list.filter((c) => c.estado == 0).length;
    return { total: list.length, ativos, inativos };
  }, [list]);

  const stats = [
    {
      label: t("stats.active"),
      value: camerasStats.ativos,
      icon: Wifi,
      color: "text-green-600",
      bg: "bg-green-100/60 dark:bg-green-900/20",
    },
    {
      label: t("stats.inactive"),
      value: camerasStats.inativos,
      icon: WifiOff,
      color: "text-red-600",
      bg: "bg-red-100/60 dark:bg-red-900/20",
    },
    {
      label: t("stats.total"),
      value: camerasStats.total,
      icon: Video,
      color: "text-slate-600",
      bg: "bg-slate-100/60 dark:bg-slate-800/40",
    },
  ];

  useEffect(() => {
    if (!showCameraPreview) return;
    let cancelled = false;

    const startPreview = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraPreviewError(t("cameraPreview.notSupported"));
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        mediaStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
      } catch {
        setCameraPreviewError(t("cameraPreview.permissionError"));
      }
    };

    startPreview();
    return () => {
      cancelled = true;
      stopPreviewStream();
    };
  }, [showCameraPreview, stopPreviewStream, t]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {toast && (
        <div
          className={`fixed top-4 right-4 z-[100] px-4 py-2 rounded-xl shadow-lg text-sm ${
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

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {stats.map((item) => (
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
          className="grid grid-cols-1 md:grid-cols-3 gap-3"
        >
          <input
            className="ca-input"
            placeholder={t("filters.designation")}
            value={filtroDesignacao}
            onChange={(e) => setFiltroDesignacao(e.target.value)}
          />
          <select className="ca-input" value={filtroBlocoId} onChange={(e) => setFiltroBlocoId(e.target.value)}>
            <option value="all">{t("filters.block")}</option>
            {departamentos.map((d) => (
              <option key={d.id} value={d.id}>
                {d.designacao}
              </option>
            ))}
          </select>
          <select className="ca-input" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
            <option value="all">{t("filters.status")}</option>
            <option value="1">{t("status.active")}</option>
            <option value="0">{t("status.inactive")}</option>
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
              <div className="flex items-center gap-3">
                <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
                <span className="text-sm ca-muted">
                  {selectedIds.length} {t("bulk.selected")}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="ca-btn text-sm"
                  disabled={selectedIds.length == 0 || bulkActionLoading != null}
                  onClick={() => handleBulkAction("ativar")}
                >
                  {bulkActionLoading == "ativar" ? <Loader2 size={14} className="animate-spin" /> : t("bulk.activate")}
                </button>
                <button
                  type="button"
                  className="ca-btn text-sm"
                  disabled={selectedIds.length == 0 || bulkActionLoading != null}
                  onClick={() => handleBulkAction("desativar")}
                >
                  {bulkActionLoading == "desativar" ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    t("bulk.deactivate")
                  )}
                </button>
                <button
                  type="button"
                  className="ca-btn text-sm"
                  disabled={selectedIds.length == 0 || bulkActionLoading != null}
                  onClick={() => handleBulkAction("eliminar")}
                >
                  {bulkActionLoading == "eliminar" ? <Loader2 size={14} className="animate-spin" /> : t("bulk.delete")}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 p-4">
              {list.map((cam) => (
                <div
                  key={cam.id}
                  className="ca-card overflow-hidden border ca-border cursor-pointer"
                  onClick={() => openCameraPreview(cam)}
                >
                  <div className="relative h-44 bg-slate-200 dark:bg-slate-700">
                    <img
                      src={getImageUrl(cam.imagem)}
                      alt={cam.designacao}
                      className="h-full w-full object-cover"
                      onError={(e) => ((e.target as HTMLImageElement).src = "/cameras/placeholder.jpg")}
                    />
                    <div className="absolute top-2 right-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(cam.id)}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => toggleRowSelection(cam.id)}
                      />
                    </div>
                  </div>

                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium truncate">{cam.designacao}</div>
                      <EstadoBadge estado={cam.estado} t={t} />
                    </div>

                    <div className="flex items-center gap-1 text-xs ca-muted">
                      <MapPin size={14} />
                      {cam.bloco?.designacao || t("table.noBlock")}
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        className="ca-icon-btn"
                        title={t("actions.edit")}
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(cam);
                        }}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        className="ca-icon-btn"
                        title={cam.estado == 1 ? t("actions.deactivate") : t("actions.activate")}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleEstado(cam);
                        }}
                      >
                        {cam.estado == 1 ? <CircleOff size={16} /> : <CheckCircle2 size={16} />}
                      </button>
                      <button
                        type="button"
                        className="ca-icon-btn text-red-600"
                        title={t("actions.remove")}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(cam.id);
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {list.length == 0 && !loading && <div className="py-8 text-center ca-muted text-sm">{t("empty")}</div>}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t ca-border">
                <span className="text-sm ca-muted">
                  {t("pagination.results", { total, currentPage, totalPages })}
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
                  title={t("actions.refreshBlocks")}
                  onClick={fetchDepartamentos}
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
                  disabled={departamentosLoading}
                >
                  <option value="">
                    {departamentosLoading ? t("form.loadingBlocks") : t("form.noBlock")}
                  </option>
                  {departamentos.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.designacao}
                    </option>
                  ))}
                </select>
                <input type="file" className="ca-input" accept="image/*" onChange={onSelectImage} />
                {form.imagemPreviewUrl && (
                  <img src={form.imagemPreviewUrl} alt={t("form.imagePreviewAlt")} className="w-full h-36 object-cover rounded-xl" />
                )}
                {editingId != null && (
                  <select
                    className="ca-input"
                    value={form.estado}
                    onChange={(e) => setForm((f) => ({ ...f, estado: Number(e.target.value) }))}
                  >
                    <option value={1}>{t("status.active")}</option>
                    <option value={0}>{t("status.inactive")}</option>
                  </select>
                )}
              </div>

              <div className="p-4 border-t ca-border flex justify-end gap-2">
                <button type="button" className="px-4 py-2 rounded-xl border ca-border" onClick={closeModal}>
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

      {showCameraPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={closeCameraPreview} />
          <div className="relative w-full max-w-6xl ca-panel shadow-2xl rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b ca-border">
              <div>
                <h3 className="text-lg font-semibold">{t("cameraPreview.title")}</h3>
                <p className="text-xs ca-muted">{previewCamera?.designacao ?? "—"}</p>
              </div>
              <button type="button" onClick={closeCameraPreview} className="ca-icon-btn">
                <X size={18} />
              </button>
            </div>
            <div className="p-4">
              {cameraPreviewError ? (
                <div className="text-sm text-red-600 dark:text-red-400">{cameraPreviewError}</div>
              ) : (
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full aspect-video bg-black rounded-xl object-cover"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
