import type { Utilizador } from "@/types/utilizador";

export interface AcessoPessoa {
  id: number;
  organizacao_id: number;
  user_id: number | null;
  /** Tipo de documento (1–3) quando exposto pelo modelo / utilizador. */
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
  aprovado?: number | null;
  motivo?: string | null;
  observacoes?: string | null;
  /** Quantidade de pessoas associadas ao acesso. */
  qtd?: number | null;
  created_at?: string;
  updated_at?: string;
  user?: Utilizador | null;
  anfitriao?: Utilizador | null;
}

export interface AcessoPessoaListResponse {
  data: AcessoPessoa[];
  total: number;
  per_page: number;
  current_page: number;
}
