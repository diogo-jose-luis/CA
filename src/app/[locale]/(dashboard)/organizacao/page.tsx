"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Building2,
  CheckCircle,
  XCircle,
  Plus,
  X,
  Pencil,
  Trash2,
  Image as ImageIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/hooks/useAuth";
import type { Organizacao, OrganizacaoEstadoFilter } from "@/types/organizacao";

const TIPO_MAP: Record<number, string> = {
  1: "Empresa",
  2: "Condomínio",
  3: "Outro",
};

function EstadoBadge({
  estado,
  labels,
}: {
  estado: number;
  labels: { ativo: string; desativado: string };
}) {
  const isActive = estado === 1;
  return (
    <span
      className={
        isActive
          ? "px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
          : "px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
      }
    >
      {isActive ? labels.ativo : labels.desativado}
    </span>
  );
}

export default function OrganizacaoPage() {
  const t = useTranslations("organizacao");
  const { http, api_base_url } = useAuth();

  const [list, setList] = useState<Organizacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; isError?: boolean } | null>(null);
  const [showOffcanvas, setShowOffcanvas] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const [filtroEstado, setFiltroEstado] = useState<OrganizacaoEstadoFilter>("all");
  const [filtroTipo, setFiltroTipo] = useState<number | "">("");
  const [filtroSearch, setFiltroSearch] = useState("");

  const [form, setForm] = useState({
    designacao: "",
    descricao: "",
    tipo: "" as number | "",
    estado: 1,
    imagem: null as File | null,
    imagemPreviewUrl: null as string | null, // object URL para preview (revogar ao limpar/fechar)
  });
  const [formSubmitting, setFormSubmitting] = useState(false);

  const showToast = useCallback((message: string, isError?: boolean) => {
    setToast({ message, isError });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const buildImageUrl = useCallback(
    (org: Organizacao) => {
      const url = org.imagem_url ?? org.imagem;
      if (!url) return null;
      const base = api_base_url.replace(/\/$/, "");
      const path = url.startsWith("/") ? url : `/${url}`;
      return `${base}${path}`;
    },
    [api_base_url]
  );

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params =
        filtroEstado === "all"
          ? {}
          : { estado: String(filtroEstado) };
      const res = await http.get<{ data: Organizacao[]; total: number }>(
        "/organizacoes",
        { params }
      );
      setList(res.data?.data ?? []);
    } catch {
      showToast(t("toast.error"), true);
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [http, filtroEstado, showToast, t]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const filteredList = list.filter((org) => {
    if (filtroSearch.trim()) {
      const q = filtroSearch.toLowerCase();
      if (!org.designacao?.toLowerCase().includes(q)) return false;
    }
    if (filtroTipo !== "" && org.tipo !== filtroTipo) return false;
    return true;
  });

  const stats = {
    total: list.length,
    ativas: list.filter((o) => o.estado === 1).length,
    desativadas: list.filter((o) => o.estado === 0).length,
  };

  const openNew = () => {
    setEditingId(null);
    setForm({
      designacao: "",
      descricao: "",
      tipo: "",
      estado: 1,
      imagem: null,
      imagemPreviewUrl: null,
    });
    setShowOffcanvas(true);
  };

  const openEdit = (org: Organizacao) => {
    setEditingId(org.id);
    setForm({
      designacao: org.designacao ?? "",
      descricao: org.descricao ?? "",
      tipo: org.tipo ?? "",
      estado: org.estado ?? 1,
      imagem: null,
      imagemPreviewUrl: null,
    });
    setShowOffcanvas(true);
  };

  const closeOffcanvas = () => {
    if (form.imagemPreviewUrl) {
      URL.revokeObjectURL(form.imagemPreviewUrl);
    }
    setShowOffcanvas(false);
    setEditingId(null);
  };

  const onFileChange = (file: File | null) => {
    setForm((prev) => {
      if (prev.imagemPreviewUrl) URL.revokeObjectURL(prev.imagemPreviewUrl);
      if (!file) {
        return { ...prev, imagem: null, imagemPreviewUrl: null };
      }
      return {
        ...prev,
        imagem: file,
        imagemPreviewUrl: URL.createObjectURL(file),
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.designacao.trim()) return;
    setFormSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("designacao", form.designacao.trim());
      formData.append("descricao", form.descricao.trim());
      formData.append("tipo", form.tipo === "" ? "" : String(form.tipo));
      formData.append("estado", String(form.estado));
      if (form.imagem) formData.append("imagem", form.imagem);

      // PHP/Laravel não popula o body em pedidos PUT com multipart; usar POST + _method=PUT (method spoofing)
      const config = { headers: { "Content-Type": undefined } };
      if (editingId) {
        formData.append("_method", "PUT");
        await http.post(`/organizacoes/${editingId}`, formData, config as never);
        showToast(t("toast.updated"));
      } else {
        await http.post("/organizacoes", formData, config as never);
        showToast(t("toast.created"));
      }
      closeOffcanvas();
      fetchList();
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { errors?: Record<string, string[]> } } })
              .response?.data?.errors
            ? Object.values(
                (err as { response: { data: { errors: Record<string, string[]> } } })
                  .response.data.errors
              )
                .flat()
                .join(" ")
            : t("toast.error")
          : t("toast.error");
      showToast(msg, true);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t("actions.remove") + "?")) return;
    try {
      await http.delete(`/organizacoes/${id}`);
      showToast(t("toast.deleted"));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      fetchList();
    } catch {
      showToast(t("toast.error"), true);
    }
  };

  const handleActivate = async (id: number) => {
    try {
      await http.post(`/organizacoes/${id}/ativar`);
      showToast(t("toast.activated"));
      fetchList();
    } catch {
      showToast(t("toast.error"), true);
    }
  };

  const handleDeactivate = async (id: number) => {
    try {
      await http.post(`/organizacoes/${id}/desativar`);
      showToast(t("toast.deactivated"));
      fetchList();
    } catch {
      showToast(t("toast.error"), true);
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredList.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredList.map((o) => o.id)));
    }
  };

  const bulkActivate = async () => {
    if (selectedIds.size === 0) return;
    try {
      await http.post("/organizacoes/ativar-bulk", { ids: Array.from(selectedIds) });
      showToast(t("toast.bulkActivated"));
      setSelectedIds(new Set());
      fetchList();
    } catch {
      showToast(t("toast.error"), true);
    }
  };

  const bulkDeactivate = async () => {
    if (selectedIds.size === 0) return;
    try {
      await http.post("/organizacoes/desativar-bulk", { ids: Array.from(selectedIds) });
      showToast(t("toast.bulkDeactivated"));
      setSelectedIds(new Set());
      fetchList();
    } catch {
      showToast(t("toast.error"), true);
    }
  };

  const bulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(t("bulk.eliminar") + "?")) return;
    try {
      await http.post("/organizacoes/eliminar-bulk", { ids: Array.from(selectedIds) });
      showToast(t("toast.bulkDeleted"));
      setSelectedIds(new Set());
      fetchList();
    } catch {
      showToast(t("toast.error"), true);
    }
  };

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
        <div className="ca-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm ca-muted">{t("stats.total")}</div>
              <div className="text-2xl font-semibold mt-1">{stats.total}</div>
            </div>
            <div className="h-11 w-11 rounded-2xl flex items-center justify-center bg-blue-100/60 dark:bg-blue-900/20">
              <Building2 className="text-blue-600" size={20} />
            </div>
          </div>
        </div>
        <div className="ca-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm ca-muted">{t("stats.ativas")}</div>
              <div className="text-2xl font-semibold mt-1">{stats.ativas}</div>
            </div>
            <div className="h-11 w-11 rounded-2xl flex items-center justify-center bg-green-100/60 dark:bg-green-900/20">
              <CheckCircle className="text-green-600" size={20} />
            </div>
          </div>
        </div>
        <div className="ca-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm ca-muted">{t("stats.desativadas")}</div>
              <div className="text-2xl font-semibold mt-1">{stats.desativadas}</div>
            </div>
            <div className="h-11 w-11 rounded-2xl flex items-center justify-center bg-red-100/60 dark:bg-red-900/20">
              <XCircle className="text-red-600" size={20} />
            </div>
          </div>
        </div>
      </div>

      <div className="ca-card p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            className="ca-input"
            placeholder={t("filters.search")}
            value={filtroSearch}
            onChange={(e) => setFiltroSearch(e.target.value)}
          />
          <select
            className="ca-input"
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value === "" ? "" : Number(e.target.value))}
          >
            <option value="">{t("filters.tipo")}</option>
            <option value={1}>{t("filters.empresa")}</option>
            <option value={2}>{t("filters.condominio")}</option>
            <option value={3}>Outro</option>
          </select>
          <select
            className="ca-input"
            value={filtroEstado}
            onChange={(e) =>
              setFiltroEstado(
                e.target.value === "all" ? "all" : Number(e.target.value) as 0 | 1
              )
            }
          >
            <option value="all">{t("filters.estado")} ({t("filters.all")})</option>
            <option value={1}>{t("filters.ativo")}</option>
            <option value={0}>{t("filters.desativado")}</option>
          </select>
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="ca-card p-4 flex flex-wrap items-center gap-3">
          <span className="text-sm ca-muted">
            {selectedIds.size} {t("bulk.selected")}
          </span>
          <button type="button" className="ca-btn text-sm" onClick={bulkActivate}>
            {t("bulk.ativar")}
          </button>
          <button type="button" className="ca-btn text-sm" onClick={bulkDeactivate}>
            {t("bulk.desativar")}
          </button>
          <button
            type="button"
            className="px-4 py-2 rounded-xl text-sm border border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
            onClick={bulkDelete}
          >
            {t("bulk.eliminar")}
          </button>
          <button
            type="button"
            className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            onClick={() => setSelectedIds(new Set())}
          >
            Limpar seleção
          </button>
        </div>
      )}

      <div className="ca-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">{t("loading")}</div>
        ) : filteredList.length === 0 ? (
          <div className="p-8 text-center text-slate-500">{t("empty")}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/40">
              <tr>
                <th className="px-4 py-3 text-left w-10">
                  <input
                    type="checkbox"
                    checked={
                      filteredList.length > 0 &&
                      selectedIds.size === filteredList.length
                    }
                    onChange={toggleSelectAll}
                    className="rounded border-slate-300"
                  />
                </th>
                <th className="px-4 py-3 text-left font-medium">#</th>
                <th className="px-4 py-3 text-left font-medium">{t("table.logo")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("table.designacao")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("table.descricao")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("table.estado")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("table.tipo")}</th>
                <th className="px-4 py-3 text-right font-medium">{t("table.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y ca-border">
              {filteredList.map((row, index) => {
                const imgUrl = buildImageUrl(row);
                return (
                  <tr
                    key={row.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/30"
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(row.id)}
                        onChange={() => toggleSelect(row.id)}
                        className="rounded border-slate-300"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium">{index + 1}</td>
                    <td className="px-4 py-3">
                      <div className="h-10 w-10 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                        {imgUrl ? (
                          <img
                            src={imgUrl}
                            alt={row.designacao}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                "/file.svg";
                            }}
                          />
                        ) : (
                          <ImageIcon size={18} className="text-slate-400" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium">{row.designacao}</td>
                    <td className="px-4 py-3 ca-muted max-w-[200px] truncate">
                      {row.descricao ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <EstadoBadge
                        estado={row.estado}
                        labels={{
                          ativo: t("filters.ativo"),
                          desativado: t("filters.desativado"),
                        }}
                      />
                    </td>
                    <td className="px-4 py-3">
                      {row.tipo != null ? TIPO_MAP[row.tipo] ?? row.tipo : "—"}
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
                        {row.estado === 1 ? (
                          <button
                            type="button"
                            className="ca-icon-btn text-amber-600"
                            title={t("actions.desativar")}
                            onClick={() => handleDeactivate(row.id)}
                          >
                            <XCircle size={16} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="ca-icon-btn text-green-600"
                            title={t("actions.ativar")}
                            onClick={() => handleActivate(row.id)}
                          >
                            <CheckCircle size={16} />
                          </button>
                        )}
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
        )}
      </div>

      {showOffcanvas && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={closeOffcanvas}
            aria-hidden
          />
          <div className="relative ml-auto h-full w-full max-w-md ca-panel shadow-2xl flex flex-col bg-white dark:bg-slate-900">
            <div className="flex items-center justify-between p-4 border-b ca-border">
              <h2 className="text-lg font-semibold">
                {editingId ? t("form.edit") : t("form.new")}
              </h2>
              <button type="button" onClick={closeOffcanvas}>
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex flex-col flex-1 min-h-0"
            >
              <div className="p-4 space-y-4 flex-1 overflow-y-auto ca-scroll">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">
                    {t("form.designacao")} *
                  </label>
                  <input
                    className="ca-input"
                    placeholder={t("form.designacao")}
                    value={form.designacao}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, designacao: e.target.value }))
                    }
                    required
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">
                    {t("form.descricao")}
                  </label>
                  <textarea
                    className="ca-input"
                    placeholder={t("form.descricao")}
                    rows={3}
                    value={form.descricao}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, descricao: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">
                    {t("form.tipo")}
                  </label>
                  <select
                    className="ca-input"
                    value={form.tipo}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        tipo: e.target.value === "" ? "" : Number(e.target.value),
                      }))
                    }
                  >
                    <option value="">—</option>
                    <option value={1}>{t("filters.empresa")}</option>
                    <option value={2}>{t("filters.condominio")}</option>
                    <option value={3}>Outro</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">
                    {t("form.estado")}
                  </label>
                  <select
                    className="ca-input"
                    value={form.estado}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, estado: Number(e.target.value) }))
                    }
                  >
                    <option value={1}>{t("filters.ativo")}</option>
                    <option value={0}>{t("filters.desativado")}</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">
                    {t("form.imagem")}
                  </label>
                  {/* Preview: nova imagem selecionada ou imagem actual ao editar */}
                  {(() => {
                    const editingOrg = editingId
                      ? list.find((o) => o.id === editingId)
                      : null;
                    const previewUrl =
                      form.imagemPreviewUrl ??
                      (editingOrg && !form.imagem
                        ? buildImageUrl(editingOrg)
                        : null);
                    return previewUrl ? (
                      <div className="mb-3 flex items-start gap-3">
                        <div className="h-20 w-20 shrink-0 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-700 border border-slate-200 dark:border-slate-600">
                          <img
                            src={previewUrl}
                            alt="Preview"
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display =
                                "none";
                            }}
                          />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          {form.imagem
                            ? form.imagem.name
                            : editingOrg?.designacao
                              ? t("form.currentImage")
                              : null}
                        </p>
                      </div>
                    ) : null;
                  })()}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="ca-input"
                    onChange={(e) =>
                      onFileChange(e.target.files?.[0] ?? null)
                    }
                  />
                </div>
              </div>

              <div className="p-4 border-t ca-border flex justify-end gap-2">
                <button
                  type="button"
                  className="px-4 py-2 rounded-xl border ca-border"
                  onClick={closeOffcanvas}
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  className="ca-btn"
                  disabled={formSubmitting}
                >
                  {formSubmitting
                    ? "..."
                    : editingId
                      ? t("form.save")
                      : t("form.register")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
