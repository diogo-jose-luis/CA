import type { DashboardApiResponse } from "@/types/dashboard-api";

export type DashboardVehicleCategory =
  | "visitantes_prestadores"
  | "fornecedores"
  | "frota";

export type DashboardViewData = {
  slaMissing: { count: number; trend: number | null };
  irregularAttempts: { count: number; trend: number | null };
  denied: {
    rate: number;
    incidents: number;
    trend: number | null;
    totalDenied: number;
  };
  avgRelease: { time: string; trend: number | null };
  totalAccesses: number;
  bars: { label: string; value: number }[];
  donut: { aValue: number; bValue: number };
  vehicles: { category: DashboardVehicleCategory; count: number }[];
  cardsRisk: { expiredOrInactive: number; criticalDeniedPct: number };
  periodEndIso: string;
};

export function mapDashboardApiResponse(res: DashboardApiResponse): DashboardViewData {
  const { cards: c, graficos: g, indicadores_risco: ind } = res;
  const det = ind.acessos_negados_detalhe;
  const veh = g.acesso_veiculos_por_categoria;

  const criticalDeniedPct =
    det.ocorrencias_negadas_total > 0
      ? Math.round(
          (det.ocorrencias_criticas / det.ocorrencias_negadas_total) * 1000,
        ) / 10
      : 0;

  const avgTime =
    c.tempo_medio_liberacao.formato ??
    (c.tempo_medio_liberacao.minutos != null
      ? formatMinutesToMmSs(c.tempo_medio_liberacao.minutos)
      : "—");

  return {
    slaMissing: {
      count: c.sem_registro_saida_sla.valor,
      trend: c.sem_registro_saida_sla.tendencia_percentual,
    },
    irregularAttempts: {
      count: c.tentativas_acesso_irregular.valor,
      trend: c.tentativas_acesso_irregular.tendencia_percentual,
    },
    denied: {
      rate: c.acessos_negados.percentagem,
      incidents: det.ocorrencias_criticas,
      trend: c.acessos_negados.tendencia_percentual,
      totalDenied: det.ocorrencias_negadas_total,
    },
    avgRelease: {
      time: avgTime,
      trend: c.tempo_medio_liberacao.tendencia_percentual,
    },
    totalAccesses: g.total_acessos_periodo.total,
    bars: g.total_acessos_periodo.por_dia_semana.map((row) => ({
      label: row.dia,
      value: row.total,
    })),
    donut: {
      aValue: g.visitantes_colaboradores.visitantes.quantidade,
      bValue: g.visitantes_colaboradores.colaboradores.quantidade,
    },
    vehicles: [
      { category: "visitantes_prestadores", count: veh.visitantes_prestadores },
      { category: "fornecedores", count: veh.fornecedores },
      { category: "frota", count: veh.frota },
    ],
    cardsRisk: {
      expiredOrInactive: ind.cartoes_vencidos_inativos.quantidade,
      criticalDeniedPct,
    },
    periodEndIso: res.meta.periodo.fim,
  };
}

function formatMinutesToMmSs(minutos: number): string {
  const totalSeconds = Math.round(minutos * 60);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
