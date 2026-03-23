"use client";
/* eslint-disable @next/next/no-img-element -- imagens servidas pelo storage da API Laravel */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import axios from "axios";
import {
  Boxes,
  Eye,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  CheckCircle2,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { Material, MaterialListResponse, MaterialShowResponse } from "@/types/material";

const API_PREFIX = "/materiais";
const ORG_KEY = "ca.selected.organization";

const NIVEIS_GESTAO = [1, 2] as const;

const CATEGORIAS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

const FORM_DATA_HEADERS = { headers: { "Content-Type": undefined as unknown as string } };

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

function materialImagePublicUrl(apiBaseUrl: string, filename: string | null | undefined): string | null {
  if (!filename) return null;
  const base = apiBaseUrl.replace(/\/$/, "");
  const name = String(filename).replace(/^\/+/, "");
  if (name.startsWith("http://") || name.startsWith("https://")) return name;
  return `${base}/storage/materiais/${encodeURIComponent(name)}`;
}

function truncateText(s: string | null | undefined, max: number): string {
  if (!s) return "—";
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

function formatDateShort(iso: string | null | undefined, locale: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(locale, { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function Page() {
  const t = useTranslations("materiaisPage");
  const tCat = useTranslations("materiaisPage.categories");
  const tEst = useTranslations("materiaisPage.estados");
  const locale = useLocale();
  const { http, user, api_base_url } = useAuth();

  const nivel = Number(user?.nivel);
  const canAccess =
    Number.isFinite(nivel) && NIVEIS_GESTAO.includes(nivel as (typeof NIVEIS_GESTAO)[number]);

  const [organizacaoId, setOrganizacaoId] = useState<number | null>(null);
  const [list, setList] = useState<Material[]>([]);
  const [total, setTotal] = useState(0);
  const [perPage, setPerPage] = useState(15);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; isError?: boolean } | null>(null);

  const [draftDesignacao, setDraftDesignacao] = useState("");
  const [draftMarca, setDraftMarca] = useState("");
  const [draftModelo, setDraftModelo] = useState("");
  const [draftCategoria, setDraftCategoria] = useState("");
  const [draftEstado, setDraftEstado] = useState("");

  const [appliedDesignacao, setAppliedDesignacao] = useState("");
  const [appliedMarca, setAppliedMarca] = useState("");
  const [appliedModelo, setAppliedModelo] = useState("");
  const [appliedCategoria, setAppliedCategoria] = useState("");
  const [appliedEstado, setAppliedEstado] = useState("");

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkLoading, setBulkLoading] = useState<
    "ativar" | "desativar" | "manutencao" | "fora" | "eliminar" | null
  >(null);

  const [showPanel, setShowPanel] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formExistingImageName, setFormExistingImageName] = useState<string | null>(null);
  const [formImageObjectUrl, setFormImageObjectUrl] = useState<string | null>(null);
  const [formFileInputKey, setFormFileInputKey] = useState(0);
  const [form, setForm] = useState({
    designacao: "",
    descricao: "",
    modelo: "",
    marca: "",
    unidade: "",
    categoria: 1,
    fabricante: "",
    estado: 1,
    imagem: null as File | null,
  });

  const [viewing, setViewing] = useState<Material | null>(null);
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
      /* noop */
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
    if (formExistingImageName) return materialImagePublicUrl(api_base_url, formExistingImageName);
    return null;
  }, [formImageObjectUrl, formExistingImageName, api_base_url]);

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
      if (appliedDesignacao.trim()) params.designacao = appliedDesignacao.trim();
      if (appliedMarca.trim()) params.marca = appliedMarca.trim();
      if (appliedModelo.trim()) params.modelo = appliedModelo.trim();
      if (appliedCategoria !== "") {
        const c = Number(appliedCategoria);
        if (Number.isFinite(c) && CATEGORIAS.includes(c as (typeof CATEGORIAS)[number])) {
          params.categoria = c;
        }
      }
      if (appliedEstado === "0" || appliedEstado === "1" || appliedEstado === "2" || appliedEstado === "3") {
        params.estado = Number(appliedEstado);
      }

      const res = await http.get<MaterialListResponse>(`${API_PREFIX}/${organizacaoId}`, { params });
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
    appliedDesignacao,
    appliedMarca,
    appliedModelo,
    appliedCategoria,
    appliedEstado,
    showToast,
    t,
  ]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  useEffect(() => {
    setSelectedIds([]);
  }, [list]);

  const stats = useMemo(() => {
    const active = list.filter((r) => r.estado === 1).length;
    return { rows: list.length, active };
  }, [list]);

  const openNew = () => {
    setEditingId(null);
    setFormExistingImageName(null);
    setFormFileInputKey((k) => k + 1);
    setForm({
      designacao: "",
      descricao: "",
      modelo: "",
      marca: "",
      unidade: "",
      categoria: 1,
      fabricante: "",
      estado: 1,
      imagem: null,
    });
    setShowPanel(true);
  };

  const openEdit = (row: Material) => {
    setEditingId(row.id);
    setFormExistingImageName(row.imagem ?? null);
    setFormFileInputKey((k) => k + 1);
    setForm({
      designacao: row.designacao ?? "",
      descricao: row.descricao ?? "",
      modelo: row.modelo ?? "",
      marca: row.marca ?? "",
      unidade: row.unidade ?? "",
      categoria: CATEGORIAS.includes(row.categoria as (typeof CATEGORIAS)[number]) ? row.categoria : 1,
      fabricante: row.fabricante ?? "",
      estado: [0, 1, 2, 3].includes(row.estado) ? row.estado : 1,
      imagem: null,
    });
    setShowPanel(true);
  };

  const closePanel = () => {
    setShowPanel(false);
    setEditingId(null);
    setFormExistingImageName(null);
    setForm((f) => ({ ...f, imagem: null }));
  };

  const appendMaterialFormFields = (fd: FormData) => {
    fd.append("designacao", form.designacao.trim());
    if (form.descricao.trim()) fd.append("descricao", form.descricao.trim());
    if (form.modelo.trim()) fd.append("modelo", form.modelo.trim());
    if (form.marca.trim()) fd.append("marca", form.marca.trim());
    fd.append("unidade", form.unidade.trim());
    fd.append("categoria", String(form.categoria));
    if (form.fabricante.trim()) fd.append("fabricante", form.fabricante.trim());
    fd.append("estado", String(form.estado));
    if (form.imagem) fd.append("imagem", form.imagem);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizacaoId) {
      showToast(t("toast.orgRequired"), true);
      return;
    }
    if (!form.designacao.trim()) {
      showToast(t("toast.designacaoRequired"), true);
      return;
    }

    setFormSubmitting(true);
    try {
      if (editingId != null) {
        if (form.imagem) {
          const fd = new FormData();
          appendMaterialFormFields(fd);
          fd.append("_method", "PUT");
          await http.post(`${API_PREFIX}/${organizacaoId}/${editingId}`, fd, FORM_DATA_HEADERS as never);
        } else {
          await http.put(`${API_PREFIX}/${organizacaoId}/${editingId}`, {
            designacao: form.designacao.trim(),
            descricao: form.descricao.trim() || null,
            modelo: form.modelo.trim() || null,
            marca: form.marca.trim() || null,
            unidade: form.unidade.trim() || null,
            categoria: form.categoria,
            fabricante: form.fabricante.trim() || null,
            estado: form.estado,
          });
        }
        showToast(t("toast.updated"));
      } else {
        if (form.imagem) {
          const fd = new FormData();
          appendMaterialFormFields(fd);
          await http.post(`${API_PREFIX}/${organizacaoId}`, fd, FORM_DATA_HEADERS as never);
        } else {
          await http.post(`${API_PREFIX}/${organizacaoId}`, {
            designacao: form.designacao.trim(),
            descricao: form.descricao.trim() || null,
            modelo: form.modelo.trim() || null,
            marca: form.marca.trim() || null,
            unidade: form.unidade.trim() || null,
            categoria: form.categoria,
            fabricante: form.fabricante.trim() || null,
            estado: form.estado,
          });
        }
        showToast(t("toast.created"));
      }
      closePanel();
      void fetchList();
    } catch (err: unknown) {
      showToast(parseApiErrors(err, t("toast.saveError")), true);
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
      if (viewing?.id === id) setViewing(null);
      void fetchList();
    } catch (err: unknown) {
      showToast(parseApiErrors(err, t("toast.deleteError")), true);
    }
  };

  const runBulk = async (
    kind: "ativar" | "desativar" | "manutencao" | "fora" | "eliminar",
    path: string,
    confirmMsg?: string,
  ) => {
    if (!organizacaoId) {
      showToast(t("toast.orgRequired"), true);
      return;
    }
    if (selectedIds.length === 0) {
      showToast(t("toast.selectAtLeastOne"), true);
      return;
    }
    if (confirmMsg && !confirm(confirmMsg)) return;
    setBulkLoading(kind);
    try {
      const res = await http.post<{ message?: string }>(`${API_PREFIX}/${organizacaoId}/${path}`, {
        ids: selectedIds,
      });
      if (typeof res.data?.message === "string" && res.data.message.trim()) {
        showToast(res.data.message);
      } else {
        const bulkFallback: Record<typeof kind, string> = {
          ativar: t("toast.bulkActivateFallback"),
          desativar: t("toast.bulkDeactivateFallback"),
          manutencao: t("toast.bulkMaintenanceFallback"),
          fora: t("toast.bulkOutFallback"),
          eliminar: t("toast.bulkDeleteFallback"),
        };
        showToast(bulkFallback[kind]);
      }
      setSelectedIds([]);
      void fetchList();
    } catch (err: unknown) {
      showToast(parseApiErrors(err, t("toast.bulkError")), true);
    } finally {
      setBulkLoading(null);
    }
  };

  const openView = async (row: Material) => {
    if (!organizacaoId) return;
    setViewLoading(true);
    setViewing(row);
    try {
      const res = await http.get<MaterialShowResponse>(`${API_PREFIX}/${organizacaoId}/${row.id}`);
      if (res.data?.data) setViewing(res.data.data);
    } catch {
      showToast(t("toast.loadError"), true);
      setViewing(null);
    } finally {
      setViewLoading(false);
    }
  };

  const closeView = () => setViewing(null);

  const allSelected = list.length > 0 && list.every((row) => selectedIds.includes(row.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(list.map((row) => row.id));
  };

  const toggleRowSelection = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, perPage)));

  const categoriaLabel = (c: number) => {
    if (CATEGORIAS.includes(c as (typeof CATEGORIAS)[number])) return tCat(String(c));
    return "—";
  };

  const estadoLabel = (e: number) => {
    if (e === 0 || e === 1 || e === 2 || e === 3) return tEst(String(e));
    return "—";
  };

  const estadoBadgeClass = (e: number) => {
    if (e === 1) return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300";
    if (e === 0) return "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200";
    if (e === 2) return "bg-amber-100 text-amber-900 dark:bg-amber-900/25 dark:text-amber-200";
    if (e === 3) return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200";
    return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  };

  const orgCell = (row: Material) => {
    const name =
      typeof row.organizacao?.designacao === "string" && row.organizacao.designacao.trim()
        ? row.organizacao.designacao.trim()
        : null;
    if (name) return `${name} (#${row.organizacao_id})`;
    return `#${row.organizacao_id}`;
  };

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
      icon: Boxes,
      color: "text-blue-600",
      bg: "bg-blue-100/60 dark:bg-blue-900/20",
    },
    {
      label: t("stats.active"),
      value: stats.active,
      icon: CheckCircle2,
      color: "text-emerald-600",
      bg: "bg-emerald-100/60 dark:bg-emerald-900/20",
    },
  ];

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
        <button type="button" onClick={openNew} className="ca-btn flex items-center gap-2">
          <Plus size={18} />
          {t("new")}
        </button>
      </div>

      {!organizacaoId && <div className="ca-card p-4 text-sm ca-muted">{t("noOrg")}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            setAppliedDesignacao(draftDesignacao);
            setAppliedMarca(draftMarca);
            setAppliedModelo(draftModelo);
            setAppliedCategoria(draftCategoria);
            setAppliedEstado(draftEstado);
            setCurrentPage(1);
          }}
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3"
        >
          <input
            className="ca-input"
            placeholder={t("filters.designacao")}
            value={draftDesignacao}
            onChange={(e) => setDraftDesignacao(e.target.value)}
          />
          <input
            className="ca-input"
            placeholder={t("filters.marca")}
            value={draftMarca}
            onChange={(e) => setDraftMarca(e.target.value)}
          />
          <input
            className="ca-input"
            placeholder={t("filters.modelo")}
            value={draftModelo}
            onChange={(e) => setDraftModelo(e.target.value)}
          />
          <select
            className="ca-input"
            value={draftCategoria}
            onChange={(e) => setDraftCategoria(e.target.value)}
          >
            <option value="">{t("filters.categoriaAll")}</option>
            {CATEGORIAS.map((c) => (
              <option key={c} value={String(c)}>
                {tCat(String(c))}
              </option>
            ))}
          </select>
          <select
            className="ca-input"
            value={draftEstado}
            onChange={(e) => setDraftEstado(e.target.value)}
          >
            <option value="">{t("filters.estadoAll")}</option>
            <option value="0">{tEst("0")}</option>
            <option value="1">{tEst("1")}</option>
            <option value="2">{tEst("2")}</option>
            <option value="3">{tEst("3")}</option>
          </select>
          <button type="submit" className="ca-btn md:col-span-2 xl:col-span-1">
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
            <div className="px-4 py-3 border-b ca-border flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <span className="text-sm ca-muted">
                {selectedIds.length} {t("bulk.selected")}
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="ca-btn text-sm"
                  disabled={selectedIds.length === 0 || bulkLoading !== null}
                  onClick={() => void runBulk("ativar", "ativar-bulk")}
                >
                  {bulkLoading === "ativar" ? <Loader2 size={14} className="animate-spin inline" /> : null}{" "}
                  {t("bulk.activate")}
                </button>
                <button
                  type="button"
                  className="ca-btn text-sm"
                  disabled={selectedIds.length === 0 || bulkLoading !== null}
                  onClick={() => void runBulk("desativar", "desativar-bulk")}
                >
                  {bulkLoading === "desativar" ? (
                    <Loader2 size={14} className="animate-spin inline" />
                  ) : null}{" "}
                  {t("bulk.deactivate")}
                </button>
                <button
                  type="button"
                  className="ca-btn text-sm"
                  disabled={selectedIds.length === 0 || bulkLoading !== null}
                  onClick={() => void runBulk("manutencao", "em-manutencao-bulk")}
                >
                  {bulkLoading === "manutencao" ? (
                    <Loader2 size={14} className="animate-spin inline" />
                  ) : null}{" "}
                  {t("bulk.maintenance")}
                </button>
                <button
                  type="button"
                  className="ca-btn text-sm"
                  disabled={selectedIds.length === 0 || bulkLoading !== null}
                  onClick={() => void runBulk("fora", "fora-de-servico-bulk")}
                >
                  {bulkLoading === "fora" ? <Loader2 size={14} className="animate-spin inline" /> : null}{" "}
                  {t("bulk.outOfService")}
                </button>
                <button
                  type="button"
                  className="ca-btn text-sm text-red-600"
                  disabled={selectedIds.length === 0 || bulkLoading !== null}
                  onClick={() => void runBulk("eliminar", "eliminar-bulk", t("confirm.deleteBulk"))}
                >
                  {bulkLoading === "eliminar" ? <Loader2 size={14} className="animate-spin inline" /> : null}{" "}
                  {t("bulk.delete")}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto ca-scroll">
              <table className="w-full text-sm min-w-[1360px]">
                <thead className="bg-slate-50 dark:bg-slate-800/40">
                  <tr>
                    <th className="px-3 py-3 text-left font-medium w-10">
                      <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
                    </th>
                    <th className="px-3 py-3 text-left font-medium">{t("table.rowNum")}</th>
                    <th className="px-3 py-3 text-left font-medium">{t("table.id")}</th>
                    <th className="px-3 py-3 text-left font-medium">{t("table.imagem")}</th>
                    <th className="px-3 py-3 text-left font-medium">{t("table.designacao")}</th>
                    <th className="px-3 py-3 text-left font-medium min-w-[140px]">{t("table.descricao")}</th>
                    <th className="px-3 py-3 text-left font-medium">{t("table.modelo")}</th>
                    <th className="px-3 py-3 text-left font-medium">{t("table.marca")}</th>
                    <th className="px-3 py-3 text-left font-medium whitespace-nowrap">{t("table.unidade")}</th>
                    <th className="px-3 py-3 text-left font-medium">{t("table.categoria")}</th>
                    <th className="px-3 py-3 text-left font-medium">{t("table.fabricante")}</th>
                    <th className="px-3 py-3 text-left font-medium">{t("table.estado")}</th>
                    <th className="px-3 py-3 text-left font-medium">{t("table.organizacao")}</th>
                    <th className="px-3 py-3 text-left font-medium whitespace-nowrap">{t("table.createdAt")}</th>
                    <th className="px-3 py-3 text-left font-medium whitespace-nowrap">{t("table.updatedAt")}</th>
                    <th className="px-3 py-3 text-right font-medium">{t("table.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y ca-border">
                  {list.map((row, index) => {
                    const imgUrl = materialImagePublicUrl(api_base_url, row.imagem);
                    return (
                      <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(row.id)}
                            onChange={() => toggleRowSelection(row.id)}
                          />
                        </td>
                        <td className="px-3 py-2 font-mono text-xs ca-muted">
                          {(currentPage - 1) * perPage + index + 1}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs">{row.id}</td>
                        <td className="px-3 py-2 w-16">
                          {imgUrl ? (
                            <button
                              type="button"
                              className="block rounded-lg overflow-hidden border ca-border focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
                              onClick={() => void openView(row)}
                              title={t("actions.view")}
                            >
                              <img
                                src={imgUrl}
                                alt=""
                                className="h-10 w-10 object-cover"
                                loading="lazy"
                              />
                            </button>
                          ) : (
                            <div
                              className="h-10 w-10 rounded-lg border ca-border ca-muted flex items-center justify-center text-[10px]"
                              title={t("table.noImage")}
                            >
                              —
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 font-medium max-w-[160px]">
                          <span className="line-clamp-2" title={row.designacao}>
                            {row.designacao}
                          </span>
                        </td>
                        <td
                          className="px-3 py-2 ca-muted max-w-[200px] align-top"
                          title={row.descricao ?? undefined}
                        >
                          {truncateText(row.descricao, 80)}
                        </td>
                        <td className="px-3 py-2 max-w-[120px]">{row.modelo?.trim() || "—"}</td>
                        <td className="px-3 py-2 max-w-[120px]">{row.marca?.trim() || "—"}</td>
                        <td className="px-3 py-2 max-w-[80px] whitespace-nowrap">
                          {row.unidade?.trim() || "—"}
                        </td>
                        <td className="px-3 py-2 max-w-[160px]">{categoriaLabel(row.categoria)}</td>
                        <td className="px-3 py-2 max-w-[120px]">{row.fabricante?.trim() || "—"}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${estadoBadgeClass(row.estado)}`}
                          >
                            {estadoLabel(row.estado)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs max-w-[140px]" title={orgCell(row)}>
                          <span className="line-clamp-2">{orgCell(row)}</span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-xs ca-muted">
                          {formatDateShort(row.created_at, locale)}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-xs ca-muted">
                          {formatDateShort(row.updated_at, locale)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              className="ca-icon-btn"
                              title={t("actions.view")}
                              onClick={() => void openView(row)}
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
            </div>

            {list.length === 0 && !loading && (
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
              <h2 className="text-lg font-semibold truncate">{editingId ? t("form.edit") : t("form.new")}</h2>
              <button type="button" onClick={closePanel} aria-label={t("cancel")}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col flex-1 min-h-0">
              <div className="p-4 space-y-4 flex-1 overflow-y-auto ca-scroll">
                <div>
                  <label className="block text-xs font-medium ca-muted mb-1">{t("form.designacao")}</label>
                  <input
                    className="ca-input w-full"
                    value={form.designacao}
                    onChange={(e) => setForm((f) => ({ ...f, designacao: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium ca-muted mb-1">{t("form.descricao")}</label>
                  <textarea
                    className="ca-input w-full min-h-[88px] resize-y"
                    value={form.descricao}
                    onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium ca-muted mb-1">{t("form.modelo")}</label>
                  <input
                    className="ca-input w-full"
                    value={form.modelo}
                    onChange={(e) => setForm((f) => ({ ...f, modelo: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium ca-muted mb-1">{t("form.marca")}</label>
                  <input
                    className="ca-input w-full"
                    value={form.marca}
                    onChange={(e) => setForm((f) => ({ ...f, marca: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium ca-muted mb-1">{t("form.unidade")}</label>
                  <input
                    className="ca-input w-full"
                    value={form.unidade}
                    onChange={(e) => setForm((f) => ({ ...f, unidade: e.target.value }))}
                    placeholder={t("form.unidadePlaceholder")}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium ca-muted mb-1">{t("form.categoria")}</label>
                  <select
                    className="ca-input w-full"
                    value={form.categoria}
                    onChange={(e) => setForm((f) => ({ ...f, categoria: Number(e.target.value) || 1 }))}
                  >
                    {CATEGORIAS.map((c) => (
                      <option key={c} value={c}>
                        {tCat(String(c))}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium ca-muted mb-1">{t("form.fabricante")}</label>
                  <input
                    className="ca-input w-full"
                    value={form.fabricante}
                    onChange={(e) => setForm((f) => ({ ...f, fabricante: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium ca-muted mb-1">{t("form.estado")}</label>
                  <select
                    className="ca-input w-full"
                    value={form.estado}
                    onChange={(e) => setForm((f) => ({ ...f, estado: Number(e.target.value) }))}
                  >
                    <option value={1}>{tEst("1")}</option>
                    <option value={0}>{tEst("0")}</option>
                    <option value={2}>{tEst("2")}</option>
                    <option value={3}>{tEst("3")}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium ca-muted mb-1">{t("form.imagem")}</label>
                  <input
                    key={formFileInputKey}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="ca-input w-full text-sm file:mr-2"
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      setForm((prev) => ({ ...prev, imagem: f }));
                    }}
                  />
                  <p className="text-[11px] ca-muted mt-1">{t("form.imagemHint")}</p>
                  <div className="mt-3 rounded-xl border ca-border overflow-hidden bg-slate-50 dark:bg-slate-900/40 min-h-[120px] flex items-center justify-center">
                    {formImagePreviewSrc ? (
                      <img
                        src={formImagePreviewSrc}
                        alt=""
                        className="max-h-48 w-full object-contain"
                      />
                    ) : (
                      <span className="text-xs ca-muted px-4 py-6 text-center">{t("form.noPreview")}</span>
                    )}
                  </div>
                  {form.imagem && (
                    <button
                      type="button"
                      className="mt-2 text-xs text-red-600 hover:underline"
                      onClick={() => {
                        setForm((f) => ({ ...f, imagem: null }));
                        setFormFileInputKey((k) => k + 1);
                      }}
                    >
                      {t("form.clearNewImage")}
                    </button>
                  )}
                  {editingId && formExistingImageName && !form.imagem && (
                    <p className="text-[11px] ca-muted mt-2">{t("form.keepExistingImageHint")}</p>
                  )}
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

      {viewing && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={closeView} aria-hidden />
          <div
            className="relative ca-panel rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col"
            role="dialog"
            aria-modal
            aria-labelledby="material-detail-title"
          >
            <div className="flex items-center justify-between gap-3 p-4 border-b ca-border">
              <h2 id="material-detail-title" className="text-lg font-semibold truncate pr-2">
                {viewing.designacao}
              </h2>
              <button type="button" className="ca-icon-btn shrink-0" onClick={closeView} aria-label={t("cancel")}>
                <X size={20} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto ca-scroll space-y-4 flex-1">
              {viewLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                </div>
              ) : (
                <>
                  <div className="rounded-xl border ca-border overflow-hidden bg-slate-50 dark:bg-slate-900/40">
                    {materialImagePublicUrl(api_base_url, viewing.imagem) ? (
                      <img
                        src={materialImagePublicUrl(api_base_url, viewing.imagem)!}
                        alt=""
                        className="w-full max-h-64 object-contain"
                      />
                    ) : (
                      <div className="py-12 text-center text-sm ca-muted">{t("modal.noImage")}</div>
                    )}
                  </div>
                  <dl className="grid grid-cols-1 gap-3 text-sm">
                    <div>
                      <dt className="text-xs ca-muted">{t("modal.id")}</dt>
                      <dd className="font-mono">{viewing.id}</dd>
                    </div>
                    <div>
                      <dt className="text-xs ca-muted">{t("modal.descricao")}</dt>
                      <dd className="whitespace-pre-wrap">{viewing.descricao?.trim() || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs ca-muted">{t("modal.modelo")}</dt>
                      <dd>{viewing.modelo?.trim() || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs ca-muted">{t("modal.marca")}</dt>
                      <dd>{viewing.marca?.trim() || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs ca-muted">{t("modal.unidade")}</dt>
                      <dd>{viewing.unidade?.trim() || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs ca-muted">{t("modal.categoria")}</dt>
                      <dd>{categoriaLabel(viewing.categoria)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs ca-muted">{t("modal.fabricante")}</dt>
                      <dd>{viewing.fabricante?.trim() || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs ca-muted">{t("modal.estado")}</dt>
                      <dd>
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${estadoBadgeClass(viewing.estado)}`}
                        >
                          {estadoLabel(viewing.estado)}
                        </span>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs ca-muted">{t("modal.organizacao")}</dt>
                      <dd>{orgCell(viewing)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs ca-muted">{t("modal.imagemFile")}</dt>
                      <dd className="font-mono text-xs break-all">{viewing.imagem?.trim() || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs ca-muted">{t("modal.createdAt")}</dt>
                      <dd>{formatDateShort(viewing.created_at, locale)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs ca-muted">{t("modal.updatedAt")}</dt>
                      <dd>{formatDateShort(viewing.updated_at, locale)}</dd>
                    </div>
                  </dl>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <button
                      type="button"
                      className="ca-btn text-sm inline-flex items-center gap-2"
                      onClick={() => {
                        closeView();
                        openEdit(viewing);
                      }}
                    >
                      <Pencil size={16} />
                      {t("modal.edit")}
                    </button>
                    <button
                      type="button"
                      className="ca-btn text-sm inline-flex items-center gap-2 border-red-200 text-red-600"
                      onClick={() => void handleDelete(viewing.id)}
                    >
                      <Trash2 size={16} />
                      {t("modal.delete")}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
