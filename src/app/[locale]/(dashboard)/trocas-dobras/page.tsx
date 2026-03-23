"use client";
/* eslint-disable @next/next/no-img-element -- imagens no storage da API */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import axios, { type AxiosInstance } from "axios";
import {
  ArrowLeftRight,
  Eye,
  ImagePlus,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { AuthUser } from "@/types/auth";
import type { Utilizador, UtilizadorListResponse } from "@/types/utilizador";
import type {
  TrocaDobraApi,
  TrocaDobraImagemRow,
  TrocaDobraListResponse,
  TrocaDobraShowResponse,
} from "@/types/troca-dobra";

const API_PREFIX = "/trocas-dobras";
const UTILIZADORES_PREFIX = "/utilizadores";
const ORG_KEY = "ca.selected.organization";

/** Nível operador na app. */
const NIVEL_OPERADOR = 3;

/** API: ver listagem e detalhe */
const NIVEIS_VER = [1, 2, 3, 4, 5, 6] as const;
/** API: criar, editar, imagens, eliminar */
const NIVEIS_GESTAO = [1, 2, 3, 5] as const;

const FORM_DATA_HEADERS = { headers: { "Content-Type": undefined as unknown as string } };

type TabKey = "geral" | "imagens";

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

function trocaDobraImageUrl(apiBaseUrl: string, filename: string | null | undefined): string | null {
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

function formatDt(iso: string | null | undefined, loc: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(loc, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function displayUser(u: unknown): string {
  if (u && typeof u == "object" && u !== null && "name" in u) {
    const n = (u as { name?: string }).name;
    if (typeof n == "string" && n.trim()) return n.trim();
  }
  return "—";
}

function userIdFromField(v: number | Utilizador | null | undefined): number | null {
  if (v == null) return null;
  if (typeof v == "number" && Number.isFinite(v)) return v;
  if (typeof v == "object" && "id" in v && typeof (v as Utilizador).id == "number") return (v as Utilizador).id;
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

function porteiroOptionLabel(u: Utilizador): string {
  const nome = u.name?.trim() || u.email?.trim() || `#${u.id}`;
  const cargoNome = u.cargo?.nome?.trim();
  return cargoNome ? `${nome} · ${cargoNome}` : nome;
}

/** Operadores da organização (lista de seleção entrante/sainte). */
async function fetchPorteiros(http: AxiosInstance, organizacaoId: number): Promise<Utilizador[]> {
  const map = new Map<number, Utilizador>();
  let page = 1;
  for (;;) {
    try {
      const res = await http.get<UtilizadorListResponse>(`${UTILIZADORES_PREFIX}/${organizacaoId}`, {
        params: { per_page: 100, page },
      });
      const chunk = res.data?.data ?? [];
      for (const u of chunk) {
        if (u?.id && typeof u.id == "number" && Number(u.nivel) === NIVEL_OPERADOR) {
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

/** Inclui entrante/sainte já gravados (ex.: legado) para o select do detalhe não ficar vazio. */
function mergePorteirosWithParties(
  porteiros: Utilizador[],
  parties: (number | Utilizador | null | undefined)[],
): Utilizador[] {
  const map = new Map(porteiros.map((u) => [u.id, u]));
  for (const p of parties) {
    if (p != null && typeof p == "object" && "id" in p && typeof (p as Utilizador).id == "number") {
      const u = p as Utilizador;
      if (!map.has(u.id)) map.set(u.id, u);
    }
  }
  return Array.from(map.values()).sort((a, b) =>
    (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" }),
  );
}

function photoCount(row: TrocaDobraApi): number {
  let n = 0;
  if (row.img1) n += 1;
  if (row.img2) n += 1;
  n += row.imagens?.length ?? 0;
  return n;
}

export default function Page() {
  const t = useTranslations("trocasDobrasPage");
  const locale = useLocale();
  const { http, user, api_base_url } = useAuth();

  const nivel = user?.nivel ?? 0;
  const canAccess = NIVEIS_VER.includes(nivel as (typeof NIVEIS_VER)[number]);
  const canGestao = NIVEIS_GESTAO.includes(nivel as (typeof NIVEIS_GESTAO)[number]);

  const [organizacaoId, setOrganizacaoId] = useState<number | null>(null);
  const [porteiros, setPorteiros] = useState<Utilizador[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const [list, setList] = useState<TrocaDobraApi[]>([]);
  const [total, setTotal] = useState(0);
  const [perPage, setPerPage] = useState(15);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; isError?: boolean } | null>(null);

  const [draftTipo, setDraftTipo] = useState("");
  const [draftEntrante, setDraftEntrante] = useState("");
  const [draftsainte, setDraftsainte] = useState("");
  const [draftData1, setDraftData1] = useState("");
  const [draftData2, setDraftData2] = useState("");
  const [appliedTipo, setAppliedTipo] = useState("");
  const [appliedEntrante, setAppliedEntrante] = useState("");
  const [appliedsainte, setAppliedsainte] = useState("");
  const [appliedData1, setAppliedData1] = useState("");
  const [appliedData2, setAppliedData2] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createFileKey, setCreateFileKey] = useState(0);
  const [createForm, setCreateForm] = useState({
    entrante_id: "",
    sainte_id: "",
    tipo: 1,
    data_hora: "",
    img1: null as File | null,
    img2: null as File | null,
    extras: [] as File[],
  });
  const [createPreview, setCreatePreview] = useState<{
    img1: string | null;
    img2: string | null;
    extras: string[];
  }>({ img1: null, img2: null, extras: [] });

  const [detail, setDetail] = useState<TrocaDobraApi | null>(null);
  const [detailTab, setDetailTab] = useState<TabKey>("geral");
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailSaving, setDetailSaving] = useState(false);
  const [detailForm, setDetailForm] = useState({
    entrante_id: "",
    sainte_id: "",
    tipo: 1,
    data_hora: "",
    remover_img1: false,
    remover_img2: false,
    img1: null as File | null,
    img2: null as File | null,
  });
  const [detailSlotPreview, setDetailSlotPreview] = useState<{
    img1: string | null;
    img2: string | null;
  }>({ img1: null, img2: null });
  const [detailFileKey, setDetailFileKey] = useState(0);

  const [imgUploading, setImgUploading] = useState(false);
  const [imgDeletingId, setImgDeletingId] = useState<number | null>(null);
  const [imgFileKey, setImgFileKey] = useState(0);

  const showToast = useCallback((message: string, isError?: boolean) => {
    setToast({ message, isError });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const selectUsersForDetail = useMemo(
    () =>
      detail ? mergePorteirosWithParties(porteiros, [detail.entrante, detail.sainte]) : porteiros,
    [porteiros, detail],
  );

  const resetCreatePreviews = useCallback(() => {
    setCreatePreview((prev) => {
      if (prev.img1) URL.revokeObjectURL(prev.img1);
      if (prev.img2) URL.revokeObjectURL(prev.img2);
      for (const u of prev.extras) URL.revokeObjectURL(u);
      return { img1: null, img2: null, extras: [] };
    });
  }, []);

  const closeCreateModal = useCallback(() => {
    resetCreatePreviews();
    setShowCreate(false);
  }, [resetCreatePreviews]);

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

  const loadPorteiros = useCallback(async () => {
    if (!organizacaoId) {
      setPorteiros([]);
      return;
    }
    setUsersLoading(true);
    try {
      let list = await fetchPorteiros(http, organizacaoId);
      if (user?.id && Number(user.nivel) === NIVEL_OPERADOR && !list.some((u) => u.id === user.id)) {
        list = [...list, minimalUserFromSession(user)].sort((a, b) =>
          (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" }),
        );
      }
      setPorteiros(list);
    } finally {
      setUsersLoading(false);
    }
  }, [http, organizacaoId, user]);

  useEffect(() => {
    void loadPorteiros();
  }, [loadPorteiros]);

  const fetchList = useCallback(async () => {
    if (!organizacaoId || !canAccess) {
      setList([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params: Record<string, string | number> = {
        per_page: perPage,
        page: currentPage,
      };
      if (appliedTipo == "1" || appliedTipo == "2") params.tipo = Number(appliedTipo);
      if (appliedEntrante.trim()) params.entrante_id = Number(appliedEntrante);
      if (appliedsainte.trim()) params.sainte_id = Number(appliedsainte);
      if (appliedData1) params.data1 = appliedData1;
      if (appliedData2) params.data2 = appliedData2;

      const res = await http.get<TrocaDobraListResponse>(`${API_PREFIX}/${organizacaoId}`, { params });
      setList(res.data?.data ?? []);
      setTotal(res.data?.total ?? 0);
      setPerPage(res.data?.per_page ?? 15);
      setCurrentPage(res.data?.current_page ?? 1);
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status == 403) {
        showToast(t("toast.forbidden"), true);
      } else {
        showToast(t("toast.loadError"), true);
      }
      setList([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [
    organizacaoId,
    canAccess,
    http,
    perPage,
    currentPage,
    appliedTipo,
    appliedEntrante,
    appliedsainte,
    appliedData1,
    appliedData2,
    showToast,
    t,
  ]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  const reloadDetail = useCallback(
    async (id: number) => {
      if (!organizacaoId) return;
      setDetailLoading(true);
      try {
        const res = await http.get<TrocaDobraShowResponse>(`${API_PREFIX}/${organizacaoId}/${id}`);
        const row = res.data?.data;
        if (row) {
          setDetail(row);
          const eid = userIdFromField(row.entrante);
          const sid = userIdFromField(row.sainte);
          setDetailSlotPreview((prev) => {
            if (prev.img1) URL.revokeObjectURL(prev.img1);
            if (prev.img2) URL.revokeObjectURL(prev.img2);
            return { img1: null, img2: null };
          });
          setDetailForm({
            entrante_id: eid != null ? String(eid) : "",
            sainte_id: sid != null ? String(sid) : "",
            tipo: row.tipo === 2 ? 2 : 1,
            data_hora: toDatetimeLocalValue(row.data_hora),
            remover_img1: false,
            remover_img2: false,
            img1: null,
            img2: null,
          });
          setDetailFileKey((k) => k + 1);
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

  const openDetail = (row: TrocaDobraApi) => {
    setDetailTab("geral");
    setDetail(row);
    const eid = userIdFromField(row.entrante);
    const sid = userIdFromField(row.sainte);
    setDetailSlotPreview((prev) => {
      if (prev.img1) URL.revokeObjectURL(prev.img1);
      if (prev.img2) URL.revokeObjectURL(prev.img2);
      return { img1: null, img2: null };
    });
    setDetailForm({
      entrante_id: eid != null ? String(eid) : "",
      sainte_id: sid != null ? String(sid) : "",
      tipo: row.tipo === 2 ? 2 : 1,
      data_hora: toDatetimeLocalValue(row.data_hora),
      remover_img1: false,
      remover_img2: false,
      img1: null,
      img2: null,
    });
    void reloadDetail(row.id);
  };

  const closeDetail = () => {
    setDetailSlotPreview((prev) => {
      if (prev.img1) URL.revokeObjectURL(prev.img1);
      if (prev.img2) URL.revokeObjectURL(prev.img2);
      return { img1: null, img2: null };
    });
    setDetail(null);
  };

  const applyFilters = () => {
    setAppliedTipo(draftTipo);
    setAppliedEntrante(draftEntrante);
    setAppliedsainte(draftsainte);
    setAppliedData1(draftData1);
    setAppliedData2(draftData2);
    setCurrentPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, perPage)));

  const openCreate = () => {
    resetCreatePreviews();
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const localDefault = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    setCreateForm({
      entrante_id: "",
      sainte_id: user?.id ? String(user.id) : "",
      tipo: 1,
      data_hora: localDefault,
      img1: null,
      img2: null,
      extras: [],
    });
    setCreateFileKey((k) => k + 1);
    setShowCreate(true);
  };

  const submitCreate = async () => {
    if (!organizacaoId) return;
    const ent = Number(createForm.entrante_id);
    const sai = Number(createForm.sainte_id);
    if (!Number.isFinite(ent) || ent < 1 || !Number.isFinite(sai) || sai < 1) {
      showToast(t("toast.usersRequired"), true);
      return;
    }
    if (!createForm.data_hora.trim()) {
      showToast(t("toast.dateRequired"), true);
      return;
    }
    setCreateSubmitting(true);
    try {
      const hasFiles =
        createForm.img1 != null || createForm.img2 != null || createForm.extras.length > 0;
      if (hasFiles) {
        const fd = new FormData();
        fd.append("entrante", String(ent));
        fd.append("sainte", String(sai));
        fd.append("tipo", String(createForm.tipo));
        fd.append("data_hora", fromDatetimeLocalValue(createForm.data_hora));
        if (createForm.img1) fd.append("img1", createForm.img1);
        if (createForm.img2) fd.append("img2", createForm.img2);
        for (const f of createForm.extras) {
          fd.append("imagens[]", f);
        }
        await http.post(`${API_PREFIX}/${organizacaoId}`, fd, FORM_DATA_HEADERS as never);
      } else {
        await http.post(`${API_PREFIX}/${organizacaoId}`, {
          entrante: ent,
          sainte: sai,
          tipo: createForm.tipo,
          data_hora: fromDatetimeLocalValue(createForm.data_hora),
        });
      }
      showToast(t("toast.createOk"));
      closeCreateModal();
      void fetchList();
      void loadPorteiros();
    } catch (err) {
      showToast(parseApiErrors(err, t("toast.saveError")), true);
    } finally {
      setCreateSubmitting(false);
    }
  };

  const saveDetailMain = async () => {
    if (!organizacaoId || !detail || !canGestao) return;
    const ent = Number(detailForm.entrante_id);
    const sai = Number(detailForm.sainte_id);
    if (!Number.isFinite(ent) || ent < 1 || !Number.isFinite(sai) || sai < 1) {
      showToast(t("toast.usersRequired"), true);
      return;
    }
    if (!detailForm.data_hora.trim()) {
      showToast(t("toast.dateRequired"), true);
      return;
    }
    setDetailSaving(true);
    try {
      const needsMultipart = detailForm.img1 != null || detailForm.img2 != null;

      if (needsMultipart) {
        const fd = new FormData();
        fd.append("_method", "PUT");
        fd.append("entrante", String(ent));
        fd.append("sainte", String(sai));
        fd.append("tipo", String(detailForm.tipo));
        fd.append("data_hora", fromDatetimeLocalValue(detailForm.data_hora));
        if (detailForm.remover_img1) fd.append("remover_img1", "1");
        if (detailForm.remover_img2) fd.append("remover_img2", "1");
        if (detailForm.img1) fd.append("img1", detailForm.img1);
        if (detailForm.img2) fd.append("img2", detailForm.img2);
        await http.post(`${API_PREFIX}/${organizacaoId}/${detail.id}`, fd, FORM_DATA_HEADERS as never);
      } else {
        await http.put(`${API_PREFIX}/${organizacaoId}/${detail.id}`, {
          entrante: ent,
          sainte: sai,
          tipo: detailForm.tipo,
          data_hora: fromDatetimeLocalValue(detailForm.data_hora),
          remover_img1: detailForm.remover_img1,
          remover_img2: detailForm.remover_img2,
        });
      }
      showToast(t("toast.updateOk"));
      await reloadDetail(detail.id);
      void fetchList();
    } catch (err) {
      showToast(parseApiErrors(err, t("toast.saveError")), true);
    } finally {
      setDetailSaving(false);
    }
  };

  const deleteRegisto = async () => {
    if (!organizacaoId || !detail || !canGestao) return;
    if (!window.confirm(t("confirm.deleteRegisto"))) return;
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

  const deleteImagem = async (img: TrocaDobraImagemRow) => {
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

  const imagensExtra = detail?.imagens ?? [];

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
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
            style={{ background: "rgba(135,55,70,0.14)", color: "var(--brand)" }}
          >
            <ArrowLeftRight className="h-5 w-5" />
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
          {canGestao ? (
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
            <label className="mb-1 block text-xs ca-muted">{t("filters.tipo")}</label>
            <select className="ca-input w-full" value={draftTipo} onChange={(e) => setDraftTipo(e.target.value)}>
              <option value="">{t("filters.tipoAll")}</option>
              <option value="1">{t("tipo.1")}</option>
              <option value="2">{t("tipo.2")}</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs ca-muted">{t("filters.entrante")}</label>
            <select
              className="ca-input w-full"
              value={draftEntrante}
              onChange={(e) => setDraftEntrante(e.target.value)}
            >
              <option value="">{t("filters.userAll")}</option>
              {porteiros.map((u) => (
                <option key={u.id} value={String(u.id)}>
                  {porteiroOptionLabel(u)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs ca-muted">{t("filters.sainte")}</label>
            <select
              className="ca-input w-full"
              value={draftsainte}
              onChange={(e) => setDraftsainte(e.target.value)}
            >
              <option value="">{t("filters.userAll")}</option>
              {porteiros.map((u) => (
                <option key={`s-${u.id}`} value={String(u.id)}>
                  {porteiroOptionLabel(u)}
                </option>
              ))}
            </select>
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
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead className="border-b ca-border bg-[var(--panel-alt)]">
              <tr>
                <th className="px-4 py-3 text-left font-medium">{t("table.when")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("table.tipo")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("table.entrante")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("table.sainte")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("table.photos")}</th>
                <th className="px-4 py-3 text-right font-medium">{t("table.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center ca-muted">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin opacity-60" />
                  </td>
                </tr>
              ) : list.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center ca-muted">
                    {t("table.empty")}
                  </td>
                </tr>
              ) : (
                list.map((row) => (
                  <tr key={row.id} className="border-b ca-border">
                    <td className="whitespace-nowrap px-4 py-3">{formatDt(row.data_hora, locale)}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {row.tipo === 2 ? t("tipo.2") : t("tipo.1")}
                      </span>
                    </td>
                    <td className="px-4 py-3">{displayUser(row.entrante)}</td>
                    <td className="px-4 py-3">{displayUser(row.sainte)}</td>
                    <td className="px-4 py-3">{photoCount(row)}</td>
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
        {total > 0 ? (
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
        ) : null}
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
          <div className="ca-card max-h-[90vh] w-full max-w-lg overflow-y-auto p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">{t("create.title")}</h2>
              <button type="button" className="ca-icon-btn" onClick={closeCreateModal}>
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
                <label className="mb-1 block text-xs ca-muted">{t("form.tipo")}</label>
                <select
                  className="ca-input w-full"
                  value={createForm.tipo}
                  onChange={(e) => setCreateForm((f) => ({ ...f, tipo: Number(e.target.value) }))}
                >
                  <option value={1}>{t("tipo.1")}</option>
                  <option value={2}>{t("tipo.2")}</option>
                </select>
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <label className="block text-xs ca-muted">{t("form.entrante")}</label>
                  <button
                    type="button"
                    className="ca-icon-btn"
                    title={t("actions.refresh")}
                    onClick={() => void loadPorteiros()}
                    disabled={usersLoading}
                  >
                    {usersLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  </button>
                </div>
                <select
                  className="ca-input w-full"
                  value={createForm.entrante_id}
                  onChange={(e) => setCreateForm((f) => ({ ...f, entrante_id: e.target.value }))}
                  disabled={usersLoading}
                >
                  <option value="">{t("form.pickUser")}</option>
                  {porteiros.map((u) => (
                    <option key={u.id} value={String(u.id)}>
                      {porteiroOptionLabel(u)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <label className="block text-xs ca-muted">{t("form.sainte")}</label>
                  <button
                    type="button"
                    className="ca-icon-btn"
                    title={t("actions.refresh")}
                    onClick={() => void loadPorteiros()}
                    disabled={usersLoading}
                  >
                    {usersLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  </button>
                </div>
                <select
                  className="ca-input w-full"
                  value={createForm.sainte_id}
                  onChange={(e) => setCreateForm((f) => ({ ...f, sainte_id: e.target.value }))}
                  disabled={usersLoading}
                >
                  <option value="">{t("form.pickUser")}</option>
                  {porteiros.map((u) => (
                    <option key={`cs-${u.id}`} value={String(u.id)}>
                      {porteiroOptionLabel(u)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs ca-muted">{t("form.img1")}</label>
                <input
                  key={`c1-${createFileKey}`}
                  type="file"
                  accept="image/*"
                  className="block w-full text-sm"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    setCreatePreview((prev) => {
                      if (prev.img1) URL.revokeObjectURL(prev.img1);
                      return { ...prev, img1: file ? URL.createObjectURL(file) : null };
                    });
                    setCreateForm((f) => ({ ...f, img1: file }));
                  }}
                />
                {createPreview.img1 ? (
                  <div className="mt-2 overflow-hidden rounded-xl border ca-border bg-slate-100/80 p-2 dark:bg-slate-800/50">
                    <img
                      src={createPreview.img1}
                      alt=""
                      className="mx-auto max-h-56 w-full object-contain"
                    />
                  </div>
                ) : null}
              </div>
              <div>
                <label className="mb-1 block text-xs ca-muted">{t("form.img2")}</label>
                <input
                  key={`c2-${createFileKey}`}
                  type="file"
                  accept="image/*"
                  className="block w-full text-sm"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    setCreatePreview((prev) => {
                      if (prev.img2) URL.revokeObjectURL(prev.img2);
                      return { ...prev, img2: file ? URL.createObjectURL(file) : null };
                    });
                    setCreateForm((f) => ({ ...f, img2: file }));
                  }}
                />
                {createPreview.img2 ? (
                  <div className="mt-2 overflow-hidden rounded-xl border ca-border bg-slate-100/80 p-2 dark:bg-slate-800/50">
                    <img
                      src={createPreview.img2}
                      alt=""
                      className="mx-auto max-h-56 w-full object-contain"
                    />
                  </div>
                ) : null}
              </div>
              <div>
                <label className="mb-1 block text-xs ca-muted">{t("form.extras")}</label>
                <input
                  key={`ce-${createFileKey}`}
                  type="file"
                  accept="image/*"
                  multiple
                  className="block w-full text-sm"
                  onChange={(e) => {
                    const files = e.target.files ? Array.from(e.target.files) : [];
                    setCreatePreview((prev) => {
                      for (const u of prev.extras) URL.revokeObjectURL(u);
                      return { ...prev, extras: files.map((file) => URL.createObjectURL(file)) };
                    });
                    setCreateForm((f) => ({ ...f, extras: files }));
                  }}
                />
                {createPreview.extras.length > 0 ? (
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {createPreview.extras.map((src, i) => (
                      <div
                        key={`${src}-${i}`}
                        className="overflow-hidden rounded-lg border ca-border bg-slate-100/80 p-1 dark:bg-slate-800/50"
                      >
                        <img src={src} alt="" className="h-28 w-full object-contain" />
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="ca-btn-outline" onClick={closeCreateModal}>
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
          <div className="ca-card flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden shadow-xl">
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
              {(["geral", "imagens"] as TabKey[]).map((key) => (
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
              ) : detailTab === "geral" ? (
                <div className="mx-auto max-w-3xl space-y-3">
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
                      disabled={!canGestao}
                      value={detailForm.data_hora}
                      onChange={(e) => setDetailForm((f) => ({ ...f, data_hora: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs ca-muted">{t("form.tipo")}</label>
                    <select
                      className="ca-input w-full"
                      disabled={!canGestao}
                      value={detailForm.tipo}
                      onChange={(e) => setDetailForm((f) => ({ ...f, tipo: Number(e.target.value) }))}
                    >
                      <option value={1}>{t("tipo.1")}</option>
                      <option value={2}>{t("tipo.2")}</option>
                    </select>
                  </div>
                  <div>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <label className="block text-xs ca-muted">{t("form.entrante")}</label>
                      <button
                        type="button"
                        className="ca-icon-btn"
                        title={t("actions.refresh")}
                        onClick={() => void loadPorteiros()}
                        disabled={!canGestao || usersLoading}
                      >
                        {usersLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <select
                      className="ca-input w-full"
                      disabled={!canGestao || usersLoading}
                      value={detailForm.entrante_id}
                      onChange={(e) => setDetailForm((f) => ({ ...f, entrante_id: e.target.value }))}
                    >
                      <option value="">{t("form.pickUser")}</option>
                      {selectUsersForDetail.map((u) => (
                        <option key={u.id} value={String(u.id)}>
                          {porteiroOptionLabel(u)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <label className="block text-xs ca-muted">{t("form.sainte")}</label>
                      <button
                        type="button"
                        className="ca-icon-btn"
                        title={t("actions.refresh")}
                        onClick={() => void loadPorteiros()}
                        disabled={!canGestao || usersLoading}
                      >
                        {usersLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <select
                      className="ca-input w-full"
                      disabled={!canGestao || usersLoading}
                      value={detailForm.sainte_id}
                      onChange={(e) => setDetailForm((f) => ({ ...f, sainte_id: e.target.value }))}
                    >
                      <option value="">{t("form.pickUser")}</option>
                      {selectUsersForDetail.map((u) => (
                        <option key={`ds-${u.id}`} value={String(u.id)}>
                          {porteiroOptionLabel(u)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="mb-1 text-xs ca-muted">{t("form.slotImg1")}</p>
                      <div className="mb-2 flex min-h-[min(70vh,22rem)] w-full items-center justify-center overflow-hidden rounded-xl border ca-border bg-slate-100/90 p-2 dark:bg-slate-800/60">
                        {detailSlotPreview.img1 ? (
                          <img
                            src={detailSlotPreview.img1}
                            alt=""
                            className="max-h-[min(70vh,22rem)] w-full object-contain"
                          />
                        ) : !detailForm.remover_img1 && detail.img1 ? (
                          <img
                            src={trocaDobraImageUrl(api_base_url, detail.img1) ?? ""}
                            alt=""
                            className="max-h-[min(70vh,22rem)] w-full object-contain"
                          />
                        ) : (
                          <p className="px-2 py-8 text-center text-xs ca-muted">{t("images.emptySlot")}</p>
                        )}
                      </div>
                      {canGestao ? (
                        <>
                          {detail.img1 && !detailSlotPreview.img1 ? (
                            <label className="mb-2 flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={detailForm.remover_img1}
                                onChange={(e) =>
                                  setDetailForm((f) => ({ ...f, remover_img1: e.target.checked }))
                                }
                              />
                              {t("form.removeImg1")}
                            </label>
                          ) : null}
                          <input
                            key={`d1-${detailFileKey}`}
                            type="file"
                            accept="image/*"
                            className="block w-full text-sm"
                            onChange={(e) => {
                              const file = e.target.files?.[0] ?? null;
                              setDetailSlotPreview((prev) => {
                                if (prev.img1) URL.revokeObjectURL(prev.img1);
                                return { ...prev, img1: file ? URL.createObjectURL(file) : null };
                              });
                              setDetailForm((f) => ({ ...f, img1: file }));
                            }}
                          />
                        </>
                      ) : null}
                    </div>
                    <div>
                      <p className="mb-1 text-xs ca-muted">{t("form.slotImg2")}</p>
                      <div className="mb-2 flex min-h-[min(70vh,22rem)] w-full items-center justify-center overflow-hidden rounded-xl border ca-border bg-slate-100/90 p-2 dark:bg-slate-800/60">
                        {detailSlotPreview.img2 ? (
                          <img
                            src={detailSlotPreview.img2}
                            alt=""
                            className="max-h-[min(70vh,22rem)] w-full object-contain"
                          />
                        ) : !detailForm.remover_img2 && detail.img2 ? (
                          <img
                            src={trocaDobraImageUrl(api_base_url, detail.img2) ?? ""}
                            alt=""
                            className="max-h-[min(70vh,22rem)] w-full object-contain"
                          />
                        ) : (
                          <p className="px-2 py-8 text-center text-xs ca-muted">{t("images.emptySlot")}</p>
                        )}
                      </div>
                      {canGestao ? (
                        <>
                          {detail.img2 && !detailSlotPreview.img2 ? (
                            <label className="mb-2 flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={detailForm.remover_img2}
                                onChange={(e) =>
                                  setDetailForm((f) => ({ ...f, remover_img2: e.target.checked }))
                                }
                              />
                              {t("form.removeImg2")}
                            </label>
                          ) : null}
                          <input
                            key={`d2-${detailFileKey}`}
                            type="file"
                            accept="image/*"
                            className="block w-full text-sm"
                            onChange={(e) => {
                              const file = e.target.files?.[0] ?? null;
                              setDetailSlotPreview((prev) => {
                                if (prev.img2) URL.revokeObjectURL(prev.img2);
                                return { ...prev, img2: file ? URL.createObjectURL(file) : null };
                              });
                              setDetailForm((f) => ({ ...f, img2: file }));
                            }}
                          />
                        </>
                      ) : null}
                    </div>
                  </div>

                  {canGestao ? (
                    <div className="flex flex-wrap gap-2 pt-2">
                      <button
                        type="button"
                        className="ca-btn"
                        disabled={detailSaving}
                        onClick={() => void saveDetailMain()}
                      >
                        {detailSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("actions.save")}
                      </button>
                      <button
                        type="button"
                        className="ca-btn-outline text-red-600"
                        onClick={() => void deleteRegisto()}
                      >
                        <Trash2 className="h-4 w-4" />
                        {t("actions.delete")}
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-4">
                  {canGestao ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="ca-btn-outline cursor-pointer">
                        <ImagePlus className="mr-1 inline h-4 w-4" />
                        {t("images.add")}
                        <input
                          key={imgFileKey}
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          disabled={imgUploading}
                          onChange={(e) => void uploadImagens(e.target.files)}
                        />
                      </label>
                      {imgUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    </div>
                  ) : null}
                  <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                    {imagensExtra.map((img) => {
                      const src = trocaDobraImageUrl(api_base_url, img.imagem);
                      return (
                        <div key={img.id} className="ca-card overflow-hidden p-2">
                          {src ? (
                            <div className="mb-2 flex min-h-[12rem] items-center justify-center overflow-hidden rounded-lg bg-slate-100/90 p-1 dark:bg-slate-800/60">
                              <img src={src} alt="" className="max-h-56 w-full object-contain" />
                            </div>
                          ) : (
                            <div className="mb-2 flex min-h-[12rem] items-center justify-center rounded-lg bg-slate-100 text-xs ca-muted dark:bg-slate-800">
                              —
                            </div>
                          )}
                          {canGestao ? (
                            <button
                              type="button"
                              className="ca-btn-outline w-full text-sm text-red-600"
                              disabled={imgDeletingId === img.id}
                              onClick={() => void deleteImagem(img)}
                            >
                              {imgDeletingId === img.id ? (
                                <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                              ) : (
                                t("images.remove")
                              )}
                            </button>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                  {imagensExtra.length === 0 ? (
                    <p className="text-sm ca-muted">{t("images.emptyExtra")}</p>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
