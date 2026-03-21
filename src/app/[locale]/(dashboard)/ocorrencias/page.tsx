"use client";
/* eslint-disable @next/next/no-img-element -- fotos servidas pelo storage da API Laravel */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ShieldAlert,
  AlertTriangle,
  ClipboardList,
  Plus,
  X,
  Eye,
  Pencil,
  Trash2,
  Loader2,
  Images,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/hooks/useAuth";
import useLocale from "@/hooks/useLocale";
import type {
  Ocorrencia,
  OcorrenciaImagem,
  OcorrenciaImagensListResponse,
  OcorrenciaListResponse,
  OcorrenciaShowResponse,
} from "@/types/ocorrencia";

const API_PREFIX = "/ocorrencias";
const ORG_KEY = "ca.selected.organization";

const NIVEIS_EDITAR = [1, 2, 3];
const NIVEIS_ELIMINAR = [1, 2];

type LookupItem = { id: number; nome: string };

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

function parseLookupItems(payload: unknown): LookupItem[] {
  const root = payload as { data?: unknown } | unknown[];
  const arr = Array.isArray(root)
    ? root
    : Array.isArray((root as { data?: unknown }).data)
      ? ((root as { data: unknown[] }).data ?? [])
      : [];
  return arr
    .map((item) => {
      const raw = item as {
        id?: number | string;
        nome?: string;
        designacao?: string;
        descricao?: string;
      };
      const id = typeof raw.id == "number" ? raw.id : Number(raw.id);
      const nome =
        typeof raw.designacao == "string"
          ? raw.designacao.trim()
          : typeof raw.nome == "string"
            ? raw.nome.trim()
            : typeof raw.descricao == "string"
              ? raw.descricao.trim()
              : "";
      if (!Number.isFinite(id) || id <= 0 || !nome) return null;
      return { id, nome };
    })
    .filter((v): v is LookupItem => v != null);
}

function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocalValue(v: string): string {
  if (!v) return "";
  return v.replace("T", " ") + ":00";
}

function formatTableDate(iso: string, locale: string): { date: string; time: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: "—", time: "—" };
  return {
    date: d.toLocaleDateString(locale, { day: "2-digit", month: "2-digit", year: "numeric" }),
    time: d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }),
  };
}

type FilterState = {
  q: string;
  tipo: string;
  categoria: string;
  periodo: string;
  estado: string;
  nivel: string;
  local: string;
  data1: string;
  data2: string;
};

const emptyFilters: FilterState = {
  q: "",
  tipo: "",
  categoria: "",
  periodo: "",
  estado: "",
  nivel: "",
  local: "",
  data1: "",
  data2: "",
};

