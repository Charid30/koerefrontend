export type Role =
  | 'ADMIN'
  | 'RESPONSABLE_PARC'
  | 'RESPONSABLE_MAINTENANCE'
  | 'MECANICIEN'
  | 'CHAUFFEUR'
  | 'DIRECTION';

export interface User {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string | null;
  departement?: string | null;
  role: Role;
  actif: boolean;
  derniereConnexion?: string | null;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}
