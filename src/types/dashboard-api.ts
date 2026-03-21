/** Resposta de GET /controle-acesso/{organizacao_id}/dashboard */

export type DashboardApiResponse = {
  meta: {
    periodo: { inicio: string; fim: string };
    periodo_comparacao_tendencias?: {
      inicio: string;
      fim: string;
      nota?: string;
    };
    sla_horas?: number;
    definicoes?: Record<string, string>;
  };
  cards: {
    sem_registro_saida_sla: {
      valor: number;
      tendencia_percentual: number | null;
    };
    tentativas_acesso_irregular: {
      valor: number;
      tendencia_percentual: number | null;
    };
    acessos_negados: {
      percentagem: number;
      total_entradas: number;
      total_negados: number;
      tendencia_percentual: number | null;
    };
    tempo_medio_liberacao: {
      minutos: number | null;
      formato: string | null;
      tendencia_percentual: number | null;
    };
  };
  graficos: {
    total_acessos_periodo: {
      total: number;
      por_dia_semana: { dia: string; iso_dia: number; total: number }[];
    };
    visitantes_colaboradores: {
      total: number;
      visitantes: { quantidade: number; percentagem: number };
      colaboradores: { quantidade: number; percentagem: number };
    };
    acesso_veiculos_por_categoria: {
      visitantes_prestadores: number;
      fornecedores: number;
      frota: number;
    };
  };
  indicadores_risco: {
    cartoes_vencidos_inativos: {
      quantidade: number;
      referencia_data: string;
    };
    acessos_negados_detalhe: {
      percentagem: number;
      ocorrencias_negadas_total: number;
      ocorrencias_criticas: number;
    };
  };
};
