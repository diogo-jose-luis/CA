import type { Utilizador } from "@/types/utilizador";

export interface AcessoVeiculo {
  id: number;
  organizacao_id: number;
  condutor_id: number | null;
  documento?: number | null;
  documento_tipo: string | null;
  documento_ref: string | null;
  destino: number | null;
  destino_id: number | null;
  anfitriao_id: number | null;
  imagem: string | null;
  entrada: string;
  saida: string | null;
  intervalo_hora_permitido_inicio?: string | null;
  intervalo_hora_permitido_fim?: string | null;
  tem_carga?: boolean | null;
  matricula: string | null;
  tipo_veiculo?: number | null;
  /** 0 = pending, 1 = approved, 2 = rejected (API in:0,1,2) */
  aprovado?: number | null;
  motivo?: string | null;
  observacoes?: string | null;
  /** Quantidade de pessoas (ocupantes) associadas ao acesso. */
  qtd?: number | null;
  created_at?: string;
  updated_at?: string;
  condutor?: Utilizador | null;
  anfitriao?: Utilizador | null;
}

export interface AcessoVeiculoListResponse {
  data: AcessoVeiculo[];
  total: number;
  per_page: number;
  current_page: number;
}
