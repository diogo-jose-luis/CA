/** Registo de imagem associado a um acesso (API `AcessoImagem`). */
export interface AcessoImagem {
  id: number;
  acesso_id: number;
  organizacao_id: number;
  tipo: number;
  imagem: string;
  created_at?: string;
  updated_at?: string;
}

export interface AcessoImagemListResponse {
  data: AcessoImagem[];
  total: number;
}
