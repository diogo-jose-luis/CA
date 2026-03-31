"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Calendar, ClipboardCheck, Loader2, Pencil, Plus, Star, Trash2, TrendingUp, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { AvaliacaoApi, AvaliacaoListResponse } from "@/types/avaliacao";

const API_PREFIX = "/avaliacoes";
const ORG_KEY = "ca.selected.organization";
const NIVEIS_LISTAR = [1, 2, 4] as const;

type FormState = {
  mes: string;
  ano: string;
  qualidade_servico: string;
  profissionalismo: string;
  tempo_resposta: string;
  comunicacao: string;
  avaliacao_geral: string;
  comentario: string;
};

const EMPTY_FORM: FormState = {
  mes: "",
  ano: "",
  qualidade_servico: "5",
  profissionalismo: "5",
  tempo_resposta: "5",
  comunicacao: "5",
  avaliacao_geral: "5",
  comentario: "",
};

function parseApiErrors(err: unknown, fallback: string): string {
  if (err && typeof err == "object" && "response" in err) {
    const data = (err as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } }).response?.data;
    if (data?.errors) return Object.values(data.errors).flat().join(" ");
    if (typeof data?.message == "string") return data.message;
  }
  return fallback;
}

function asId(value: unknown): number | null {
  if (typeof value == "number" && Number.isFinite(value)) return value;
  if (value && typeof value == "object" && "id" in value && typeof (value as { id?: unknown }).id == "number") {
    return (value as { id: number }).id;
  }
  return null;
}

function Stars({ value }: { value: number }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={16} className={n <= value ? "text-yellow-500" : "text-slate-300"} fill={n <= value ? "currentColor" : "none"} />
      ))}
    </div>
  );
}

function StarRatingInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
}) {
  const current = Number(value) || 0;
  return (
    <div>
      <label className="mb-1 block text-xs ca-muted">{label}</label>
      <div className="flex items-center gap-1 rounded-xl border ca-border px-3 py-2">
        {[1, 2, 3, 4, 5].map((n) => {
          const active = n <= current;
          return (
            <button
              key={n}
              type="button"
              className="rounded p-1 transition-transform hover:scale-110"
              onClick={() => onChange(String(n))}
              aria-label={`${label}: ${n}`}
              title={`${n}`}
            >
              <Star
                size={20}
                className={active ? "text-yellow-500" : "text-slate-300 dark:text-slate-600"}
                fill={active ? "currentColor" : "none"}
              />
            </button>
          );
        })}
        <span className="ml-2 text-sm font-medium text-slate-600 dark:text-slate-300">{current || 0}/5</span>
      </div>
    </div>
  );
}

