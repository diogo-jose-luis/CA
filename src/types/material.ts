/** Alinhado com o modelo Laravel Material (tabela material). */

export interface MaterialOrganizacaoRef {
  id?: number;
  designacao?: string | null;
}

export interface Material {
  id: number;
  organizacao_id: number;
  designacao: string;
  descricao?: string | null;
  modelo?: string | null;
  marca?: string | null;
  categoria: number;
  fabricante?: string | null;
  estado: number;
  imagem?: string | null;
  unidade?: string | null;
  organizacao?: MaterialOrganizacaoRef | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface MaterialListResponse {
  data: Material[];
  total: number;
  per_page: number;
  current_page: number;
}

export interface MaterialShowResponse {
  data: Material;
}
