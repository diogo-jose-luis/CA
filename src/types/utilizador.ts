// Utilizadores da API (user management - tipo 1 = utilizadores)

export interface Utilizador {
  id: number;
  tipo: number;
  name: string;
  email: string;
  telefone: string | null;
  imagem: string | null;
  estado: number;
  nivel: number | null;
  genero: number | null;
  site: string | null;
  documento: number | null;
  documento_ref: string | null;
  organizacao_id: number | null;
  empresa_id: number | null;
  cargo_id: number | null;
  departamento_id: number | null;
  created_at?: string;
  updated_at?: string;
  cargo?: { id: number; nome?: string };
  departamento?: { id: number; nome?: string };
  empresa?: { id: number; designacao?: string };
  organizacao?: { id: number; designacao?: string };
}

/** API index response */
export interface UtilizadorListResponse {
  data: Utilizador[];
  total: number;
  per_page: number;
  current_page: number;
}

/** API stats response for tipo 1 (utilizadores) */
export interface UtilizadorStatsResponse {
  data: {
    total: number;
    por_nivel?: Record<number, number>;
    ativos: number;
    inativos: number;
  };
}

/** Nível 1=admin, 2=gestor, 3=operador, 4=cliente, 5=supervisor, 6=anfitrião */
export const NIVEL_LABEL: Record<number, string> = {
  1: "admin",
  2: "gestor",
  3: "operador",
  4: "cliente",
  5: "supervisor",
  6: "anfitriao",
};
