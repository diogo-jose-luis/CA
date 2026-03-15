//app/%5Blocale%5D/%28dashboard%29/dashboard/page.tsx
"use client";

import React from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  ShieldX,
  Truck,
} from "lucide-react";
import MiniBars from "./MiniBars";
import Donut from "./Donut";
import Gauge from "./Gauge";

import { useTranslations } from "next-intl";
import useLocale from "@/hooks/useLocale";

const data = {
  totalAccesses: 6732,
  bars: [
    { label: "SEG", value: 100 },
    { label: "TER", value: 320 },
    { label: "QUA", value: 420 },
    { label: "QUI", value: 310 },
    { label: "SEX", value: 500 },
    { label: "SÁB", value: 100 },
    { label: "DOM", value: 880 },
  ],
  donut: {
    aLabel: "Visitantes",
    aValue: 3791,
    bLabel: "Colaboradores",
    bValue: 2941,
  },
  cardsRisk: {
    expiredOrInactive: 125,
    riskLabel: "Risco Alto",
    invalidRate: 1.8,
  },
  denied: { rate: 2.5, incidents: 15, trend: 12 },
  vehicles: [
    { label: "Visitantes & Prestadores", left: 1521, right: 1241 },
    { label: "Fornecedores", left: 1384, right: 764 },
    { label: "Frota", left: 764, right: 0 },
  ],
  slaMissing: { count: 52, trend: 34 },
  irregularAttempts: { count: 97, trend: 15 },
  avgRelease: { time: "2:32", trend: 12 },
  updatedAt: "28/04/2024 16:45",
};

export default function DashboardCards() {
  const total = data.donut.aValue + data.donut.bValue;
  const visitorsPct = Math.round((data.donut.aValue / total) * 100);
  const collabPct = 100 - visitorsPct;

  const t = useTranslations("dashboard");
const locale = useLocale();

  return (
    <div className="grid grid-cols-12 gap-4">
      {/* KPI tiles */}
      <div className="col-span-12 lg:col-span-3 ca-card p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm ca-muted">{t("slaMissing")}</div>
          <AlertTriangle size={18} style={{ color: "var(--warning)" }} />
        </div>
        <div className="text-3xl font-semibold mt-2">
          {data.slaMissing.count}
        </div>
        <div className="text-sm ca-muted mt-1">
          +{data.slaMissing.trend}% vs mês anterior
        </div>
      </div>

      <div className="col-span-12 lg:col-span-3 ca-card p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm ca-muted">{t("irregularAttempts")}</div>
          <ShieldX size={18} style={{ color: "var(--danger)" }} />
        </div>
        <div className="text-3xl font-semibold mt-2">
          {data.irregularAttempts.count}
        </div>
        <div className="text-sm ca-muted mt-1">
          +{data.slaMissing.trend}% {t("vsLastMonth")}
        </div>
      </div>

      <div className="col-span-12 lg:col-span-3 ca-card p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm ca-muted">{t("deniedAccess")}</div>
          <CheckCircle2 size={18} style={{ color: "var(--success)" }} />
        </div>
        <div className="text-3xl font-semibold mt-2">{data.denied.rate}%</div>
        <div className="text-sm ca-muted mt-1">Indicador do período</div>
      </div>

      <div className="col-span-12 lg:col-span-3 ca-card p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm ca-muted">{t("avgRelease")}</div>
          <Clock3 size={18} style={{ color: "var(--brand)" }} />
        </div>
        <div className="text-3xl font-semibold mt-2">
          {data.avgRelease.time} min
        </div>
        <div className="text-sm ca-muted mt-1">
          +{data.avgRelease.trend}% vs mês anterior
        </div>
      </div>

      {/* Total */}
      <div className="col-span-12 lg:col-span-4 ca-card p-4 flex flex-col">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm ca-muted">{t("totalAccessPeriod")}</div>
            <div className="text-3xl font-semibold mt-1">
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

        {/* empurra gráfico para baixo */}
        <div className="mt-auto pt-6">
          <MiniBars items={data.bars} />
        </div>
      </div>

      {/* Donut */}
      <div className="col-span-12 lg:col-span-4 ca-card p-4 flex flex-col">
        <div className="text-sm font-medium mb-4">
         {t("visitorsVsEmployees")}
        </div>

        <div className="flex items-center justify-between gap-6 mt-auto">
          <Donut a={data.donut.aValue} b={data.donut.bValue} size={210} />

          <div className="min-w-[160px] space-y-4">
            <div className="rounded-2xl border ca-border p-4 ca-panel">
              <div className="text-xs ca-muted">{data.donut.aLabel}</div>
              <div className="text-2xl font-semibold">{visitorsPct}%</div>
              <div className="text-sm ca-muted">
                {data.donut.aValue.toLocaleString("pt-PT")}
              </div>
            </div>

            <div className="rounded-2xl border ca-border p-4 ca-panel">
              <div className="text-xs ca-muted">{data.donut.bLabel}</div>
              <div className="text-2xl font-semibold">{collabPct}%</div>
              <div className="text-sm ca-muted">
                {data.donut.bValue.toLocaleString("pt-PT")}
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
          {data.vehicles.map((v) => {
            const max = Math.max(...data.vehicles.map((x) => x.left || 0), 1);
            const pct = Math.round(((v.left || 0) / max) * 100);

            return (
              <div key={v.label}>
                <div className="flex items-center justify-between text-sm mb-2">
                  <div className="font-medium">{v.label}</div>
                  <div className="ca-muted">
                    {(v.left || 0).toLocaleString("pt-PT")}
                  </div>
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
            <div className="text-sm font-medium">
              {t("expiredCards")}
            </div>
            <div className="text-3xl font-semibold mt-1">
              {data.cardsRisk.expiredOrInactive}
            </div>
            <div className="text-sm ca-muted">{data.cardsRisk.riskLabel}</div>
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
          <Gauge value={0.78} label="Risco" />
          <div className="mt-3 text-sm ca-muted">
            {t("cardsWithoutValidity")}:{" "}
            <span className="font-medium">{data.cardsRisk.invalidRate}%</span>
          </div>
        </div>
      </div>

      {/* Negados */}
      <div className="col-span-12 lg:col-span-6 ca-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-medium">Acessos Negados</div>
            <div className="text-3xl font-semibold mt-1">
              {data.denied.rate}%
            </div>
            <div className="text-sm ca-muted">
              {data.denied.incidents} {t("criticalIncidents")}
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <span className="inline-flex items-center gap-1 rounded-xl border ca-border px-2 py-1 ca-panel">
              <ArrowUpRight size={16} style={{ color: "var(--warning)" }} />+
              {data.denied.trend}%
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
          <Gauge value={data.denied.rate / 10} label="Negados" />
        </div>
      </div>

      <div className="col-span-12">
        <div className="text-xs ca-muted">{t("updatedAt")} {data.updatedAt}</div>
      </div>
    </div>
  );
}
