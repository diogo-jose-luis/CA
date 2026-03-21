//app/%5Blocale%5D/%28dashboard%29/dashboard/page.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Loader2,
  ShieldX,
  Truck,
} from "lucide-react";
import MiniBars from "./MiniBars";
import Donut from "./Donut";
import Gauge from "./Gauge";

import { useTranslations } from "next-intl";
import useLocale from "@/hooks/useLocale";
import { useAuth } from "@/hooks/useAuth";
import type { DashboardApiResponse } from "@/types/dashboard-api";
import {
  mapDashboardApiResponse,
  type DashboardViewData,
  type DashboardVehicleCategory,
} from "@/lib/map-dashboard-api";

export type DashboardPeriod = { from: Date; to: Date };

const API_PREFIX = "/controle-acesso";

function formatLocalDateTimeForApi(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
}

function formatSignedPercent(value: number | null): string {
  if (value === null || Number.isNaN(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value}%`;
}

function parseAxiosError(err: unknown, fallback: string): string {
  if (!err || typeof err !== "object" || !("response" in err)) return fallback;
  const r = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })
    .response;
  const msg = r?.data?.message;
  if (typeof msg === "string" && msg.trim()) return msg;
  const errors = r?.data?.errors;
  if (errors && typeof errors === "object") {
    const flat = Object.values(errors).flat().filter(Boolean);
    if (flat.length) return flat.join(" ");
  }
  return fallback;
}

function riskLevelKey(expired: number): "riskLevelLow" | "riskLevelMedium" | "riskLevelHigh" {
  if (expired === 0) return "riskLevelLow";
  if (expired < 30) return "riskLevelMedium";
  return "riskLevelHigh";
}

function vehicleCategoryLabel(
  cat: DashboardVehicleCategory,
  t: (k: string) => string,
): string {
  switch (cat) {
    case "visitantes_prestadores":
      return t("vehicleCatVisitorsProviders");
    case "fornecedores":
      return t("vehicleCatSuppliers");
    case "frota":
      return t("vehicleCatFleet");
  }
}

export default function DashboardCards({
  organizacaoId,
  period,
}: {
  organizacaoId: number | null;
  period: DashboardPeriod;
}) {
  const { http } = useAuth();
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const loadErrorLabel = useRef("");
  loadErrorLabel.current = t("loadError");

  const [data, setData] = useState<DashboardViewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!organizacaoId) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await http.get<DashboardApiResponse>(
          `${API_PREFIX}/${organizacaoId}/dashboard`,
          {
            params: {
              startDate: formatLocalDateTimeForApi(period.from),
              endDate: formatLocalDateTimeForApi(period.to),
            },
          },
        );
        if (!cancelled) {
          setData(mapDashboardApiResponse(res.data));
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(parseAxiosError(err, loadErrorLabel.current));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [organizacaoId, http, period.from.getTime(), period.to.getTime()]);

  const updatedAt = useMemo(() => {
    if (!data?.periodEndIso) return "—";
    try {
      return new Date(data.periodEndIso).toLocaleString(locale, {
        dateStyle: "short",
        timeStyle: "short",
      });
    } catch {
      return data.periodEndIso;
    }
  }, [data?.periodEndIso, locale]);

  const totalDonut = (data?.donut.aValue ?? 0) + (data?.donut.bValue ?? 0);
  const visitorsPct =
    totalDonut > 0 ? Math.round(((data?.donut.aValue ?? 0) / totalDonut) * 100) : 0;
  const collabPct = totalDonut > 0 ? 100 - visitorsPct : 0;

  const vehiclesForBars = useMemo(() => {
    if (!data) return [];
    return data.vehicles.map((v) => ({
      label: vehicleCategoryLabel(v.category, t),
      left: v.count,
      right: 0,
    }));
  }, [data, t]);

  const gaugeCardsValue = data
    ? Math.min(0.95, Math.max(0.05, data.cardsRisk.criticalDeniedPct / 100))
    : 0.15;

  if (!organizacaoId) {
    return <p className="text-sm ca-muted">{t("noOrganization")}</p>;
  }

  if (error && !data) {
    return (
      <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/80 dark:bg-red-950/20 p-4 text-sm text-red-800 dark:text-red-200">
        {error}
      </div>
    );
  }

  const refreshErrorBanner =
    error && data ? (
      <div className="col-span-12 rounded-lg border border-amber-200/80 dark:border-amber-900/50 bg-amber-50/90 dark:bg-amber-950/25 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
        {error}
      </div>
    ) : null;

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 ca-muted">
        <Loader2 className="animate-spin shrink-0" size={22} aria-hidden />
        <span>{t("loading")}</span>
      </div>
    );
  }

  if (!data) return null;

  const trendIcon = (v: number | null) => {
    if (v === null) return null;
    if (v > 0) return <ArrowUpRight size={16} style={{ color: "var(--warning)" }} />;
    if (v < 0) return <ArrowDownRight size={16} style={{ color: "var(--success)" }} />;
    return null;
  };

  return (
    <div className="relative grid grid-cols-12 gap-4 tablet-app:gap-5 tablet-app:[&_.ca-card]:rounded-2xl tablet-app:[&_.ca-card]:p-5 tablet-app:[&_.ca-card]:shadow-md">
      {refreshErrorBanner}
      {loading ? (
        <div className="absolute inset-0 z-10 flex items-start justify-end pt-2 pr-2 pointer-events-none">
          <Loader2 className="animate-spin ca-muted" size={20} aria-label={t("loading")} />
        </div>
      ) : null}

      {/* KPI tiles */}
      <div className="col-span-12 lg:col-span-3 ca-card p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm ca-muted">{t("slaMissing")}</div>
          <AlertTriangle size={18} style={{ color: "var(--warning)" }} />
        </div>
        <div className="text-3xl font-semibold tablet-app:text-4xl mt-2">{data.slaMissing.count}</div>
        <div className="text-sm ca-muted mt-1">
          {formatSignedPercent(data.slaMissing.trend)} {t("vsPreviousPeriod")}
        </div>
      </div>

      <div className="col-span-12 lg:col-span-3 ca-card p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm ca-muted">{t("irregularAttempts")}</div>
          <ShieldX size={18} style={{ color: "var(--danger)" }} />
        </div>
        <div className="text-3xl font-semibold tablet-app:text-4xl mt-2">{data.irregularAttempts.count}</div>
        <div className="text-sm ca-muted mt-1">
          {formatSignedPercent(data.irregularAttempts.trend)} {t("vsPreviousPeriod")}
        </div>
      </div>

      <div className="col-span-12 lg:col-span-3 ca-card p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm ca-muted">{t("deniedAccess")}</div>
          <CheckCircle2 size={18} style={{ color: "var(--success)" }} />
        </div>
        <div className="text-3xl font-semibold tablet-app:text-4xl mt-2">{data.denied.rate}%</div>
        <div className="text-sm ca-muted mt-1">{t("periodIndicator")}</div>
      </div>

      <div className="col-span-12 lg:col-span-3 ca-card p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm ca-muted">{t("avgRelease")}</div>
          <Clock3 size={18} style={{ color: "var(--brand)" }} />
        </div>
        <div className="text-3xl font-semibold tablet-app:text-4xl mt-2">
          {data.avgRelease.time === "—" ? "—" : `${data.avgRelease.time} min`}
        </div>
        <div className="text-sm ca-muted mt-1">
          {data.avgRelease.trend === null
            ? "—"
            : `${formatSignedPercent(data.avgRelease.trend)} ${t("vsPreviousPeriod")}`}
        </div>
      </div>

      {/* Total */}
      <div className="col-span-12 lg:col-span-4 ca-card p-4 flex flex-col">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm ca-muted">{t("totalAccessPeriod")}</div>
            <div className="text-3xl font-semibold tablet-app:text-4xl mt-1">
              {data.totalAccesses.toLocaleString(locale)}
            </div>
          </div>

          <div
            className="h-10 w-10 rounded-2xl flex items-center justify-center"
            style={{
              background: "rgba(135,55,70,0.14)",
              color: "var(--brand)",
            }}
          >
            <CheckCircle2 size={18} />
          </div>
        </div>

        <div className="mt-auto pt-6">
          <MiniBars items={data.bars} />
        </div>
      </div>

      {/* Donut */}
      <div className="col-span-12 lg:col-span-4 ca-card p-4 flex flex-col">
        <div className="text-sm font-medium mb-4">{t("visitorsVsEmployees")}</div>

        <div className="flex items-center justify-between gap-6 mt-auto">
          <Donut a={data.donut.aValue} b={data.donut.bValue} size={210} />

          <div className="min-w-[160px] space-y-4">
            <div className="rounded-2xl border ca-border p-4 ca-panel">
              <div className="text-xs ca-muted">{t("labelVisitors")}</div>
              <div className="text-2xl font-semibold">{visitorsPct}%</div>
              <div className="text-sm ca-muted">
                {data.donut.aValue.toLocaleString(locale)}
              </div>
            </div>

            <div className="rounded-2xl border ca-border p-4 ca-panel">
              <div className="text-xs ca-muted">{t("labelEmployees")}</div>
              <div className="text-2xl font-semibold">{collabPct}%</div>
              <div className="text-sm ca-muted">
                {data.donut.bValue.toLocaleString(locale)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Veículos */}
      <div className="col-span-12 lg:col-span-4 ca-card p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm font-medium">{t("vehicleAccess")}</div>
            <div className="text-sm ca-muted">{t("vehicleByCategory")}</div>
          </div>

          <div
            className="h-10 w-10 rounded-2xl flex items-center justify-center"
            style={{
              background: "rgba(34,197,94,0.14)",
              color: "var(--success)",
            }}
          >
            <Truck size={18} />
          </div>
        </div>

        <div className="mt-auto pt-6 space-y-5">
          {vehiclesForBars.map((v) => {
            const max = Math.max(...vehiclesForBars.map((x) => x.left || 0), 1);
            const pct = Math.round(((v.left || 0) / max) * 100);

            return (
              <div key={v.label}>
                <div className="flex items-center justify-between text-sm mb-2">
                  <div className="font-medium">{v.label}</div>
                  <div className="ca-muted">{(v.left || 0).toLocaleString(locale)}</div>
                </div>

                <div className="h-4 rounded-full bg-slate-200 dark:bg-slate-700">
                  <div
                    className="h-4 rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      background: "rgba(135,55,70,0.75)",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cartões */}
      <div className="col-span-12 lg:col-span-6 ca-card p-4 flex flex-col">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-medium">{t("expiredCards")}</div>
            <div className="text-3xl font-semibold tablet-app:text-4xl mt-1">{data.cardsRisk.expiredOrInactive}</div>
            <div className="text-sm ca-muted">{t(riskLevelKey(data.cardsRisk.expiredOrInactive))}</div>
          </div>

          <div
            className="h-5 w-10 rounded-2xl flex items-center justify-center"
            style={{
              background: "rgba(220,38,38,0.14)",
              color: "var(--danger)",
            }}
          >
            <AlertTriangle size={18} />
          </div>
        </div>

        <div className="mt-4">
          <Gauge value={gaugeCardsValue} label={t("risk")} />
          <div className="mt-3 text-sm ca-muted">
            {t("criticalDeniedRatio")}:{" "}
            <span className="font-medium">{data.cardsRisk.criticalDeniedPct}%</span>
          </div>
        </div>
      </div>

      {/* Negados */}
      <div className="col-span-12 lg:col-span-6 ca-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-medium">{t("deniedAccess")}</div>
            <div className="text-3xl font-semibold tablet-app:text-4xl mt-1">{data.denied.rate}%</div>
            <div className="text-sm ca-muted">
              {data.denied.incidents} {t("criticalIncidents")}
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <span className="inline-flex items-center gap-1 rounded-xl border ca-border px-2 py-1 ca-panel">
              {trendIcon(data.denied.trend)}
              {formatSignedPercent(data.denied.trend)}
            </span>

            <div
              className="h-10 w-10 rounded-2xl flex items-center justify-center"
              style={{
                background: "rgba(245,158,11,0.16)",
                color: "var(--warning)",
              }}
            >
              <ShieldX size={18} />
            </div>
          </div>
        </div>

        <div className="mt-4">
          <Gauge value={Math.min(0.95, data.denied.rate / 10)} label={t("deniedGauge")} />
        </div>
      </div>

      <div className="col-span-12">
        <div className="text-xs ca-muted">
          {t("updatedAt")} {updatedAt}
        </div>
      </div>
    </div>
  );
}
