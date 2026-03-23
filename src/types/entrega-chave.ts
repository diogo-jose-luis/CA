import type { Utilizador } from "@/types/utilizador";

export interface ResidenciaChaveRef {
  id: number;
  designacao?: string | null;
  nome?: string | null;
}

/** Item devolvido pela API com relações carregadas */
export interface EntregaChaveApi {
  id: number;
  organizacao_id?: number;
  data_entrega: string;
  data_devolucao: string | null;
  chave: string;
  /** FK ou relação aninhada conforme serialização Laravel */
  entregue_por?: number | Utilizador | null;
  entregue_a?: number | Utilizador | null;
  devolvida_a?: number | Utilizador | null;
  residencia_id?: number | null;
  imagem: string | null;
  observacoes?: string | null;
  entreguePor?: Utilizador | null;
  recebedor?: Utilizador | null;
  quemRecebeuDevolucao?: Utilizador | null;
  residencia?: ResidenciaChaveRef | null;
}

export interface EntregaChaveListResponse {
  data: EntregaChaveApi[];
  total: number;
  per_page: number;
  current_page: number;
}

export interface EntregaChaveShowResponse {
  data: EntregaChaveApi;
}
