"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Key,
  CheckCircle,
  Clock,
  Plus,
  X,
  Eye,
  Pencil,
  Trash2,
  Loader2,
  Image as ImageIcon,
  Undo2,
  Camera,
  Upload,
} from "lucide-react";
import CameraCaptureModal from "@/components/media/CameraCaptureModal";
import { useLocale, useTranslations } from "next-intl";
import axios, { type AxiosInstance } from "axios";
import { useAuth } from "@/hooks/useAuth";
import type {
  EntregaChaveApi,
  EntregaChaveListResponse,
  EntregaChaveShowResponse,
  ResidenciaChaveRef,
} from "@/types/entrega-chave";
import type { AuthUser } from "@/types/auth";
import type { Utilizador, UtilizadorListResponse } from "@/types/utilizador";

const API_PREFIX = "/entrega-chaves";
const USERS_PREFIX = "/utilizadores";
const MORADORES_PREFIX = "/moradores";
const GUARDAS_PREFIX = "/guardas";
const RESIDENCIAS_PREFIX = "/residencias";
const ORG_KEY = "ca.selected.organization";

function extractCreatedUserId(res: { data?: unknown }): number | null {
  const d = res.data as Record<string, unknown> | undefined;
  if (!d) return null;
  if (typeof d.id === "number") return d.id;
  const inner = d.data as Record<string, unknown> | undefined;
  if (inner && typeof inner.id === "number") return inner.id;
  return null;
}

function minimalUserFromSession(self: AuthUser): Utilizador {
  return {
    id: self.id,
    name: self.name,
    email: self.email,
    telefone: null,
    tipo: self.tipo,
    nivel: self.nivel,
    imagem: self.imagem,
    estado: 1,
    genero: null,
    site: null,
    documento: null,
    documento_ref: null,
    organizacao_id: self.organizacao_id ?? null,
    empresa_id: null,
    cargo_id: self.cargo_id,
    departamento_id: null,
  };
}

