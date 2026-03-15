// Alinhado com o modelo Laravel Organizacao (tabela organizacaos)

export interface Organizacao {
  id: number;
  designacao: string;
  tipo: number | null; // 1 - Empresa, 2 - Condomínio, 3 - outro
  descricao: string | null;
  imagem: string | null; // path em storage, ex: organizacoes/org_xxx.jpg
  estado: number; // 1 - Ativo, 0 - Inativo
  imagem_url: string | null; // URL público (append do modelo Laravel)
  created_at?: string;
  updated_at?: string;
}

export type OrganizacaoEstadoFilter = "all" | 0 | 1;

export interface OrganizacaoFormData {
  designacao: string;
  tipo: number | "";
  descricao: string;
  estado: number;
  imagem?: File | null;
}
