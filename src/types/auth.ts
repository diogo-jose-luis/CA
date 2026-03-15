// Tipos de sessão e utilizador (substituem next-auth)

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  token: string;
  cargo: string;
  nivel: number;
  imagem: string;
  tipo: number;
  cargo_id: number;
  /** ID da organização do utilizador (quando não tem acesso ao select-org). */
  organizacao_id?: number | null;
}

export interface Session {
  user: AuthUser;
}
