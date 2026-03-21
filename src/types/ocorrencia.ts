/** Ocorrências — API `ocorrencias/{organizacao_id}` */

export interface OcorrenciaDepartamento {
  id: number;
  designacao?: string | null;
  nome?: string | null;
}

/** Comprovativo em `ocorrencias/{org}/{id}/imagens` — campo `imagem` = caminho tipo `ocorrencias/ficheiro.jpg` */
export interface OcorrenciaImagem {
  id: number;
  ocorrencia_id: number;
  organizacao_id: number;
  imagem: string;
  created_at?: string;
  updated_at?: string;
}

export interface Ocorrencia {
  id: number;
  organizacao_id: number;
  data: string;
  tipo: number;
  descricao: string;
  estado: number;
  categoria: number;
  nivel: number;
  periodo: number;
  local: number | null;
  observacoes?: string | null;
  /** Ficheiro principal (apenas nome no disco `public/ocorrencias`) */
  imagem?: string | null;
  departamento?: OcorrenciaDepartamento | null;
  imagens?: OcorrenciaImagem[];
  created_at?: string;
  updated_at?: string;
}

export interface OcorrenciaListResponse {
  data: Ocorrencia[];
  total: number;
  per_page: number;
  current_page: number;
}

export interface OcorrenciaShowResponse {
  data: Ocorrencia;
}

export interface OcorrenciaImagensListResponse {
  data: OcorrenciaImagem[];
  total: number;
}
