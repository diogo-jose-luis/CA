"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FileText,
  Users,
  Car,
  AlertTriangle,
  Bell,
  ClipboardList,
  Sparkles,
  FileCheck2,
  Loader2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/hooks/useAuth";

type ExportingState = { key: string; mode: "sample" | "real" } | null;

type PeriodReportDef = {
  key: string;
  apiPath: string;
  titleKey: string;
  moduleKey: string;
  icon: typeof Users;
};

const PERIOD_REPORTS: PeriodReportDef[] = [
  {
    key: "acesso-pessoas",
    apiPath: "acesso-pessoas",
    titleKey: "periodReports.peopleAccess.title",
    moduleKey: "periodReports.peopleAccess.module",
    icon: Users,
  },
  {
    key: "acesso-veiculos",
    apiPath: "acesso-veiculos",
    titleKey: "periodReports.vehicleAccess.title",
    moduleKey: "periodReports.vehicleAccess.module",
    icon: Car,
  },
  {
    key: "ocorrencias",
    apiPath: "ocorrencias",
    titleKey: "periodReports.occurrences.title",
    moduleKey: "periodReports.occurrences.module",
    icon: AlertTriangle,
  },
  {
    key: "avisos",
    apiPath: "avisos",
    titleKey: "periodReports.notices.title",
    moduleKey: "periodReports.notices.module",
    icon: Bell,
  },
  {
    key: "supervisoes",
    apiPath: "supervisoes",
    titleKey: "periodReports.supervisions.title",
    moduleKey: "periodReports.supervisions.module",
    icon: ClipboardList,
  },
];

function isExporting(exporting: ExportingState, key: string, mode: "sample" | "real") {
  return exporting?.key === key && exporting?.mode === mode;
}

async function parseBlobErrorMessage(blob: Blob): Promise<string | null> {
  try {
    const text = await blob.text();
    const parsed = JSON.parse(text) as { errors?: Record<string, string[]>; message?: string };
    if (parsed.errors) {
      return Object.values(parsed.errors)
        .flat()
        .join(" ");
    }
    if (typeof parsed.message === "string") return parsed.message;
  } catch {
    /* not JSON */
  }
  return null;
}

