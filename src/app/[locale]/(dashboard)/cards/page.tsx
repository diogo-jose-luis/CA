"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  CreditCard,
  CheckCircle2,
  CircleOff,
  AlertTriangle,
  RefreshCw,
  Plus,
  X,
  Pencil,
  Trash2,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { Utilizador, UtilizadorListResponse } from "@/types/utilizador";

type Cartao = {
  id: number;
  codigo: string;
  descricao?: string | null;
  titular?: string | { id?: number; name?: string } | null;
  titular_id?: number | null;
  tipo?: number | null;
  emissao?: string | null;
  validade?: string | null;
  estado?: number;
  titular_rel?: { id: number; name?: string } | null;
  titular_user?: { id: number; name?: string } | null;
  titularModel?: { id: number; name?: string } | null;
};

type CartaoListResponse = {
  data: Cartao[];
  total: number;
  per_page: number;
  current_page: number;
};

const API_PREFIX = "/cartaos";
const ORG_KEY = "ca.selected.organization";

const USER_SOURCES = [
  "/utilizadores",
  "/colaboradores",
  "/moradores",
  "/porteiros",
  "/guests",
  "/clientes",
  "/fornecedores",
];

function toDateInput(date?: string | null): string {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function toDateLabel(date?: string | null): string {
  if (!date) return "—";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-PT");
}

function tipoLabel(tipo?: number | null): string {
  if (tipo == 1) return "RFID";
  if (tipo == 2) return "QR";
  if (tipo == 3) return "Outro";
  return "—";
}

function isExpired(validade?: string | null): boolean {
  if (!validade) return false;
  const d = new Date(validade);
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() < Date.now();
}

function EstadoBadge({ estado, t }: { estado?: number; t: ReturnType<typeof useTranslations> }) {
  const color =
    estado == 1
      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
      : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${color}`}>
      {estado == 1 ? t("status.active") : t("status.inactive")}
    </span>
  );
}

export default function Page() {
  const t = useTranslations("cardsPage");
  const { http } = useAuth();

  const [organizacaoId, setOrganizacaoId] = useState<number | null>(null);
  const [list, setList] = useState<Cartao[]>([]);
  const [total, setTotal] = useState(0);
  const [perPage, setPerPage] = useState(15);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; isError?: boolean } | null>(null);

  const [filtroCodigo, setFiltroCodigo] = useState("");
  const [filtroTitular, setFiltroTitular] = useState("");
  const [filtroDescricao, setFiltroDescricao] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("all");
  const [filtroEstado, setFiltroEstado] = useState("all");

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState<"ativar" | "desativar" | "eliminar" | null>(
    null,
  );

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [titulares, setTitulares] = useState<Utilizador[]>([]);
  const [titularesLoading, setTitularesLoading] = useState(false);

  const [form, setForm] = useState({
    codigo: "",
    descricao: "",
    titular_id: "",
    tipo: "1",
    emissao: "",
    validade: "",
    estado: 1,
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
      if (filtroCodigo.trim()) params.codigo = filtroCodigo.trim();
      if (filtroTitular.trim()) params.titular = filtroTitular.trim();
      if (filtroDescricao.trim()) params.descricao = filtroDescricao.trim();
      if (filtroTipo == "1" || filtroTipo == "2" || filtroTipo == "3") params.tipo = Number(filtroTipo);
      if (filtroEstado == "0" || filtroEstado == "1") params.estado = Number(filtroEstado);

      const res = await http.get<CartaoListResponse>(`${API_PREFIX}/${organizacaoId}`, { params });
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
    filtroCodigo,
    filtroDescricao,
    filtroEstado,
    filtroTipo,
    filtroTitular,
    http,
    organizacaoId,
    perPage,
    showToast,
    t,
  ]);

  const normalizeUsers = (payload: unknown): Utilizador[] => {
    const root = payload as { data?: unknown } | unknown[];
    const arr = Array.isArray(root) ? root : Array.isArray(root?.data) ? root.data : [];
    return arr
      .map((u) => u as Partial<Utilizador>)
      .filter((u): u is Utilizador => typeof u?.id == "number" && typeof u?.name == "string");
  };

  const fetchTitulares = useCallback(async () => {
    if (!organizacaoId) {
      setTitulares([]);
      return;
    }

    setTitularesLoading(true);
    try {
      const responses = await Promise.allSettled(
        USER_SOURCES.map((source) =>
          http.get<UtilizadorListResponse | unknown>(`${source}/${organizacaoId}`, {
            params: { per_page: 100 },
          }),
        ),
      );

      const merged = new Map<number, Utilizador>();
      for (const res of responses) {
        if (res.status != "fulfilled") continue;
        for (const user of normalizeUsers(res.value.data)) {
          if (!merged.has(user.id)) merged.set(user.id, user);
        }
      }

      const rows = Array.from(merged.values()).sort((a, b) => a.name.localeCompare(b.name));
      setTitulares(rows);
    } catch {
      setTitulares([]);
    } finally {
      setTitularesLoading(false);
    }
  }, [http, organizacaoId]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    fetchTitulares();
  }, [fetchTitulares]);

  useEffect(() => {
    setSelectedIds([]);
  }, [list]);

  const getTitularName = (row: Cartao) =>
    row.titular_rel?.name ??
    row.titular_user?.name ??
    row.titularModel?.name ??
    (typeof row.titular == "string"
      ? row.titular
      : row.titular && typeof row.titular == "object" && "name" in row.titular
        ? (row.titular.name ?? "—")
        : "—");

  const openNew = () => {
    setEditingId(null);
    setForm({
      codigo: t("form.codeAuto"),
      descricao: "",
      titular_id: "",
      tipo: "1",
      emissao: "",
      validade: "",
      estado: 1,
    });
    setShowModal(true);
  };

  const openEdit = (row: Cartao) => {
    setEditingId(row.id);
    setForm({
      codigo: row.codigo ?? "",
      descricao: row.descricao ?? "",
      titular_id: row.titular_id ? String(row.titular_id) : "",
      tipo: row.tipo ? String(row.tipo) : "1",
      emissao: toDateInput(row.emissao),
      validade: toDateInput(row.validade),
      estado: row.estado ?? 1,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizacaoId) {
      showToast(t("toast.orgRequired"), true);
      return;
    }
    if (!form.titular_id) {
      showToast(t("toast.holderRequired"), true);
      return;
    }

    setFormSubmitting(true);
    try {
      const payload = {
        descricao: form.descricao.trim() || null,
        titular_id: Number(form.titular_id),
        tipo: form.tipo ? Number(form.tipo) : null,
        emissao: form.emissao || null,
        validade: form.validade || null,
        estado: form.estado,
      };

      if (editingId) {
        await http.put(`${API_PREFIX}/${organizacaoId}/${editingId}`, payload);
        showToast(t("toast.updated"));
      } else {
        await http.post(`${API_PREFIX}/${organizacaoId}`, payload);
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

  const handleToggleEstado = async (row: Cartao) => {
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
  const cardsStats = useMemo(() => {
    const ativos = list.filter((c) => c.estado == 1).length;
    const inativos = list.filter((c) => c.estado == 0).length;
    const vencidos = list.filter((c) => isExpired(c.validade)).length;
    return { total: list.length, ativos, inativos, vencidos };
  }, [list]);

  const stats = [
    {
      label: t("stats.active"),
      value: cardsStats.ativos,
      icon: CheckCircle2,
      color: "text-green-600",
      bg: "bg-green-100/60 dark:bg-green-900/20",
    },
    {
      label: t("stats.expired"),
      value: cardsStats.vencidos,
      icon: AlertTriangle,
      color: "text-amber-600",
      bg: "bg-amber-100/60 dark:bg-amber-900/20",
    },
    {
      label: t("stats.inactive"),
      value: cardsStats.inativos,
      icon: CircleOff,
      color: "text-red-600",
      bg: "bg-red-100/60 dark:bg-red-900/20",
    },
    {
      label: t("stats.total"),
      value: cardsStats.total,
      icon: CreditCard,
      color: "text-slate-600",
      bg: "bg-slate-100/60 dark:bg-slate-800/40",
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

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
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
          className="grid grid-cols-1 md:grid-cols-5 gap-3"
        >
          <input
            className="ca-input"
            placeholder={t("filters.code")}
            value={filtroCodigo}
            onChange={(e) => setFiltroCodigo(e.target.value)}
          />
          <input
            className="ca-input"
            placeholder={t("filters.holder")}
            value={filtroTitular}
            onChange={(e) => setFiltroTitular(e.target.value)}
          />
          <input
            className="ca-input"
            placeholder={t("filters.description")}
            value={filtroDescricao}
            onChange={(e) => setFiltroDescricao(e.target.value)}
          />
          <select className="ca-input" value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
            <option value="all">{t("filters.type")}</option>
            <option value="1">RFID</option>
            <option value="2">QR</option>
            <option value="3">{t("types.other")}</option>
          </select>
          <select className="ca-input" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
            <option value="all">{t("filters.status")}</option>
            <option value="1">{t("status.active")}</option>
            <option value="0">{t("status.inactive")}</option>
          </select>
          <button type="submit" className="ca-btn md:col-span-5">
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

            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/40">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">
                    <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
                  </th>
                  <th className="px-4 py-3 text-left font-medium">#</th>
                  <th className="px-4 py-3 text-left font-medium">{t("table.code")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("table.description")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("table.holder")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("table.type")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("table.issueDate")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("table.expiryDate")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("table.status")}</th>
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
                    <td className="px-4 py-3 font-medium">{row.codigo}</td>
                    <td className="px-4 py-3 ca-muted">{row.descricao?.trim() ? row.descricao : "—"}</td>
                    <td className="px-4 py-3">{getTitularName(row)}</td>
                    <td className="px-4 py-3">{tipoLabel(row.tipo)}</td>
                    <td className="px-4 py-3">{toDateLabel(row.emissao)}</td>
                    <td className="px-4 py-3">{toDateLabel(row.validade)}</td>
                    <td className="px-4 py-3">
                      <EstadoBadge estado={row.estado} t={t} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button type="button" className="ca-icon-btn" title={t("actions.edit")} onClick={() => openEdit(row)}>
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          className="ca-icon-btn"
                          title={row.estado == 1 ? t("actions.deactivate") : t("actions.activate")}
                          onClick={() => handleToggleEstado(row)}
                        >
                          {row.estado == 1 ? <CircleOff size={16} /> : <CheckCircle2 size={16} />}
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
                ))}
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
                  title="Recarregar titulares"
                  onClick={fetchTitulares}
                  disabled={titularesLoading}
                >
                  <RefreshCw size={16} className={titularesLoading ? "animate-spin" : ""} />
                </button>
                <button type="button" onClick={closeModal}>
                  <X size={20} />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="p-4 space-y-4 flex-1 overflow-y-auto ca-scroll">
                <input
                  className="ca-input bg-slate-100 dark:bg-slate-800"
                  value={form.codigo}
                  placeholder={t("form.code")}
                  readOnly
                  disabled
                />
                <textarea
                  className="ca-input"
                  placeholder={t("form.description")}
                  rows={4}
                  value={form.descricao}
                  onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                />
                <select
                  className="ca-input"
                  value={form.titular_id}
                  onChange={(e) => setForm((f) => ({ ...f, titular_id: e.target.value }))}
                  disabled={titularesLoading}
                  required
                >
                  <option value="">{titularesLoading ? t("form.loadingHolders") : t("form.holder")}</option>
                  {titulares.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
                <select
                  className="ca-input"
                  value={form.tipo}
                  onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}
                >
                  <option value="1">RFID</option>
                  <option value="2">QR</option>
                  <option value="3">{t("types.other")}</option>
                </select>
                <input
                  type="date"
                  className="ca-input"
                  value={form.emissao}
                  onChange={(e) => setForm((f) => ({ ...f, emissao: e.target.value }))}
                />
                <input
                  type="date"
                  className="ca-input"
                  value={form.validade}
                  onChange={(e) => setForm((f) => ({ ...f, validade: e.target.value }))}
                />
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
    </div>
  );
}