async function createMoradorUser(
  http: AxiosInstance,
  organizacaoId: number,
  input: { name: string; email: string; telefone: string; residencia_id?: string },
): Promise<number> {
  const formData = new FormData();
  formData.append("name", input.name.trim());
  formData.append("email", input.email.trim());
  formData.append("telefone", input.telefone.trim());
  formData.append("estado", "1");
  formData.append(
    "residencia_id",
    input.residencia_id?.trim() ? String(Number(input.residencia_id)) : "",
  );
  const config = { headers: { "Content-Type": undefined as unknown as string } };
  const res = await http.post(`${MORADORES_PREFIX}/${organizacaoId}`, formData, config as never);
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

function displayUser(u: unknown): string {
  if (u && typeof u === "object" && u !== null && "name" in u) {
    const n = (u as { name?: string }).name;
    if (typeof n === "string" && n.trim()) return n;
  }
  return "—";
}

function userFromPartyField(v: number | Utilizador | null | undefined): string {
  if (v == null) return "—";
  if (typeof v === "object") return displayUser(v);
  return "—";
}

function handedByName(row: EntregaChaveApi): string {
  if (row.entreguePor) return displayUser(row.entreguePor);
  return userFromPartyField(row.entregue_por);
}

function receiverName(row: EntregaChaveApi): string {
  if (row.recebedor) return displayUser(row.recebedor);
  return userFromPartyField(row.entregue_a);
}

/** Morador a quem a chave foi devolvida (campo devolvida_a). */
function returnedToMoradorName(row: EntregaChaveApi): string {
  if (row.quemRecebeuDevolucao) return displayUser(row.quemRecebeuDevolucao);
  return userFromPartyField(row.devolvida_a);
}

function residenciaLabel(r?: ResidenciaChaveRef | null): string {
  if (!r) return "—";
  return r.designacao || r.nome || `#${r.id}`;
}

function datetimeLocalToApi(s: string): string {
  if (!s) return "";
  if (s.includes("T")) return s.replace("T", " ") + ":00";
  return s;
}

function apiToDatetimeLocal(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 16);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
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
  const t = useTranslations("keys");
  const locale = useLocale();
  const { http, api_base_url, user } = useAuth();

  const nivel = user?.nivel ?? 0;
  const canList = NIVEIS_LISTAR.includes(nivel);
  const canEdit = NIVEIS_EDITAR.includes(nivel);
  const canDelete = NIVEIS_ELIMINAR.includes(nivel);

  const [organizacaoId, setOrganizacaoId] = useState<number | null>(null);

  const [list, setList] = useState<EntregaChaveApi[]>([]);
  const [total, setTotal] = useState(0);
  const [perPage, setPerPage] = useState(15);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statTotal, setStatTotal] = useState(0);
  const [statOngoing, setStatOngoing] = useState(0);
  const [statReturned, setStatReturned] = useState(0);

  const [toast, setToast] = useState<{ message: string; isError?: boolean } | null>(null);

  const [filtroQ, setFiltroQ] = useState("");
  const [filtroResidencia, setFiltroResidencia] = useState("");
  const [filtroEmCurso, setFiltroEmCurso] = useState<string>("");
  const [filtroData1, setFiltroData1] = useState("");
  const [filtroData2, setFiltroData2] = useState("");

  const [appliedQ, setAppliedQ] = useState("");
  const [appliedResidencia, setAppliedResidencia] = useState("");
  const [appliedEmCurso, setAppliedEmCurso] = useState<string>("");
  const [appliedData1, setAppliedData1] = useState("");
  const [appliedData2, setAppliedData2] = useState("");

  const [residencias, setResidencias] = useState<ResidenciaChaveRef[]>([]);
  const [residenciasLoading, setResidenciasLoading] = useState(false);

  const [moradorOptions, setMoradorOptions] = useState<Utilizador[]>([]);
  const [operatorOptions, setOperatorOptions] = useState<Utilizador[]>([]);

  const [entreguePorMode, setEntreguePorMode] = useState<"existing" | "new">("existing");
  const [entreguePorNovo, setEntreguePorNovo] = useState({
    nome: "",
    email: "",
    telefone: "",
    residencia_id: "",
  });

  const [returnDevolvidaMode, setReturnDevolvidaMode] = useState<"existing" | "new">("existing");
  const [returnDevolvidaNovo, setReturnDevolvidaNovo] = useState({
    nome: "",
    email: "",
    telefone: "",
    residencia_id: "",
  });

  const [showPanel, setShowPanel] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [detailRow, setDetailRow] = useState<EntregaChaveApi | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const [returnRow, setReturnRow] = useState<EntregaChaveApi | null>(null);
  const [returnForm, setReturnForm] = useState({
    data_devolucao: "",
    devolvida_a: "",
    observacoes: "",
    imagem: null as File | null,
    imagemPreviewUrl: null as string | null,
  });
  const [returnSubmitting, setReturnSubmitting] = useState(false);

  const formImagemInputRef = useRef<HTMLInputElement>(null);
  const returnImagemInputRef = useRef<HTMLInputElement>(null);
  const [keyImageCameraOpen, setKeyImageCameraOpen] = useState(false);
  const keyImageCameraTargetRef = useRef<"form" | "return" | null>(null);

  const [form, setForm] = useState({
    data_entrega: "",
    chave: "",
    residencia_id: "",
    entregue_por: "",
    entregue_a: "",
    observacoes: "",
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

  const buildChaveImageUrl = useCallback(
    (name: string | null | undefined) => {
      if (!name) return null;
      const base = api_base_url.replace(/\/$/, "");
      const path = name.startsWith("/") ? name : `/storage/entrega-chaves/${name}`;
      return `${base}${path}`;
    },
    [api_base_url],
  );

  const fetchResidencias = useCallback(async () => {
    if (!organizacaoId) {
      setResidencias([]);
      return;
    }
    setResidenciasLoading(true);
    try {
      const res = await http.get<{ data: ResidenciaChaveRef[] }>(`${RESIDENCIAS_PREFIX}/${organizacaoId}`, {
        params: { per_page: 200, page: 1 },
      });
      setResidencias((res.data?.data ?? []).filter((r) => typeof r?.id === "number"));
    } catch {
      setResidencias([]);
    } finally {
      setResidenciasLoading(false);
    }
  }, [http, organizacaoId]);

  const fetchKeyOptions = useCallback(async () => {
    if (!organizacaoId) {
      setMoradorOptions([]);
      setOperatorOptions([]);
      return;
    }
    try {
      const [morRes, guardRes, usersRes] = await Promise.all([
        http.get<UtilizadorListResponse>(`${MORADORES_PREFIX}/${organizacaoId}`, {
          params: { per_page: 500, page: 1 },
        }),
        http.get<UtilizadorListResponse>(`${GUARDAS_PREFIX}/${organizacaoId}`, {
          params: { per_page: 200, page: 1 },
        }),
        http.get<UtilizadorListResponse>(`${USERS_PREFIX}/${organizacaoId}`, {
          params: { per_page: 500, page: 1 },
        }),
      ]);
      const moradores = (morRes.data?.data ?? []).filter((u) => typeof u?.id === "number");
      setMoradorOptions(
        [...moradores].sort((a, b) =>
          (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" }),
        ),
      );

      const opMap = new Map<number, Utilizador>();
      for (const u of guardRes.data?.data ?? []) {
        if (u?.id && typeof u.id === "number") opMap.set(u.id, u);
      }
      for (const u of usersRes.data?.data ?? []) {
        if (u?.nivel === 3 && typeof u.id === "number") opMap.set(u.id, u);
      }
      if (user?.id) {
        const existing = opMap.get(user.id);
        if (!existing) opMap.set(user.id, minimalUserFromSession(user));
      }
      setOperatorOptions(
        Array.from(opMap.values()).sort((a, b) =>
          (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" }),
        ),
      );
    } catch {
      setMoradorOptions([]);
      setOperatorOptions([]);
    }
  }, [http, organizacaoId, user]);

  useEffect(() => {
    void fetchResidencias();
  }, [fetchResidencias]);

  useEffect(() => {
    void fetchKeyOptions();
  }, [fetchKeyOptions]);

  const fetchStats = useCallback(async () => {
    if (!organizacaoId || !canList) return;
    setStatsLoading(true);
    try {
      const base = { per_page: 1, page: 1 };
      const [r0, r1, r2] = await Promise.all([
        http.get<EntregaChaveListResponse>(`${API_PREFIX}/${organizacaoId}`, { params: base }),
        http.get<EntregaChaveListResponse>(`${API_PREFIX}/${organizacaoId}`, {
          params: { ...base, em_curso: true },
        }),
        http.get<EntregaChaveListResponse>(`${API_PREFIX}/${organizacaoId}`, {
          params: { ...base, em_curso: false },
        }),
      ]);
      setStatTotal(r0.data?.total ?? 0);
      setStatOngoing(r1.data?.total ?? 0);
      setStatReturned(r2.data?.total ?? 0);
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
      const params: Record<string, string | number | boolean> = {
        per_page: perPage,
        page: currentPage,
      };
      if (appliedQ.trim()) params.q = appliedQ.trim();
      if (appliedResidencia.trim()) params.residencia_id = Number(appliedResidencia);
      if (appliedEmCurso === "1") params.em_curso = true;
      if (appliedEmCurso === "0") params.em_curso = false;
      if (appliedData1) params.data_entrega_de = appliedData1;
      if (appliedData2) params.data_entrega_ate = appliedData2;

      const res = await http.get<EntregaChaveListResponse>(`${API_PREFIX}/${organizacaoId}`, {
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
    appliedResidencia,
    appliedEmCurso,
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
        icon: Key,
        color: "text-blue-600",
        bg: "bg-blue-100/60 dark:bg-blue-900/20",
      },
      {
        label: "inProgress",
        value: statsLoading ? "…" : statOngoing,
        icon: Clock,
        color: "text-amber-600",
        bg: "bg-amber-100/60 dark:bg-amber-900/20",
      },
      {
        label: "returned",
        value: statsLoading ? "…" : statReturned,
        icon: CheckCircle,
        color: "text-green-600",
        bg: "bg-green-100/60 dark:bg-green-900/20",
      },
    ],
    [statTotal, statOngoing, statReturned, statsLoading],
  );

  const applyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedQ(filtroQ);
    setAppliedResidencia(filtroResidencia);
    setAppliedEmCurso(filtroEmCurso);
    setAppliedData1(filtroData1);
    setAppliedData2(filtroData2);
    setCurrentPage(1);
  };

  const openNew = () => {
    setEditingId(null);
    if (form.imagemPreviewUrl) URL.revokeObjectURL(form.imagemPreviewUrl);
    setEntreguePorMode("existing");
    setEntreguePorNovo({ nome: "", email: "", telefone: "", residencia_id: "" });
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const localDefault = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    setForm({
      data_entrega: localDefault,
      chave: "",
      residencia_id: "",
      entregue_por: "",
      entregue_a: user?.id ? String(user.id) : "",
      observacoes: "",
      imagem: null,
      imagemPreviewUrl: null,
    });
    setShowPanel(true);
  };

  const openEdit = (row: EntregaChaveApi) => {
    setEditingId(row.id);
    if (form.imagemPreviewUrl) URL.revokeObjectURL(form.imagemPreviewUrl);
    setEntreguePorMode("existing");
    setEntreguePorNovo({ nome: "", email: "", telefone: "", residencia_id: "" });

    const ep = row.entreguePor ?? row.entregue_por;
    const epId =
      ep && typeof ep === "object" && "id" in ep
        ? String((ep as Utilizador).id)
        : typeof ep === "number"
          ? String(ep)
          : "";

    const rec = row.recebedor ?? row.entregue_a;
    const eaId =
      rec && typeof rec === "object" && "id" in rec
        ? String((rec as Utilizador).id)
        : typeof rec === "number"
          ? String(rec)
          : "";

    const epUser = ep && typeof ep === "object" && "id" in ep ? (ep as Utilizador) : null;
    if (epUser && typeof epUser.id === "number") {
      setMoradorOptions((prev) =>
        prev.some((u) => u.id === epUser.id)
          ? prev
          : [...prev, epUser].sort((a, b) =>
              (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" }),
            ),
      );
    }
    const opUser = rec && typeof rec === "object" && "id" in rec ? (rec as Utilizador) : null;
    if (opUser && typeof opUser.id === "number") {
      setOperatorOptions((prev) =>
        prev.some((u) => u.id === opUser.id)
          ? prev
          : [...prev, opUser].sort((a, b) =>
              (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" }),
            ),
      );
    }

    setForm({
      data_entrega: apiToDatetimeLocal(row.data_entrega),
      chave: row.chave ?? "",
      residencia_id: row.residencia_id != null ? String(row.residencia_id) : "",
      entregue_por: epId,
      entregue_a: eaId,
      observacoes: row.observacoes ?? "",
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
    const dt = datetimeLocalToApi(form.data_entrega);
    if (!dt || !form.chave.trim()) {
      showToast(t("toast.saveError"), true);
      return;
    }
    if (entreguePorMode === "existing" && !form.entregue_por.trim()) {
      showToast(t("toast.saveError"), true);
      return;
    }
    if (entreguePorMode === "new") {
      if (!entreguePorNovo.nome.trim()) {
        showToast(t("toast.partyNameRequired"), true);
        return;
      }
      if (!entreguePorNovo.email.trim()) {
        showToast(t("toast.moradorEmailRequired"), true);
        return;
      }
    }
    if (!form.entregue_a.trim()) {
      showToast(t("toast.saveError"), true);
      return;
    }

    setFormSubmitting(true);
    const config = { headers: { "Content-Type": undefined as unknown as string } };
    try {
      let entreguePorFinal = form.entregue_por.trim();
      if (entreguePorMode === "new") {
        entreguePorFinal = String(
          await createMoradorUser(http, organizacaoId, {
            name: entreguePorNovo.nome,
            email: entreguePorNovo.email,
            telefone: entreguePorNovo.telefone,
            residencia_id: entreguePorNovo.residencia_id,
          }),
        );
      }
      const entregueAFinal = form.entregue_a.trim();

      const formData = new FormData();
      formData.append("data_entrega", dt);
      formData.append("chave", form.chave.trim());
      formData.append("entregue_por", entreguePorFinal);
      formData.append("entregue_a", entregueAFinal);
      if (form.residencia_id.trim()) formData.append("residencia_id", form.residencia_id.trim());
      if (form.observacoes.trim()) formData.append("observacoes", form.observacoes.trim());
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
      void fetchKeyOptions();
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

  const openDetail = async (row: EntregaChaveApi) => {
    if (!organizacaoId) return;
    try {
      const res = await http.get<EntregaChaveShowResponse>(`${API_PREFIX}/${organizacaoId}/${row.id}`);
      setDetailRow(res.data?.data ?? row);
    } catch {
      setDetailRow(row);
    }
  };

  const openReturn = (row: EntregaChaveApi) => {
    if (row.data_devolucao) return;
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const localDefault = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    if (returnForm.imagemPreviewUrl) URL.revokeObjectURL(returnForm.imagemPreviewUrl);
    setReturnDevolvidaMode("existing");
    setReturnDevolvidaNovo({ nome: "", email: "", telefone: "", residencia_id: "" });
    setReturnForm({
      data_devolucao: localDefault,
      devolvida_a: "",
      observacoes: "",
      imagem: null,
      imagemPreviewUrl: null,
    });
    setReturnRow(row);
  };

  const closeReturn = () => {
    if (returnForm.imagemPreviewUrl) URL.revokeObjectURL(returnForm.imagemPreviewUrl);
    setReturnRow(null);
    setReturnDevolvidaMode("existing");
    setReturnDevolvidaNovo({ nome: "", email: "", telefone: "", residencia_id: "" });
    setReturnForm({
      data_devolucao: "",
      devolvida_a: "",
      observacoes: "",
      imagem: null,
      imagemPreviewUrl: null,
    });
  };

  const onReturnFile = (file: File | null) => {
    setReturnForm((prev) => {
      if (prev.imagemPreviewUrl) URL.revokeObjectURL(prev.imagemPreviewUrl);
      if (!file) return { ...prev, imagem: null, imagemPreviewUrl: null };
      return { ...prev, imagem: file, imagemPreviewUrl: URL.createObjectURL(file) };
    });
  };

  const submitReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizacaoId || !returnRow) return;
    const dt = datetimeLocalToApi(returnForm.data_devolucao);
    if (!dt) {
      showToast(t("toast.returnError"), true);
      return;
    }
    if (returnDevolvidaMode === "existing" && !returnForm.devolvida_a.trim()) {
      showToast(t("toast.returnError"), true);
      return;
    }
    if (returnDevolvidaMode === "new") {
      if (!returnDevolvidaNovo.nome.trim()) {
        showToast(t("toast.partyNameRequired"), true);
        return;
      }
      if (!returnDevolvidaNovo.email.trim()) {
        showToast(t("toast.moradorEmailRequired"), true);
        return;
      }
    }
    setReturnSubmitting(true);
    const config = { headers: { "Content-Type": undefined as unknown as string } };
    try {
      let devolvidaAId = returnForm.devolvida_a.trim();
      if (returnDevolvidaMode === "new") {
        devolvidaAId = String(
          await createMoradorUser(http, organizacaoId, {
            name: returnDevolvidaNovo.nome,
            email: returnDevolvidaNovo.email,
            telefone: returnDevolvidaNovo.telefone,
            residencia_id: returnDevolvidaNovo.residencia_id,
          }),
        );
      }
      const fd = new FormData();
      fd.append("data_devolucao", dt);
      fd.append("devolvida_a", devolvidaAId);
      if (returnForm.observacoes.trim()) fd.append("observacoes", returnForm.observacoes.trim());
      if (returnForm.imagem) fd.append("imagem", returnForm.imagem);
      await http.post(`${API_PREFIX}/${organizacaoId}/${returnRow.id}/devolucao`, fd, config as never);
      showToast(t("toast.returnedOk"));
      closeReturn();
      void fetchKeyOptions();
      fetchList();
      fetchStats();
    } catch (err: unknown) {
      showToast(apiErrMessage(err, t("toast.returnError")), true);
    } finally {
      setReturnSubmitting(false);
    }
  };

  const isOngoing = (row: EntregaChaveApi) => !row.data_devolucao;

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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3">
          <input
            className="ca-input xl:col-span-2"
            placeholder={t("filters.search")}
            value={filtroQ}
            onChange={(e) => setFiltroQ(e.target.value)}
          />
          <select
            className="ca-input"
            value={filtroResidencia}
            onChange={(e) => setFiltroResidencia(e.target.value)}
            disabled={residenciasLoading}
          >
            <option value="">{t("filters.allResidences")}</option>
            {residencias.map((r) => (
              <option key={r.id} value={r.id}>
                {residenciaLabel(r)}
              </option>
            ))}
          </select>
          <select
            className="ca-input"
            value={filtroEmCurso}
            onChange={(e) => setFiltroEmCurso(e.target.value)}
          >
            <option value="">{t("filters.allStatuses")}</option>
            <option value="1">{t("status.ongoing")}</option>
            <option value="0">{t("status.returned")}</option>
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
          <button type="submit" className="ca-btn md:col-span-2 xl:col-span-6">
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
              <table className="w-full text-sm min-w-[900px]">
                <thead className="bg-slate-50 dark:bg-slate-800/40">
                  <tr>
                    <th className="py-3 px-4 text-left">{t("table.id")}</th>
                    <th className="py-3 px-4 text-left">{t("table.delivery")}</th>
                    <th className="py-3 px-4 text-left">{t("table.key")}</th>
                    <th className="py-3 px-4 text-left">{t("table.residence")}</th>
                    <th className="py-3 px-4 text-left">{t("table.handedBy")}</th>
                    <th className="py-3 px-4 text-left">{t("table.receivedBy")}</th>
                    <th className="py-3 px-4 text-left">{t("table.status")}</th>
                    <th className="py-3 px-4 text-left">{t("table.return")}</th>
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
                      const { date, time } = formatDateTimeParts(row.data_entrega, locale);
                      const ret = row.data_devolucao
                        ? formatDateTimeParts(row.data_devolucao, locale)
                        : null;
                      return (
                        <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                          <td className="px-4 py-3 font-medium">#{row.id}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {date} {time}
                          </td>
                          <td className="px-4 py-3 max-w-[140px] truncate" title={row.chave}>
                            {row.chave}
                          </td>
                          <td className="px-4 py-3">{residenciaLabel(row.residencia)}</td>
                          <td className="px-4 py-3">{handedByName(row)}</td>
                          <td className="px-4 py-3">{receiverName(row)}</td>
                          <td className="px-4 py-3">
                            {isOngoing(row) ? (
                              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                {t("status.ongoing")}
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                {t("status.returned")}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs ca-muted whitespace-nowrap">
                            {ret ? (
                              <>
                                {ret.date} {ret.time}
                                <div>{returnedToMoradorName(row)}</div>
                              </>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-2 flex-wrap">
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
                              {canEdit && isOngoing(row) && (
                                <button
                                  type="button"
                                  className="ca-icon-btn text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
                                  title={t("actions.registerReturn")}
                                  onClick={() => openReturn(row)}
                                >
                                  <Undo2 size={16} />
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
                  const { date, time } = formatDateTimeParts(row.data_entrega, locale);
                  const ret = row.data_devolucao ? formatDateTimeParts(row.data_devolucao, locale) : null;
                  return (
                    <article
                      key={row.id}
                      className="overflow-hidden rounded-2xl border ca-border bg-[var(--panel)] shadow-md ring-1 ring-black/[0.04] dark:ring-white/[0.06]"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2 border-b ca-border bg-slate-50/90 px-4 py-3 dark:bg-slate-800/50">
                        <div>
                          <div className="text-xs font-medium ca-muted">{t("table.id")}</div>
                          <div className="text-lg font-semibold">#{row.id}</div>
                        </div>
                        {isOngoing(row) ? (
                          <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                            {t("status.ongoing")}
                          </span>
                        ) : (
                          <span className="shrink-0 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            {t("status.returned")}
                          </span>
                        )}
                      </div>
                      <div className="space-y-3 px-4 py-3 text-sm">
                        <div>
                          <div className="text-xs ca-muted">{t("table.delivery")}</div>
                          <div className="font-medium">
                            {date} {time}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs ca-muted">{t("table.key")}</div>
                          <div className="font-semibold">{row.chave}</div>
                        </div>
                        <div>
                          <div className="text-xs ca-muted">{t("table.residence")}</div>
                          <div className="font-medium">{residenciaLabel(row.residencia)}</div>
                        </div>
                        <div>
                          <div className="text-xs ca-muted">{t("table.handedBy")}</div>
                          <div className="font-medium">{handedByName(row)}</div>
                        </div>
                        <div>
                          <div className="text-xs ca-muted">{t("table.receivedBy")}</div>
                          <div className="font-medium">{receiverName(row)}</div>
                        </div>
                        <div>
                          <div className="text-xs ca-muted">{t("table.return")}</div>
                          <div className="text-sm">
                            {ret ? (
                              <>
                                <div className="font-medium">
                                  {ret.date} {ret.time}
                                </div>
                                <div className="ca-muted">{returnedToMoradorName(row)}</div>
                              </>
                            ) : (
                              "—"
                            )}
                          </div>
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
                          {canEdit && isOngoing(row) && (
                            <button
                              type="button"
                              className="ca-icon-btn min-h-10 min-w-10 text-emerald-600"
                              title={t("actions.registerReturn")}
                              onClick={() => openReturn(row)}
                            >
                              <Undo2 size={18} />
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
                <label className="block text-xs ca-muted">{t("form.deliveryAt")}</label>
                <input
                  type="datetime-local"
                  className="ca-input w-full"
                  required
                  value={form.data_entrega}
                  onChange={(e) => setForm((f) => ({ ...f, data_entrega: e.target.value }))}
                />
                <label className="block text-xs ca-muted">{t("form.keyLabel")}</label>
                <input
                  type="text"
                  className="ca-input w-full"
                  required
                  value={form.chave}
                  onChange={(e) => setForm((f) => ({ ...f, chave: e.target.value }))}
                />
                <label className="block text-xs ca-muted">{t("form.residenceOptional")}</label>
                <select
                  className="ca-input w-full"
                  value={form.residencia_id}
                  onChange={(e) => setForm((f) => ({ ...f, residencia_id: e.target.value }))}
                  disabled={residenciasLoading}
                >
                  <option value="">—</option>
                  {residencias.map((r) => (
                    <option key={r.id} value={r.id}>
                      {residenciaLabel(r)}
                    </option>
                  ))}
                </select>

                <div className="space-y-2">
                  <label className="block text-xs ca-muted">{t("form.handedByMorador")}</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className={`flex-1 py-2 rounded-xl text-sm border ${
                        entreguePorMode === "existing" ? "ca-btn" : "border ca-border"
                      }`}
                      onClick={() => setEntreguePorMode("existing")}
                    >
                      {t("form.modeExisting")}
                    </button>
                    <button
                      type="button"
                      className={`flex-1 py-2 rounded-xl text-sm border ${
                        entreguePorMode === "new" ? "ca-btn" : "border ca-border"
                      }`}
                      onClick={() => setEntreguePorMode("new")}
                    >
                      {t("form.modeNew")}
                    </button>
                  </div>
                  {entreguePorMode === "existing" ? (
                    <select
                      className="ca-input w-full"
                      required
                      value={form.entregue_por}
                      onChange={(e) => setForm((f) => ({ ...f, entregue_por: e.target.value }))}
                    >
                      <option value="">{t("form.selectMorador")}</option>
                      {moradorOptions.map((u) => (
                        <option key={`m-${u.id}`} value={u.id}>
                          {userLabel(u)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="space-y-2 rounded-xl border ca-border p-3 bg-slate-50/50 dark:bg-slate-900/20">
                      <p className="text-xs ca-muted">{t("form.newMoradorHint")}</p>
                      <input
                        type="text"
                        className="ca-input w-full"
                        required
                        value={entreguePorNovo.nome}
                        onChange={(e) => setEntreguePorNovo((p) => ({ ...p, nome: e.target.value }))}
                        placeholder={t("form.partyName")}
                      />
                      <input
                        type="email"
                        className="ca-input w-full"
                        required
                        value={entreguePorNovo.email}
                        onChange={(e) => setEntreguePorNovo((p) => ({ ...p, email: e.target.value }))}
                        placeholder={t("form.moradorEmail")}
                      />
                      <input
                        type="tel"
                        className="ca-input w-full"
                        value={entreguePorNovo.telefone}
                        onChange={(e) => setEntreguePorNovo((p) => ({ ...p, telefone: e.target.value }))}
                        placeholder={t("form.partyPhone")}
                      />
                      <label className="block text-xs ca-muted">{t("form.newMoradorResidenceOptional")}</label>
                      <select
                        className="ca-input w-full"
                        value={entreguePorNovo.residencia_id}
                        onChange={(e) =>
                          setEntreguePorNovo((p) => ({ ...p, residencia_id: e.target.value }))
                        }
                        disabled={residenciasLoading}
                      >
                        <option value="">—</option>
                        {residencias.map((r) => (
                          <option key={`nm-${r.id}`} value={r.id}>
                            {residenciaLabel(r)}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <label className="block text-xs ca-muted">{t("form.receivedByOperator")}</label>
                <select
                  className="ca-input w-full"
                  required
                  value={form.entregue_a}
                  onChange={(e) => setForm((f) => ({ ...f, entregue_a: e.target.value }))}
                >
                  <option value="">{t("form.selectOperator")}</option>
                  {operatorOptions.map((u) => (
                    <option key={`o-${u.id}`} value={u.id}>
                      {userLabel(u)}
                    </option>
                  ))}
                </select>

                <label className="block text-xs ca-muted">{t("form.notes")}</label>
                <textarea
                  className="ca-input w-full"
                  rows={3}
                  value={form.observacoes}
                  onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
                />
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
                    onClick={() => {
                      keyImageCameraTargetRef.current = "form";
                      setKeyImageCameraOpen(true);
                    }}
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

      {returnRow && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={closeReturn} />
          <div className="relative m-auto w-full max-w-md ca-panel shadow-2xl rounded-2xl overflow-hidden tablet-app:max-w-none">
            <div className="flex items-center justify-between p-4 border-b ca-border">
              <h2 className="text-lg font-semibold">{t("returnPanel.title")}</h2>
              <button type="button" onClick={closeReturn}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={submitReturn} className="p-4 space-y-4">
              <p className="text-sm ca-muted">
                #{returnRow.id} · {returnRow.chave}
              </p>
              <label className="block text-xs ca-muted">{t("returnPanel.date")}</label>
              <input
                type="datetime-local"
                className="ca-input w-full"
                required
                value={returnForm.data_devolucao}
                onChange={(e) => setReturnForm((f) => ({ ...f, data_devolucao: e.target.value }))}
              />
              <div className="space-y-2">
                <label className="block text-xs ca-muted">{t("returnPanel.returnedToMorador")}</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={`flex-1 py-2 rounded-xl text-sm border ${
                      returnDevolvidaMode === "existing" ? "ca-btn" : "border ca-border"
                    }`}
                    onClick={() => setReturnDevolvidaMode("existing")}
                  >
                    {t("form.modeExisting")}
                  </button>
                  <button
                    type="button"
                    className={`flex-1 py-2 rounded-xl text-sm border ${
                      returnDevolvidaMode === "new" ? "ca-btn" : "border ca-border"
                    }`}
                    onClick={() => setReturnDevolvidaMode("new")}
                  >
                    {t("form.modeNew")}
                  </button>
                </div>
                {returnDevolvidaMode === "existing" ? (
                  <select
                    className="ca-input w-full"
                    required
                    value={returnForm.devolvida_a}
                    onChange={(e) => setReturnForm((f) => ({ ...f, devolvida_a: e.target.value }))}
                  >
                    <option value="">{t("form.selectMorador")}</option>
                    {moradorOptions.map((u) => (
                      <option key={`rd-${u.id}`} value={u.id}>
                        {userLabel(u)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="space-y-2 rounded-xl border ca-border p-3 bg-slate-50/50 dark:bg-slate-900/20">
                    <p className="text-xs ca-muted">{t("form.newMoradorHint")}</p>
                    <input
                      type="text"
                      className="ca-input w-full"
                      required
                      value={returnDevolvidaNovo.nome}
                      onChange={(e) =>
                        setReturnDevolvidaNovo((p) => ({ ...p, nome: e.target.value }))
                      }
                      placeholder={t("form.partyName")}
                    />
                    <input
                      type="email"
                      className="ca-input w-full"
                      required
                      value={returnDevolvidaNovo.email}
                      onChange={(e) =>
                        setReturnDevolvidaNovo((p) => ({ ...p, email: e.target.value }))
                      }
                      placeholder={t("form.moradorEmail")}
                    />
                    <input
                      type="tel"
                      className="ca-input w-full"
                      value={returnDevolvidaNovo.telefone}
                      onChange={(e) =>
                        setReturnDevolvidaNovo((p) => ({ ...p, telefone: e.target.value }))
                      }
                      placeholder={t("form.partyPhone")}
                    />
                    <label className="block text-xs ca-muted">{t("form.newMoradorResidenceOptional")}</label>
                    <select
                      className="ca-input w-full"
                      value={returnDevolvidaNovo.residencia_id}
                      onChange={(e) =>
                        setReturnDevolvidaNovo((p) => ({ ...p, residencia_id: e.target.value }))
                      }
                      disabled={residenciasLoading}
                    >
                      <option value="">—</option>
                      {residencias.map((r) => (
                        <option key={`rnm-${r.id}`} value={r.id}>
                          {residenciaLabel(r)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <label className="block text-xs ca-muted">{t("returnPanel.notes")}</label>
              <textarea
                className="ca-input w-full"
                rows={2}
                value={returnForm.observacoes}
                onChange={(e) => setReturnForm((f) => ({ ...f, observacoes: e.target.value }))}
              />
              <label className="block text-xs ca-muted flex items-center gap-2">
                <ImageIcon size={14} />
                {t("form.image")}
              </label>
              <input
                ref={returnImagemInputRef}
                type="file"
                accept="image/jpeg,image/png,image/jpg,image/gif,image/webp"
                className="hidden"
                onChange={(e) => onReturnFile(e.target.files?.[0] ?? null)}
              />
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  className="ca-btn flex w-full items-center justify-center gap-2"
                  onClick={() => returnImagemInputRef.current?.click()}
                >
                  <Upload size={18} />
                  {t("form.chooseFromDevice")}
                </button>
                <button
                  type="button"
                  className="flex w-full items-center justify-center gap-2 rounded-xl border ca-border px-4 py-2 text-sm"
                  onClick={() => {
                    keyImageCameraTargetRef.current = "return";
                    setKeyImageCameraOpen(true);
                  }}
                >
                  <Camera size={18} />
                  {t("form.takePhoto")}
                </button>
              </div>
              {returnForm.imagemPreviewUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={returnForm.imagemPreviewUrl}
                  alt=""
                  className="mt-2 max-h-40 w-full rounded-xl border ca-border object-contain"
                />
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="px-4 py-2 rounded-xl border ca-border" onClick={closeReturn}>
                  {t("cancel")}
                </button>
                <button type="submit" className="ca-btn inline-flex items-center gap-2" disabled={returnSubmitting}>
                  {returnSubmitting ? <Loader2 size={16} className="animate-spin" /> : null}
                  {t("returnPanel.submit")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {detailRow && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDetailRow(null)} />
          <div className="relative m-auto w-full max-w-lg ca-panel shadow-2xl rounded-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b ca-border shrink-0">
              <h2 className="text-lg font-semibold">{t("form.detail")}</h2>
              <button type="button" onClick={() => setDetailRow(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-3 text-sm overflow-y-auto ca-scroll">
              <p className="font-medium">#{detailRow.id}</p>
              <p>
                <span className="ca-muted">{t("table.delivery")}:</span>{" "}
                {formatDateTimeParts(detailRow.data_entrega, locale).date}{" "}
                {formatDateTimeParts(detailRow.data_entrega, locale).time}
              </p>
              <p>
                <span className="ca-muted">{t("table.key")}:</span> {detailRow.chave}
              </p>
              <p>
                <span className="ca-muted">{t("table.residence")}:</span>{" "}
                {residenciaLabel(detailRow.residencia)}
              </p>
              <p>
                <span className="ca-muted">{t("table.handedBy")}:</span> {handedByName(detailRow)}
              </p>
              <p>
                <span className="ca-muted">{t("table.receivedBy")}:</span> {receiverName(detailRow)}
              </p>
              <p>
                <span className="ca-muted">Registado por:</span> {auditActorLabel(detailRow, "registado")}
              </p>
              <p>
                <span className="ca-muted">Atualizado por:</span> {auditActorLabel(detailRow, "atualizado")}
              </p>
              <p>
                <span className="ca-muted">{t("table.status")}:</span>{" "}
                {isOngoing(detailRow) ? t("status.ongoing") : t("status.returned")}
              </p>
              {detailRow.data_devolucao && (
                <>
                  <p>
                    <span className="ca-muted">{t("table.return")}:</span>{" "}
                    {formatDateTimeParts(detailRow.data_devolucao, locale).date}{" "}
                    {formatDateTimeParts(detailRow.data_devolucao, locale).time}
                  </p>
                  <p>
                    <span className="ca-muted">{t("detail.returnedToMorador")}:</span>{" "}
                    {returnedToMoradorName(detailRow)}
                  </p>
                </>
              )}
              {detailRow.observacoes && (
                <p>
                  <span className="ca-muted">{t("form.notes")}:</span>{" "}
                  <span className="whitespace-pre-wrap">{detailRow.observacoes}</span>
                </p>
              )}
              {buildChaveImageUrl(detailRow.imagem) && (
                <img
                  src={buildChaveImageUrl(detailRow.imagem) ?? ""}
                  alt=""
                  className="max-h-48 rounded-lg border ca-border object-contain"
                />
              )}
            </div>
          </div>
        </div>
      )}

      <CameraCaptureModal
        open={keyImageCameraOpen}
        onClose={() => {
          keyImageCameraTargetRef.current = null;
          setKeyImageCameraOpen(false);
        }}
        onCapture={(file) => {
          setKeyImageCameraOpen(false);
          const tgt = keyImageCameraTargetRef.current;
          keyImageCameraTargetRef.current = null;
          if (tgt === "form") onFileChange(file);
          else if (tgt === "return") onReturnFile(file);
        }}
      />
    </div>
  );
}
