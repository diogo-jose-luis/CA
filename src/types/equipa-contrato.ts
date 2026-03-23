export type EquipaContratoCargo = {
  id?: number;
  nome?: string;
  designacao?: string;
};

export type EquipaContratoApi = {
  id: number;
  cargo_id: number;
  qtd_contrato: number;
  qtd_turno: number;
  regime_trabalho: number;
  organizacao_id?: number;
  cargo?: EquipaContratoCargo | null;
};

export type EquipaContratoListResponse = {
  data: EquipaContratoApi[];
  total: number;
  per_page: number;
  current_page: number;
};
