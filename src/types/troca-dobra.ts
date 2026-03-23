import type { Utilizador } from "./utilizador";

export interface TrocaDobraImagemRow {
  id: number;
  troca_dobra_id: number;
  imagem: string;
  organizacao_id: number;
}

/** Registo de troca (tipo 1) ou dobra (tipo 2) — API `troca_dobra`. */
export interface TrocaDobraApi {
  id: number;
  organizacao_id: number;
  entrante: number | Utilizador;
  sainte: number | Utilizador;
  img1: string | null;
  img2: string | null;
  tipo: number;
  data_hora: string;
  imagens?: TrocaDobraImagemRow[];
  created_at?: string;
  updated_at?: string;
}

export interface TrocaDobraListResponse {
  data: TrocaDobraApi[];
  total: number;
  per_page: number;
  current_page: number;
}

export interface TrocaDobraShowResponse {
  data: TrocaDobraApi;
}
