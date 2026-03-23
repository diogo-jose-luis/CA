import type { Utilizador } from "@/types/utilizador";

/** 1 pendente, 2 entregue, 3 cancelada */
export type EncomendaEstado = 1 | 2 | 3;

/** Item devolvido pela API com relações carregadas */
export interface EncomendaApi {
  id: number;
  organizacao_id?: number;
  data: string;
  descricao: string;
  estado: EncomendaEstado;
  entregue_a: number | null;
  imagem: string | null;
  remetente?: Utilizador | null;
  destinatario?: Utilizador | null;
  quemEntregou?: Utilizador | null;
  /** Algumas respostas JSON usam snake_case */
  quem_entregou?: Utilizador | null;
}

export interface EncomendaListResponse {
  data: EncomendaApi[];
  total: number;
  per_page: number;
  current_page: number;
}

export interface EncomendaShowResponse {
  data: EncomendaApi;
}