export default function Page() {
  const t = useTranslations("reports");
  const { http } = useAuth();

  const [organizacaoId, setOrganizacaoId] = useState<number | null>(null);
  const [mes, setMes] = useState(String(new Date().getMonth() + 1));
  const [ano, setAno] = useState(String(new Date().getFullYear()));
  const [exporting, setExporting] = useState<ExportingState>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("ca.selected.organization");
      if (!raw) return;
      const parsed = JSON.parse(raw) as { id?: number | string };
      const id = typeof parsed.id == "number" ? parsed.id : Number(parsed.id);
      if (Number.isFinite(id) && id > 0) setOrganizacaoId(id);
    } catch {
      /* noop */
    }
  }, []);

  const mesAnoValido = useMemo(() => {
    const m = Number(mes);
    const a = Number(ano);
    return {
      ok: Number.isInteger(m) && m >= 1 && m <= 12 && Number.isInteger(a) && a >= 2000 && a <= 2100,
      mes: m,
      ano: a,
    };
  }, [mes, ano]);

  function validateBeforeExport(): { mes: number; ano: number } | null {
    if (!organizacaoId) {
      window.alert(t("errors.noOrganization"));
      return null;
    }
    if (!mesAnoValido.ok) {
      window.alert(t("errors.invalidPeriod"));
      return null;
    }
    return { mes: mesAnoValido.mes, ano: mesAnoValido.ano };
  }

  async function downloadPdf(
    exportKey: string,
    modo: "sample" | "real",
    urlPath: string,
    suggestedName: string
  ) {
    const period = validateBeforeExport();
    if (!period || !organizacaoId) return;

    setExporting({ key: exportKey, mode: modo });
    try {
      const res = await http.get(`/relatorios/${organizacaoId}/${urlPath}`, {
        params: { mes: period.mes, ano: period.ano, modo },
        responseType: "blob",
      });

      const ctype = (res.headers["content-type"] || "").toString().toLowerCase();
      if (ctype.includes("application/json") || ctype.includes("text/")) {
        const msg = await parseBlobErrorMessage(res.data as Blob);
        window.alert(msg || t("errors.exportFailed"));
        return;
      }

      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = suggestedName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      const data = (err as { response?: { data?: unknown } })?.response?.data;
      if (data instanceof Blob) {
        const msg = await parseBlobErrorMessage(data);
        window.alert(msg || t("errors.exportFailed"));
      } else {
        window.alert(t("errors.exportFailed"));
      }
    } finally {
      setExporting(null);
    }
  }

  const period = mesAnoValido.ok ? { mes: mesAnoValido.mes, ano: mesAnoValido.ano } : null;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-semibold">{t("title")}</h1>
        <p className="text-sm ca-muted mt-1">{t("subtitle")}</p>
      </div>

      <div className="ca-card p-4">
        <div className="font-medium mb-1">{t("period.title")}</div>
        <p className="text-xs ca-muted mb-3">{t("period.hint")}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md">
          <select className="ca-input" value={mes} onChange={(e) => setMes(e.target.value)}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {t(`generalReport.months.${m}`)}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={2000}
            max={2100}
            className="ca-input"
            value={ano}
            onChange={(e) => setAno(e.target.value)}
            placeholder={t("generalReport.year")}
          />
        </div>
      </div>

      <div className="ca-card">
        <div className="p-4 border-b ca-border font-medium">{t("sections.general")}</div>

        <div className="p-4 border-b ca-border bg-slate-50/60 dark:bg-slate-800/20">
          <div className="flex flex-col md:flex-row md:items-end gap-3">
            <div className="flex-1 flex gap-3">
              <div className="h-11 w-11 rounded-2xl flex items-center justify-center bg-blue-100/60 dark:bg-blue-900/20 shrink-0">
                <FileText className="text-blue-600" size={22} />
              </div>
              <div>
                <div className="font-medium">{t("generalReport.title")}</div>
                <div className="text-xs ca-muted">{t("generalReport.subtitle")}</div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="ca-icon-btn h-11 w-11 shrink-0 disabled:opacity-50"
                title={t("generalReport.exportSampleTitle")}
                aria-label={t("generalReport.exportSampleTitle")}
                onClick={() =>
                  downloadPdf(
                    "mensal",
                    "sample",
                    "mensal/pdf",
                    period
                      ? `relatorio_mensal_sample_${organizacaoId}_${period.ano}_${String(period.mes).padStart(2, "0")}.pdf`
                      : "relatorio_mensal_sample.pdf"
                  )
                }
                disabled={exporting !== null}
              >
                {isExporting(exporting, "mensal", "sample") ? (
                  <Loader2 size={20} className="animate-spin ca-muted" aria-hidden />
                ) : (
                  <Sparkles size={20} className="text-amber-600 dark:text-amber-400" aria-hidden />
                )}
              </button>
              <button
                type="button"
                className="ca-icon-btn h-11 w-11 shrink-0 disabled:opacity-50"
                title={t("generalReport.exportRealTitle")}
                aria-label={t("generalReport.exportRealTitle")}
                onClick={() =>
                  downloadPdf(
                    "mensal",
                    "real",
                    "mensal/pdf",
                    period
                      ? `relatorio_mensal_real_${organizacaoId}_${period.ano}_${String(period.mes).padStart(2, "0")}.pdf`
                      : "relatorio_mensal_real.pdf"
                  )
                }
                disabled={exporting !== null}
              >
                {isExporting(exporting, "mensal", "real") ? (
                  <Loader2 size={20} className="animate-spin ca-muted" aria-hidden />
                ) : (
                  <FileCheck2 size={20} className="text-emerald-600 dark:text-emerald-400" aria-hidden />
                )}
              </button>
              <span className="text-xs ca-muted w-full sm:w-auto sm:max-w-[16rem]">
                {isExporting(exporting, "mensal", "sample")
                  ? t("generalReport.exportingSample")
                  : isExporting(exporting, "mensal", "real")
                    ? t("generalReport.exportingReal")
                    : t("generalReport.exportHint")}
              </span>
            </div>
          </div>
        </div>

        <div className="p-4 border-b ca-border font-medium">{t("sections.byModule")}</div>

        <div className="divide-y ca-border">
          {PERIOD_REPORTS.map((rep) => {
            const Icon = rep.icon;
            const fileBase = rep.key.replace(/-/g, "_");
            return (
              <div
                key={rep.key}
                className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
              >
                <div className="flex gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-slate-800 shrink-0">
                    <Icon size={20} className="ca-muted" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium">{t(rep.titleKey)}</div>
                    <div className="text-xs ca-muted">
                      {t("module")}: {t(rep.moduleKey)}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    className="ca-icon-btn h-11 w-11 disabled:opacity-50"
                    title={t("actions.exportSamplePdf")}
                    aria-label={t("actions.exportSamplePdf")}
                    onClick={() =>
                      downloadPdf(
                        rep.key,
                        "sample",
                        `${rep.apiPath}/pdf`,
                        period
                          ? `${fileBase}_sample_${organizacaoId}_${period.ano}_${String(period.mes).padStart(2, "0")}.pdf`
                          : `${fileBase}_sample.pdf`
                      )
                    }
                    disabled={exporting !== null}
                  >
                    {isExporting(exporting, rep.key, "sample") ? (
                      <Loader2 size={20} className="animate-spin ca-muted" aria-hidden />
                    ) : (
                      <Sparkles size={20} className="text-amber-600 dark:text-amber-400" aria-hidden />
                    )}
                  </button>
                  <button
                    type="button"
                    className="ca-icon-btn h-11 w-11 disabled:opacity-50"
                    title={t("actions.exportRealPdf")}
                    aria-label={t("actions.exportRealPdf")}
                    onClick={() =>
                      downloadPdf(
                        rep.key,
                        "real",
                        `${rep.apiPath}/pdf`,
                        period
                          ? `${fileBase}_real_${organizacaoId}_${period.ano}_${String(period.mes).padStart(2, "0")}.pdf`
                          : `${fileBase}_real.pdf`
                      )
                    }
                    disabled={exporting !== null}
                  >
                    {isExporting(exporting, rep.key, "real") ? (
                      <Loader2 size={20} className="animate-spin ca-muted" aria-hidden />
                    ) : (
                      <FileCheck2 size={20} className="text-emerald-600 dark:text-emerald-400" aria-hidden />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
