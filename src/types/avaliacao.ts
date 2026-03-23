export interface AvaliacaoApi {
  id: number;
  organizacao_id: number;
  mes: number;
  ano: number;
  qualidade_servico: number;
  profissionalismo: number;
  tempo_resposta: number;
  comunicacao: number;
  avaliacao_geral: number;
  comentario?: string | null;
  data_submissao?: string | null;
  registado_por?: number | null;
  atualizado_por?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface AvaliacaoListResponse {
  data: AvaliacaoApi[];
  total: number;
  per_page: number;
  current_page: number;
}
