"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Package,
  CheckCircle,
  Clock,
  Plus,
  X,
  Eye,
  Pencil,
  Trash2,
  Loader2,
  Image as ImageIcon,
  Camera,
  Upload,
} from "lucide-react";
import CameraCaptureModal from "@/components/media/CameraCaptureModal";
import { useLocale, useTranslations } from "next-intl";
import axios, { type AxiosInstance } from "axios";
import { useAuth } from "@/hooks/useAuth";
import type { EncomendaApi, EncomendaListResponse, EncomendaShowResponse } from "@/types/encomenda";
import type { Utilizador, UtilizadorListResponse } from "@/types/utilizador";

const API_PREFIX = "/encomendas";
const USERS_PREFIX = "/utilizadores";
const ORG_KEY = "ca.selected.organization";

/** Tipos de utilizador (API): remetente = visitante, cliente, fornecedor */
const SENDER_TIPOS = new Set([3, 4, 6]);
/** Destinatário = colaborador, morador */
const RECIPIENT_TIPOS = new Set([2, 7]);

type PartyTipoNovo = "3" | "4" | "6";

async function fetchUsersFromPaths(
  http: AxiosInstance,
  organizacaoId: number,
  paths: readonly string[],
): Promise<Utilizador[]> {
  const map = new Map<number, Utilizador>();
  await Promise.all(
    paths.map(async (path) => {
      try {
        const res = await http.get<UtilizadorListResponse>(`${path}/${organizacaoId}`, {
          params: { per_page: 200, page: 1 },
        });
        for (const u of res.data?.data ?? []) {
          if (u?.id && typeof u.id === "number") map.set(u.id, u);
        }
      } catch {
        /* ignore per-source failures */
      }
    }),
  );
  return Array.from(map.values()).sort((a, b) =>
    (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" }),
  );
}

function filterByTipos(users: Utilizador[], tipos: Set<number>): Utilizador[] {
  return users.filter((u) => tipos.has(u.tipo));
}

function extractCreatedUserId(res: { data?: unknown }): number | null {
  const d = res.data as Record<string, unknown> | undefined;
  if (!d) return null;
  if (typeof d.id === "number") return d.id;
  const inner = d.data as Record<string, unknown> | undefined;
  if (inner && typeof inner.id === "number") return inner.id;
  return null;
}

async function createPartyUser(
  http: AxiosInstance,
  organizacaoId: number,
  input: { name: string; email: string; telefone: string; tipo: PartyTipoNovo },
): Promise<number> {
  const formData = new FormData();
  formData.append("name", input.name.trim());
  if (input.email.trim()) formData.append("email", input.email.trim());
  formData.append("telefone", input.telefone.trim());
  const config = { headers: { "Content-Type": undefined as unknown as string } };

  let url: string;
  if (input.tipo === "3") {
    formData.append("tipo", "3");
    formData.append("site", "");
    url = `/clientes/${organizacaoId}`;
  } else if (input.tipo === "6") {
    formData.append("site", "");
    formData.append("estado", "1");
    url = `/fornecedores/${organizacaoId}`;
  } else {
    formData.append("documento_ref", "");
    url = `/visitantes/${organizacaoId}`;
  }

  const res = await http.post(url, formData, config as never);
  const id = extractCreatedUserId(res);
  if (id == null) throw new Error("missing user id");
  return id;
}

const NIVEIS_LISTAR = [1, 2, 3, 4, 5, 6];
const NIVEIS_EDITAR = [1, 2, 3, 5, 6];
const NIVEIS_ELIMINAR = [1, 2];

function userLabel(u: Utilizador): string {
  const bits = [u.name, u.email].filter(Boolean);
  return bits.length ? bits.join(" · ") : `#${u.id}`;
}

function formatDateTimeParts(iso: string, locale: string): { date: string; time: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: "—", time: "—" };
  return {
    date: d.toLocaleDateString(locale, { day: "2-digit", month: "2-digit", year: "numeric" }),
    time: d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }),
  };
}

function partyName(row: EncomendaApi, side: "remetente" | "destinatario"): string {
  const u = row[side];
  if (u && typeof u === "object" && u.name) return u.name;
  return "—";
}

function deliveredName(row: EncomendaApi): string {
  const u = row.quemEntregou ?? row.quem_entregou;
  if (u && typeof u === "object" && u.name) return u.name;
  return "—";
}

function apiErrMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: string; errors?: Record<string, string[]> };
    if (data?.errors) return Object.values(data.errors).flat().join(" ");
    if (data?.message) return data.message;
  }
  return fallback;
}

export default function Page() {
  const t = useTranslations("packages");
  const locale = useLocale();
  const { http, api_base_url, user } = useAuth();

  const nivel = user?.nivel ?? 0;
  const canList = NIVEIS_LISTAR.includes(nivel);
  const canEdit = NIVEIS_EDITAR.includes(nivel);
  const canDelete = NIVEIS_ELIMINAR.includes(nivel);

  const [organizacaoId, setOrganizacaoId] = useState<number | null>(null);

  const [list, setList] = useState<EncomendaApi[]>([]);
  const [total, setTotal] = useState(0);
  const [perPage, setPerPage] = useState(15);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statTotal, setStatTotal] = useState(0);
  const [statPending, setStatPending] = useState(0);
  const [statDelivered, setStatDelivered] = useState(0);

  const [toast, setToast] = useState<{ message: string; isError?: boolean } | null>(null);

  const [filtroQ, setFiltroQ] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<string>("");
  const [filtroData1, setFiltroData1] = useState("");
  const [filtroData2, setFiltroData2] = useState("");

  const [appliedQ, setAppliedQ] = useState("");
  const [appliedEstado, setAppliedEstado] = useState<string>("");
  const [appliedData1, setAppliedData1] = useState("");
  const [appliedData2, setAppliedData2] = useState("");

  const [senderOptions, setSenderOptions] = useState<Utilizador[]>([]);
  const [recipientOptions, setRecipientOptions] = useState<Utilizador[]>([]);
  const [entregueAOptions, setEntregueAOptions] = useState<Utilizador[]>([]);

  const [remetenteMode, setRemetenteMode] = useState<"existing" | "new">("existing");
  const [destinatarioMode, setDestinatarioMode] = useState<"existing" | "new">("existing");
  const [remetenteNovo, setRemetenteNovo] = useState({
    nome: "",
    email: "",
    telefone: "",
    tipo: "4" as PartyTipoNovo,
  });
  const [destinatarioNovo, setDestinatarioNovo] = useState({
    nome: "",
    email: "",
    telefone: "",
    tipo: "4" as PartyTipoNovo,
  });

  const [showPanel, setShowPanel] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [detailRow, setDetailRow] = useState<EncomendaApi | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const formImagemInputRef = useRef<HTMLInputElement>(null);
  const [formImageCameraOpen, setFormImageCameraOpen] = useState(false);

  const [form, setForm] = useState({
    data: "",
    descricao: "",
    remetenteId: "" as string,
    destinatarioId: "" as string,
    entregueAId: "" as string,
    estado: 1 as 1 | 2 | 3,
    imagem: null as File | null,
    imagemPreviewUrl: null as string | null,
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ORG_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { id?: number | string };
      const id = typeof parsed?.id === "number" ? parsed.id : Number(parsed?.id);
      if (Number.isFinite(id) && id > 0) setOrganizacaoId(id);
    } catch {
      // noop
    }
  }, []);

  const showToast = useCallback((message: string, isError?: boolean) => {
    setToast({ message, isError });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const buildEncomendaImageUrl = useCallback(
    (name: string | null | undefined) => {
      if (!name) return null;
      const base = api_base_url.replace(/\/$/, "");
      const path = name.startsWith("/") ? name : `/storage/encomendas/${name}`;
      return `${base}${path}`;
    },
    [api_base_url],
  );

  const fetchPartyOptions = useCallback(async () => {
    if (!organizacaoId) {
      setSenderOptions([]);
      setRecipientOptions([]);
      return;
    }
    try {
      const [senders, recipients] = await Promise.all([
        fetchUsersFromPaths(http, organizacaoId, ["/visitantes", "/clientes", "/fornecedores"]),
        fetchUsersFromPaths(http, organizacaoId, ["/colaboradores", "/moradores"]),
      ]);
      setSenderOptions(filterByTipos(senders, SENDER_TIPOS));
      setRecipientOptions(filterByTipos(recipients, RECIPIENT_TIPOS));
    } catch {
      setSenderOptions([]);
      setRecipientOptions([]);
    }
  }, [http, organizacaoId]);

  const fetchEntregueAOptions = useCallback(async () => {
    if (!organizacaoId) {
      setEntregueAOptions([]);
      return;
    }
    try {
      const res = await http.get<UtilizadorListResponse>(`${USERS_PREFIX}/${organizacaoId}`, {
        params: { per_page: 200, page: 1 },
      });
      setEntregueAOptions(res.data?.data ?? []);
    } catch {
      setEntregueAOptions([]);
    }
  }, [http, organizacaoId]);

  useEffect(() => {
    void fetchPartyOptions();
  }, [fetchPartyOptions]);

  useEffect(() => {
    void fetchEntregueAOptions();
  }, [fetchEntregueAOptions]);

  const fetchStats = useCallback(async () => {
    if (!organizacaoId || !canList) return;
    setStatsLoading(true);
    try {
      const base = { per_page: 1, page: 1 };
      const [r0, r1, r2] = await Promise.all([
        http.get<EncomendaListResponse>(`${API_PREFIX}/${organizacaoId}`, { params: base }),
        http.get<EncomendaListResponse>(`${API_PREFIX}/${organizacaoId}`, {
          params: { ...base, estado: 1 },
        }),
        http.get<EncomendaListResponse>(`${API_PREFIX}/${organizacaoId}`, {
          params: { ...base, estado: 2 },
        }),
      ]);
      setStatTotal(r0.data?.total ?? 0);
      setStatPending(r1.data?.total ?? 0);
      setStatDelivered(r2.data?.total ?? 0);
    } catch {
      showToast(t("toast.statsError"), true);
    } finally {
      setStatsLoading(false);
    }
  }, [organizacaoId, http, canList, showToast, t]);

  const fetchList = useCallback(async () => {
    if (!organizacaoId || !canList) {
      setList([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    let timeout: ReturnType<typeof setTimeout> | null = null;
    timeout = setTimeout(() => setLoading(false), 12000);
    try {
      const params: Record<string, string | number> = {
        per_page: perPage,
        page: currentPage,
      };
      if (appliedQ.trim()) params.q = appliedQ.trim();
      if (appliedEstado && ["1", "2", "3"].includes(appliedEstado)) {
        params.estado = Number(appliedEstado);
      }
      if (appliedData1) params.data1 = appliedData1;
      if (appliedData2) params.data2 = appliedData2;

      const res = await http.get<EncomendaListResponse>(`${API_PREFIX}/${organizacaoId}`, {
        params,
      });
      setList(res.data?.data ?? []);
      setTotal(res.data?.total ?? 0);
      setPerPage(res.data?.per_page ?? 15);
      setCurrentPage(res.data?.current_page ?? 1);
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 403) {
        showToast(t("toast.forbidden"), true);
      } else {
        showToast(t("toast.loadError"), true);
      }
      setList([]);
      setTotal(0);
    } finally {
      if (timeout) clearTimeout(timeout);
      setLoading(false);
    }
  }, [
    organizacaoId,
    canList,
    http,
    perPage,
    currentPage,
    appliedQ,
    appliedEstado,
    appliedData1,
    appliedData2,
    showToast,
    t,
  ]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

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

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / Math.max(1, perPage))),
    [total, perPage],
  );

  const stats = useMemo(
    () => [
      {
        label: "total",
        value: statsLoading ? "…" : statTotal,
        icon: Package,
        color: "text-blue-600",
        bg: "bg-blue-100/60 dark:bg-blue-900/20",
      },
      {
        label: "pending",
        value: statsLoading ? "…" : statPending,
        icon: Clock,
        color: "text-amber-600",
        bg: "bg-amber-100/60 dark:bg-amber-900/20",
      },
      {
        label: "delivered",
        value: statsLoading ? "…" : statDelivered,
        icon: CheckCircle,
        color: "text-green-600",
        bg: "bg-green-100/60 dark:bg-green-900/20",
      },
    ],
    [statTotal, statPending, statDelivered, statsLoading],
  );

  const applyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedQ(filtroQ);
    setAppliedEstado(filtroEstado);
    setAppliedData1(filtroData1);
    setAppliedData2(filtroData2);
    setCurrentPage(1);
  };

  const openNew = () => {
    setEditingId(null);
    if (form.imagemPreviewUrl) URL.revokeObjectURL(form.imagemPreviewUrl);
    setRemetenteMode("existing");
    setDestinatarioMode("existing");
    setRemetenteNovo({ nome: "", email: "", telefone: "", tipo: "4" });
    setDestinatarioNovo({ nome: "", email: "", telefone: "", tipo: "4" });
    setForm({
      data: new Date().toISOString().slice(0, 10),
      descricao: "",
      remetenteId: "",
      destinatarioId: "",
      entregueAId: "",
      estado: 1,
      imagem: null,
      imagemPreviewUrl: null,
    });
    setShowPanel(true);
  };

  const openEdit = (row: EncomendaApi) => {
    setEditingId(row.id);
    if (form.imagemPreviewUrl) URL.revokeObjectURL(form.imagemPreviewUrl);
    setRemetenteMode("existing");
    setDestinatarioMode("existing");
    setRemetenteNovo({ nome: "", email: "", telefone: "", tipo: "4" });
    setDestinatarioNovo({ nome: "", email: "", telefone: "", tipo: "4" });
    const rem = row.remetente;
    const dest = row.destinatario;
    const remId =
      rem && typeof rem === "object" && "id" in rem ? String((rem as Utilizador).id) : "";
    const destId =
      dest && typeof dest === "object" && "id" in dest ? String((dest as Utilizador).id) : "";
    const entId = row.entregue_a != null ? String(row.entregue_a) : "";
    const dateSlice = row.data ? row.data.slice(0, 10) : "";
    setForm({
      data: dateSlice,
      descricao: row.descricao ?? "",
      remetenteId: remId,
      destinatarioId: destId,
      entregueAId: entId,
      estado: row.estado,
      imagem: null,
      imagemPreviewUrl: null,
    });
    setShowPanel(true);
  };

  const closePanel = () => {
    setShowPanel(false);
    setEditingId(null);
    if (form.imagemPreviewUrl) URL.revokeObjectURL(form.imagemPreviewUrl);
    setForm((prev) => ({ ...prev, imagem: null, imagemPreviewUrl: null }));
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
    if (!form.data || !form.descricao.trim()) {
      showToast(t("toast.saveError"), true);
      return;
    }
    if (remetenteMode === "existing" && !form.remetenteId) {
      showToast(t("toast.saveError"), true);
      return;
    }
    if (destinatarioMode === "existing" && !form.destinatarioId) {
      showToast(t("toast.saveError"), true);
      return;
    }
    if (remetenteMode === "new" && !remetenteNovo.nome.trim()) {
      showToast(t("toast.partyNameRequired"), true);
      return;
    }
    if (destinatarioMode === "new" && !destinatarioNovo.nome.trim()) {
      showToast(t("toast.partyNameRequired"), true);
      return;
    }
    setFormSubmitting(true);
    const config = { headers: { "Content-Type": undefined as unknown as string } };
    try {
      let remetenteFinal = form.remetenteId;
      if (remetenteMode === "new") {
        const id = await createPartyUser(http, organizacaoId, {
          name: remetenteNovo.nome,
          email: remetenteNovo.email,
          telefone: remetenteNovo.telefone,
          tipo: remetenteNovo.tipo,
        });
        remetenteFinal = String(id);
      }
      let destinatarioFinal = form.destinatarioId;
      if (destinatarioMode === "new") {
        const id = await createPartyUser(http, organizacaoId, {
          name: destinatarioNovo.nome,
          email: destinatarioNovo.email,
          telefone: destinatarioNovo.telefone,
          tipo: destinatarioNovo.tipo,
        });
        destinatarioFinal = String(id);
      }

      const formData = new FormData();
      formData.append("data", form.data);
      formData.append("descricao", form.descricao.trim());
      formData.append("remetente", remetenteFinal);
      formData.append("destinatario", destinatarioFinal);
      formData.append("estado", String(form.estado));
      if (form.entregueAId.trim()) formData.append("entregue_a", form.entregueAId.trim());
      if (form.imagem) formData.append("imagem", form.imagem);

      if (editingId) {
        formData.append("_method", "PUT");
        await http.post(`${API_PREFIX}/${organizacaoId}/${editingId}`, formData, config as never);
        showToast(t("toast.updated"));
      } else {
        await http.post(`${API_PREFIX}/${organizacaoId}`, formData, config as never);
        showToast(t("toast.saved"));
      }
      closePanel();
      void fetchPartyOptions();
      fetchList();
      fetchStats();
    } catch (err: unknown) {
      showToast(apiErrMessage(err, t("toast.saveError")), true);
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
      fetchStats();
    } catch {
      showToast(t("toast.deleteError"), true);
    }
  };

  const openDetail = async (row: EncomendaApi) => {
    if (!organizacaoId) return;
    try {
      const res = await http.get<EncomendaShowResponse>(`${API_PREFIX}/${organizacaoId}/${row.id}`);
      setDetailRow(res.data?.data ?? row);
    } catch {
      setDetailRow(row);
    }
  };

  const statusBadge = (estado: number) => {
    const map: Record<number, { cls: string; label: string }> = {
      1: {
        cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
        label: t("status.pending"),
      },
      2: {
        cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
        label: t("status.delivered"),
      },
      3: {
        cls: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
        label: t("status.cancelled"),
      },
    };
    const m = map[estado] ?? map[1];
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${m.cls}`}>{m.label}</span>
    );
  };

  if (!canList) {
    return (
      <div className="p-4 md:p-6">
        <p className="text-sm ca-muted">{t("toast.forbidden")}</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {toast && (
        <div
          className={`fixed bottom-4 right-4 z-[60] px-4 py-2 rounded-xl shadow-lg text-sm ${
            toast.isError
              ? "bg-red-600 text-white"
              : "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
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

      {!organizacaoId && (
        <div className="ca-card p-4 text-sm ca-muted">{t("toast.orgRequired")}</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {stats.map((item) => (
          <div key={item.label} className="ca-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm ca-muted">{t(`stats.${item.label}`)}</div>
                <div className="text-2xl font-semibold mt-1">{item.value}</div>
              </div>
              <div
                className={`h-11 w-11 rounded-2xl flex items-center justify-center ${item.bg}`}
              >
                <item.icon className={item.color} size={20} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <form className="ca-card p-4" onSubmit={applyFilters}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            className="ca-input"
            placeholder={t("filters.search")}
            value={filtroQ}
            onChange={(e) => setFiltroQ(e.target.value)}
          />
          <select
            className="ca-input"
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
          >
            <option value="">{t("filters.allStatuses")}</option>
            <option value="1">{t("status.pending")}</option>
            <option value="2">{t("status.delivered")}</option>
            <option value="3">{t("status.cancelled")}</option>
          </select>
          <input
            type="date"
            className="ca-input"
            value={filtroData1}
            onChange={(e) => setFiltroData1(e.target.value)}
            aria-label={t("filters.dateFrom")}
          />
          <input
            type="date"
            className="ca-input"
            value={filtroData2}
            onChange={(e) => setFiltroData2(e.target.value)}
            aria-label={t("filters.dateTo")}
          />
          <button type="submit" className="ca-btn md:col-span-4">
            {t("filters.apply")}
          </button>
        </div>
      </form>

      <div className="ca-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto desktop-auth:block">
              <table className="w-full min-w-[960px] text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/40">
                  <tr>
                    <th className="py-3 px-4 text-left">{t("table.order")}</th>
                    <th className="py-3 px-4 text-left">{t("table.date")}</th>
                    <th className="py-3 px-4 text-left">{t("table.time")}</th>
                    <th className="py-3 px-4 text-left">{t("table.sender")}</th>
                    <th className="py-3 px-4 text-left">{t("table.receiver")}</th>
                    <th className="py-3 px-4 text-left">{t("table.description")}</th>
                    <th className="py-3 px-4 text-left">{t("table.status")}</th>
                    <th className="py-3 px-4 text-left">{t("table.deliveredTo")}</th>
                    <th className="py-3 px-4 text-right">{t("table.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y ca-border">
                  {list.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-10 text-center text-sm ca-muted">
                        {t("empty")}
                      </td>
                    </tr>
                  ) : (
                    list.map((row) => {
                      const { date, time } = formatDateTimeParts(row.data, locale);
                      return (
                        <tr
                          key={row.id}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/30"
                        >
                          <td className="px-4 py-3 font-medium">#{row.id}</td>
                          <td className="px-4 py-3">{date}</td>
                          <td className="px-4 py-3">{time}</td>
                          <td className="px-4 py-3">{partyName(row, "remetente")}</td>
                          <td className="px-4 py-3">{partyName(row, "destinatario")}</td>
                          <td className="px-4 py-3 max-w-[200px] truncate" title={row.descricao}>
                            {row.descricao}
                          </td>
                          <td className="px-4 py-3">{statusBadge(row.estado)}</td>
                          <td className="px-4 py-3">{deliveredName(row)}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                className="ca-icon-btn"
                                title={t("actions.view")}
                                onClick={() => openDetail(row)}
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
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="space-y-4 px-3 py-3 tablet-app:px-4 tablet-app:py-4 desktop-auth:hidden">
              {list.length === 0 ? (
                <div className="py-12 text-center text-sm ca-muted">{t("empty")}</div>
              ) : (
                list.map((row) => {
                  const { date, time } = formatDateTimeParts(row.data, locale);
                  return (
                    <article
                      key={row.id}
                      className="overflow-hidden rounded-2xl border ca-border bg-[var(--panel)] shadow-md ring-1 ring-black/[0.04] dark:ring-white/[0.06]"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2 border-b ca-border bg-slate-50/90 px-4 py-3 dark:bg-slate-800/50">
                        <div>
                          <div className="text-xs font-medium ca-muted">{t("table.order")}</div>
                          <div className="text-lg font-semibold">#{row.id}</div>
                        </div>
                        {statusBadge(row.estado)}
                      </div>
                      <div className="space-y-3 px-4 py-3 text-sm">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <div className="text-xs ca-muted">{t("table.date")}</div>
                            <div className="font-medium">{date}</div>
                          </div>
                          <div>
                            <div className="text-xs ca-muted">{t("table.time")}</div>
                            <div className="font-medium">{time}</div>
                          </div>
                        </div>
                        <div>
                          <div className="text-xs ca-muted">{t("table.sender")}</div>
                          <div className="font-medium">{partyName(row, "remetente")}</div>
                        </div>
                        <div>
                          <div className="text-xs ca-muted">{t("table.receiver")}</div>
                          <div className="font-medium">{partyName(row, "destinatario")}</div>
                        </div>
                        <div>
                          <div className="text-xs ca-muted">{t("table.description")}</div>
                          <div className="text-sm leading-snug">{row.descricao}</div>
                        </div>
                        <div>
                          <div className="text-xs ca-muted">{t("table.deliveredTo")}</div>
                          <div className="font-medium">{deliveredName(row)}</div>
                        </div>
                        <div className="flex flex-wrap justify-end gap-1 border-t ca-border bg-slate-50/60 px-2 py-2 dark:bg-slate-800/30">
                          <button
                            type="button"
                            className="ca-icon-btn min-h-10 min-w-10"
                            title={t("actions.view")}
                            onClick={() => openDetail(row)}
                          >
                            <Eye size={18} />
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
                              className="ca-icon-btn min-h-10 min-w-10 text-red-600"
                              title={t("actions.remove")}
                              onClick={() => handleDelete(row.id)}
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t ca-border">
                <span className="text-sm ca-muted">
                  {total} · {currentPage} / {totalPages}
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
          <div className="absolute inset-0 bg-black/60" onClick={closePanel} />
          <div className="relative ml-auto h-full w-full max-w-md ca-panel shadow-2xl flex flex-col tablet-app:max-w-none">
            <div className="flex items-center justify-between p-4 border-b ca-border">
              <h2 className="text-lg font-semibold">
                {editingId ? t("form.edit") : t("form.title")}
              </h2>
              <button type="button" onClick={closePanel}>
                <X size={20} />
              </button>
            </div>
            <form className="flex flex-col flex-1 min-h-0" onSubmit={handleSubmit}>
              <div className="p-4 space-y-4 flex-1 overflow-y-auto ca-scroll">
                <label className="block text-xs ca-muted">{t("form.date")}</label>
                <input
                  type="date"
                  className="ca-input w-full"
                  required
                  value={form.data}
                  onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))}
                />
                <label className="block text-xs ca-muted">{t("form.description")}</label>
                <textarea
                  className="ca-input w-full"
                  rows={4}
                  required
                  value={form.descricao}
                  onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                />
                <div className="space-y-2">
                  <label className="block text-xs ca-muted">{t("form.sender")}</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className={`flex-1 py-2 rounded-xl text-sm border ${
                        remetenteMode === "existing" ? "ca-btn" : "border ca-border"
                      }`}
                      onClick={() => setRemetenteMode("existing")}
                    >
                      {t("form.modeExisting")}
                    </button>
                    <button
                      type="button"
                      className={`flex-1 py-2 rounded-xl text-sm border ${
                        remetenteMode === "new" ? "ca-btn" : "border ca-border"
                      }`}
                      onClick={() => setRemetenteMode("new")}
                    >
                      {t("form.modeNew")}
                    </button>
                  </div>
                  {remetenteMode === "existing" ? (
                    <select
                      className="ca-input w-full"
                      required
                      value={form.remetenteId}
                      onChange={(e) => setForm((f) => ({ ...f, remetenteId: e.target.value }))}
                    >
                      <option value="">{t("form.selectSender")}</option>
                      {senderOptions.map((u) => (
                        <option key={u.id} value={u.id}>
                          {userLabel(u)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="space-y-2 rounded-xl border ca-border p-3 bg-slate-50/50 dark:bg-slate-900/20">
                      <p className="text-xs ca-muted">{t("form.newPartyHint")}</p>
                      <input
                        type="text"
                        className="ca-input w-full"
                        required
                        value={remetenteNovo.nome}
                        onChange={(e) =>
                          setRemetenteNovo((p) => ({ ...p, nome: e.target.value }))
                        }
                        placeholder={t("form.partyName")}
                      />
                      <input
                        type="email"
                        className="ca-input w-full"
                        value={remetenteNovo.email}
                        onChange={(e) =>
                          setRemetenteNovo((p) => ({ ...p, email: e.target.value }))
                        }
                        placeholder={t("form.partyEmailOptional")}
                      />
                      <input
                        type="tel"
                        className="ca-input w-full"
                        value={remetenteNovo.telefone}
                        onChange={(e) =>
                          setRemetenteNovo((p) => ({ ...p, telefone: e.target.value }))
                        }
                        placeholder={t("form.partyPhone")}
                      />
                      <select
                        className="ca-input w-full"
                        value={remetenteNovo.tipo}
                        onChange={(e) =>
                          setRemetenteNovo((p) => ({
                            ...p,
                            tipo: e.target.value as PartyTipoNovo,
                          }))
                        }
                      >
                        <option value="4">{t("form.partyTypeVisitor")}</option>
                        <option value="3">{t("form.partyTypeClient")}</option>
                        <option value="6">{t("form.partyTypeSupplier")}</option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-xs ca-muted">{t("form.receiver")}</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className={`flex-1 py-2 rounded-xl text-sm border ${
                        destinatarioMode === "existing" ? "ca-btn" : "border ca-border"
                      }`}
                      onClick={() => setDestinatarioMode("existing")}
                    >
                      {t("form.modeExisting")}
                    </button>
                    <button
                      type="button"
                      className={`flex-1 py-2 rounded-xl text-sm border ${
                        destinatarioMode === "new" ? "ca-btn" : "border ca-border"
                      }`}
                      onClick={() => setDestinatarioMode("new")}
                    >
                      {t("form.modeNew")}
                    </button>
                  </div>
                  {destinatarioMode === "existing" ? (
                    <select
                      className="ca-input w-full"
                      required
                      value={form.destinatarioId}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, destinatarioId: e.target.value }))
                      }
                    >
                      <option value="">{t("form.selectReceiver")}</option>
                      {recipientOptions.map((u) => (
                        <option key={`d-${u.id}`} value={u.id}>
                          {userLabel(u)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="space-y-2 rounded-xl border ca-border p-3 bg-slate-50/50 dark:bg-slate-900/20">
                      <p className="text-xs ca-muted">{t("form.newPartyHint")}</p>
                      <input
                        type="text"
                        className="ca-input w-full"
                        required
                        value={destinatarioNovo.nome}
                        onChange={(e) =>
                          setDestinatarioNovo((p) => ({ ...p, nome: e.target.value }))
                        }
                        placeholder={t("form.partyName")}
                      />
                      <input
                        type="email"
                        className="ca-input w-full"
                        value={destinatarioNovo.email}
                        onChange={(e) =>
                          setDestinatarioNovo((p) => ({ ...p, email: e.target.value }))
                        }
                        placeholder={t("form.partyEmailOptional")}
                      />
                      <input
                        type="tel"
                        className="ca-input w-full"
                        value={destinatarioNovo.telefone}
                        onChange={(e) =>
                          setDestinatarioNovo((p) => ({ ...p, telefone: e.target.value }))
                        }
                        placeholder={t("form.partyPhone")}
                      />
                      <select
                        className="ca-input w-full"
                        value={destinatarioNovo.tipo}
                        onChange={(e) =>
                          setDestinatarioNovo((p) => ({
                            ...p,
                            tipo: e.target.value as PartyTipoNovo,
                          }))
                        }
                      >
                        <option value="4">{t("form.partyTypeVisitor")}</option>
                        <option value="3">{t("form.partyTypeClient")}</option>
                        <option value="6">{t("form.partyTypeSupplier")}</option>
                      </select>
                    </div>
                  )}
                </div>
                <label className="block text-xs ca-muted">{t("form.entregueA")}</label>
                <select
                  className="ca-input w-full"
                  value={form.entregueAId}
                  onChange={(e) => setForm((f) => ({ ...f, entregueAId: e.target.value }))}
                >
                  <option value="">—</option>
                  {entregueAOptions.map((u) => (
                    <option key={`e-${u.id}`} value={u.id}>
                      {userLabel(u)}
                    </option>
                  ))}
                </select>
                <label className="block text-xs ca-muted">{t("form.state")}</label>
                <select
                  className="ca-input w-full"
                  value={form.estado}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, estado: Number(e.target.value) as 1 | 2 | 3 }))
                  }
                >
                  <option value={1}>{t("status.pending")}</option>
                  <option value={2}>{t("status.delivered")}</option>
                  <option value={3}>{t("status.cancelled")}</option>
                </select>
                <label className="block text-xs ca-muted flex items-center gap-2">
                  <ImageIcon size={14} />
                  {t("form.image")}
                </label>
                <input
                  ref={formImagemInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/jpg,image/gif,image/webp"
                  className="hidden"
                  onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
                />
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    className="ca-btn flex w-full items-center justify-center gap-2"
                    onClick={() => formImagemInputRef.current?.click()}
                  >
                    <Upload size={18} />
                    {t("form.chooseFromDevice")}
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center justify-center gap-2 rounded-xl border ca-border px-4 py-2 text-sm"
                    onClick={() => setFormImageCameraOpen(true)}
                  >
                    <Camera size={18} />
                    {t("form.takePhoto")}
                  </button>
                </div>
                {form.imagemPreviewUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={form.imagemPreviewUrl}
                    alt=""
                    className="mt-2 max-h-48 w-full rounded-xl border ca-border object-contain"
                  />
                )}
              </div>
              <div className="p-4 border-t ca-border flex justify-end gap-2 shrink-0">
                <button
                  type="button"
                  className="px-4 py-2 rounded-xl border ca-border"
                  onClick={closePanel}
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  className="ca-btn inline-flex items-center gap-2"
                  disabled={formSubmitting}
                >
                  {formSubmitting ? <Loader2 size={16} className="animate-spin" /> : null}
                  {editingId ? t("form.update") : t("form.register")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {detailRow && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDetailRow(null)} />
          <div className="relative m-auto w-full max-w-lg ca-panel shadow-2xl rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b ca-border">
              <h2 className="text-lg font-semibold">{t("form.detail")}</h2>
              <button type="button" onClick={() => setDetailRow(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-3 text-sm">
              <p>
                <span className="ca-muted">#{detailRow.id}</span>
              </p>
              <p>
                {formatDateTimeParts(detailRow.data, locale).date}{" "}
                {formatDateTimeParts(detailRow.data, locale).time}
              </p>
              <p>
                <span className="ca-muted">{t("table.sender")}:</span>{" "}
                {partyName(detailRow, "remetente")}
              </p>
              <p>
                <span className="ca-muted">{t("table.receiver")}:</span>{" "}
                {partyName(detailRow, "destinatario")}
              </p>
              <p>
                <span className="ca-muted">{t("table.description")}:</span> {detailRow.descricao}
              </p>
              <div className="flex items-center gap-2">
                <span className="ca-muted">{t("table.status")}:</span>
                {statusBadge(detailRow.estado)}
              </div>
              <p>
                <span className="ca-muted">{t("table.deliveredTo")}:</span> {deliveredName(detailRow)}
              </p>
              <p>
                <span className="ca-muted">Registado por:</span> {auditActorLabel(detailRow, "registado")}
              </p>
              <p>
                <span className="ca-muted">Atualizado por:</span> {auditActorLabel(detailRow, "atualizado")}
              </p>
              {buildEncomendaImageUrl(detailRow.imagem) && (
                <img
                  src={buildEncomendaImageUrl(detailRow.imagem) ?? ""}
                  alt=""
                  className="max-h-48 rounded-lg border ca-border object-contain"
                />
              )}
            </div>
          </div>
        </div>
      )}

      <CameraCaptureModal
        open={formImageCameraOpen}
        onClose={() => setFormImageCameraOpen(false)}
        onCapture={(file) => {
          setFormImageCameraOpen(false);
          onFileChange(file);
        }}
      />
    </div>
  );
}