export default function Page() {
  const t = useTranslations("occurrences");
  const { http, user, api_base_url } = useAuth();
  const locale = useLocale();

  const [organizacaoId, setOrganizacaoId] = useState<number | null>(null);
  const [list, setList] = useState<Ocorrencia[]>([]);
  const [total, setTotal] = useState(0);
  const [perPage, setPerPage] = useState(15);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statTotal, setStatTotal] = useState(0);
  const [statHighRisk, setStatHighRisk] = useState(0);
  const [statSecurity, setStatSecurity] = useState(0);

  const [draftFilters, setDraftFilters] = useState<FilterState>(emptyFilters);
  const [filters, setFilters] = useState<FilterState>(emptyFilters);

  const [departamentos, setDepartamentos] = useState<LookupItem[]>([]);
  const [toast, setToast] = useState<{ message: string; isError?: boolean } | null>(null);

  const [viewing, setViewing] = useState<Ocorrencia | null>(null);
  const [viewLoading, setViewLoading] = useState(false);

  /** Painel de gestão de comprovativos (segundo off-canvas) */
  const [imagesPanelRow, setImagesPanelRow] = useState<Ocorrencia | null>(null);
  const [comprovantoList, setComprovantoList] = useState<OcorrenciaImagem[]>([]);
  const [comprovantoLoading, setComprovantoLoading] = useState(false);
  const [comprovantoUploading, setComprovantoUploading] = useState(false);
  const [deletingComprovantoId, setDeletingComprovantoId] = useState<number | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [form, setForm] = useState({
    data: "",
    tipo: 1,
    categoria: 1,
    descricao: "",
    estado: 1,
    nivel: 2,
    periodo: 1,
    local: "" as string,
    observacoes: "",
    imagem: null as File | null,
    comprovantoFiles: [] as File[],
  });

  const canEdit = user != null && NIVEIS_EDITAR.includes(Number(user.nivel));
  const canDelete = user != null && NIVEIS_ELIMINAR.includes(Number(user.nivel));

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

  const fetchDepartamentos = useCallback(async () => {
    if (!organizacaoId) {
      setDepartamentos([]);
      return;
    }
    try {
      const res = await http.get(`/departamentos/${organizacaoId}/ativados`);
      setDepartamentos(parseLookupItems(res.data));
    } catch {
      setDepartamentos([]);
    }
  }, [http, organizacaoId]);

  useEffect(() => {
    fetchDepartamentos();
  }, [fetchDepartamentos]);

  const fetchStats = useCallback(async () => {
    if (!organizacaoId) {
      setStatTotal(0);
      setStatHighRisk(0);
      setStatSecurity(0);
      return;
    }
    setStatsLoading(true);
    try {
      const base = `${API_PREFIX}/${organizacaoId}`;
      const [rTotal, rHigh, rSec] = await Promise.all([
        http.get<OcorrenciaListResponse>(base, { params: { per_page: 1, page: 1 } }),
        http.get<OcorrenciaListResponse>(base, { params: { per_page: 1, page: 1, nivel: 1 } }),
        http.get<OcorrenciaListResponse>(base, { params: { per_page: 1, page: 1, tipo: 2 } }),
      ]);
      setStatTotal(rTotal.data?.total ?? 0);
      setStatHighRisk(rHigh.data?.total ?? 0);
      setStatSecurity(rSec.data?.total ?? 0);
    } catch {
      setStatTotal(0);
      setStatHighRisk(0);
      setStatSecurity(0);
    } finally {
      setStatsLoading(false);
    }
  }, [http, organizacaoId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

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
      if (filters.q.trim()) params.q = filters.q.trim();
      if (filters.tipo == "1" || filters.tipo == "2" || filters.tipo == "3") params.tipo = Number(filters.tipo);
      if (filters.categoria == "1" || filters.categoria == "2" || filters.categoria == "3" || filters.categoria == "4") {
        params.categoria = Number(filters.categoria);
      }
      if (filters.periodo == "1" || filters.periodo == "2") params.periodo = Number(filters.periodo);
      if (filters.estado == "1" || filters.estado == "2") params.estado = Number(filters.estado);
      if (filters.nivel == "1" || filters.nivel == "2" || filters.nivel == "3") params.nivel = Number(filters.nivel);
      if (filters.local) params.local = Number(filters.local);
      if (filters.data1) params.data1 = filters.data1;
      if (filters.data2) params.data2 = filters.data2;

      const res = await http.get<OcorrenciaListResponse>(`${API_PREFIX}/${organizacaoId}`, { params });
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
  }, [http, organizacaoId, perPage, currentPage, filters, showToast, t]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / perPage) || 1), [total, perPage]);

  const riskClass = (nivel: number) => {
    if (nivel == 1) return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    if (nivel == 2) return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
  };

  const riskLabel = (nivel: number) => {
    if (nivel == 1) return t("riskLevels.high");
    if (nivel == 2) return t("riskLevels.medium");
    return t("riskLevels.low");
  };

  const tipoLabel = (tipo: number) => {
    if (tipo == 1) return t("types.client");
    if (tipo == 2) return t("types.security");
    return t("types.internal");
  };

  const categoriaLabel = (categoria: number) => {
    if (categoria == 1) return t("categories.accident");
    if (categoria == 2) return t("categories.theft");
    if (categoria == 3) return t("categories.robbery");
    return t("categories.other");
  };

  const periodoLabel = (periodo: number) => (periodo == 2 ? t("period.night") : t("period.day"));

  const estadoLabel = (estado: number) => (estado == 2 ? t("states.closed") : t("states.open"));

  const estadoBadgeClass = (estado: number) =>
    estado == 2
      ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
      : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400";

  const localLabel = (row: Ocorrencia) => {
    const d = row.departamento;
    const name = d?.designacao ?? d?.nome;
    if (typeof name == "string" && name.trim()) return name.trim();
    if (row.local != null) {
      const dep = departamentos.find((x) => x.id == row.local);
      if (dep) return dep.nome;
      return `#${row.local}`;
    }
    return "—";
  };

  const imageUrl = (name: string | null | undefined) => {
    if (!name) return null;
    const base = api_base_url.replace(/\/$/, "");
    return `${base}/storage/ocorrencias/${encodeURIComponent(name.replace(/^\/+/, ""))}`;
  };

  /** Caminho API tipo `ocorrencias/ficheiro.jpg` → URL pública `/storage/...` */
  const storagePublicUrl = (relativePath: string | null | undefined) => {
    if (!relativePath) return null;
    const base = api_base_url.replace(/\/$/, "");
    const rel = relativePath.replace(/^\/+/, "");
    return `${base}/storage/${rel.split("/").map(encodeURIComponent).join("/")}`;
  };

  const fetchComprovantos = useCallback(
    async (ocorrenciaId: number) => {
      if (!organizacaoId) return;
      setComprovantoLoading(true);
      try {
        const res = await http.get<OcorrenciaImagensListResponse>(
          `${API_PREFIX}/${organizacaoId}/${ocorrenciaId}/imagens`
        );
        setComprovantoList(Array.isArray(res.data?.data) ? res.data.data : []);
      } catch {
        showToast(t("toast.loadError"), true);
        setComprovantoList([]);
      } finally {
        setComprovantoLoading(false);
      }
    },
    [http, organizacaoId, showToast, t]
  );

  useEffect(() => {
    if (!imagesPanelRow) {
      setComprovantoList([]);
      return;
    }
    fetchComprovantos(imagesPanelRow.id);
  }, [imagesPanelRow, fetchComprovantos]);

  const openImagesPanel = (row: Ocorrencia) => {
    setImagesPanelRow(row);
  };

  const closeImagesPanel = () => {
    setImagesPanelRow(null);
    setComprovantoList([]);
  };

  const handleUploadComprovantos = async (files: FileList | null) => {
    if (!organizacaoId || !imagesPanelRow || !files?.length) return;
    const list = Array.from(files).filter((f) => f.size > 0);
    if (!list.length) return;
    setComprovantoUploading(true);
    const config = { headers: { "Content-Type": undefined as unknown as string } };
    try {
      const fd = new FormData();
      for (const file of list) {
        fd.append("imagens[]", file);
      }
      await http.post(`${API_PREFIX}/${organizacaoId}/${imagesPanelRow.id}/imagens`, fd, config as never);
      showToast(t("imagesPanel.uploadSuccess"));
      await fetchComprovantos(imagesPanelRow.id);
      fetchList();
      if (viewing?.id == imagesPanelRow.id) {
        const res = await http.get<OcorrenciaShowResponse>(`${API_PREFIX}/${organizacaoId}/${imagesPanelRow.id}`);
        if (res.data?.data) setViewing(res.data.data);
      }
    } catch (err: unknown) {
      showToast(parseApiErrors(err, t("toast.error")), true);
    } finally {
      setComprovantoUploading(false);
    }
  };

  const handleDeleteComprovanto = async (imagemId: number) => {
    if (!organizacaoId || !imagesPanelRow || !confirm(t("imagesPanel.deleteConfirm"))) return;
    setDeletingComprovantoId(imagemId);
    try {
      await http.delete(`${API_PREFIX}/${organizacaoId}/${imagesPanelRow.id}/imagens/${imagemId}`);
      showToast(t("imagesPanel.deleteSuccess"));
      setComprovantoList((prev) => prev.filter((i) => i.id != imagemId));
      fetchList();
      if (viewing?.id == imagesPanelRow.id) {
        const res = await http.get<OcorrenciaShowResponse>(`${API_PREFIX}/${organizacaoId}/${imagesPanelRow.id}`);
        if (res.data?.data) setViewing(res.data.data);
      }
    } catch (err: unknown) {
      showToast(parseApiErrors(err, t("toast.error")), true);
    } finally {
      setDeletingComprovantoId(null);
    }
  };

  const openNew = () => {
    setEditingId(null);
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const localDefault = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    setForm({
      data: localDefault,
      tipo: 1,
      categoria: 1,
      descricao: "",
      estado: 1,
      nivel: 2,
      periodo: 1,
      local: "",
      observacoes: "",
      imagem: null,
      comprovantoFiles: [],
    });
    setShowForm(true);
  };

  const openEdit = (row: Ocorrencia) => {
    setEditingId(row.id);
    setForm({
      data: toDatetimeLocalValue(row.data),
      tipo: row.tipo,
      categoria: row.categoria,
      descricao: row.descricao ?? "",
      estado: row.estado,
      nivel: row.nivel,
      periodo: row.periodo,
      local: row.local != null ? String(row.local) : "",
      observacoes: row.observacoes ?? "",
      imagem: null,
      comprovantoFiles: [],
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
  };

  const openView = async (row: Ocorrencia) => {
    if (!organizacaoId) return;
    setViewLoading(true);
    setViewing(row);
    try {
      const res = await http.get<OcorrenciaShowResponse>(`${API_PREFIX}/${organizacaoId}/${row.id}`);
      if (res.data?.data) setViewing(res.data.data);
    } catch {
      showToast(t("toast.loadError"), true);
      setViewing(null);
    } finally {
      setViewLoading(false);
    }
  };

  const appendFormFields = (fd: FormData) => {
    fd.append("data", fromDatetimeLocalValue(form.data));
    fd.append("tipo", String(form.tipo));
    fd.append("categoria", String(form.categoria));
    fd.append("descricao", form.descricao);
    fd.append("estado", String(form.estado));
    fd.append("nivel", String(form.nivel));
    fd.append("periodo", String(form.periodo));
    if (form.local) fd.append("local", form.local);
    fd.append("observacoes", form.observacoes.trim());
    if (form.imagem) fd.append("imagem", form.imagem);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizacaoId || !form.descricao.trim() || !form.data) return;
    setFormSubmitting(true);
    const config = { headers: { "Content-Type": undefined as unknown as string } };
    try {
      if (editingId != null) {
        const fd = new FormData();
        appendFormFields(fd);
        if (form.imagem) {
          fd.append("_method", "PUT");
          await http.post(`${API_PREFIX}/${organizacaoId}/${editingId}`, fd, config as never);
        } else {
          await http.put(`${API_PREFIX}/${organizacaoId}/${editingId}`, {
            data: fromDatetimeLocalValue(form.data),
            tipo: form.tipo,
            categoria: form.categoria,
            descricao: form.descricao.trim(),
            estado: form.estado,
            nivel: form.nivel,
            periodo: form.periodo,
            local: form.local ? Number(form.local) : null,
            observacoes: form.observacoes.trim() || null,
          });
        }
        showToast(t("toast.updated"));
      } else {
        const fd = new FormData();
        appendFormFields(fd);
        const res = await http.post<{ data: Ocorrencia }>(`${API_PREFIX}/${organizacaoId}`, fd, config as never);
        const newId = res.data?.data?.id;
        if (newId && form.comprovantoFiles.length > 0) {
          const fd2 = new FormData();
          for (const file of form.comprovantoFiles) {
            fd2.append("imagens[]", file);
          }
          try {
            await http.post(`${API_PREFIX}/${organizacaoId}/${newId}/imagens`, fd2, config as never);
          } catch (err: unknown) {
            showToast(parseApiErrors(err, t("toast.error")), true);
          }
        }
        showToast(t("toast.created"));
      }
      closeForm();
      fetchList();
      fetchStats();
    } catch (err: unknown) {
      showToast(parseApiErrors(err, t("toast.error")), true);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!organizacaoId || !confirm(t("confirmDelete"))) return;
    try {
      await http.delete(`${API_PREFIX}/${organizacaoId}/${id}`);
      showToast(t("toast.deleted"));
      if (viewing?.id == id) setViewing(null);
      if (imagesPanelRow?.id == id) closeImagesPanel();
      fetchList();
      fetchStats();
    } catch (err: unknown) {
      showToast(parseApiErrors(err, t("toast.error")), true);
    }
  };

  const applyFilters = () => {
    setFilters({ ...draftFilters });
    setCurrentPage(1);
  };

  const statsCards = [
    {
      key: "total",
      value: statsLoading ? "—" : statTotal,
      icon: ClipboardList,
      color: "text-blue-600",
      bg: "bg-blue-100/60 dark:bg-blue-900/20",
    },
    {
      key: "highRisk",
      value: statsLoading ? "—" : statHighRisk,
      icon: AlertTriangle,
      color: "text-red-600",
      bg: "bg-red-100/60 dark:bg-red-900/20",
    },
    {
      key: "security",
      value: statsLoading ? "—" : statSecurity,
      icon: ShieldAlert,
      color: "text-amber-600",
      bg: "bg-amber-100/60 dark:bg-amber-900/20",
    },
  ];

  if (!organizacaoId) {
    return (
      <div className="p-4 md:p-6">
        <p className="text-sm ca-muted">{t("noOrg")}</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {toast && (
        <div
          className={`fixed bottom-4 right-4 z-[60] px-4 py-2 rounded-xl shadow-lg text-sm ${
            toast.isError ? "bg-red-600 text-white" : "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
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
            {t("new")}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {statsCards.map((item) => (
          <div key={item.key} className="ca-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm ca-muted">{t(`stats.${item.key}`)}</div>
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
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <input
            className="ca-input md:col-span-2 lg:col-span-1"
            placeholder={t("filters.search")}
            value={draftFilters.q}
            onChange={(e) => setDraftFilters((f) => ({ ...f, q: e.target.value }))}
          />

          <select
            className="ca-input"
            value={draftFilters.tipo}
            onChange={(e) => setDraftFilters((f) => ({ ...f, tipo: e.target.value }))}
          >
            <option value="">{t("filters.allTypes")}</option>
            <option value="1">{t("types.client")}</option>
            <option value="2">{t("types.security")}</option>
            <option value="3">{t("types.internal")}</option>
          </select>

          <select
            className="ca-input"
            value={draftFilters.categoria}
            onChange={(e) => setDraftFilters((f) => ({ ...f, categoria: e.target.value }))}
          >
            <option value="">{t("filters.allCategories")}</option>
            <option value="1">{t("categories.accident")}</option>
            <option value="2">{t("categories.theft")}</option>
            <option value="3">{t("categories.robbery")}</option>
            <option value="4">{t("categories.other")}</option>
          </select>

          <select
            className="ca-input"
            value={draftFilters.periodo}
            onChange={(e) => setDraftFilters((f) => ({ ...f, periodo: e.target.value }))}
          >
            <option value="">{t("filters.allPeriods")}</option>
            <option value="1">{t("period.day")}</option>
            <option value="2">{t("period.night")}</option>
          </select>

          <select
            className="ca-input"
            value={draftFilters.estado}
            onChange={(e) => setDraftFilters((f) => ({ ...f, estado: e.target.value }))}
          >
            <option value="">{t("filters.allStates")}</option>
            <option value="1">{t("states.open")}</option>
            <option value="2">{t("states.closed")}</option>
          </select>

          <select
            className="ca-input"
            value={draftFilters.nivel}
            onChange={(e) => setDraftFilters((f) => ({ ...f, nivel: e.target.value }))}
          >
            <option value="">{t("filters.allRiskLevels")}</option>
            <option value="1">{t("riskLevels.high")}</option>
            <option value="2">{t("riskLevels.medium")}</option>
            <option value="3">{t("riskLevels.low")}</option>
          </select>

          <select
            className="ca-input"
            value={draftFilters.local}
            onChange={(e) => setDraftFilters((f) => ({ ...f, local: e.target.value }))}
          >
            <option value="">{t("filters.allLocals")}</option>
            {departamentos.map((d) => (
              <option key={d.id} value={String(d.id)}>
                {d.nome}
              </option>
            ))}
          </select>

          <input
            type="date"
            className="ca-input"
            value={draftFilters.data1}
            onChange={(e) => setDraftFilters((f) => ({ ...f, data1: e.target.value }))}
            title={t("filters.dateFrom")}
          />

          <input
            type="date"
            className="ca-input"
            value={draftFilters.data2}
            onChange={(e) => setDraftFilters((f) => ({ ...f, data2: e.target.value }))}
            title={t("filters.dateTo")}
          />

          <button type="button" className="ca-btn md:col-span-3 lg:col-span-5" onClick={applyFilters}>
            {t("filters.apply")}
          </button>
        </div>
      </div>

      <div className="ca-card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin ca-muted" />
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto desktop-auth:block">
              <table className="w-full text-sm min-w-[1220px]">
                <thead className="bg-slate-50 dark:bg-slate-800/40">
                  <tr>
                    <th className="py-3 px-4 text-left font-medium">{t("table.order")}</th>
                    <th className="py-3 px-4 text-left font-medium w-[72px]">{t("table.mainPhoto")}</th>
                    <th className="py-3 px-4 text-left font-medium">{t("table.date")}</th>
                    <th className="py-3 px-4 text-left font-medium">{t("table.time")}</th>
                    <th className="py-3 px-4 text-left font-medium">{t("table.type")}</th>
                    <th className="py-3 px-4 text-left font-medium">{t("table.category")}</th>
                    <th className="py-3 px-4 text-left font-medium">{t("table.description")}</th>
                    <th className="py-3 px-4 text-left font-medium">{t("table.location")}</th>
                    <th className="py-3 px-4 text-left font-medium">{t("table.status")}</th>
                    <th className="py-3 px-4 text-left font-medium">{t("table.risk")}</th>
                    <th className="py-3 px-4 text-left font-medium">{t("table.period")}</th>
                    <th className="py-3 px-4 text-right font-medium">{t("table.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y ca-border">
                  {list.map((row) => {
                    const { date, time } = formatTableDate(row.data, locale);
                    const thumb = imageUrl(row.imagem);
                    return (
                      <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                        <td className="px-4 py-3 font-medium">OC-{row.id}</td>
                        <td className="px-4 py-3 align-middle">
                          {thumb ? (
                            <a
                              href={thumb}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex w-12 h-12 rounded-lg border ca-border overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0"
                              title={t("table.mainPhoto")}
                            >
                              <img src={thumb} alt="" className="w-full h-full object-cover" />
                            </a>
                          ) : (
                            <span
                              className="inline-flex w-12 h-12 rounded-lg border ca-border ca-muted text-xs items-center justify-center shrink-0"
                              aria-hidden
                            >
                              —
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">{date}</td>
                        <td className="px-4 py-3">{time}</td>
                        <td className="px-4 py-3">{tipoLabel(row.tipo)}</td>
                        <td className="px-4 py-3">{categoriaLabel(row.categoria)}</td>
                        <td className="px-4 py-3 max-w-xs truncate" title={row.descricao}>
                          {row.descricao}
                        </td>
                        <td className="px-4 py-3 max-w-[140px] truncate" title={localLabel(row)}>
                          {localLabel(row)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-medium ${estadoBadgeClass(row.estado)}`}
                          >
                            {estadoLabel(row.estado)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${riskClass(row.nivel)}`}>
                            {riskLabel(row.nivel)}
                          </span>
                        </td>
                        <td className="px-4 py-3">{periodoLabel(row.periodo)}</td>
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
                            <button
                              type="button"
                              className="ca-icon-btn"
                              title={t("actions.images")}
                              onClick={() => openImagesPanel(row)}
                            >
                              <Images size={16} />
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
                                title={t("actions.delete")}
                                onClick={() => handleDelete(row.id)}
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="space-y-4 px-3 py-3 tablet-app:px-4 tablet-app:py-4 desktop-auth:hidden">
              {list.length == 0 ? (
                <div className="py-12 text-center text-sm ca-muted">{t("empty")}</div>
              ) : (
                list.map((row) => {
                  const { date, time } = formatTableDate(row.data, locale);
                  const thumb = imageUrl(row.imagem);
                  return (
                    <article
                      key={row.id}
                      className="overflow-hidden rounded-2xl border ca-border bg-[var(--panel)] shadow-md ring-1 ring-black/[0.04] dark:ring-white/[0.06]"
                    >
                      <div className="flex gap-3 border-b ca-border bg-slate-50/90 px-4 py-3 dark:bg-slate-800/50">
                        {thumb ? (
                          <a
                            href={thumb}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-14 w-14 shrink-0 overflow-hidden rounded-xl border ca-border bg-slate-100 dark:bg-slate-800"
                            title={t("table.mainPhoto")}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={thumb} alt="" className="h-full w-full object-cover" />
                          </a>
                        ) : (
                          <span
                            className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border ca-border text-xs ca-muted"
                            aria-hidden
                          >
                            —
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold">OC-{row.id}</div>
                          <div className="mt-1 text-sm ca-muted">
                            {date} · {time}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${estadoBadgeClass(row.estado)}`}
                            >
                              {estadoLabel(row.estado)}
                            </span>
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${riskClass(row.nivel)}`}>
                              {riskLabel(row.nivel)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2.5 px-4 py-3 text-sm">
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <div>
                            <div className="text-xs font-medium ca-muted">{t("table.type")}</div>
                            <div className="mt-0.5">{tipoLabel(row.tipo)}</div>
                          </div>
                          <div>
                            <div className="text-xs font-medium ca-muted">{t("table.category")}</div>
                            <div className="mt-0.5">{categoriaLabel(row.categoria)}</div>
                          </div>
                          <div>
                            <div className="text-xs font-medium ca-muted">{t("table.period")}</div>
                            <div className="mt-0.5">{periodoLabel(row.periodo)}</div>
                          </div>
                          <div>
                            <div className="text-xs font-medium ca-muted">{t("table.location")}</div>
                            <div className="mt-0.5 break-words">{localLabel(row)}</div>
                          </div>
                        </div>
                        <div className="border-t border-dashed ca-border pt-2">
                          <div className="text-xs font-medium ca-muted">{t("table.description")}</div>
                          <p className="mt-1 line-clamp-4 whitespace-pre-wrap break-words text-sm">{row.descricao}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap justify-end gap-1 border-t ca-border bg-slate-50/60 px-3 py-2.5 dark:bg-slate-800/30">
                        <button
                          type="button"
                          className="ca-icon-btn min-h-10 min-w-10"
                          title={t("actions.view")}
                          onClick={() => openView(row)}
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          type="button"
                          className="ca-icon-btn min-h-10 min-w-10"
                          title={t("actions.images")}
                          onClick={() => openImagesPanel(row)}
                        >
                          <Images size={18} />
                        </button>
                        {canEdit && (
                          <button
                            type="button"
                            className="ca-icon-btn min-h-10 min-w-10"
                            title={t("actions.edit")}
                            onClick={() => openEdit(row)}
                          >
                            <Pencil size={18} />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            className="ca-icon-btn min-h-10 min-w-10 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
                            title={t("actions.delete")}
                            onClick={() => handleDelete(row.id)}
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })
              )}
            </div>

            {list.length == 0 && (
              <div className="hidden border-t ca-border py-8 text-center text-sm ca-muted desktop-auth:block">
                {t("empty")}
              </div>
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

      {/* Detalhe */}
      {viewing && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => !viewLoading && setViewing(null)} />
          <div className="relative ml-auto h-full w-full max-w-md ca-panel shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b ca-border">
              <h2 className="text-lg font-semibold">{t("view.title")}</h2>
              <button type="button" onClick={() => setViewing(null)} disabled={viewLoading}>
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-3 flex-1 overflow-y-auto ca-scroll text-sm">
              {viewLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <>
                  <p>
                    <span className="ca-muted">{t("table.order")}:</span> OC-{viewing.id}
                  </p>
                  <p>
                    <span className="ca-muted">{t("form.datetime")}:</span>{" "}
                    {new Date(viewing.data).toLocaleString(locale)}
                  </p>
                  <p>
                    <span className="ca-muted">{t("table.type")}:</span> {tipoLabel(viewing.tipo)}
                  </p>
                  <p>
                    <span className="ca-muted">{t("table.category")}:</span> {categoriaLabel(viewing.categoria)}
                  </p>
                  <p>
                    <span className="ca-muted">{t("form.state")}:</span> {estadoLabel(viewing.estado)}
                  </p>
                  <p>
                    <span className="ca-muted">{t("table.risk")}:</span> {riskLabel(viewing.nivel)}
                  </p>
                  <p>
                    <span className="ca-muted">{t("table.period")}:</span> {periodoLabel(viewing.periodo)}
                  </p>
                  <p>
                    <span className="ca-muted">{t("form.local")}:</span> {localLabel(viewing)}
                  </p>
                  <p>
                    <span className="ca-muted">{t("table.description")}:</span>
                  </p>
                  <p className="whitespace-pre-wrap">{viewing.descricao}</p>
                  {viewing.observacoes ? (
                    <>
                      <p>
                        <span className="ca-muted">{t("form.observations")}:</span>
                      </p>
                      <p className="whitespace-pre-wrap">{viewing.observacoes}</p>
                    </>
                  ) : null}
                  <p className="text-xs font-medium ca-muted pt-2">{t("view.mainImage")}</p>
                  {imageUrl(viewing.imagem) ? (
                    <img
                      src={imageUrl(viewing.imagem)!}
                      alt=""
                      className="w-full rounded-xl border ca-border mt-2"
                    />
                  ) : (
                    <p className="text-xs ca-muted">{t("view.noMainImage")}</p>
                  )}

                  <p className="text-xs font-medium ca-muted pt-3">{t("view.comprovantosSection")}</p>
                  {Array.isArray(viewing.imagens) && viewing.imagens.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      {viewing.imagens.map((img) => {
                        const url = storagePublicUrl(img.imagem);
                        return url ? (
                          <a
                            key={img.id}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block rounded-lg border ca-border overflow-hidden aspect-video bg-slate-100 dark:bg-slate-800"
                          >
                            <img src={url} alt="" className="w-full h-full object-cover" />
                          </a>
                        ) : null;
                      })}
                    </div>
                  ) : (
                    <p className="text-xs ca-muted">{t("view.noComprovantos")}</p>
                  )}
                </>
              )}
            </div>
            <div className="p-4 border-t ca-border flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="ca-btn flex items-center gap-2"
                disabled={viewLoading}
                onClick={() => viewing && openImagesPanel(viewing)}
              >
                <Images size={16} />
                {t("actions.manageImages")}
              </button>
              {canEdit && !viewLoading && (
                <button
                  type="button"
                  className="ca-btn"
                  onClick={() => {
                    const row = viewing;
                    setViewing(null);
                    openEdit(row);
                  }}
                >
                  {t("actions.edit")}
                </button>
              )}
              <button type="button" className="px-4 py-2 rounded-xl border ca-border" onClick={() => setViewing(null)}>
                {t("cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comprovativos (gestão) */}
      {imagesPanelRow && (
        <div className="fixed inset-0 z-[55] flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => !comprovantoUploading && closeImagesPanel()} />
          <div className="relative ml-auto h-full w-full max-w-lg ca-panel shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b ca-border">
              <div>
                <h2 className="text-lg font-semibold">{t("imagesPanel.title")}</h2>
                <p className="text-xs ca-muted mt-0.5">
                  {t("imagesPanel.subtitle", { id: imagesPanelRow.id })}
                </p>
              </div>
              <button type="button" onClick={closeImagesPanel} disabled={comprovantoUploading}>
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-4 flex-1 overflow-y-auto ca-scroll">
              {canEdit && (
                <div className="space-y-2">
                  <label className="block text-xs ca-muted">{t("imagesPanel.addFiles")}</label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    multiple
                    className="ca-input text-sm"
                    disabled={comprovantoUploading}
                    onChange={(e) => {
                      void handleUploadComprovantos(e.target.files);
                      e.target.value = "";
                    }}
                  />
                  <p className="text-xs ca-muted">{t("form.imageHint")}</p>
                  {comprovantoUploading && (
                    <div className="flex items-center gap-2 text-sm ca-muted">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("imagesPanel.uploading")}
                    </div>
                  )}
                </div>
              )}

              <div>
                <p className="text-xs font-medium ca-muted mb-2">{t("imagesPanel.listTitle")}</p>
                {comprovantoLoading ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin ca-muted" />
                  </div>
                ) : comprovantoList.length == 0 ? (
                  <p className="text-sm ca-muted py-4">{t("imagesPanel.empty")}</p>
                ) : (
                  <ul className="space-y-3">
                    {comprovantoList.map((img) => {
                      const url = storagePublicUrl(img.imagem);
                      return (
                        <li
                          key={img.id}
                          className="flex gap-3 items-center p-2 rounded-xl border ca-border bg-slate-50/50 dark:bg-slate-800/30"
                        >
                          {url ? (
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="shrink-0 w-20 h-20 rounded-lg border ca-border overflow-hidden bg-slate-100 dark:bg-slate-800"
                            >
                              <img src={url} alt="" className="w-full h-full object-cover" />
                            </a>
                          ) : (
                            <div className="shrink-0 w-20 h-20 rounded-lg border ca-border ca-muted text-xs flex items-center justify-center">
                              —
                            </div>
                          )}
                          <div className="flex-1 min-w-0 text-xs ca-muted truncate">#{img.id}</div>
                          {canEdit && (
                            <button
                              type="button"
                              className="ca-icon-btn text-red-600 shrink-0"
                              title={t("actions.delete")}
                              disabled={deletingComprovantoId != null}
                              onClick={() => void handleDeleteComprovanto(img.id)}
                            >
                              {deletingComprovantoId == img.id ? (
                                <Loader2 size={16} className="animate-spin" />
                              ) : (
                                <Trash2 size={16} />
                              )}
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>

            <div className="p-4 border-t ca-border flex justify-end">
              <button
                type="button"
                className="px-4 py-2 rounded-xl border ca-border"
                onClick={closeImagesPanel}
                disabled={comprovantoUploading}
              >
                {t("cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form create/edit */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => !formSubmitting && closeForm()} />
          <div className="relative ml-auto h-full w-full max-w-md ca-panel shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b ca-border">
              <h2 className="text-lg font-semibold">{editingId ? t("form.titleEdit") : t("form.titleNew")}</h2>
              <button type="button" onClick={closeForm} disabled={formSubmitting}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="p-4 space-y-4 flex-1 overflow-y-auto ca-scroll">
                <label className="block text-xs ca-muted">{t("form.datetime")}</label>
                <input
                  type="datetime-local"
                  className="ca-input"
                  required
                  value={form.data}
                  onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))}
                />

                <label className="block text-xs ca-muted">{t("filters.type")}</label>
                <select
                  className="ca-input"
                  value={form.tipo}
                  onChange={(e) => setForm((f) => ({ ...f, tipo: Number(e.target.value) }))}
                >
                  <option value={1}>{t("types.client")}</option>
                  <option value={2}>{t("types.security")}</option>
                  <option value={3}>{t("types.internal")}</option>
                </select>

                <label className="block text-xs ca-muted">{t("filters.category")}</label>
                <select
                  className="ca-input"
                  value={form.categoria}
                  onChange={(e) => setForm((f) => ({ ...f, categoria: Number(e.target.value) }))}
                >
                  <option value={1}>{t("categories.accident")}</option>
                  <option value={2}>{t("categories.theft")}</option>
                  <option value={3}>{t("categories.robbery")}</option>
                  <option value={4}>{t("categories.other")}</option>
                </select>

                <label className="block text-xs ca-muted">{t("form.state")}</label>
                <select
                  className="ca-input"
                  value={form.estado}
                  onChange={(e) => setForm((f) => ({ ...f, estado: Number(e.target.value) }))}
                >
                  <option value={1}>{t("states.open")}</option>
                  <option value={2}>{t("states.closed")}</option>
                </select>

                <label className="block text-xs ca-muted">{t("table.description")}</label>
                <textarea
                  className="ca-input"
                  rows={4}
                  required
                  placeholder={t("form.description")}
                  value={form.descricao}
                  onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                />

                <label className="block text-xs ca-muted">{t("form.risk")}</label>
                <select
                  className="ca-input"
                  value={form.nivel}
                  onChange={(e) => setForm((f) => ({ ...f, nivel: Number(e.target.value) }))}
                >
                  <option value={1}>{t("riskLevels.high")}</option>
                  <option value={2}>{t("riskLevels.medium")}</option>
                  <option value={3}>{t("riskLevels.low")}</option>
                </select>

                <label className="block text-xs ca-muted">{t("filters.period")}</label>
                <select
                  className="ca-input"
                  value={form.periodo}
                  onChange={(e) => setForm((f) => ({ ...f, periodo: Number(e.target.value) }))}
                >
                  <option value={1}>{t("period.day")}</option>
                  <option value={2}>{t("period.night")}</option>
                </select>

                <label className="block text-xs ca-muted">{t("form.local")}</label>
                <select
                  className="ca-input"
                  value={form.local}
                  onChange={(e) => setForm((f) => ({ ...f, local: e.target.value }))}
                >
                  <option value="">{t("form.localNone")}</option>
                  {departamentos.map((d) => (
                    <option key={d.id} value={String(d.id)}>
                      {d.nome}
                    </option>
                  ))}
                </select>

                <label className="block text-xs ca-muted">{t("form.observations")}</label>
                <textarea
                  className="ca-input"
                  rows={3}
                  value={form.observacoes}
                  onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
                />

                <label className="block text-xs ca-muted">{t("form.image")}</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="ca-input text-sm"
                  onChange={(e) =>
                    setForm((f) => ({ ...f, imagem: e.target.files?.[0] ?? null }))
                  }
                />
                <p className="text-xs ca-muted">{t("form.imageHint")}</p>

                {editingId == null && (
                  <>
                    <label className="block text-xs ca-muted">{t("form.comprovantos")}</label>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      multiple
                      className="ca-input text-sm"
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          comprovantoFiles: e.target.files?.length
                            ? Array.from(e.target.files)
                            : [],
                        }))
                      }
                    />
                    <p className="text-xs ca-muted">{t("form.comprovantosHint")}</p>
                  </>
                )}
              </div>

              <div className="p-4 border-t ca-border flex justify-end gap-2">
                <button
                  type="button"
                  className="px-4 py-2 rounded-xl border ca-border"
                  onClick={closeForm}
                  disabled={formSubmitting}
                >
                  {t("cancel")}
                </button>
                <button type="submit" className="ca-btn flex items-center gap-2" disabled={formSubmitting}>
                  {formSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {t("form.save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
