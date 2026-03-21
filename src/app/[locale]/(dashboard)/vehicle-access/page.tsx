"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AxiosInstance } from "axios";
import {
  Car,
  LogIn,
  LogOut,
  Clock,
  Plus,
  X,
  Eye,
  Pencil,
  Trash2,
  Loader2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Images,
  Upload,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/hooks/useAuth";
import type { Utilizador, UtilizadorListResponse } from "@/types/utilizador";
import type { AcessoVeiculo, AcessoVeiculoListResponse } from "@/types/acesso-veiculo";
import type { AcessoImagem, AcessoImagemListResponse } from "@/types/acesso-imagem";

const API_PREFIX = "/acessos-veiculos";
const ORG_KEY = "ca.selected.organization";

const DOCUMENT_UI_KEYS = ["bi", "passport", "carta", "outro"] as const;
type DocumentUiKey = (typeof DOCUMENT_UI_KEYS)[number];

const DOC_TIPO_CARTA = "carta_conducao";
const DOC_TIPO_OUTRO = "outro_generico";

/** Valores enviados no campo `motivo` da API (igual ao acesso por pessoas). */
const MOTIVO_ACCESSO_VALUES = ["morador", "colaborador", "reuniao", "visita", "outros"] as const;

const VISITANTE_TIPO_VALUES = [1, 2, 3, 4, 5, 6, 7] as const;

function visitanteTipoFormValue(tipo: number | null | undefined): string {
  if (tipo != null && tipo >= 1 && tipo <= 7) return String(tipo);
  return "6";
}

function inferDocumentUi(row: AcessoVeiculo): DocumentUiKey {
  const d = row.documento ?? row.condutor?.documento ?? null;
  const tipo = (row.documento_tipo ?? "").trim().toLowerCase();
  if (d === 1) return "bi";
  if (d === 2) return "passport";
  if (d === 3) {
    if (tipo === DOC_TIPO_CARTA.toLowerCase() || /carta|condu|driving|permis|drive/.test(tipo)) return "carta";
    if (tipo === DOC_TIPO_OUTRO.toLowerCase()) return "outro";
    return "outro";
  }
  if (/pass|passeport/i.test(tipo)) return "passport";
  if (/bilhe|identit|^bi$/i.test(tipo)) return "bi";
  if (/carta|condu|driv|permis/i.test(tipo)) return "carta";
  return "outro";
}

function mapDocumentUiToApi(ui: DocumentUiKey): { documento: number; documento_tipo: string | null } {
  switch (ui) {
    case "bi":
      return { documento: 1, documento_tipo: null };
    case "passport":
      return { documento: 2, documento_tipo: null };
    case "carta":
      return { documento: 3, documento_tipo: DOC_TIPO_CARTA };
    case "outro":
      return { documento: 3, documento_tipo: DOC_TIPO_OUTRO };
  }
}

const USER_SOURCE_PATHS = [
  "/utilizadores",
  "/colaboradores",
  "/visitantes",
  "/clientes",
  "/fornecedores",
  "/guardas",
  "/moradores",
] as const;

type LookupItem = { id: number; nome: string };

type Bloco = {
  id: number;
  designacao?: string | null;
  nome?: string | null;
};

type Residencia = {
  id: number;
  designacao: string;
  bloco?: Bloco | null;
};

type ResidenciaListResponse = { data: Residencia[] };

type StoredOrg = {
  id?: number | string;
  tipoNum?: number | null;
};

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function localDateTimeToApi(value: string): string {
  if (!value?.trim()) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value.trim();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
}

function parseApiErrors(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "response" in err) {
    const data = (err as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } })
      .response?.data;
    if (data?.errors) {
      return Object.values(data.errors)
        .flat()
        .join(" ");
    }
    if (typeof data?.message === "string") return data.message;
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
      const id = typeof raw.id === "number" ? raw.id : Number(raw.id);
      const nome =
        typeof raw.designacao === "string"
          ? raw.designacao.trim()
          : typeof raw.nome === "string"
            ? raw.nome.trim()
            : typeof raw.descricao === "string"
              ? raw.descricao.trim()
              : "";
      if (!Number.isFinite(id) || id <= 0 || !nome) return null;
      return { id, nome };
    })
    .filter((v): v is LookupItem => v !== null);
}

