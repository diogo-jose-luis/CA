import type { Material } from "./material";

export type MaterialContratoApi = {
  id: number;
  material_id: number;
  qtd_contrato: number;
  qtd_turno: number;
  regime_trabalho: number;
  organizacao_id?: number;
  material?: Pick<Material, "id" | "designacao" | "modelo" | "marca" | "imagem" | "unidade"> | null;
};

export type MaterialContratoListResponse = {
  data: MaterialContratoApi[];
  total: number;
  per_page: number;
  current_page: number;
};

export type MaterialContratoShowResponse = {
  data: MaterialContratoApi;
};