export default function Page() {
  const t = useTranslations("serviceEvaluation");
  const locale = useLocale();
  const { http, user } = useAuth();

  const nivel = user?.nivel ?? 0;
  const canAccess = NIVEIS_LISTAR.includes(nivel as (typeof NIVEIS_LISTAR)[number]);
  const canCreate = nivel === 4;
  const canDeleteAsAdmin = nivel === 1;

  const [organizacaoId, setOrganizacaoId] = useState<number | null>(null);
  const [list, setList] = useState<AvaliacaoApi[]>([]);
  const [total, setTotal] = useState(0);
  const [perPage, setPerPage] = useState(15);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; isError?: boolean } | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [editing, setEditing] = useState<AvaliacaoApi | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const showToast = useCallback((message: string, isError?: boolean) => {
    setToast({ message, isError });
    setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ORG_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { id?: number | string };
      const id = typeof parsed.id == "number" ? parsed.id : Number(parsed.id);
      if (Number.isFinite(id) && id > 0) setOrganizacaoId(id);
    } catch {
      /* noop */
    }
  }, []);

  const load = useCallback(async () => {
    if (!organizacaoId || !canAccess) {
      setList([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await http.get<AvaliacaoListResponse>(`${API_PREFIX}/${organizacaoId}`, {
        params: { per_page: perPage, page: currentPage },
      });
      setList(res.data?.data ?? []);
      setTotal(res.data?.total ?? 0);
      setPerPage(res.data?.per_page ?? perPage);
      setCurrentPage(res.data?.current_page ?? currentPage);
    } catch (err) {
      showToast(parseApiErrors(err, t("toast.loadError")), true);
    } finally {
      setLoading(false);
    }
  }, [organizacaoId, canAccess, http, perPage, currentPage, showToast, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const average = useMemo(() => {
    if (!list.length) return "0.0";
    const sum = list.reduce((acc, row) => acc + Number(row.avaliacao_geral || 0), 0);
    return (sum / list.length).toFixed(1);
  }, [list]);

  const thisYearCount = useMemo(() => {
    const y = new Date().getFullYear();
    return list.filter((r) => Number(r.ano) === y).length;
  }, [list]);

  const lastEvaluation = useMemo(() => {
    if (!list.length) return "—";
    const sorted = [...list].sort((a, b) => (b.ano - a.ano) || (b.mes - a.mes) || (b.id - a.id));
    const row = sorted[0];
    return `${t(`months.${row.mes}`)} ${row.ano}`;
  }, [list, t]);

  const stats = useMemo(
    () => [
      { label: "total", value: total, icon: ClipboardCheck, color: "text-blue-600", bg: "bg-blue-100/60 dark:bg-blue-900/20" },
      { label: "average", value: average, icon: Star, color: "text-yellow-500", bg: "bg-yellow-100/60 dark:bg-yellow-900/20" },
      { label: "year", value: thisYearCount, icon: Calendar, color: "text-green-600", bg: "bg-green-100/60 dark:bg-green-900/20" },
      { label: "last", value: lastEvaluation, icon: TrendingUp, color: "text-purple-600", bg: "bg-purple-100/60 dark:bg-purple-900/20" },
    ],
    [total, average, thisYearCount, lastEvaluation]
  );

  function resetForm() {
    setEditing(null);
    setForm(EMPTY_FORM);
  }

  function openCreate() {
    resetForm();
    setShowForm(true);
  }

  function openEdit(row: AvaliacaoApi) {
    setEditing(row);
    setForm({
      mes: String(row.mes),
      ano: String(row.ano),
      qualidade_servico: String(row.qualidade_servico),
      profissionalismo: String(row.profissionalismo),
      tempo_resposta: String(row.tempo_resposta),
      comunicacao: String(row.comunicacao),
      avaliacao_geral: String(row.avaliacao_geral),
      comentario: row.comentario || "",
    });
    setShowForm(true);
  }

  function canManageRow(row: AvaliacaoApi): boolean {
    const selfId = user?.id ?? 0;
    const ownerId = asId(row.registado_por);
    return ownerId != null && ownerId === selfId;
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!organizacaoId) return;

    setFormSubmitting(true);
    try {
      const payload = {
        mes: Number(form.mes),
        ano: Number(form.ano),
        qualidade_servico: Number(form.qualidade_servico),
        profissionalismo: Number(form.profissionalismo),
        tempo_resposta: Number(form.tempo_resposta),
        comunicacao: Number(form.comunicacao),
        avaliacao_geral: Number(form.avaliacao_geral),
        comentario: form.comentario.trim() || null,
      };

      if (editing) {
        await http.put(`${API_PREFIX}/${organizacaoId}/${editing.id}`, payload);
        showToast(t("toast.updated"));
      } else {
        await http.post(`${API_PREFIX}/${organizacaoId}`, payload);
        showToast(t("toast.created"));
      }
      setShowForm(false);
      resetForm();
      void load();
    } catch (err) {
      showToast(parseApiErrors(err, t("toast.saveError")), true);
    } finally {
      setFormSubmitting(false);
    }
  }

  async function onDelete(row: AvaliacaoApi) {
    if (!organizacaoId) return;
    if (!window.confirm(t("confirm.deleteOne"))) return;
    try {
      await http.delete(`${API_PREFIX}/${organizacaoId}/${row.id}`);
      showToast(t("toast.deleted"));
      void load();
    } catch (err) {
      showToast(parseApiErrors(err, t("toast.deleteError")), true);
    }
  }

  if (!canAccess) {
    return <div className="p-6 text-sm ca-muted">{t("accessDenied")}</div>;
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold">{t("title")}</h1>
          <p className="text-sm ca-muted">{t("subtitle")}</p>
        </div>
        {canCreate ? (
          <button onClick={openCreate} className="ca-btn flex items-center gap-2">
            <Plus size={18} />
            {t("newEvaluation")}
          </button>
        ) : null}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((item) => (
          <div key={item.label} className="ca-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm ca-muted">{t(`stats.${item.label}`)}</div>
                <div className="text-2xl font-semibold mt-1">{item.value}</div>
              </div>
              <div className={`h-11 w-11 rounded-2xl flex items-center justify-center ${item.bg}`}>
                <item.icon className={item.color} size={20} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="ca-card overflow-x-auto">
        <table className="w-full text-sm min-w-[980px]">
          <thead className="bg-slate-50 dark:bg-slate-800/40">
            <tr>
              <th className="py-3">{t("table.month")}</th>
              <th className="py-3">{t("table.year")}</th>
              <th className="py-3">{t("table.quality")}</th>
              <th className="py-3">{t("table.professionalism")}</th>
              <th className="py-3">{t("table.response")}</th>
              <th className="py-3">{t("table.communication")}</th>
              <th className="py-3">{t("table.general")}</th>
              <th className="py-3">{t("table.comments")}</th>
              <th className="py-3">{t("table.date")}</th>
              <th className="py-3">{t("table.actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y ca-border">
            {loading ? (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center">
                  <Loader2 className="mx-auto animate-spin" size={20} />
                </td>
              </tr>
            ) : list.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-10 text-center ca-muted">
                  {t("empty")}
                </td>
              </tr>
            ) : (
              list.map((row) => {
                const canManage = canManageRow(row);
                const canDelete = canDeleteAsAdmin || canManage;
                return (
                  <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-3">{t(`months.${row.mes}`)}</td>
                    <td className="px-4 py-3">{row.ano}</td>
                    <td className="px-4 py-3"><Stars value={row.qualidade_servico} /></td>
                    <td className="px-4 py-3"><Stars value={row.profissionalismo} /></td>
                    <td className="px-4 py-3"><Stars value={row.tempo_resposta} /></td>
                    <td className="px-4 py-3"><Stars value={row.comunicacao} /></td>
                    <td className="px-4 py-3 font-medium">{row.avaliacao_geral}</td>
                    <td className="px-4 py-3 max-w-xs">
                      <span className="block truncate" title={row.comentario || "—"}>
                        {row.comentario
                          ? row.comentario.length > 90
                            ? `${row.comentario.slice(0, 90)}...`
                            : row.comentario
                          : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {row.data_submissao ? new Date(row.data_submissao).toLocaleDateString(locale) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {canManage ? (
                          <button type="button" className="ca-icon-btn" onClick={() => openEdit(row)} title={t("actions.edit")}>
                            <Pencil size={16} />
                          </button>
                        ) : null}
                        {canDelete ? (
                          <button type="button" className="ca-icon-btn" onClick={() => onDelete(row)} title={t("actions.delete")}>
                            <Trash2 size={16} />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm ca-muted">{t("pagination.total", { total })}</div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="px-3 py-2 rounded-xl border ca-border text-sm disabled:opacity-50"
            disabled={currentPage <= 1 || loading}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          >
            {t("pagination.prev")}
          </button>
          <span className="text-sm ca-muted">{t("pagination.page", { page: currentPage })}</span>
          <button
            type="button"
            className="px-3 py-2 rounded-xl border ca-border text-sm disabled:opacity-50"
            disabled={loading || currentPage * perPage >= total}
            onClick={() => setCurrentPage((p) => p + 1)}
          >
            {t("pagination.next")}
          </button>
        </div>
      </div>

      {showForm ? (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => (!formSubmitting ? setShowForm(false) : null)} />
          <div className="relative ml-auto h-full w-full max-w-md ca-panel shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b ca-border">
              <h2 className="text-lg font-semibold">{editing ? t("form.editTitle") : t("form.title")}</h2>
              <button type="button" onClick={() => (!formSubmitting ? setShowForm(false) : null)}><X size={20} /></button>
            </div>
            <form className="p-4 space-y-4 overflow-y-auto flex-1 ca-scroll" onSubmit={onSubmit}>
              <div>
                <label className="mb-1 block text-xs ca-muted">{t("form.month")}</label>
                <select className="ca-input" value={form.mes} required onChange={(e) => setForm((s) => ({ ...s, mes: e.target.value }))}>
                  <option value="">{t("form.selectMonth")}</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                    <option key={m} value={m}>{t(`months.${m}`)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs ca-muted">{t("form.year")}</label>
                <input type="number" min={2000} max={2100} className="ca-input" placeholder={t("form.year")} value={form.ano}
                  onChange={(e) => setForm((s) => ({ ...s, ano: e.target.value }))} required />
              </div>
              <StarRatingInput
                label={t("form.quality")}
                value={form.qualidade_servico}
                onChange={(next) => setForm((s) => ({ ...s, qualidade_servico: next }))}
              />
              <StarRatingInput
                label={t("form.professionalism")}
                value={form.profissionalismo}
                onChange={(next) => setForm((s) => ({ ...s, profissionalismo: next }))}
              />
              <StarRatingInput
                label={t("form.response")}
                value={form.tempo_resposta}
                onChange={(next) => setForm((s) => ({ ...s, tempo_resposta: next }))}
              />
              <StarRatingInput
                label={t("form.communication")}
                value={form.comunicacao}
                onChange={(next) => setForm((s) => ({ ...s, comunicacao: next }))}
              />
              <StarRatingInput
                label={t("form.general")}
                value={form.avaliacao_geral}
                onChange={(next) => setForm((s) => ({ ...s, avaliacao_geral: next }))}
              />
              <div>
                <label className="mb-1 block text-xs ca-muted">{t("form.comments")}</label>
                <textarea className="ca-input min-h-[140px]" rows={6} placeholder={t("form.comments")} value={form.comentario}
                  onChange={(e) => setForm((s) => ({ ...s, comentario: e.target.value }))} />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" className="px-4 py-2 rounded-xl border ca-border" onClick={() => setShowForm(false)}>
                  {t("cancel")}
                </button>
                <button type="submit" className="ca-btn disabled:opacity-60" disabled={formSubmitting}>
                  {formSubmitting ? <Loader2 size={16} className="animate-spin" /> : null}
                  {editing ? t("form.update") : t("form.submit")}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className={`fixed bottom-4 right-4 rounded-xl px-4 py-3 text-sm shadow-xl ${toast.isError ? "bg-red-600 text-white" : "bg-emerald-600 text-white"}`}>
          {toast.message}
        </div>
      ) : null}
    </div>
  );
}