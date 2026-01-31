"use client";

import React from "react";
import { AlertTriangle, ArrowUpRight, CheckCircle2, Clock3, ShieldX, Truck } from "lucide-react";
import MiniBars from "./MiniBars";
import Donut from "./Donut";
import Gauge from "./Gauge";

const data = {
  totalAccesses: 6732,
  bars: [
    { label: "SEG", value: 210 },
    { label: "TER", value: 320 },
    { label: "QUA", value: 420 },
    { label: "QUI", value: 310 },
    { label: "SEX", value: 500 },
    { label: "SÁB", value: 460 },
    { label: "DOM", value: 520 },
  ],
  donut: { aLabel: "Visitantes", aValue: 3791, bLabel: "Colaboradores", bValue: 2941 },
  cardsRisk: { expiredOrInactive: 125, riskLabel: "Risco Alto", invalidRate: 1.8 },
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

  return (
    <div className="grid grid-cols-12 gap-4">
      {/* Total */}
      <div className="col-span-12 lg:col-span-4 ca-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm ca-muted">Total de Acessos no Período</div>
            <div className="text-3xl font-semibold mt-1">{data.totalAccesses.toLocaleString("pt-PT")}</div>
          </div>
          <div
            className="h-10 w-10 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(135,55,70,0.14)", color: "var(--brand)" }}
          >
            <CheckCircle2 size={18} />
          </div>
        </div>

        <div className="mt-4">
          <MiniBars items={data.bars} />
        </div>
      </div>

      {/* Donut */}
      <div className="col-span-12 lg:col-span-4 ca-card p-4">
        <div className="text-sm font-medium mb-3">Visitantes x Colaboradores</div>

        <div className="flex items-center justify-between gap-4">
          <Donut a={data.donut.aValue} b={data.donut.bValue} size={170} />

          <div className="min-w-[140px] space-y-3">
            <div className="rounded-2xl border ca-border p-3 ca-panel">
              <div className="text-xs ca-muted">{data.donut.aLabel}</div>
              <div className="text-lg font-semibold">{visitorsPct}%</div>
              <div className="text-sm ca-muted">{data.donut.aValue.toLocaleString("pt-PT")}</div>
            </div>

            <div className="rounded-2xl border ca-border p-3 ca-panel">
              <div className="text-xs ca-muted">{data.donut.bLabel}</div>
              <div className="text-lg font-semibold">{collabPct}%</div>
              <div className="text-sm ca-muted">{data.donut.bValue.toLocaleString("pt-PT")}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Cartões */}
      <div className="col-span-12 lg:col-span-4 ca-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-medium">Cartões Vencidos / Inativos</div>
            <div className="text-3xl font-semibold mt-1">{data.cardsRisk.expiredOrInactive}</div>
            <div className="text-sm ca-muted">{data.cardsRisk.riskLabel}</div>
          </div>

          <div
            className="h-10 w-10 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(220,38,38,0.14)", color: "var(--danger)" }}
          >
            <AlertTriangle size={18} />
          </div>
        </div>

        <div className="mt-4">
          <Gauge value={0.78} label="Risco" />
          <div className="mt-3 text-sm ca-muted">
            Cartões sem validade: <span className="font-medium">{data.cardsRisk.invalidRate}%</span>
          </div>
        </div>
      </div>

      {/* Negados */}
      <div className="col-span-12 lg:col-span-6 ca-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-medium">Acessos Negados</div>
            <div className="text-3xl font-semibold mt-1">{data.denied.rate}%</div>
            <div className="text-sm ca-muted">{data.denied.incidents} ocorrências críticas</div>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <span className="inline-flex items-center gap-1 rounded-xl border ca-border px-2 py-1 ca-panel">
              <ArrowUpRight size={16} style={{ color: "var(--warning)" }} />
              +{data.denied.trend}%
            </span>

            <div
              className="h-10 w-10 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(245,158,11,0.16)", color: "var(--warning)" }}
            >
              <ShieldX size={18} />
            </div>
          </div>
        </div>

        <div className="mt-4">
          <Gauge value={data.denied.rate / 10} label="Negados" />
        </div>
      </div>

      {/* Veículos */}
      <div className="col-span-12 lg:col-span-6 ca-card p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm font-medium">Acesso de Veículos</div>
            <div className="text-sm ca-muted">Por categoria no período</div>
          </div>

          <div
            className="h-10 w-10 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(34,197,94,0.14)", color: "var(--success)" }}
          >
            <Truck size={18} />
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {data.vehicles.map((v) => {
            const max = Math.max(...data.vehicles.map((x) => x.left || 0), 1);
            const pct = Math.round(((v.left || 0) / max) * 100);

            return (
              <div key={v.label}>
                <div className="flex items-center justify-between text-sm">
                  <div className="font-medium">{v.label}</div>
                  <div className="ca-muted">
                    {(v.left || 0).toLocaleString("pt-PT")}
                    {v.right ? <span className="ml-2 ca-muted">· {v.right.toLocaleString("pt-PT")}</span> : null}
                  </div>
                </div>

                <div className="mt-2 h-2 rounded-full" style={{ background: "rgba(148,163,184,0.18)" }}>
                  <div
                    className="h-2 rounded-full"
                    style={{ width: `${pct}%`, background: "rgba(135,55,70,0.65)" }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* KPI tiles */}
      <div className="col-span-12 lg:col-span-3 ca-card p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm ca-muted">Sem Registar Saída no SLA</div>
          <AlertTriangle size={18} style={{ color: "var(--warning)" }} />
        </div>
        <div className="text-3xl font-semibold mt-2">{data.slaMissing.count}</div>
        <div className="text-sm ca-muted mt-1">+{data.slaMissing.trend}% vs mês anterior</div>
      </div>

      <div className="col-span-12 lg:col-span-3 ca-card p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm ca-muted">Tentativas de Acesso Irregular</div>
          <ShieldX size={18} style={{ color: "var(--danger)" }} />
        </div>
        <div className="text-3xl font-semibold mt-2">{data.irregularAttempts.count}</div>
        <div className="text-sm ca-muted mt-1">+{data.irregularAttempts.trend}% vs mês anterior</div>
      </div>

      <div className="col-span-12 lg:col-span-3 ca-card p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm ca-muted">Acessos Negados</div>
          <CheckCircle2 size={18} style={{ color: "var(--success)" }} />
        </div>
        <div className="text-3xl font-semibold mt-2">{data.denied.rate}%</div>
        <div className="text-sm ca-muted mt-1">Indicador do período</div>
      </div>

      <div className="col-span-12 lg:col-span-3 ca-card p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm ca-muted">Tempo Médio de Liberação</div>
          <Clock3 size={18} style={{ color: "var(--brand)" }} />
        </div>
        <div className="text-3xl font-semibold mt-2">{data.avgRelease.time} min</div>
        <div className="text-sm ca-muted mt-1">+{data.avgRelease.trend}% vs mês anterior</div>
      </div>

      <div className="col-span-12">
        <div className="text-xs ca-muted">Atualizado em {data.updatedAt}</div>
      </div>
    </div>
  );
}