async function fetchMergedUsers(http: AxiosInstance, organizacaoId: number): Promise<Utilizador[]> {
  const map = new Map<number, Utilizador>();
  await Promise.all(
    USER_SOURCE_PATHS.map(async (path) => {
      try {
        const res = await http.get<UtilizadorListResponse>(`${path}/${organizacaoId}`, {
          params: { per_page: 100, page: 1 },
        });
        for (const u of res.data?.data ?? []) {
          if (u?.id && typeof u.id === "number") map.set(u.id, u);
        }
      } catch {
        /* ignore */
      }
    }),
  );
  return Array.from(map.values()).sort((a, b) =>
    (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" }),
  );
}

function rowVisualStatus(row: AcessoVeiculo, t: (k: string) => string): { key: string; className: string; label: string } {
  if (row.saida) {
    return {
      key: "left",
      label: t("status.left"),
      className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    };
  }
  const ent = row.entrada ? new Date(row.entrada) : null;
  const late =
    ent &&
    !Number.isNaN(ent.getTime()) &&
    Date.now() - ent.getTime() > 8 * 60 * 60 * 1000;
  if (late) {
    return {
      key: "late",
      label: t("status.late"),
      className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    };
  }
  return {
    key: "inside",
    label: t("status.inside"),
    className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  };
}

function aprovadoRowStyle(
  aprovado: number | null | undefined,
  t: (k: string) => string,
): { label: string; className: string } {
  if (aprovado === 0) {
    return {
      label: t("aprovado.0"),
      className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    };
  }
  if (aprovado === 1) {
    return {
      label: t("aprovado.1"),
      className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
    };
  }
  if (aprovado === 2) {
    return {
      label: t("aprovado.2"),
      className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    };
  }
  return {
    label: t("aprovado.unknown"),
    className: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  };
}

export default function Page() {
  const t = useTranslations("vehicleAccess");
  const { http, api_base_url, user: authUser } = useAuth();

  const [organizacaoId, setOrganizacaoId] = useState<number | null>(null);
  const [orgTipoNum, setOrgTipoNum] = useState<number | null>(null);

  const [list, setList] = useState<AcessoVeiculo[]>([]);
  const [total, setTotal] = useState(0);
  const [perPage, setPerPage] = useState(15);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; isError?: boolean } | null>(null);

  const [filtroMatricula, setFiltroMatricula] = useState("");
  const [filtroTipoVeiculo, setFiltroTipoVeiculo] = useState("");
  const [filtroTemCarga, setFiltroTemCarga] = useState("");
  const [filtroDestinoId, setFiltroDestinoId] = useState("");
  const [filtroData1, setFiltroData1] = useState("");
  const [filtroData2, setFiltroData2] = useState("");

  const [statsLoading, setStatsLoading] = useState(false);
  const [statInside, setStatInside] = useState(0);
  const [statEntriesToday, setStatEntriesToday] = useState(0);
  const [statExitsToday, setStatExitsToday] = useState(0);
  const [statLateInside, setStatLateInside] = useState(0);

  const [allUsers, setAllUsers] = useState<Utilizador[]>([]);
  const [anfitrioes, setAnfitrioes] = useState<Utilizador[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [anfitrioesLoading, setAnfitrioesLoading] = useState(false);

  const [departamentos, setDepartamentos] = useState<LookupItem[]>([]);
  const [residencias, setResidencias] = useState<Residencia[]>([]);
  const [destLoading, setDestLoading] = useState(false);

  const [showPanel, setShowPanel] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [detailRow, setDetailRow] = useState<AcessoVeiculo | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const [condutorMode, setCondutorMode] = useState<"existing" | "visitante">("existing");
  const [formCondutorId, setFormCondutorId] = useState("");
  const [formVisitanteNome, setFormVisitanteNome] = useState("");
  const [formVisitanteEmail, setFormVisitanteEmail] = useState("");
  const [formVisitanteTelefone, setFormVisitanteTelefone] = useState("");
  const [formVisitanteTipo, setFormVisitanteTipo] = useState("6");
  const [formDocumentUi, setFormDocumentUi] = useState<DocumentUiKey>("bi");
  const [formDocumentoRef, setFormDocumentoRef] = useState("");

  const [formMatricula, setFormMatricula] = useState("");
  const [formTipoVeiculo, setFormTipoVeiculo] = useState("1");
  const [formTemCarga, setFormTemCarga] = useState(false);
  const [formDestinoId, setFormDestinoId] = useState("");
  const [formAnfitriaoId, setFormAnfitriaoId] = useState("");
  const [formEntrada, setFormEntrada] = useState("");
  const [formSaida, setFormSaida] = useState("");
  const [formAprovado, setFormAprovado] = useState("1");
  const [formMotivo, setFormMotivo] = useState("");
  const [formObservacoes, setFormObservacoes] = useState("");

  const [attachmentsOpen, setAttachmentsOpen] = useState(false);
  const [attachmentsAcessoId, setAttachmentsAcessoId] = useState<number | null>(null);
  const [attachmentsRowLabel, setAttachmentsRowLabel] = useState("");
  const [attachmentsImagens, setAttachmentsImagens] = useState<AcessoImagem[]>([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [attachmentsUploading, setAttachmentsUploading] = useState(false);
  const [attachmentsDeletingId, setAttachmentsDeletingId] = useState<number | null>(null);
  const attachmentsFileInputRef = useRef<HTMLInputElement>(null);

  /** Skip refetching host/user lists when reopening the panel for the same organization. */
  const panelSelectsPrimedRef = useRef<{ orgId: number } | null>(null);

  const isCondominio = orgTipoNum === 2;
  const destinoApi = isCondominio ? 2 : 1;

  const canEdit = authUser && [1, 2, 3].includes(Number(authUser.nivel));
  const canDelete = authUser && [1, 2].includes(Number(authUser.nivel));

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ORG_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as StoredOrg;
      const id = typeof parsed?.id === "number" ? parsed.id : Number(parsed?.id);
      if (Number.isFinite(id) && id > 0) setOrganizacaoId(id);
      const tn = parsed?.tipoNum;
      setOrgTipoNum(typeof tn === "number" && Number.isFinite(tn) ? tn : null);
    } catch {
      // noop
    }
  }, []);

  useEffect(() => {
    panelSelectsPrimedRef.current = null;
    setAllUsers([]);
    setAnfitrioes([]);
  }, [organizacaoId]);

  const showToast = useCallback((message: string, isError?: boolean) => {
    setToast({ message, isError });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const buildImageUrl = useCallback(
    (path: string | null | undefined) => {
      if (!path) return null;
      const base = api_base_url.replace(/\/$/, "");
      const p = path.startsWith("/") ? path : `/storage/${path}`;
      return `${base}${p}`;
    },
    [api_base_url],
  );

  const fetchDestinations = useCallback(async () => {
    if (!organizacaoId) {
      setDepartamentos([]);
      setResidencias([]);
      return;
    }
    setDestLoading(true);
    try {
      if (isCondominio) {
        const res = await http.get<ResidenciaListResponse>(`/residencias/${organizacaoId}`, {
          params: { estado: 1, per_page: 200 },
        });
        const rows = Array.isArray(res.data?.data) ? res.data.data : [];
        setResidencias(rows.filter((r) => typeof r?.id === "number"));
        setDepartamentos([]);
      } else {
        const res = await http.get(`/departamentos/${organizacaoId}/ativados`);
        setDepartamentos(parseLookupItems(res.data));
        setResidencias([]);
      }
    } catch {
      setDepartamentos([]);
      setResidencias([]);
    } finally {
      setDestLoading(false);
    }
  }, [http, organizacaoId, isCondominio]);

  const fetchAnfitrioes = useCallback(async () => {
    if (!organizacaoId) {
      setAnfitrioes([]);
      return;
    }
    setAnfitrioesLoading(true);
    try {
      const path = isCondominio ? "/moradores" : "/colaboradores";
      const res = await http.get<UtilizadorListResponse>(`${path}/${organizacaoId}`, {
        params: { per_page: 200, page: 1 },
      });
      setAnfitrioes(res.data?.data ?? []);
    } catch {
      setAnfitrioes([]);
      showToast(t("toast.loadHostsError"), true);
    } finally {
      setAnfitrioesLoading(false);
    }
  }, [http, organizacaoId, isCondominio, showToast, t]);

  const fetchAllUsersForSelect = useCallback(async () => {
    if (!organizacaoId) {
      setAllUsers([]);
      return;
    }
    setUsersLoading(true);
    try {
      const merged = await fetchMergedUsers(http, organizacaoId);
      setAllUsers(merged);
    } catch {
      setAllUsers([]);
      showToast(t("toast.loadUsersError"), true);
    } finally {
      setUsersLoading(false);
    }
  }, [http, organizacaoId, showToast, t]);

  const ensurePanelSelectUsers = useCallback(
    async (opts?: { force?: boolean; includeDestinations?: boolean }) => {
      const force = opts?.force ?? false;
      const includeDestinations = opts?.includeDestinations ?? false;
      if (!organizacaoId) return;
      const primed = panelSelectsPrimedRef.current;
      if (!force && primed?.orgId === organizacaoId) return;

      const tasks: Promise<unknown>[] = [fetchAnfitrioes(), fetchAllUsersForSelect()];
      if (includeDestinations) tasks.unshift(fetchDestinations());
      await Promise.all(tasks);
      panelSelectsPrimedRef.current = { orgId: organizacaoId };
    },
    [organizacaoId, fetchAnfitrioes, fetchAllUsersForSelect, fetchDestinations],
  );

  const fetchList = useCallback(async () => {
    if (!organizacaoId) {
      setList([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params: Record<string, string | number | boolean> = {
        per_page: perPage,
        page: currentPage,
      };
      if (filtroMatricula.trim()) params.matricula = filtroMatricula.trim();
      if (filtroTipoVeiculo === "1" || filtroTipoVeiculo === "2" || filtroTipoVeiculo === "3") {
        params.tipo_veiculo = Number(filtroTipoVeiculo);
      }
      if (filtroTemCarga === "1") params.tem_carga = true;
      if (filtroTemCarga === "0") params.tem_carga = false;
      if (filtroDestinoId.trim()) {
        params.destino = destinoApi;
        params.destino_id = Number(filtroDestinoId);
      }
      if (filtroData1.trim()) params.data1 = filtroData1.trim();
      if (filtroData2.trim()) params.data2 = filtroData2.trim();

      const res = await http.get<AcessoVeiculoListResponse>(`${API_PREFIX}/${organizacaoId}`, { params });
      setList(res.data?.data ?? []);
      setTotal(res.data?.total ?? 0);
      setPerPage(res.data?.per_page ?? 15);
      setCurrentPage(res.data?.current_page ?? 1);
    } catch {
      showToast(t("toast.loadError"), true);
      setList([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [
    organizacaoId,
    http,
    perPage,
    currentPage,
    filtroMatricula,
    filtroTipoVeiculo,
    filtroTemCarga,
    filtroDestinoId,
    filtroData1,
    filtroData2,
    destinoApi,
    showToast,
    t,
  ]);

  const fetchStats = useCallback(async () => {
    if (!organizacaoId) {
      setStatInside(0);
      setStatEntriesToday(0);
      setStatExitsToday(0);
      setStatLateInside(0);
      return;
    }
    setStatsLoading(true);
    const today = ymd(new Date());
    try {
      const [todayHead, recent] = await Promise.all([
        http.get<AcessoVeiculoListResponse>(`${API_PREFIX}/${organizacaoId}`, {
          params: { data1: today, data2: today, per_page: 1, page: 1 },
        }),
        http.get<AcessoVeiculoListResponse>(`${API_PREFIX}/${organizacaoId}`, {
          params: { per_page: 250, page: 1 },
        }),
      ]);

      setStatEntriesToday(todayHead.data?.total ?? 0);

      const recentItems = recent.data?.data ?? [];
      const inside = recentItems.filter((r) => !r.saida);
      setStatInside(inside.length);

      const eightH = 8 * 60 * 60 * 1000;
      setStatLateInside(
        inside.filter((r) => {
          const ent = r.entrada ? new Date(r.entrada) : null;
          return ent && !Number.isNaN(ent.getTime()) && Date.now() - ent.getTime() > eightH;
        }).length,
      );

      let exits = 0;
      try {
        const todayFull = await http.get<AcessoVeiculoListResponse>(`${API_PREFIX}/${organizacaoId}`, {
          params: { data1: today, data2: today, per_page: 500, page: 1 },
        });
        exits = (todayFull.data?.data ?? []).filter((r) => Boolean(r.saida)).length;
      } catch {
        exits = 0;
      }
      setStatExitsToday(exits);
    } catch {
      setStatInside(0);
      setStatEntriesToday(0);
      setStatExitsToday(0);
      setStatLateInside(0);
    } finally {
      setStatsLoading(false);
    }
  }, [http, organizacaoId]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchDestinations();
  }, [fetchDestinations]);

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  const tipoLabel = useCallback(
    (u?: Utilizador | null) => {
      const raw = u?.tipo;
      if (raw == null) return "—";
      const tipo = typeof raw === "number" ? raw : Number(raw);
      if (!Number.isFinite(tipo)) return "—";
      if (tipo >= 1 && tipo <= 7) {
        return t(`visitorsTipoSelect.${tipo}` as "visitorsTipoSelect.1");
      }
      return `Tipo ${tipo}`;
    },
    [t],
  );

  const tipoVeiculoLabel = useCallback(
    (n: number | null | undefined) => {
      if (n === 1) return t("types.light");
      if (n === 2) return t("types.heavy");
      if (n === 3) return t("types.bus");
      return "—";
    },
    [t],
  );

  const documentTypeLabel = useCallback(
    (row: AcessoVeiculo) => {
      const ui = inferDocumentUi(row);
      return t(`docTypeUi.${ui}` as "docTypeUi.bi");
    },
    [t],
  );

  const motivoLabel = useCallback(
    (raw: string | null | undefined) => {
      const v = raw?.trim() ?? "";
      if (!v) return "—";
      if ((MOTIVO_ACCESSO_VALUES as readonly string[]).includes(v)) {
        return t(`motivo.${v}` as "motivo.morador");
      }
      return v;
    },
    [t],
  );

  const contactCell = useCallback((u: Utilizador | null | undefined) => {
    if (!u?.email && !u?.telefone) return <span>—</span>;
    return (
      <div className="text-xs space-y-0.5 max-w-[160px]">
        {u.email ? (
          <div className="truncate" title={u.email}>
            {u.email}
          </div>
        ) : null}
        {u.telefone ? <div>{u.telefone}</div> : null}
      </div>
    );
  }, []);

  const hostCell = useCallback((u: Utilizador | null | undefined) => {
    if (!u?.name && !u?.telefone && !u?.email) return <span>—</span>;
    return (
      <div className="text-xs space-y-0.5 max-w-[140px]">
        {u?.name ? <div className="font-medium truncate">{u.name}</div> : null}
        {u?.telefone ? <div className="ca-muted">{u.telefone}</div> : null}
        {u?.email ? (
          <div className="truncate ca-muted" title={u.email}>
            {u.email}
          </div>
        ) : null}
      </div>
    );
  }, []);

  const destinoLabel = useCallback(
    (row: AcessoVeiculo) => {
      if (row.destino === 1 && row.destino_id) {
        const d = departamentos.find((x) => x.id === row.destino_id);
        return d?.nome ?? "—";
      }
      if (row.destino === 2 && row.destino_id) {
        const r = residencias.find((x) => x.id === row.destino_id);
        if (!r) return "—";
        const bloco = r.bloco?.designacao ?? r.bloco?.nome ?? "";
        return bloco ? `${r.designacao} (${bloco})` : r.designacao;
      }
      return "—";
    },
    [departamentos, residencias],
  );

  const resetForm = () => {
    setCondutorMode("existing");
    setFormCondutorId("");
    setFormVisitanteNome("");
    setFormVisitanteEmail("");
    setFormVisitanteTelefone("");
    setFormVisitanteTipo("6");
    setFormDocumentUi("bi");
    setFormDocumentoRef("");
    setFormMatricula("");
    setFormTipoVeiculo("1");
    setFormTemCarga(false);
    setFormDestinoId("");
    setFormAnfitriaoId("");
    setFormEntrada("");
    setFormSaida("");
    setFormAprovado("1");
    setFormMotivo("");
    setFormObservacoes("");
  };

  const openNew = () => {
    setEditingId(null);
    setDetailRow(null);
    resetForm();
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const local = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    setFormEntrada(local);
    setFormAprovado("1");
    setFormMotivo("");
    setFormObservacoes("");
    setShowPanel(true);
    void ensurePanelSelectUsers();
  };

  const openEdit = (row: AcessoVeiculo) => {
    setEditingId(row.id);
    setDetailRow(null);
    const c = row.condutor ?? null;
    if (row.condutor_id) {
      setCondutorMode("existing");
      setFormCondutorId(String(row.condutor_id));
      setFormVisitanteNome("");
      setFormVisitanteEmail("");
      setFormVisitanteTelefone("");
      setFormVisitanteTipo("6");
      setFormDocumentUi(inferDocumentUi(row));
    } else {
      setCondutorMode("visitante");
      setFormCondutorId("");
      setFormVisitanteNome(c?.name?.trim() ?? "");
      setFormVisitanteEmail(c?.email?.trim() ?? "");
      setFormVisitanteTelefone(c?.telefone?.trim() ?? "");
      setFormVisitanteTipo(visitanteTipoFormValue(c?.tipo));
      setFormDocumentUi(inferDocumentUi(row));
    }
    setFormDocumentoRef(row.documento_ref ?? "");
    setFormMatricula(row.matricula?.trim() ?? "");
    setFormTipoVeiculo(row.tipo_veiculo != null ? String(row.tipo_veiculo) : "1");
    setFormTemCarga(Boolean(row.tem_carga));
    setFormDestinoId(row.destino_id ? String(row.destino_id) : "");
    setFormAnfitriaoId(row.anfitriao_id ? String(row.anfitriao_id) : "");
    if (row.entrada) {
      const d = new Date(row.entrada);
      if (!Number.isNaN(d.getTime())) {
        const pad = (n: number) => String(n).padStart(2, "0");
        setFormEntrada(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
      }
    }
    if (row.saida) {
      const d = new Date(row.saida);
      if (!Number.isNaN(d.getTime())) {
        const pad = (n: number) => String(n).padStart(2, "0");
        setFormSaida(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
      }
    } else setFormSaida("");
    const ap = row.aprovado;
    setFormAprovado(ap === 0 || ap === 1 || ap === 2 ? String(ap) : "1");
    setFormMotivo(row.motivo?.trim() ?? "");
    setFormObservacoes(row.observacoes?.trim() ?? "");
    setShowPanel(true);
    void ensurePanelSelectUsers();
  };

  const openDetail = async (id: number) => {
    if (!organizacaoId) return;
    try {
      const res = await http.get<{ data: AcessoVeiculo }>(`${API_PREFIX}/${organizacaoId}/${id}`);
      setDetailRow(res.data?.data ?? null);
    } catch {
      showToast(t("toast.loadError"), true);
    }
  };

  const closePanel = () => {
    setShowPanel(false);
    setEditingId(null);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizacaoId) {
      showToast(t("toast.orgRequired"), true);
      return;
    }
    if (!canEdit) {
      showToast(t("toast.noPermission"), true);
      return;
    }

    const entradaApi = localDateTimeToApi(formEntrada);
    if (!entradaApi) {
      showToast(t("toast.entryRequired"), true);
      return;
    }

    if (condutorMode === "existing") {
      if (!formCondutorId.trim()) {
        showToast(t("toast.condutorRequired"), true);
        return;
      }
    } else {
      if (!formVisitanteNome.trim()) {
        showToast(t("toast.visitanteNomeRequired"), true);
        return;
      }
      if (!formDocumentoRef.trim()) {
        showToast(t("toast.documentoRefRequired"), true);
        return;
      }
    }

    if (!formDestinoId.trim()) {
      showToast(t("toast.destinationRequired"), true);
      return;
    }

    const saidaApi = formSaida.trim() ? localDateTimeToApi(formSaida) : null;
    const docRefStr = formDocumentoRef.trim();
    const { documento, documento_tipo: docTipoApi } = mapDocumentUiToApi(formDocumentUi);

    const payload: Record<string, string | number | boolean | null | undefined> = {
      destino: destinoApi,
      destino_id: Number(formDestinoId),
      anfitriao_id: formAnfitriaoId.trim() ? Number(formAnfitriaoId) : null,
      entrada: entradaApi,
      saida: saidaApi,
      matricula: formMatricula.trim() || null,
      tipo_veiculo: Number(formTipoVeiculo) || 1,
      tem_carga: formTemCarga,
      aprovado: Number(formAprovado) === 0 || Number(formAprovado) === 1 || Number(formAprovado) === 2 ? Number(formAprovado) : 1,
      motivo: formMotivo.trim() || null,
      observacoes: formObservacoes.trim() || null,
    };

    if (condutorMode === "existing") {
      payload.condutor_id = Number(formCondutorId);
      payload.documento = documento;
      if (docTipoApi) payload.documento_tipo = docTipoApi;
      if (docRefStr) payload.documento_ref = docRefStr;
    } else {
      payload.nome = formVisitanteNome.trim();
      if (formVisitanteEmail.trim()) payload.email = formVisitanteEmail.trim();
      if (formVisitanteTelefone.trim()) payload.telefone = formVisitanteTelefone.trim();
      const tipoN = Number(formVisitanteTipo);
      if (tipoN >= 1 && tipoN <= 7) payload.tipo = tipoN;
      payload.documento = documento;
      payload.documento_ref = docRefStr;
      if (docTipoApi) payload.documento_tipo = docTipoApi;
    }

    setFormSubmitting(true);
    try {
      type SaveRes = {
        message?: string;
        data?: unknown;
        visitante_user_id?: number;
        visitante_novo_registado?: boolean;
      };

      if (editingId) {
        const res = await http.put<SaveRes>(`${API_PREFIX}/${organizacaoId}/${editingId}`, payload);
        const novo = res.data?.visitante_novo_registado === true;
        showToast(novo ? t("toast.updatedVisitanteNovo") : t("toast.updated"));
      } else {
        const res = await http.post<SaveRes>(`${API_PREFIX}/${organizacaoId}`, payload);
        const novo = res.data?.visitante_novo_registado === true;
        showToast(novo ? t("toast.createdVisitanteNovo") : t("toast.created"));
      }
      void fetchAllUsersForSelect();
      closePanel();
      fetchList();
      fetchStats();
    } catch (err) {
      showToast(parseApiErrors(err, t("toast.saveError")), true);
    } finally {
      setFormSubmitting(false);
    }
  };

  const closeAttachmentsPanel = useCallback(() => {
    setAttachmentsOpen(false);
    setAttachmentsAcessoId(null);
    setAttachmentsRowLabel("");
    setAttachmentsImagens([]);
  }, []);

  const fetchAttachmentsList = useCallback(
    async (acessoId: number) => {
      if (!organizacaoId) return;
      setAttachmentsLoading(true);
      try {
        const res = await http.get<AcessoImagemListResponse>(`${API_PREFIX}/${organizacaoId}/${acessoId}/imagens`);
        setAttachmentsImagens(Array.isArray(res.data?.data) ? res.data.data : []);
      } catch {
        showToast(t("attachments.loadError"), true);
        setAttachmentsImagens([]);
      } finally {
        setAttachmentsLoading(false);
      }
    },
    [http, organizacaoId, showToast, t],
  );

  const handleDelete = async (id: number) => {
    if (!canDelete) {
      showToast(t("toast.noPermission"), true);
      return;
    }
    if (!organizacaoId) {
      showToast(t("toast.orgRequired"), true);
      return;
    }
    if (!confirm(t("confirm.delete"))) return;
    try {
      await http.delete(`${API_PREFIX}/${organizacaoId}/${id}`);
      showToast(t("toast.deleted"));
      fetchList();
      fetchStats();
      if (detailRow?.id === id) setDetailRow(null);
      if (attachmentsAcessoId === id) closeAttachmentsPanel();
    } catch {
      showToast(t("toast.deleteError"), true);
    }
  };

  const openAttachmentsPanel = (row: AcessoVeiculo) => {
    const label =
      row.condutor?.name?.trim() ||
      row.matricula?.trim() ||
      row.documento_ref?.trim() ||
      (row.condutor_id ? `#${row.condutor_id}` : "—");
    setAttachmentsAcessoId(row.id);
    setAttachmentsRowLabel(label);
    setAttachmentsOpen(true);
    void fetchAttachmentsList(row.id);
  };

  const handleAttachmentsFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    e.target.value = "";
    if (!files?.length || !organizacaoId || !attachmentsAcessoId || !canEdit) return;
    setAttachmentsUploading(true);
    try {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append("imagens[]", f));
      await http.post(`${API_PREFIX}/${organizacaoId}/${attachmentsAcessoId}/imagens`, fd, {
        headers: { "Content-Type": undefined },
      } as never);
      showToast(t("attachments.uploaded"));
      await fetchAttachmentsList(attachmentsAcessoId);
    } catch (err) {
      showToast(parseApiErrors(err, t("attachments.uploadError")), true);
    } finally {
      setAttachmentsUploading(false);
    }
  };

  const handleDeleteAttachmentImage = async (imagemId: number) => {
    if (!organizacaoId || !attachmentsAcessoId || !canEdit) return;
    if (!confirm(t("attachments.deleteConfirm"))) return;
    setAttachmentsDeletingId(imagemId);
    try {
      await http.delete(`${API_PREFIX}/${organizacaoId}/${attachmentsAcessoId}/imagens/${imagemId}`);
      showToast(t("attachments.deleted"));
      await fetchAttachmentsList(attachmentsAcessoId);
    } catch {
      showToast(t("attachments.deleteError"), true);
    } finally {
      setAttachmentsDeletingId(null);
    }
  };

  const statCards = useMemo(
    () => [
      {
        label: t("stats.inside"),
        value: statsLoading ? "…" : statInside,
        icon: Car,
        color: "text-green-600",
        bg: "bg-green-100/60 dark:bg-green-900/20",
        hint: t("stats.insideHint"),
      },
      {
        label: t("stats.entriesToday"),
        value: statsLoading ? "…" : statEntriesToday,
        icon: LogIn,
        color: "text-blue-600",
        bg: "bg-blue-100/60 dark:bg-blue-900/20",
      },
      {
        label: t("stats.exitsRegistered"),
        value: statsLoading ? "…" : statExitsToday,
        icon: LogOut,
        color: "text-slate-600",
        bg: "bg-slate-100/60 dark:bg-slate-800/40",
      },
      {
        label: t("stats.pendingIrregular"),
        value: statsLoading ? "…" : statLateInside,
        icon: Clock,
        color: "text-amber-600",
        bg: "bg-amber-100/60 dark:bg-amber-900/20",
        hint: t("stats.pendingIrregularHint"),
      },
    ],
    [statInside, statEntriesToday, statExitsToday, statLateInside, statsLoading, t],
  );

  const displayDriverName = (row: AcessoVeiculo) =>
    row.condutor?.name ?? row.documento_ref ?? (row.condutor_id ? `#${row.condutor_id}` : "—");

  const detailAprovadoStyle = detailRow ? aprovadoRowStyle(detailRow.aprovado, t) : null;

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
        {canEdit && (
          <button type="button" onClick={openNew} className="ca-btn flex items-center gap-2">
            <Plus size={18} />
            {t("newAccess")}
          </button>
        )}
      </div>

      {!organizacaoId && <div className="ca-card p-4 text-sm ca-muted">{t("toast.orgRequired")}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((item) => (
          <div key={item.label} className="ca-card p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-sm ca-muted">{item.label}</div>
                <div className="text-2xl font-semibold mt-1">{item.value}</div>
                {"hint" in item && item.hint ? (
                  <p className="text-xs ca-muted mt-1 leading-snug">{item.hint}</p>
                ) : null}
              </div>
              <div className={`h-11 w-11 shrink-0 rounded-2xl flex items-center justify-center ${item.bg}`}>
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
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3"
        >
          <input
            className="ca-input"
            placeholder={t("filters.plate")}
            value={filtroMatricula}
            onChange={(e) => setFiltroMatricula(e.target.value)}
          />
          <select
            className="ca-input"
            value={filtroTipoVeiculo}
            onChange={(e) => setFiltroTipoVeiculo(e.target.value)}
          >
            <option value="">{t("filters.vehicleTypeAll")}</option>
            <option value="1">{t("types.light")}</option>
            <option value="2">{t("types.heavy")}</option>
            <option value="3">{t("types.bus")}</option>
          </select>
          <select
            className="ca-input"
            value={filtroTemCarga}
            onChange={(e) => setFiltroTemCarga(e.target.value)}
          >
            <option value="">{t("filters.cargoAll")}</option>
            <option value="1">{t("filters.cargoYes")}</option>
            <option value="0">{t("filters.cargoNo")}</option>
          </select>
          <select
            className="ca-input"
            value={filtroDestinoId}
            onChange={(e) => setFiltroDestinoId(e.target.value)}
            disabled={destLoading || !organizacaoId}
          >
            <option value="">{isCondominio ? t("filters.residence") : t("filters.department")}</option>
            {isCondominio
              ? residencias.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.designacao}
                  </option>
                ))
              : departamentos.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nome}
                  </option>
                ))}
          </select>
          <input
            type="date"
            className="ca-input"
            value={filtroData1}
            onChange={(e) => setFiltroData1(e.target.value)}
          />
          <input
            type="date"
            className="ca-input"
            value={filtroData2}
            onChange={(e) => setFiltroData2(e.target.value)}
          />
          <button type="submit" className="ca-btn md:col-span-2 xl:col-span-6">
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
            <div className="hidden overflow-x-auto desktop-auth:block">
              <table className="w-full text-sm min-w-[1200px]">
                <thead className="bg-slate-50 dark:bg-slate-800/40">
                  <tr>
                    <th className="px-4 py-3 text-left whitespace-nowrap">{t("table.entry")}</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">{t("table.exit")}</th>
                    <th className="px-4 py-3 text-left">{t("table.status")}</th>
                    <th className="px-4 py-3 text-left">{t("table.approval")}</th>
                    <th className="px-4 py-3 text-left">{t("table.vehicle")}</th>
                    <th className="px-4 py-3 text-left">{t("table.plate")}</th>
                    <th className="px-4 py-3 text-left">{t("table.type")}</th>
                    <th className="px-4 py-3 text-left">{t("table.driver")}</th>
                    <th className="px-4 py-3 text-left">{t("table.driverContact")}</th>
                    <th className="px-4 py-3 text-left">{t("table.entity")}</th>
                    <th className="px-4 py-3 text-left">{t("table.destination")}</th>
                    <th className="px-4 py-3 text-left">{t("table.host")}</th>
                    <th className="px-4 py-3 text-left">{t("table.hostContact")}</th>
                    <th className="px-4 py-3 text-right min-w-[17rem] w-[17rem] whitespace-nowrap">{t("table.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y ca-border">
                  {list.length === 0 ? (
                    <tr>
                      <td colSpan={14} className="px-4 py-8 text-center ca-muted">
                        {t("table.empty")}
                      </td>
                    </tr>
                  ) : (
                    list.map((row) => {
                      const st = rowVisualStatus(row, t);
                      const ap = aprovadoRowStyle(row.aprovado, t);
                      const thumb = buildImageUrl(row.imagem);
                      return (
                        <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                          <td className="px-4 py-3 whitespace-nowrap">
                            {row.entrada ? new Date(row.entrada).toLocaleString() : "—"}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {row.saida ? new Date(row.saida).toLocaleString() : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${st.className}`}>
                              {st.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${ap.className}`}>
                              {ap.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="h-10 w-14 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-700">
                              {thumb ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={thumb} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center">
                                  <Car size={18} className="text-slate-400" />
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 font-medium whitespace-nowrap">
                            {row.matricula?.trim() || "—"}
                          </td>
                          <td className="px-4 py-3">{tipoVeiculoLabel(row.tipo_veiculo)}</td>
                          <td className="px-4 py-3 max-w-[140px]">
                            <div className="font-medium truncate">{displayDriverName(row)}</div>
                          </td>
                          <td className="px-4 py-3 align-top">{contactCell(row.condutor)}</td>
                          <td className="px-4 py-3">{tipoLabel(row.condutor)}</td>
                          <td className="px-4 py-3 min-w-[10rem]">{destinoLabel(row)}</td>
                          <td className="px-4 py-3 align-top">{hostCell(row.anfitriao)}</td>
                          <td className="px-4 py-3 align-top">{contactCell(row.anfitriao)}</td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <div className="flex justify-end flex-nowrap gap-1">
                              <button
                                type="button"
                                className="ca-icon-btn"
                                title={t("actions.view")}
                                onClick={() => void openDetail(row.id)}
                              >
                                <Eye size={16} />
                              </button>
                              <button
                                type="button"
                                className="ca-icon-btn"
                                title={t("attachments.open")}
                                onClick={() => openAttachmentsPanel(row)}
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
                                  className="ca-icon-btn text-red-600"
                                  title={t("actions.delete")}
                                  onClick={() => void handleDelete(row.id)}
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
                <div className="py-12 text-center text-sm ca-muted">{t("table.empty")}</div>
              ) : (
                list.map((row) => {
                  const st = rowVisualStatus(row, t);
                  const ap = aprovadoRowStyle(row.aprovado, t);
                  const thumb = buildImageUrl(row.imagem);
                  return (
                    <article
                      key={row.id}
                      className="overflow-hidden rounded-2xl border ca-border bg-[var(--panel)] shadow-md ring-1 ring-black/[0.04] dark:ring-white/[0.06]"
                    >
                      <div className="flex gap-3 border-b ca-border bg-slate-50/90 px-4 py-3 dark:bg-slate-800/50">
                        <div className="flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-200 dark:bg-slate-700">
                          {thumb ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={thumb} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <Car size={22} className="text-slate-400" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-lg font-semibold tracking-tight">
                            {row.matricula?.trim() || "—"}
                          </div>
                          <div className="mt-1.5 flex flex-wrap items-center gap-2">
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${st.className}`}>
                              {st.label}
                            </span>
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ap.className}`}>
                              {ap.label}
                            </span>
                          </div>
                          <div className="mt-1 text-xs ca-muted">{tipoVeiculoLabel(row.tipo_veiculo)}</div>
                        </div>
                      </div>
                      <div className="space-y-3 px-4 py-3 text-sm">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div>
                            <div className="text-xs font-medium ca-muted">{t("table.entry")}</div>
                            <div className="mt-0.5 font-medium">
                              {row.entrada ? new Date(row.entrada).toLocaleString() : "—"}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs font-medium ca-muted">{t("table.exit")}</div>
                            <div className="mt-0.5 font-medium">
                              {row.saida ? new Date(row.saida).toLocaleString() : "—"}
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-3 border-t border-dashed ca-border pt-3 sm:grid-cols-2">
                          <div>
                            <div className="text-xs font-medium ca-muted">{t("table.driver")}</div>
                            <div className="mt-0.5 font-medium">{displayDriverName(row)}</div>
                          </div>
                          <div>
                            <div className="text-xs font-medium ca-muted">{t("table.entity")}</div>
                            <div className="mt-0.5">{tipoLabel(row.condutor)}</div>
                          </div>
                          <div className="sm:col-span-2">
                            <div className="text-xs font-medium ca-muted">{t("table.driverContact")}</div>
                            <div className="mt-0.5">{contactCell(row.condutor)}</div>
                          </div>
                          <div className="sm:col-span-2">
                            <div className="text-xs font-medium ca-muted">{t("table.destination")}</div>
                            <div className="mt-0.5">{destinoLabel(row)}</div>
                          </div>
                          <div>
                            <div className="text-xs font-medium ca-muted">{t("table.host")}</div>
                            <div className="mt-0.5">{hostCell(row.anfitriao)}</div>
                          </div>
                          <div>
                            <div className="text-xs font-medium ca-muted">{t("table.hostContact")}</div>
                            <div className="mt-0.5">{contactCell(row.anfitriao)}</div>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap justify-end gap-1 border-t ca-border bg-slate-50/60 px-3 py-2.5 dark:bg-slate-800/30">
                        <button
                          type="button"
                          className="ca-icon-btn min-h-10 min-w-10"
                          title={t("actions.view")}
                          onClick={() => void openDetail(row.id)}
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          type="button"
                          className="ca-icon-btn min-h-10 min-w-10"
                          title={t("attachments.open")}
                          onClick={() => openAttachmentsPanel(row)}
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
                            className="ca-icon-btn min-h-10 min-w-10 text-red-600"
                            title={t("actions.delete")}
                            onClick={() => void handleDelete(row.id)}
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

            {totalPages > 1 && (
              <div className="px-4 py-3 border-t ca-border flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm ca-muted">
                  {t("pagination.page", { current: currentPage, total: totalPages })} · {total}{" "}
                  {t("pagination.records")}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="ca-icon-btn"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    type="button"
                    className="ca-icon-btn"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {detailRow && (
        <div className="fixed inset-0 z-[95] flex items-end sm:items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Close"
            onClick={() => setDetailRow(null)}
          />
          <div className="relative ca-panel rounded-2xl max-w-lg w-full p-4 shadow-xl max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-start gap-2 mb-3">
              <h3 className="font-semibold">{t("detail.title")}</h3>
              <button type="button" className="ca-icon-btn" onClick={() => setDetailRow(null)}>
                <X size={18} />
              </button>
            </div>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="ca-muted">{t("table.plate")}</dt>
                <dd className="font-medium">{detailRow.matricula?.trim() || "—"}</dd>
              </div>
              <div>
                <dt className="ca-muted">{t("table.type")}</dt>
                <dd>{tipoVeiculoLabel(detailRow.tipo_veiculo)}</dd>
              </div>
              <div>
                <dt className="ca-muted">{t("form.temCarga")}</dt>
                <dd>{detailRow.tem_carga ? t("form.cargoYes") : t("form.cargoNo")}</dd>
              </div>
              <div>
                <dt className="ca-muted">{t("table.driver")}</dt>
                <dd className="font-medium">{displayDriverName(detailRow)}</dd>
              </div>
              <div>
                <dt className="ca-muted">{t("table.driverContact")}</dt>
                <dd>
                  {[detailRow.condutor?.email, detailRow.condutor?.telefone].filter(Boolean).join(" · ") || "—"}
                </dd>
              </div>
              <div>
                <dt className="ca-muted">{t("form.documentType")}</dt>
                <dd>{documentTypeLabel(detailRow)}</dd>
              </div>
              <div>
                <dt className="ca-muted">{t("form.documentRef")}</dt>
                <dd>{detailRow.documento_ref?.trim() || "—"}</dd>
              </div>
              <div>
                <dt className="ca-muted">{t("table.host")}</dt>
                <dd>
                  {detailRow.anfitriao?.name ?? (detailRow.anfitriao_id ? `#${detailRow.anfitriao_id}` : "—")}
                  {detailRow.anfitriao?.telefone ? (
                    <span className="block text-xs ca-muted mt-0.5">{detailRow.anfitriao.telefone}</span>
                  ) : null}
                </dd>
              </div>
              <div>
                <dt className="ca-muted">{t("table.hostContact")}</dt>
                <dd>
                  {[detailRow.anfitriao?.email, detailRow.anfitriao?.telefone].filter(Boolean).join(" · ") || "—"}
                </dd>
              </div>
              <div>
                <dt className="ca-muted">{t("table.destination")}</dt>
                <dd>{destinoLabel(detailRow)}</dd>
              </div>
              <div>
                <dt className="ca-muted">{t("table.entry")}</dt>
                <dd>{detailRow.entrada ? new Date(detailRow.entrada).toLocaleString() : "—"}</dd>
              </div>
              <div>
                <dt className="ca-muted">{t("table.exit")}</dt>
                <dd>{detailRow.saida ? new Date(detailRow.saida).toLocaleString() : "—"}</dd>
              </div>
              {detailAprovadoStyle ? (
                <div>
                  <dt className="ca-muted">{t("table.approval")}</dt>
                  <dd>
                    <span
                      className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${detailAprovadoStyle.className}`}
                    >
                      {detailAprovadoStyle.label}
                    </span>
                  </dd>
                </div>
              ) : null}
              <div>
                <dt className="ca-muted">{t("form.requestReason")}</dt>
                <dd>{motivoLabel(detailRow.motivo)}</dd>
              </div>
              <div>
                <dt className="ca-muted">{t("form.observacoes")}</dt>
                <dd className="whitespace-pre-wrap">{detailRow.observacoes?.trim() || "—"}</dd>
              </div>
            </dl>
          </div>
        </div>
      )}

      {showPanel && (
        <div className="fixed top-0 left-0 right-0 bottom-0 z-[100] flex">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Close"
            onClick={closePanel}
          />
          <div className="absolute right-0 top-0 h-screen w-full max-w-md ca-panel flex flex-col shadow-xl">
            <div className="p-4 border-b ca-border flex justify-between items-center gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <h2 className="font-semibold truncate">{editingId ? t("form.editTitle") : t("form.title")}</h2>
                <button
                  type="button"
                  className="ca-icon-btn shrink-0"
                  title={t("form.refreshUsers")}
                  disabled={usersLoading || anfitrioesLoading}
                  onClick={() => void ensurePanelSelectUsers({ force: true, includeDestinations: true })}
                >
                  {usersLoading || anfitrioesLoading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <RefreshCw size={18} />
                  )}
                </button>
              </div>
              <button type="button" className="ca-icon-btn" onClick={closePanel}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="p-4 space-y-4 flex-1 overflow-y-auto ca-scroll">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("form.entry")}</label>
                  <input
                    type="datetime-local"
                    className="ca-input w-full"
                    value={formEntrada}
                    onChange={(e) => setFormEntrada(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("form.exit")}</label>
                  <input
                    type="datetime-local"
                    className="ca-input w-full"
                    value={formSaida}
                    onChange={(e) => setFormSaida(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("form.aprovado")}</label>
                  <select
                    className="ca-input w-full"
                    value={formAprovado}
                    onChange={(e) => setFormAprovado(e.target.value)}
                  >
                    <option value="0">{t("aprovado.0")}</option>
                    <option value="1">{t("aprovado.1")}</option>
                    <option value="2">{t("aprovado.2")}</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("form.requestReason")}</label>
                  <select
                    className="ca-input w-full"
                    value={formMotivo}
                    onChange={(e) => setFormMotivo(e.target.value)}
                  >
                    <option value="">{t("form.selectRequestReason")}</option>
                    {MOTIVO_ACCESSO_VALUES.map((v) => (
                      <option key={v} value={v}>
                        {t(`motivo.${v}` as "motivo.morador")}
                      </option>
                    ))}
                    {formMotivo.trim() &&
                    !(MOTIVO_ACCESSO_VALUES as readonly string[]).includes(formMotivo.trim()) ? (
                      <option value={formMotivo.trim()}>{formMotivo.trim()}</option>
                    ) : null}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("form.observacoes")}</label>
                  <textarea
                    className="ca-input w-full min-h-[4rem] resize-y"
                    value={formObservacoes}
                    onChange={(e) => setFormObservacoes(e.target.value)}
                    placeholder={t("form.observacoesPlaceholder")}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("form.plate")}</label>
                  <input
                    className="ca-input w-full"
                    value={formMatricula}
                    onChange={(e) => setFormMatricula(e.target.value)}
                    placeholder={t("form.platePlaceholder")}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("form.vehicleType")}</label>
                  <select
                    className="ca-input w-full"
                    value={formTipoVeiculo}
                    onChange={(e) => setFormTipoVeiculo(e.target.value)}
                  >
                    <option value="1">{t("types.light")}</option>
                    <option value="2">{t("types.heavy")}</option>
                    <option value="3">{t("types.bus")}</option>
                  </select>
                </div>

                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded border ca-border"
                    checked={formTemCarga}
                    onChange={(e) => setFormTemCarga(e.target.checked)}
                  />
                  {t("form.temCarga")}
                </label>

                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("form.condutor")}</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className={`flex-1 py-2 rounded-xl text-sm border ${condutorMode === "existing" ? "ca-btn" : "border ca-border"}`}
                      onClick={() => setCondutorMode("existing")}
                    >
                      {t("form.condutorExisting")}
                    </button>
                    <button
                      type="button"
                      className={`flex-1 py-2 rounded-xl text-sm border ${condutorMode === "visitante" ? "ca-btn" : "border ca-border"}`}
                      onClick={() => setCondutorMode("visitante")}
                    >
                      {t("form.condutorVisitante")}
                    </button>
                  </div>
                  {condutorMode === "existing" ? (
                    <select
                      className="ca-input w-full"
                      value={formCondutorId}
                      onChange={(e) => setFormCondutorId(e.target.value)}
                      disabled={usersLoading}
                    >
                      <option value="">{usersLoading ? t("form.loadingUsers") : t("form.selectDriver")}</option>
                      {allUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({tipoLabel(u)})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs ca-muted">{t("form.visitanteApiHint")}</p>
                      <input
                        className="ca-input w-full"
                        value={formVisitanteNome}
                        onChange={(e) => setFormVisitanteNome(e.target.value)}
                        placeholder={t("form.visitanteNome")}
                        required
                      />
                      <input
                        className="ca-input w-full"
                        type="email"
                        value={formVisitanteEmail}
                        onChange={(e) => setFormVisitanteEmail(e.target.value)}
                        placeholder={t("form.email")}
                      />
                      <input
                        className="ca-input w-full"
                        value={formVisitanteTelefone}
                        onChange={(e) => setFormVisitanteTelefone(e.target.value)}
                        placeholder={t("form.phone")}
                      />
                      <label className="text-sm font-medium block">{t("form.visitanteUserType")}</label>
                      <select
                        className="ca-input w-full"
                        value={formVisitanteTipo}
                        onChange={(e) => setFormVisitanteTipo(e.target.value)}
                      >
                        {VISITANTE_TIPO_VALUES.map((n) => (
                          <option key={n} value={n}>
                            {n} — {t(`visitorsTipoSelect.${n}` as "visitorsTipoSelect.1")}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("form.documentType")}</label>
                  <select
                    className="ca-input w-full"
                    value={formDocumentUi}
                    onChange={(e) => setFormDocumentUi(e.target.value as DocumentUiKey)}
                  >
                    {DOCUMENT_UI_KEYS.map((k) => (
                      <option key={k} value={k}>
                        {t(`docTypeUi.${k}` as "docTypeUi.bi")}
                      </option>
                    ))}
                  </select>
                  <label className="text-sm font-medium">{t("form.documentRef")}</label>
                  <input
                    className="ca-input w-full"
                    value={formDocumentoRef}
                    onChange={(e) => setFormDocumentoRef(e.target.value)}
                    placeholder={t("form.documentRefPlaceholder")}
                    required={condutorMode === "visitante"}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("form.destination")}</label>
                  <select
                    className="ca-input w-full"
                    value={formDestinoId}
                    onChange={(e) => setFormDestinoId(e.target.value)}
                    disabled={destLoading}
                    required
                  >
                    <option value="">{destLoading ? t("form.loadingDestinations") : t("form.selectDestination")}</option>
                    {isCondominio
                      ? residencias.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.designacao}
                          </option>
                        ))
                      : departamentos.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.nome}
                          </option>
                        ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("form.host")}</label>
                  <select
                    className="ca-input w-full"
                    value={formAnfitriaoId}
                    onChange={(e) => setFormAnfitriaoId(e.target.value)}
                    disabled={anfitrioesLoading}
                  >
                    <option value="">{anfitrioesLoading ? t("form.loadingHosts") : t("form.selectHost")}</option>
                    {anfitrioes.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-4 border-t ca-border flex justify-end gap-2">
                <button type="button" className="px-4 py-2 rounded-xl border ca-border" onClick={closePanel}>
                  {t("cancel")}
                </button>
                <button type="submit" className="ca-btn" disabled={formSubmitting}>
                  {formSubmitting ? (
                    <Loader2 className="animate-spin" size={18} />
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

      {attachmentsOpen && (
        <div className="fixed inset-0 z-[100] flex">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Close"
            onClick={closeAttachmentsPanel}
          />
          <div className="relative ml-auto h-full w-full max-w-lg ca-panel shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b ca-border gap-2">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold truncate">{t("attachments.title")}</h2>
                <p className="text-xs ca-muted truncate">{attachmentsRowLabel}</p>
              </div>
              <button type="button" className="ca-icon-btn shrink-0" onClick={closeAttachmentsPanel}>
                <X size={20} />
              </button>
            </div>
            <div className="p-4 flex-1 overflow-y-auto ca-scroll">
              {attachmentsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                </div>
              ) : attachmentsImagens.length === 0 ? (
                <p className="text-sm ca-muted py-4">{t("attachments.empty")}</p>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {attachmentsImagens.map((img) => {
                    const src = buildImageUrl(img.imagem);
                    return (
                      <div key={img.id} className="relative rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-700 group">
                        {src ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={src} alt="" className="w-full h-36 object-cover" />
                        ) : null}
                        {canEdit && (
                          <button
                            type="button"
                            className="absolute top-2 right-2 ca-icon-btn bg-white/90 dark:bg-slate-900/90 opacity-0 group-hover:opacity-100 transition-opacity"
                            title={t("attachments.remove")}
                            disabled={attachmentsDeletingId === img.id}
                            onClick={() => void handleDeleteAttachmentImage(img.id)}
                          >
                            {attachmentsDeletingId === img.id ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <Trash2 size={16} />
                            )}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {canEdit && (
              <div className="p-4 border-t ca-border flex flex-col gap-2">
                <input
                  ref={attachmentsFileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleAttachmentsFileChange}
                />
                <button
                  type="button"
                  className="ca-btn flex items-center justify-center gap-2 w-full"
                  disabled={attachmentsUploading}
                  onClick={() => attachmentsFileInputRef.current?.click()}
                >
                  {attachmentsUploading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Upload size={18} />
                  )}
                  {t("attachments.add")}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
