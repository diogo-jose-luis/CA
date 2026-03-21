"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Building2,
  Users,
  CheckCircle2,
  CircleOff,
  Plus,
  X,
  Pencil,
  Trash2,
  User,
  Loader2,
  Image as ImageIcon,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { Utilizador, UtilizadorListResponse } from "@/types/utilizador";

const API_PREFIX = "/clientes";
const CLIENTE_TIPO = 3;
const ORG_KEY = "ca.selected.organization";

export default function Page() {
  const t = useTranslations("clientsPage");
  const { http, api_base_url } = useAuth();
  const [organizacaoId, setOrganizacaoId] = useState<number | null>(null);

  const [list, setList] = useState<Utilizador[]>([]);
  const [total, setTotal] = useState(0);
  const [perPage, setPerPage] = useState(15);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; isError?: boolean } | null>(null);

  const [filtroNome, setFiltroNome] = useState("");
  const [filtroArea, setFiltroArea] = useState("");
  const [filtroEmail, setFiltroEmail] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState<
    "ativar" | "desativar" | "eliminar" | null
  >(null);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    area: "",
    email: "",
    telefone: "",
    site: "",
    imagem: null as File | null,
    imagemPreviewUrl: null as string | null,
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ORG_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { id?: number | string };
      const id =
        typeof parsed?.id === "number"
          ? parsed.id
          : Number(parsed?.id);
      if (Number.isFinite(id) && id > 0) setOrganizacaoId(id);
    } catch {
      // noop
    }
  }, []);

  const showToast = useCallback((message: string, isError?: boolean) => {
    setToast({ message, isError });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const buildImageUrl = useCallback(
    (user: Utilizador) => {
      const path = user.imagem;
      if (!path) return null;
      const base = api_base_url.replace(/\/$/, "");
      const p = path.startsWith("/") ? path : `/storage/${path}`;
      return `${base}${p}`;
    },
    [api_base_url],
  );

  const getAreaLabel = useCallback((u: Utilizador) => {
    return u.empresa?.designacao ?? u.organizacao?.designacao ?? u.departamento?.nome ?? "—";
  }, []);

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
      if (filtroNome.trim()) params.nome = filtroNome.trim();
      if (filtroEmail.trim()) params.email = filtroEmail.trim();
      if (filtroArea.trim()) params.area = filtroArea.trim();

      const res = await http.get<UtilizadorListResponse>(
        `${API_PREFIX}/${organizacaoId}`,
        { params }
      );
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
    perPage,
    currentPage,
    filtroNome,
    filtroEmail,
    filtroArea,
    showToast,
    t,
  ]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    setSelectedIds([]);
  }, [list]);

  const openNew = () => {
    setEditingId(null);
    setForm({
      name: "",
      area: "",
      email: "",
      telefone: "",
      site: "",
      imagem: null,
      imagemPreviewUrl: null,
    });
    setShowModal(true);
  };

  const openEdit = (u: Utilizador) => {
    setEditingId(u.id);
    setForm({
      name: u.name ?? "",
      area: getAreaLabel(u) === "—" ? "" : getAreaLabel(u),
      email: u.email ?? "",
      telefone: u.telefone ?? "",
      site: u.site ?? "",
      imagem: null,
      imagemPreviewUrl: null,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    if (form.imagemPreviewUrl) URL.revokeObjectURL(form.imagemPreviewUrl);
    setShowModal(false);
    setEditingId(null);
  };

  const onFileChange = (file: File | null) => {
    setForm((prev) => {
      if (prev.imagemPreviewUrl) URL.revokeObjectURL(prev.imagemPreviewUrl);
      if (!file) return { ...prev, imagem: null, imagemPreviewUrl: null };
      return {
        ...prev,
        imagem: file,
        imagemPreviewUrl: URL.createObjectURL(file),
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizacaoId) {
      showToast(t("toast.orgRequired"), true);
      return;
    }
    if (!form.name.trim()) return;
    setFormSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("name", form.name.trim());
      if (form.email.trim()) formData.append("email", form.email.trim());
      formData.append("telefone", form.telefone.trim());
      formData.append("site", form.site.trim());
      formData.append("tipo", String(CLIENTE_TIPO));
      if (form.area.trim()) formData.append("area", form.area.trim());
      if (form.imagem) formData.append("imagem", form.imagem);

      const config = { headers: { "Content-Type": undefined } };
      if (editingId) {
        formData.append("_method", "PUT");
        await http.post(
          `${API_PREFIX}/${organizacaoId}/${editingId}`,
          formData,
          config as never
        );
        showToast(t("toast.updated"));
      } else {
        await http.post(
          `${API_PREFIX}/${organizacaoId}`,
          formData,
          config as never
        );
        showToast(t("toast.created"));
      }
      closeModal();
      fetchList();
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { errors?: Record<string, string[]> } } }).response?.data
              ?.errors
            ? Object.values(
                (err as { response: { data: { errors: Record<string, string[]> } } }).response.data
                  .errors,
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
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleBulkAction = async (action: "ativar" | "desativar" | "eliminar") => {
    if (!organizacaoId) {
      showToast(t("toast.orgRequired"), true);
      return;
    }
    if (selectedIds.length === 0) {
      showToast(t("toast.selectAtLeastOne"), true);
      return;
    }
    if (action === "eliminar" && !confirm(t("confirm.deleteBulk"))) return;

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
  const cardsStats = useMemo(() => {
    const corporativos = list.filter((u) => {
      const area = getAreaLabel(u).toLowerCase();
      return area.includes("corp") || area.includes("empresa") || area.includes("industrial");
    }).length;
    const particulares = Math.max(0, list.length - corporativos);
    return {
      total: list.length,
      corporativos,
      particulares,
    };
  }, [list, getAreaLabel]);

  const statCards = [
    {
      label: t("stats.total"),
      value: cardsStats.total,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-100/60 dark:bg-blue-900/20",
    },
    {
      label: t("stats.corporate"),
      value: cardsStats.corporativos,
      icon: Building2,
      color: "text-green-600",
      bg: "bg-green-100/60 dark:bg-green-900/20",
    },
    {
      label: t("stats.individual"),
      value: cardsStats.particulares,
      icon: Users,
      color: "text-slate-600",
      bg: "bg-slate-100/60 dark:bg-slate-800/40",
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
          <p className="text-sm ca-muted">
            {t("subtitle")}
          </p>
        </div>
        <button onClick={openNew} className="ca-btn flex items-center gap-2">
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
            setCurrentPage(1);
            fetchList();
          }}
          className="grid grid-cols-1 md:grid-cols-4 gap-3"
        >
          <input
            className="ca-input"
            placeholder={t("filters.name")}
            value={filtroNome}
            onChange={(e) => setFiltroNome(e.target.value)}
          />
          <input
            className="ca-input"
            placeholder={t("filters.area")}
            value={filtroArea}
            onChange={(e) => setFiltroArea(e.target.value)}
          />
          <input
            className="ca-input"
            placeholder={t("filters.email")}
            value={filtroEmail}
            onChange={(e) => setFiltroEmail(e.target.value)}
          />
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
                  disabled={selectedIds.length === 0 || bulkActionLoading !== null}
                  onClick={() => handleBulkAction("ativar")}
                >
                  <span className="inline-flex items-center gap-2">
                    {bulkActionLoading === "ativar" ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={14} />
                    )}
                    {t("bulk.activate")}
                  </span>
                </button>
                <button
                  type="button"
                  className="ca-btn text-sm"
                  disabled={selectedIds.length === 0 || bulkActionLoading !== null}
                  onClick={() => handleBulkAction("desativar")}
                >
                  <span className="inline-flex items-center gap-2">
                    {bulkActionLoading === "desativar" ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <CircleOff size={14} />
                    )}
                    {t("bulk.deactivate")}
                  </span>
                </button>
                <button
                  type="button"
                  className="ca-btn text-sm"
                  disabled={selectedIds.length === 0 || bulkActionLoading !== null}
                  onClick={() => handleBulkAction("eliminar")}
                >
                  <span className="inline-flex items-center gap-2">
                    {bulkActionLoading === "eliminar" ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                    {t("bulk.delete")}
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
                  <th className="px-4 py-3 text-left font-medium">{t("table.logo")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("table.name")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("table.area")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("table.email")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("table.phone")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("table.site")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("table.status")}</th>
                  <th className="px-4 py-3 text-right font-medium">{t("table.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y ca-border">
                {list.map((row, index) => {
                  const imgUrl = buildImageUrl(row);
                  const area = getAreaLabel(row);
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
                              alt={row.name}
                              className="h-full w-full object-contain"
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
                            <User size={18} />
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium">{row.name}</td>
                      <td className="px-4 py-3">{area}</td>
                      <td className="px-4 py-3 ca-muted">{row.email ?? "—"}</td>
                      <td className="px-4 py-3">{row.telefone ?? "—"}</td>
                      <td className="px-4 py-3 text-blue-600">{row.site ?? "—"}</td>
                      <td className="px-4 py-3">
                        {row.estado === 1 ? (
                          <span className="text-green-600 dark:text-green-400 text-xs font-medium">
                            {t("status.active")}
                          </span>
                        ) : (
                          <span className="text-red-600 dark:text-red-400 text-xs font-medium">
                            {t("status.inactive")}
                          </span>
                        )}
                      </td>
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
            {list.length === 0 && !loading && (
              <div className="py-8 text-center ca-muted text-sm">{t("empty")}</div>
            )}
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

      {showModal && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={closeModal} />
          <div className="relative ml-auto h-full w-full max-w-md ca-panel shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b ca-border">
              <h2 className="text-lg font-semibold">{editingId ? t("form.edit") : t("form.new")}</h2>
              <button type="button" onClick={closeModal}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="p-4 space-y-4 flex-1 overflow-y-auto ca-scroll">
                <input
                  className="ca-input"
                  placeholder={t("form.name")}
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
                <input
                  className="ca-input"
                  placeholder={t("form.area")}
                  value={form.area}
                  onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))}
                />
                <input
                  type="email"
                  className="ca-input"
                  placeholder={t("form.email")}
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
                <input
                  className="ca-input"
                  placeholder={t("form.phone")}
                  value={form.telefone}
                  onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
                />
                <input
                  className="ca-input"
                  placeholder={t("form.site")}
                  value={form.site}
                  onChange={(e) => setForm((f) => ({ ...f, site: e.target.value }))}
                />
                <div>
                  <label className="block text-sm font-medium mb-1">{t("form.logo")}</label>
                  <input
                    type="file"
                    accept="image/*"
                    className="ca-input"
                    onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
                  />
                  {form.imagemPreviewUrl ? (
                    <img
                      src={form.imagemPreviewUrl}
                      alt="Preview"
                      className="mt-2 h-20 w-28 rounded-lg object-contain bg-slate-100 dark:bg-slate-800"
                    />
                  ) : (
                    <div className="mt-2 h-20 w-28 rounded-lg flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400">
                      <ImageIcon size={20} />
                    </div>
                  )}
                </div>
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