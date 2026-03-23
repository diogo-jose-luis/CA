/** Alinhado com Supervisao / SupervisaoImagem / SupervisaoEfetivo / SupervisaoMaterial (API Laravel). */

import type { Material } from "@/types/material";

export interface UserRef {
  id: number;
  name?: string | null;
  email?: string | null;
  cargo?: { id?: number; nome?: string | null } | null;
}

export interface SupervisaoImagem {
  id: number;
  supervisao_id: number;
  organizacao_id: number;
  imagem: string;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface SupervisaoEfetivo {
  id: number;
  supervisao_id: number;
  organizacao_id: number;
  efetivo_id: number | null;
  nome?: string | null;
  cargo?: string | null;
  observacoes?: string | null;
  uniformizacao_adequada?: number | null;
  equipamento_adequado?: number | null;
  estado: number;
  efetivo?: UserRef | null;
}

export interface SupervisaoMaterial {
  id: number;
  supervisao_id: number;
  organizacao_id: number;
  material_id: number;
  unidade?: string | null;
  quantidade?: string | number | null;
  observacoes?: string | null;
  estado: number;
  material?: Material | null;
}

export interface SupervisaoApi {
  id: number;
  organizacao_id: number;
  data_hora: string;
  supervisor_id: number;
  observacoes?: string | null;
  estado: number;
  supervisor?: UserRef | null;
  organizacao?: { id?: number; designacao?: string | null } | null;
  imagens?: SupervisaoImagem[];
  efetivos?: SupervisaoEfetivo[];
  materiais?: SupervisaoMaterial[];
  created_at?: string | null;
  updated_at?: string | null;
}

export interface SupervisaoListResponse {
  data: SupervisaoApi[];
  total: number;
  per_page: number;
  current_page: number;
}

export interface SupervisaoShowResponse {
  data: SupervisaoApi;
}

export interface SupervisaoImagemListResponse {
  data: SupervisaoImagem[];
  total: number;
}

export interface SupervisaoEfetivoListResponse {
  data: SupervisaoEfetivo[];
  total: number;
}

export interface SupervisaoMaterialListResponse {
  data: SupervisaoMaterial[];
  total: number;
}
