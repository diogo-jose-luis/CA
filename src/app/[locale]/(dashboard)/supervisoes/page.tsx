"use client";
/* eslint-disable @next/next/no-img-element -- imagens no storage da API */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import axios, { type AxiosInstance } from "axios";
import {
  Camera,
  ClipboardList,
  Eye,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import CameraCaptureModal from "@/components/media/CameraCaptureModal";
import { fileToFileList } from "@/lib/file-list";
import { useAuth } from "@/hooks/useAuth";
import type { Utilizador, UtilizadorListResponse } from "@/types/utilizador";
import type { Material, MaterialListResponse } from "@/types/material";
import type {
  SupervisaoApi,
  SupervisaoEfetivo,
  SupervisaoImagem,
  SupervisaoListResponse,
  SupervisaoMaterial,
  SupervisaoShowResponse,
} from "@/types/supervisao";

const API_PREFIX = "/supervisoes";
const MATERIAIS_PREFIX = "/materiais";
const ORG_KEY = "ca.selected.organization";

/** API: admin, gestor, cliente, supervisor */
const NIVEIS_LISTAR = [1, 2, 4, 5] as const;
/** API: admin, gestor, supervisor */
const NIVEIS_ELIMINAR = [1, 2, 5] as const;

const GUARDAS_PREFIX = "/guardas";
/** Tipo utilizador porteiro / efetivo (alinhado com `porteiros/page.tsx`). */
const PORTEIRO_TIPO = 5;

const FORM_DATA_HEADERS = { headers: { "Content-Type": undefined as unknown as string } };

type TabKey = "detalhes" | "imagens" | "efetivos" | "materiais";

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

function supervisaoImagePublicUrl(apiBaseUrl: string, filename: string | null | undefined): string | null {
  if (!filename) return null;
  const base = apiBaseUrl.replace(/\/$/, "");
  const name = String(filename).replace(/^\/+/, "");
  if (name.startsWith("http://") || name.startsWith("https://")) return name;
  const parts = name.split("/").map((p) => encodeURIComponent(p));
  return `${base}/storage/${parts.join("/")}`;
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

function formatDt(iso: string | null | undefined, locale: string): string {
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

async function fetchPorteiros(http: AxiosInstance, organizacaoId: number): Promise<Utilizador[]> {
  const map = new Map<number, Utilizador>();
  let page = 1;
  for (;;) {
    try {
      const res = await http.get<UtilizadorListResponse>(`${GUARDAS_PREFIX}/${organizacaoId}`, {
        params: { per_page: 100, page },
      });
      const chunk = res.data?.data ?? [];
      for (const u of chunk) {
        if (u?.id && typeof u.id == "number" && (u.tipo == null || u.tipo === PORTEIRO_TIPO)) {
          map.set(u.id, u);
        }
      }
      const tot = res.data?.total ?? map.size;
      if (map.size >= tot || chunk.length === 0) break;
      page += 1;
      if (page > 100) break;
    } catch {
      break;
    }
  }
  return Array.from(map.values()).sort((a, b) =>
    (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" }),
  );
}

function porteiroOptionLabel(u: Utilizador): string {
  const nome = u.name?.trim() || u.email?.trim() || `#${u.id}`;
  const cargoNome = u.cargo?.nome?.trim();
  return cargoNome ? `${nome} · ${cargoNome}` : nome;
}

function efetivoNomeDisplay(row: SupervisaoEfetivo): string {
  const n = row.efetivo?.name?.trim() || row.nome?.trim();
  if (n) return n;
  if (row.efetivo_id) return `#${row.efetivo_id}`;
  return "—";
}

function efetivoCargoDisplay(row: SupervisaoEfetivo): string {
  const manual = row.cargo?.trim();
  if (manual) return manual;
  const cn = row.efetivo?.cargo?.nome?.trim();
  if (cn) return cn;
  return "—";
}

export default function Page() {
  const t = useTranslations("supervisoesPage");
  const locale = useLocale();
  const { http, user, api_base_url } = useAuth();

  const nivel = user?.nivel ?? 0;
  const canAccess = NIVEIS_LISTAR.includes(nivel as (typeof NIVEIS_LISTAR)[number]);
  const canDeleteSupervisao = NIVEIS_ELIMINAR.includes(nivel as (typeof NIVEIS_ELIMINAR)[number]);
  const canCreateSupervisao = nivel !== 4;
  const supervisorLocked = nivel === 4 || nivel === 5;
  const selfId = user?.id ?? 0;

  const [organizacaoId, setOrganizacaoId] = useState<number | null>(null);
  const [list, setList] = useState<SupervisaoApi[]>([]);
  const [total, setTotal] = useState(0);
  const [perPage, setPerPage] = useState(15);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; isError?: boolean } | null>(null);

  const [draftEstado, setDraftEstado] = useState("");
  const [draftSupervisorId, setDraftSupervisorId] = useState("");
  const [draftQ, setDraftQ] = useState("");
  const [draftData1, setDraftData1] = useState("");
  const [draftData2, setDraftData2] = useState("");
  const [appliedEstado, setAppliedEstado] = useState("");
  const [appliedSupervisorId, setAppliedSupervisorId] = useState("");
  const [appliedQ, setAppliedQ] = useState("");
  const [appliedData1, setAppliedData1] = useState("");
  const [appliedData2, setAppliedData2] = useState("");

  const [porteiros, setPorteiros] = useState<Utilizador[]>([]);
  const [materiais, setMateriais] = useState<Material[]>([]);

  const [showCreate, setShowCreate] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createForm, setCreateForm] = useState({
    data_hora: "",
    supervisor_id: "" as string,
    observacoes: "",
    estado: 1,
    files: [] as File[],
  });
  const [createFileKey, setCreateFileKey] = useState(0);
  const [createPreviewUrls, setCreatePreviewUrls] = useState<string[]>([]);

  const [detail, setDetail] = useState<SupervisaoApi | null>(null);
  const [detailTab, setDetailTab] = useState<TabKey>("detalhes");
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailSaving, setDetailSaving] = useState(false);
  const [detailForm, setDetailForm] = useState({
    data_hora: "",
    supervisor_id: "" as string,
    observacoes: "",
    estado: 1,
  });

  const [imgUploading, setImgUploading] = useState(false);
  const [imgDeletingId, setImgDeletingId] = useState<number | null>(null);
  const [imgFileKey, setImgFileKey] = useState(0);
  const createFilesInputRef = useRef<HTMLInputElement>(null);
  const detailImagensInputRef = useRef<HTMLInputElement>(null);
  const supervisaoCameraTargetRef = useRef<"create" | "detail" | null>(null);
  const [supervisaoCameraOpen, setSupervisaoCameraOpen] = useState(false);

  const [efForm, setEfForm] = useState({
    efetivo_id: "" as string,
    observacoes: "",
    uniformizacao_adequada: "" as "" | "0" | "1",
    equipamento_adequado: "" as "" | "0" | "1",
    estado: 1,
  });
  const [efEditing, setEfEditing] = useState<SupervisaoEfetivo | null>(null);
  const [efSubmitting, setEfSubmitting] = useState(false);

  const [matForm, setMatForm] = useState({
    material_id: "" as string,
    unidade: "",
    quantidade: "" as string,
    observacoes: "",
    estado: 1,
  });
  const [matEditing, setMatEditing] = useState<SupervisaoMaterial | null>(null);
  const [matSubmitting, setMatSubmitting] = useState(false);

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

  const loadPorteiros = useCallback(async () => {
    if (!organizacaoId || !canAccess) {
      setPorteiros([]);
      return;
    }
    try {
      setPorteiros(await fetchPorteiros(http, organizacaoId));
    } catch {
      setPorteiros([]);
    }
  }, [http, organizacaoId, canAccess]);

  const loadMateriais = useCallback(async () => {
    if (!organizacaoId || !canAccess) {
      setMateriais([]);
      return;
    }
    try {
      const collected: Material[] = [];
      let page = 1;
      for (;;) {
        const res = await http.get<MaterialListResponse>(`${MATERIAIS_PREFIX}/${organizacaoId}`, {
          params: { per_page: 100, page },
        });
        const chunk = res.data?.data ?? [];
        collected.push(...chunk);
        const tot = res.data?.total ?? collected.length;
        if (collected.length >= tot || chunk.length === 0) break;
        page += 1;
        if (page > 50) break;
      }
      setMateriais(collected);
    } catch {
      setMateriais([]);
    }
  }, [http, organizacaoId, canAccess]);

  useEffect(() => {
    void loadPorteiros();
  }, [loadPorteiros]);

  const porteirosWithSelf = useMemo(() => {
    if (!user?.id) return porteiros;
    if (porteiros.some((u) => u.id === user.id)) return porteiros;
    if (!supervisorLocked) return porteiros;
    return [
      ...porteiros,
      {
        id: user.id,
        tipo: PORTEIRO_TIPO,
        name: user.name,
        email: user.email,
        telefone: null,
        imagem: user.imagem ?? null,
        estado: 1,
        nivel: user.nivel,
        genero: null,
        site: null,
        documento: null,
        documento_ref: null,
        organizacao_id: user.organizacao_id ?? null,
        empresa_id: null,
        cargo_id: user.cargo_id ?? null,
        departamento_id: null,
      } satisfies Utilizador,
    ];
  }, [porteiros, user, supervisorLocked]);

  /** Inclui o efetivo em edição se já não estiver na lista de porteiros (ex.: dados antigos). */
  const porteirosForEfetivoSelect = useMemo(() => {
    const map = new Map<number, Utilizador>(porteiros.map((p) => [p.id, p]));
    const eid = efEditing?.efetivo_id;
    if (eid != null && eid > 0 && !map.has(eid)) {
      const r = efEditing?.efetivo;
      const cr = r?.cargo;
      map.set(eid, {
        id: eid,
        tipo: PORTEIRO_TIPO,
        name: r?.name?.trim() || `ID ${eid}`,
        email: r?.email?.trim() || "",
        telefone: null,
        imagem: null,
        estado: 1,
        nivel: null,
        genero: null,
        site: null,
        documento: null,
        documento_ref: null,
        organizacao_id: null,
        empresa_id: null,
        cargo_id: null,
        departamento_id: null,
        cargo:
          cr && (typeof cr.id == "number" || (typeof cr.nome == "string" && cr.nome.trim()))
            ? { id: typeof cr.id == "number" ? cr.id : 0, nome: cr.nome?.trim() || undefined }
            : undefined,
      });
    }
    return Array.from(map.values()).sort((a, b) =>
      (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" }),
    );
  }, [porteiros, efEditing]);

  useEffect(() => {
    void loadMateriais();
  }, [loadMateriais]);

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
      if (appliedEstado === "1" || appliedEstado === "2") params.estado = Number(appliedEstado);
      if (appliedSupervisorId.trim()) {
        const sid = Number(appliedSupervisorId);
        if (Number.isFinite(sid) && sid > 0) params.supervisor_id = sid;
      }
      if (appliedQ.trim()) params.q = appliedQ.trim();
      if (appliedData1.trim()) params.data1 = appliedData1.trim();
      if (appliedData2.trim()) params.data2 = appliedData2.trim();

      const res = await http.get<SupervisaoListResponse>(`${API_PREFIX}/${organizacaoId}`, { params });
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
    appliedEstado,
    appliedSupervisorId,
    appliedQ,
    appliedData1,
    appliedData2,
    showToast,
    t,
  ]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  useEffect(() => {
    const urls = createForm.files.map((file) => URL.createObjectURL(file));
    setCreatePreviewUrls(urls);
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [createForm.files]);

  const removeCreateFileAt = (index: number) => {
    setCreateForm((f) => ({
      ...f,
      files: f.files.filter((_, i) => i !== index),
    }));
  };

  const openCreate = () => {
    const sup = supervisorLocked && selfId > 0 ? String(selfId) : "";
    setCreateForm({
      data_hora: "",
      supervisor_id: sup,
      observacoes: "",
      estado: 1,
      files: [],
    });
    setCreateFileKey((k) => k + 1);
    setShowCreate(true);
  };

  const reloadDetail = useCallback(
    async (id: number) => {
      if (!organizacaoId) return;
      setDetailLoading(true);
      try {
        const res = await http.get<SupervisaoShowResponse>(`${API_PREFIX}/${organizacaoId}/${id}`);
        const row = res.data?.data;
        if (row) {
          setDetail(row);
          setDetailForm({
            data_hora: toDatetimeLocalValue(row.data_hora),
            supervisor_id: String(row.supervisor_id),
            observacoes: row.observacoes ?? "",
            estado: row.estado,
          });
        }
      } catch {
        showToast(t("toast.loadDetailError"), true);
        setDetail(null);
      } finally {
        setDetailLoading(false);
      }
    },
    [http, organizacaoId, showToast, t],
  );

  const openDetail = (row: SupervisaoApi) => {
    setDetailTab("detalhes");
    setDetail(row);
    setDetailForm({
      data_hora: toDatetimeLocalValue(row.data_hora),
      supervisor_id: String(row.supervisor_id),
      observacoes: row.observacoes ?? "",
      estado: row.estado,
    });
    void reloadDetail(row.id);
  };

  const closeDetail = () => {
    setDetail(null);
    setEfEditing(null);
    setMatEditing(null);
  };

  const submitCreate = async () => {
    if (!organizacaoId) return;
    const supId = supervisorLocked && selfId > 0 ? selfId : Number(createForm.supervisor_id);
    if (!Number.isFinite(supId) || supId < 1) {
      showToast(t("toast.supervisorRequired"), true);
      return;
    }
    if (!createForm.data_hora.trim()) {
      showToast(t("toast.dateRequired"), true);
      return;
    }
    setCreateSubmitting(true);
    try {
      const hasFiles = createForm.files.length > 0;
      if (hasFiles) {
        const fd = new FormData();
        fd.append("data_hora", fromDatetimeLocalValue(createForm.data_hora));
        fd.append("supervisor_id", String(supId));
        fd.append("observacoes", createForm.observacoes);
        fd.append("estado", String(createForm.estado));
        for (const f of createForm.files) {
          fd.append("imagens[]", f);
        }
        await http.post(`${API_PREFIX}/${organizacaoId}`, fd, FORM_DATA_HEADERS as never);
      } else {
        await http.post(`${API_PREFIX}/${organizacaoId}`, {
          data_hora: fromDatetimeLocalValue(createForm.data_hora),
          supervisor_id: supId,
          observacoes: createForm.observacoes || null,
          estado: createForm.estado,
        });
      }
      showToast(t("toast.createOk"));
      setShowCreate(false);
      void fetchList();
    } catch (err) {
      showToast(parseApiErrors(err, t("toast.saveError")), true);
    } finally {
      setCreateSubmitting(false);
    }
  };

  const saveDetailMain = async () => {
    if (!organizacaoId || !detail) return;
    const supId = supervisorLocked && selfId > 0 ? selfId : Number(detailForm.supervisor_id);
    if (!Number.isFinite(supId) || supId < 1) {
      showToast(t("toast.supervisorRequired"), true);
      return;
    }
    setDetailSaving(true);
    try {
      await http.put(`${API_PREFIX}/${organizacaoId}/${detail.id}`, {
        data_hora: fromDatetimeLocalValue(detailForm.data_hora),
        supervisor_id: supId,
        observacoes: detailForm.observacoes,
        estado: detailForm.estado,
      });
      showToast(t("toast.updateOk"));
      await reloadDetail(detail.id);
      void fetchList();
    } catch (err) {
      showToast(parseApiErrors(err, t("toast.saveError")), true);
    } finally {
      setDetailSaving(false);
    }
  };

  const deleteSupervisao = async () => {
    if (!organizacaoId || !detail || !canDeleteSupervisao) return;
    if (!window.confirm(t("confirm.deleteSupervisao"))) return;
    try {
      await http.delete(`${API_PREFIX}/${organizacaoId}/${detail.id}`);
      showToast(t("toast.deleteOk"));
      closeDetail();
      void fetchList();
    } catch (err) {
      showToast(parseApiErrors(err, t("toast.deleteError")), true);
    }
  };

  const uploadImagens = async (files: FileList | null) => {
    if (!organizacaoId || !detail || !files?.length) return;
    setImgUploading(true);
    try {
      const fd = new FormData();
      for (let i = 0; i < files.length; i++) {
        fd.append("imagens[]", files[i]);
      }
      await http.post(`${API_PREFIX}/${organizacaoId}/${detail.id}/imagens`, fd, FORM_DATA_HEADERS as never);
      showToast(t("toast.imagesAdded"));
      setImgFileKey((k) => k + 1);
      await reloadDetail(detail.id);
      void fetchList();
    } catch (err) {
      showToast(parseApiErrors(err, t("toast.imageError")), true);
    } finally {
      setImgUploading(false);
    }
  };

  function openSupervisaoCamera(target: "create" | "detail") {
    supervisaoCameraTargetRef.current = target;
    setSupervisaoCameraOpen(true);
  }

  function handleSupervisaoCameraFile(file: File) {
    const target = supervisaoCameraTargetRef.current;
    supervisaoCameraTargetRef.current = null;
    if (target === "create") {
      setCreateForm((f) => ({ ...f, files: [...f.files, file] }));
    } else if (target === "detail") {
      void uploadImagens(fileToFileList(file));
    }
  }

  function closeSupervisaoCamera() {
    supervisaoCameraTargetRef.current = null;
    setSupervisaoCameraOpen(false);
  }

  const deleteImagem = async (img: SupervisaoImagem) => {
    if (!organizacaoId || !detail) return;
    if (!window.confirm(t("confirm.deleteImagem"))) return;
    setImgDeletingId(img.id);
    try {
      await http.delete(`${API_PREFIX}/${organizacaoId}/${detail.id}/imagens/${img.id}`);
      showToast(t("toast.imageDeleted"));
      await reloadDetail(detail.id);
      void fetchList();
    } catch (err) {
      showToast(parseApiErrors(err, t("toast.imageError")), true);
    } finally {
      setImgDeletingId(null);
    }
  };

  const submitEfetivo = async () => {
    if (!organizacaoId || !detail) return;
    const eid = Number(efForm.efetivo_id);
    if (!efForm.efetivo_id.trim() || !Number.isFinite(eid) || eid < 1) {
      showToast(t("toast.efetivoUserRequired"), true);
      return;
    }
    setEfSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        efetivo_id: eid,
        observacoes: efForm.observacoes.trim() || null,
        estado: efForm.estado,
      };
      if (efForm.uniformizacao_adequada !== "") {
        body.uniformizacao_adequada = Number(efForm.uniformizacao_adequada);
      }
      if (efForm.equipamento_adequado !== "") {
        body.equipamento_adequado = Number(efForm.equipamento_adequado);
      }

      if (efEditing) {
        await http.put(`${API_PREFIX}/${organizacaoId}/${detail.id}/efetivos/${efEditing.id}`, body);
        showToast(t("toast.efetivoUpdated"));
      } else {
        await http.post(`${API_PREFIX}/${organizacaoId}/${detail.id}/efetivos`, body);
        showToast(t("toast.efetivoAdded"));
      }
      setEfEditing(null);
      setEfForm({
        efetivo_id: "",
        observacoes: "",
        uniformizacao_adequada: "",
        equipamento_adequado: "",
        estado: 1,
      });
      await reloadDetail(detail.id);
    } catch (err) {
      showToast(parseApiErrors(err, t("toast.efetivoError")), true);
    } finally {
      setEfSubmitting(false);
    }
  };

  const deleteEfetivo = async (row: SupervisaoEfetivo) => {
    if (!organizacaoId || !detail) return;
    if (!window.confirm(t("confirm.deleteEfetivo"))) return;
    try {
      await http.delete(`${API_PREFIX}/${organizacaoId}/${detail.id}/efetivos/${row.id}`);
      showToast(t("toast.efetivoDeleted"));
      await reloadDetail(detail.id);
    } catch (err) {
      showToast(parseApiErrors(err, t("toast.efetivoError")), true);
    }
  };

  const startEditEfetivo = (row: SupervisaoEfetivo) => {
    setEfEditing(row);
    setEfForm({
      efetivo_id: row.efetivo_id != null ? String(row.efetivo_id) : "",
      observacoes: row.observacoes ?? "",
      uniformizacao_adequada:
        row.uniformizacao_adequada === 0 || row.uniformizacao_adequada === 1
          ? (String(row.uniformizacao_adequada) as "0" | "1")
          : ("" as const),
      equipamento_adequado:
        row.equipamento_adequado === 0 || row.equipamento_adequado === 1
          ? (String(row.equipamento_adequado) as "0" | "1")
          : ("" as const),
      estado: row.estado,
    });
  };

  const submitMaterial = async () => {
    if (!organizacaoId || !detail) return;
    setMatSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        unidade: matForm.unidade.trim() || null,
        quantidade: matForm.quantidade.trim() === "" ? null : Number(matForm.quantidade),
        observacoes: matForm.observacoes.trim() || null,
        estado: matForm.estado,
      };
      if (matEditing) {
        if (matForm.material_id.trim()) {
          body.material_id = Number(matForm.material_id);
        }
        await http.put(`${API_PREFIX}/${organizacaoId}/${detail.id}/materiais/${matEditing.id}`, body);
        showToast(t("toast.materialUpdated"));
      } else {
        const mid = Number(matForm.material_id);
        if (!Number.isFinite(mid) || mid < 1) {
          showToast(t("toast.materialRequired"), true);
          setMatSubmitting(false);
          return;
        }
        body.material_id = mid;
        await http.post(`${API_PREFIX}/${organizacaoId}/${detail.id}/materiais`, body);
        showToast(t("toast.materialAdded"));
      }
      setMatEditing(null);
      setMatForm({ material_id: "", unidade: "", quantidade: "", observacoes: "", estado: 1 });
      await reloadDetail(detail.id);
    } catch (err) {
      showToast(parseApiErrors(err, t("toast.materialError")), true);
    } finally {
      setMatSubmitting(false);
    }
  };

  const startEditMaterial = (row: SupervisaoMaterial) => {
    setMatEditing(row);
    setMatForm({
      material_id: String(row.material_id),
      unidade: row.unidade ?? "",
      quantidade: row.quantidade != null ? String(row.quantidade) : "",
      observacoes: row.observacoes ?? "",
      estado: row.estado,
    });
  };

  const deleteMaterial = async (row: SupervisaoMaterial) => {
    if (!organizacaoId || !detail) return;
    if (!window.confirm(t("confirm.deleteMaterial"))) return;
    try {
      await http.delete(`${API_PREFIX}/${organizacaoId}/${detail.id}/materiais/${row.id}`);
      showToast(t("toast.materialDeleted"));
      await reloadDetail(detail.id);
    } catch (err) {
      showToast(parseApiErrors(err, t("toast.materialError")), true);
    }
  };

  const applyFilters = () => {
    setAppliedEstado(draftEstado);
    setAppliedSupervisorId(draftSupervisorId);
    setAppliedQ(draftQ);
    setAppliedData1(draftData1);
    setAppliedData2(draftData2);
    setCurrentPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  const imagens = detail?.imagens ?? [];
  const efetivos = detail?.efetivos ?? [];
  const matRows = detail?.materiais ?? [];

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

  const materialLabel = (m?: Material | null) => {
    if (!m) return "—";
    const d = m.designacao?.trim();
    if (d) return d;
    return [m.marca, m.modelo].filter(Boolean).join(" · ") || `#${m.id}`;
  };

  const materialEstadoLabel = (est: number) => {
    if (est === 1 || est === 2 || est === 3 || est === 4) {
      return t(`estadoMaterial.${est}` as "estadoMaterial.1");
    }
    return "—";
  };

  const supervisorSelectDisabled = supervisorLocked;

  const emptyState = useMemo(() => {
    if (!canAccess) return t("empty.forbidden");
    if (!organizacaoId) return t("empty.noOrg");
    return null;
  }, [canAccess, organizacaoId, t]);

  if (emptyState) {
    return (
      <div className="ca-page ca-scroll p-4 md:p-6">
        <div className="ca-card p-8 text-center ca-muted">{emptyState}</div>
      </div>
    );
  }

  return (
    <div className="ca-page ca-scroll p-4 md:p-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
            style={{ background: "rgba(135,55,70,0.14)", color: "var(--brand)" }}
          >
            <ClipboardList className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight">{t("title")}</h1>
            <p className="text-sm ca-muted">{t("subtitle")}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="ca-btn-outline" onClick={() => void fetchList()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {t("actions.refresh")}
          </button>
          {canCreateSupervisao ? (
            <button type="button" className="ca-btn" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              {t("actions.new")}
            </button>
          ) : null}
        </div>
      </div>

      <div className="ca-card mb-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div>
            <label className="mb-1 block text-xs ca-muted">{t("filters.estado")}</label>
            <select
              className="ca-input w-full"
              value={draftEstado}
              onChange={(e) => setDraftEstado(e.target.value)}
            >
              <option value="">{t("filters.estadoAll")}</option>
              <option value="1">{t("estadoSupervisao.normal")}</option>
              <option value="2">{t("estadoSupervisao.anormal")}</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs ca-muted">{t("filters.supervisor")}</label>
            <select
              className="ca-input w-full"
              value={draftSupervisorId}
              onChange={(e) => setDraftSupervisorId(e.target.value)}
            >
              <option value="">{t("filters.supervisorAll")}</option>
              {porteirosWithSelf.map((u) => (
                <option key={u.id} value={String(u.id)}>
                  {porteiroOptionLabel(u)}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs ca-muted">{t("filters.q")}</label>
            <input
              className="ca-input w-full"
              value={draftQ}
              onChange={(e) => setDraftQ(e.target.value)}
              placeholder={t("filters.qPlaceholder")}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs ca-muted">{t("filters.data1")}</label>
            <input
              type="date"
              className="ca-input w-full"
              value={draftData1}
              onChange={(e) => setDraftData1(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs ca-muted">{t("filters.data2")}</label>
            <input
              type="date"
              className="ca-input w-full"
              value={draftData2}
              onChange={(e) => setDraftData2(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <button type="button" className="ca-btn" onClick={applyFilters}>
            {t("filters.apply")}
          </button>
        </div>
      </div>

      <div className="ca-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto desktop-auth:block">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="border-b ca-border bg-[var(--panel-alt)]">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">{t("table.when")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t("table.supervisor")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t("table.estado")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t("table.observacoes")}</th>
                    <th className="px-4 py-3 text-right font-medium">{t("table.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {list.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center ca-muted">
                        {t("table.empty")}
                      </td>
                    </tr>
                  ) : (
                    list.map((row) => (
                      <tr key={row.id} className="border-b ca-border">
                        <td className="px-4 py-3 whitespace-nowrap">{formatDt(row.data_hora, locale)}</td>
                        <td className="px-4 py-3">
                          {row.supervisor?.name || row.supervisor?.email || `#${row.supervisor_id}`}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              row.estado === 2
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                                : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            }`}
                          >
                            {row.estado === 2 ? t("estadoSupervisao.anormal") : t("estadoSupervisao.normal")}
                          </span>
                        </td>
                        <td className="px-4 py-3 max-w-[240px] truncate">{row.observacoes?.trim() || "—"}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            className="ca-icon-btn"
                            onClick={() => openDetail(row)}
                            title={t("actions.view")}
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="space-y-4 px-3 py-3 tablet-app:px-4 tablet-app:py-4 desktop-auth:hidden">
              {list.length === 0 ? (
                <div className="py-12 text-center text-sm ca-muted">{t("table.empty")}</div>
              ) : (
                list.map((row) => (
                  <article
                    key={row.id}
                    className="overflow-hidden rounded-2xl border ca-border bg-[var(--panel)] shadow-md ring-1 ring-black/[0.04] dark:ring-white/[0.06]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2 border-b ca-border bg-slate-50/90 px-4 py-3 dark:bg-slate-800/50">
                      <div className="min-w-0">
                        <div className="text-xs font-medium ca-muted">{t("table.when")}</div>
                        <div className="font-semibold leading-snug">{formatDt(row.data_hora, locale)}</div>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                          row.estado === 2
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                            : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        {row.estado === 2 ? t("estadoSupervisao.anormal") : t("estadoSupervisao.normal")}
                      </span>
                    </div>
                    <div className="space-y-3 px-4 py-3 text-sm">
                      <div>
                        <div className="text-xs ca-muted">{t("table.supervisor")}</div>
                        <div className="font-medium">
                          {row.supervisor?.name || row.supervisor?.email || `#${row.supervisor_id}`}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs ca-muted">{t("table.observacoes")}</div>
                        <div className="text-sm leading-snug">{row.observacoes?.trim() || "—"}</div>
                      </div>
                      <div className="flex justify-end border-t ca-border pt-2">
                        <button type="button" className="ca-btn min-h-10 px-4 text-sm" onClick={() => openDetail(row)}>
                          <Eye className="mr-2 inline h-4 w-4" />
                          {t("actions.view")}
                        </button>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </>
        )}
        {total > 0 && (
          <div className="flex flex-col gap-2 border-t ca-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs ca-muted">
              {t("pagination.summary", { total, page: currentPage, pages: totalPages })}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="ca-btn-outline text-sm"
                disabled={currentPage <= 1 || loading}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                {t("pagination.prev")}
              </button>
              <button
                type="button"
                className="ca-btn-outline text-sm"
                disabled={currentPage >= totalPages || loading}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                {t("pagination.next")}
              </button>
            </div>
          </div>
        )}
      </div>

      {toast ? (
        <div
          className={`fixed bottom-6 left-1/2 z-[60] max-w-md -translate-x-1/2 rounded-xl px-4 py-3 text-sm shadow-lg ${
            toast.isError ? "bg-red-600 text-white" : "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
          }`}
        >
          {toast.message}
        </div>
      ) : null}

      {showCreate ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="ca-card max-h-[90vh] w-full max-w-lg overflow-y-auto p-5 shadow-xl tablet-app:max-w-none">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">{t("create.title")}</h2>
              <button type="button" className="ca-icon-btn" onClick={() => setShowCreate(false)}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs ca-muted">{t("form.dataHora")}</label>
                <input
                  type="datetime-local"
                  className="ca-input w-full"
                  value={createForm.data_hora}
                  onChange={(e) => setCreateForm((f) => ({ ...f, data_hora: e.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs ca-muted">{t("form.supervisor")}</label>
                <select
                  className="ca-input w-full"
                  disabled={supervisorSelectDisabled}
                  value={supervisorLocked ? String(selfId) : createForm.supervisor_id}
                  onChange={(e) => setCreateForm((f) => ({ ...f, supervisor_id: e.target.value }))}
                >
                  <option value="">{t("form.pickSupervisor")}</option>
                  {porteirosWithSelf.map((u) => (
                    <option key={u.id} value={String(u.id)}>
                      {porteiroOptionLabel(u)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs ca-muted">{t("form.estado")}</label>
                <select
                  className="ca-input w-full"
                  value={createForm.estado}
                  onChange={(e) => setCreateForm((f) => ({ ...f, estado: Number(e.target.value) }))}
                >
                  <option value={1}>{t("estadoSupervisao.normal")}</option>
                  <option value={2}>{t("estadoSupervisao.anormal")}</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs ca-muted">{t("form.observacoes")}</label>
                <textarea
                  className="ca-input min-h-[88px] w-full"
                  value={createForm.observacoes}
                  onChange={(e) => setCreateForm((f) => ({ ...f, observacoes: e.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs ca-muted">{t("form.images")}</label>
                <input
                  key={createFileKey}
                  ref={createFilesInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const fl = e.target.files;
                    setCreateForm((f) => ({ ...f, files: fl ? Array.from(fl) : [] }));
                    e.target.value = "";
                  }}
                />
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    className="ca-btn flex w-full items-center justify-center gap-2"
                    onClick={() => createFilesInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4" />
                    {t("form.chooseFromDevice")}
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center justify-center gap-2 rounded-xl border ca-border px-4 py-2 text-sm"
                    onClick={() => openSupervisaoCamera("create")}
                  >
                    <Camera className="h-4 w-4" />
                    {t("form.takePhoto")}
                  </button>
                </div>
                {createPreviewUrls.length > 0 ? (
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {createPreviewUrls.map((src, i) => (
                      <div
                        key={`${src}-${i}`}
                        className="relative overflow-hidden rounded-xl border ca-border bg-slate-100/80 dark:bg-slate-800/50"
                      >
                        <img src={src} alt="" className="h-28 w-full object-cover" />
                        <button
                          type="button"
                          className="absolute right-1.5 top-1.5 rounded-lg bg-red-600 p-1.5 text-white shadow-md hover:bg-red-700"
                          title={t("images.remove")}
                          onClick={() => removeCreateFileAt(i)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="ca-btn-outline" onClick={() => setShowCreate(false)}>
                {t("actions.cancel")}
              </button>
              <button type="button" className="ca-btn" disabled={createSubmitting} onClick={() => void submitCreate()}>
                {createSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : t("actions.save")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {detail ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="ca-card flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden shadow-xl tablet-app:max-w-none">
            <div className="flex items-start justify-between gap-2 border-b ca-border p-4">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold">{t("detail.title", { id: detail.id })}</h2>
                <p className="text-xs ca-muted">{formatDt(detail.data_hora, locale)}</p>
              </div>
              <button type="button" className="ca-icon-btn shrink-0" onClick={closeDetail}>
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex gap-1 border-b ca-border px-2 pt-2">
              {(["detalhes", "imagens", "efetivos", "materiais"] as TabKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  className={`rounded-t-lg px-3 py-2 text-sm font-medium transition-colors ${
                    detailTab === key
                      ? "bg-[var(--panel-alt)] text-[var(--brand)]"
                      : "ca-muted hover:text-[var(--fg)]"
                  }`}
                  onClick={() => setDetailTab(key)}
                >
                  {t(`tabs.${key}`)}
                </button>
              ))}
            </div>

            <div className="ca-scroll flex-1 overflow-y-auto p-4">
              {detailLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin opacity-50" />
                </div>
              ) : detailTab === "detalhes" ? (
                <div className="mx-auto max-w-xl space-y-3">
                  <div className="rounded-xl border ca-border bg-[var(--panel-alt)] p-3 text-sm space-y-1">
                    <p>
                      <span className="ca-muted">Registado por:</span> {auditActorLabel(detail, "registado")}
                    </p>
                    <p>
                      <span className="ca-muted">Atualizado por:</span> {auditActorLabel(detail, "atualizado")}
                    </p>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs ca-muted">{t("form.dataHora")}</label>
                    <input
                      type="datetime-local"
                      className="ca-input w-full"
                      value={detailForm.data_hora}
                      onChange={(e) => setDetailForm((f) => ({ ...f, data_hora: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs ca-muted">{t("form.supervisor")}</label>
                    <select
                      className="ca-input w-full"
                      disabled={supervisorSelectDisabled}
                      value={supervisorLocked ? String(selfId) : detailForm.supervisor_id}
                      onChange={(e) => setDetailForm((f) => ({ ...f, supervisor_id: e.target.value }))}
                    >
                      {porteirosWithSelf.map((u) => (
                        <option key={u.id} value={String(u.id)}>
                          {porteiroOptionLabel(u)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs ca-muted">{t("form.estado")}</label>
                    <select
                      className="ca-input w-full"
                      value={detailForm.estado}
                      onChange={(e) => setDetailForm((f) => ({ ...f, estado: Number(e.target.value) }))}
                    >
                      <option value={1}>{t("estadoSupervisao.normal")}</option>
                      <option value={2}>{t("estadoSupervisao.anormal")}</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs ca-muted">{t("form.observacoes")}</label>
                    <textarea
                      className="ca-input min-h-[100px] w-full"
                      value={detailForm.observacoes}
                      onChange={(e) => setDetailForm((f) => ({ ...f, observacoes: e.target.value }))}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <button type="button" className="ca-btn" disabled={detailSaving} onClick={() => void saveDetailMain()}>
                      {detailSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("actions.save")}
                    </button>
                    {canDeleteSupervisao ? (
                      <button type="button" className="ca-btn-outline text-red-600" onClick={() => void deleteSupervisao()}>
                        <Trash2 className="h-4 w-4" />
                        {t("actions.delete")}
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : detailTab === "imagens" ? (
                <div className="space-y-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                    <input
                      key={imgFileKey}
                      ref={detailImagensInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      multiple
                      className="hidden"
                      disabled={imgUploading}
                      onChange={(e) => {
                        void uploadImagens(e.target.files);
                        e.target.value = "";
                      }}
                    />
                    <button
                      type="button"
                      className="ca-btn inline-flex items-center justify-center gap-2 disabled:opacity-50"
                      disabled={imgUploading}
                      onClick={() => detailImagensInputRef.current?.click()}
                    >
                      {imgUploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      {t("images.chooseFromDevice")}
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center gap-2 rounded-xl border ca-border px-4 py-2 text-sm disabled:opacity-50"
                      disabled={imgUploading}
                      onClick={() => openSupervisaoCamera("detail")}
                    >
                      <Camera className="h-4 w-4" />
                      {t("images.takePhoto")}
                    </button>
                    <span className="text-xs ca-muted sm:ml-1">{t("images.addHint")}</span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                    {imagens.map((img) => {
                      const src = supervisaoImagePublicUrl(api_base_url, img.imagem);
                      return (
                        <div key={img.id} className="ca-card overflow-hidden p-2">
                          {src ? (
                            <img src={src} alt="" className="mb-2 h-36 w-full rounded-lg object-cover" />
                          ) : (
                            <div className="mb-2 flex h-36 items-center justify-center rounded-lg bg-slate-100 text-xs ca-muted dark:bg-slate-800">
                              —
                            </div>
                          )}
                          <button
                            type="button"
                            className="ca-btn-outline w-full text-red-600 text-sm"
                            disabled={imgDeletingId === img.id}
                            onClick={() => void deleteImagem(img)}
                          >
                            {imgDeletingId === img.id ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : t("images.remove")}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  {imagens.length === 0 ? <p className="text-sm ca-muted">{t("images.empty")}</p> : null}
                </div>
              ) : detailTab === "efetivos" ? (
                <div className="space-y-6">
                  <div className="ca-card space-y-3 p-4">
                    <h3 className="text-sm font-semibold">{efEditing ? t("efetivos.editTitle") : t("efetivos.addTitle")}</h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-xs ca-muted">{t("efetivos.efetivoUser")}</label>
                        <select
                          className="ca-input w-full"
                          value={efForm.efetivo_id}
                          onChange={(e) => setEfForm((f) => ({ ...f, efetivo_id: e.target.value }))}
                        >
                          <option value="">{t("efetivos.pickPorteiro")}</option>
                          {porteirosForEfetivoSelect.map((u) => (
                            <option key={u.id} value={String(u.id)}>
                              {porteiroOptionLabel(u)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs ca-muted">{t("efetivos.uniforme")}</label>
                        <select
                          className="ca-input w-full"
                          value={efForm.uniformizacao_adequada}
                          onChange={(e) =>
                            setEfForm((f) => ({
                              ...f,
                              uniformizacao_adequada: e.target.value as "" | "0" | "1",
                            }))
                          }
                        >
                          <option value="">{t("efetivos.na")}</option>
                          <option value="1">{t("efetivos.sim")}</option>
                          <option value="0">{t("efetivos.nao")}</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs ca-muted">{t("efetivos.equipamento")}</label>
                        <select
                          className="ca-input w-full"
                          value={efForm.equipamento_adequado}
                          onChange={(e) =>
                            setEfForm((f) => ({
                              ...f,
                              equipamento_adequado: e.target.value as "" | "0" | "1",
                            }))
                          }
                        >
                          <option value="">{t("efetivos.na")}</option>
                          <option value="1">{t("efetivos.sim")}</option>
                          <option value="0">{t("efetivos.nao")}</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs ca-muted">{t("efetivos.estado")}</label>
                        <select
                          className="ca-input w-full"
                          value={efForm.estado}
                          onChange={(e) => setEfForm((f) => ({ ...f, estado: Number(e.target.value) }))}
                        >
                          <option value={1}>{t("estadoEfetivo.ok")}</option>
                          <option value={2}>{t("estadoEfetivo.bad")}</option>
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-xs ca-muted">{t("efetivos.observacoes")}</label>
                        <textarea
                          className="ca-input min-h-[72px] w-full"
                          value={efForm.observacoes}
                          onChange={(e) => setEfForm((f) => ({ ...f, observacoes: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className="ca-btn" disabled={efSubmitting} onClick={() => void submitEfetivo()}>
                        {efSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : efEditing ? t("actions.save") : t("efetivos.add")}
                      </button>
                      {efEditing ? (
                        <button
                          type="button"
                          className="ca-btn-outline"
                          onClick={() => {
                            setEfEditing(null);
                            setEfForm({
                              efetivo_id: "",
                              observacoes: "",
                              uniformizacao_adequada: "",
                              equipamento_adequado: "",
                              estado: 1,
                            });
                          }}
                        >
                          {t("actions.cancel")}
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <div className="rounded-xl border ca-border">
                    <div className="hidden overflow-x-auto desktop-auth:block">
                      <table className="w-full min-w-[720px] text-sm">
                        <thead className="bg-[var(--panel-alt)]">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium">{t("efetivos.colNome")}</th>
                            <th className="px-3 py-2 text-left font-medium">{t("efetivos.colCargo")}</th>
                            <th className="px-3 py-2 text-left font-medium">{t("efetivos.colEstado")}</th>
                            <th className="px-3 py-2 text-right font-medium">{t("table.actions")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {efetivos.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="px-3 py-8 text-center text-sm ca-muted">
                                {t("efetivos.empty")}
                              </td>
                            </tr>
                          ) : (
                            efetivos.map((row) => (
                              <tr key={row.id} className="border-t ca-border">
                                <td className="px-3 py-2">{efetivoNomeDisplay(row)}</td>
                                <td className="px-3 py-2">{efetivoCargoDisplay(row)}</td>
                                <td className="px-3 py-2">
                                  {row.estado === 2 ? t("estadoEfetivo.bad") : t("estadoEfetivo.ok")}
                                </td>
                                <td className="px-3 py-2 text-right">
                                  <button
                                    type="button"
                                    className="ca-icon-btn mr-1"
                                    title={t("actions.edit")}
                                    onClick={() => startEditEfetivo(row)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    className="ca-icon-btn text-red-600"
                                    title={t("actions.delete")}
                                    onClick={() => void deleteEfetivo(row)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                    <div className="space-y-3 p-3 desktop-auth:hidden">
                      {efetivos.length === 0 ? (
                        <p className="py-4 text-center text-sm ca-muted">{t("efetivos.empty")}</p>
                      ) : (
                        efetivos.map((row) => (
                          <article
                            key={row.id}
                            className="rounded-2xl border ca-border bg-[var(--panel)] p-4 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]"
                          >
                            <div className="space-y-2 text-sm">
                              <div>
                                <div className="text-xs ca-muted">{t("efetivos.colNome")}</div>
                                <div className="font-semibold">{efetivoNomeDisplay(row)}</div>
                              </div>
                              <div>
                                <div className="text-xs ca-muted">{t("efetivos.colCargo")}</div>
                                <div>{efetivoCargoDisplay(row)}</div>
                              </div>
                              <div>
                                <div className="text-xs ca-muted">{t("efetivos.colEstado")}</div>
                                <div className="font-medium">
                                  {row.estado === 2 ? t("estadoEfetivo.bad") : t("estadoEfetivo.ok")}
                                </div>
                              </div>
                            </div>
                            <div className="mt-3 flex justify-end gap-1 border-t ca-border pt-3">
                              <button
                                type="button"
                                className="ca-icon-btn min-h-10 min-w-10"
                                title={t("actions.edit")}
                                onClick={() => startEditEfetivo(row)}
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                className="ca-icon-btn min-h-10 min-w-10 text-red-600"
                                title={t("actions.delete")}
                                onClick={() => void deleteEfetivo(row)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </article>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="ca-card space-y-3 p-4">
                    <h3 className="text-sm font-semibold">{matEditing ? t("materiais.editTitle") : t("materiais.addTitle")}</h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-xs ca-muted">{t("materiais.material")}</label>
                        <select
                          className="ca-input w-full"
                          disabled={Boolean(matEditing)}
                          value={matForm.material_id}
                          onChange={(e) => setMatForm((f) => ({ ...f, material_id: e.target.value }))}
                        >
                          <option value="">{t("materiais.pick")}</option>
                          {materiais.map((m) => (
                            <option key={m.id} value={String(m.id)}>
                              {materialLabel(m)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs ca-muted">{t("materiais.unidade")}</label>
                        <input
                          className="ca-input w-full"
                          value={matForm.unidade}
                          onChange={(e) => setMatForm((f) => ({ ...f, unidade: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs ca-muted">{t("materiais.quantidade")}</label>
                        <input
                          type="number"
                          min={0}
                          step="any"
                          className="ca-input w-full"
                          value={matForm.quantidade}
                          onChange={(e) => setMatForm((f) => ({ ...f, quantidade: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs ca-muted">{t("materiais.estado")}</label>
                        <select
                          className="ca-input w-full"
                          value={matForm.estado}
                          onChange={(e) => setMatForm((f) => ({ ...f, estado: Number(e.target.value) }))}
                        >
                          <option value={1}>{t("estadoMaterial.1")}</option>
                          <option value={2}>{t("estadoMaterial.2")}</option>
                          <option value={3}>{t("estadoMaterial.3")}</option>
                          <option value={4}>{t("estadoMaterial.4")}</option>
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-xs ca-muted">{t("materiais.observacoes")}</label>
                        <textarea
                          className="ca-input min-h-[72px] w-full"
                          value={matForm.observacoes}
                          onChange={(e) => setMatForm((f) => ({ ...f, observacoes: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className="ca-btn" disabled={matSubmitting} onClick={() => void submitMaterial()}>
                        {matSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : matEditing ? t("actions.save") : t("materiais.add")}
                      </button>
                      {matEditing ? (
                        <button
                          type="button"
                          className="ca-btn-outline"
                          onClick={() => {
                            setMatEditing(null);
                            setMatForm({ material_id: "", unidade: "", quantidade: "", observacoes: "", estado: 1 });
                          }}
                        >
                          {t("actions.cancel")}
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <div className="rounded-xl border ca-border">
                    <div className="hidden overflow-x-auto desktop-auth:block">
                      <table className="w-full min-w-[640px] text-sm">
                        <thead className="bg-[var(--panel-alt)]">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium">{t("materiais.colMaterial")}</th>
                            <th className="px-3 py-2 text-left font-medium">{t("materiais.colQty")}</th>
                            <th className="px-3 py-2 text-left font-medium">{t("materiais.colEstado")}</th>
                            <th className="px-3 py-2 text-right font-medium">{t("table.actions")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {matRows.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="px-3 py-8 text-center text-sm ca-muted">
                                {t("materiais.empty")}
                              </td>
                            </tr>
                          ) : (
                            matRows.map((row) => (
                              <tr key={row.id} className="border-t ca-border">
                                <td className="px-3 py-2">{materialLabel(row.material)}</td>
                                <td className="px-3 py-2">
                                  {row.quantidade != null && row.quantidade !== ""
                                    ? `${row.quantidade}${row.unidade ? `\u00A0${row.unidade}` : ""}`
                                    : "—"}
                                </td>
                                <td className="px-3 py-2">{materialEstadoLabel(row.estado)}</td>
                                <td className="px-3 py-2 text-right">
                                  <button
                                    type="button"
                                    className="ca-icon-btn mr-1"
                                    title={t("actions.edit")}
                                    onClick={() => startEditMaterial(row)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    className="ca-icon-btn text-red-600"
                                    title={t("actions.delete")}
                                    onClick={() => void deleteMaterial(row)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                    <div className="space-y-3 p-3 desktop-auth:hidden">
                      {matRows.length === 0 ? (
                        <p className="py-4 text-center text-sm ca-muted">{t("materiais.empty")}</p>
                      ) : (
                        matRows.map((row) => (
                          <article
                            key={row.id}
                            className="rounded-2xl border ca-border bg-[var(--panel)] p-4 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]"
                          >
                            <div className="space-y-2 text-sm">
                              <div>
                                <div className="text-xs ca-muted">{t("materiais.colMaterial")}</div>
                                <div className="font-semibold">{materialLabel(row.material)}</div>
                              </div>
                              <div>
                                <div className="text-xs ca-muted">{t("materiais.colQty")}</div>
                                <div>
                                  {row.quantidade != null && row.quantidade !== ""
                                    ? `${row.quantidade}${row.unidade ? `\u00A0${row.unidade}` : ""}`
                                    : "—"}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs ca-muted">{t("materiais.colEstado")}</div>
                                <div className="font-medium">{materialEstadoLabel(row.estado)}</div>
                              </div>
                            </div>
                            <div className="mt-3 flex justify-end gap-1 border-t ca-border pt-3">
                              <button
                                type="button"
                                className="ca-icon-btn min-h-10 min-w-10"
                                title={t("actions.edit")}
                                onClick={() => startEditMaterial(row)}
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                className="ca-icon-btn min-h-10 min-w-10 text-red-600"
                                title={t("actions.delete")}
                                onClick={() => void deleteMaterial(row)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </article>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <CameraCaptureModal
        open={supervisaoCameraOpen}
        onClose={closeSupervisaoCamera}
        onCapture={handleSupervisaoCameraFile}
      />
    </div>
  );
}
