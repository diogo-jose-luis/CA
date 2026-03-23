/** Avisos — API `avisos/{organizacao_id}` (AvisoManagementController) */

export type AvisoBroadcast = {
  id?: number;
  aviso_id?: number;
  grupo: number;
  receptor_id: number | null;
  organizacao_id?: number;
};

export type Aviso = {
  id: number;
  titulo: string;
  descricao?: string | null;
  categoria: number;
  prioridade?: number | null;
  data_publicacao?: string | null;
  estado: number;
  imagem?: string | null;
  organizacao_id?: number;
  broadcasts?: AvisoBroadcast[];
};

export type AvisoListResponse = {
  data: Aviso[];
  total: number;
  per_page: number;
  current_page: number;
};

export type AvisoShowResponse = {
  data: Aviso;
};
