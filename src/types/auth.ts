export type UserRole = 'researcher' | 'lead_investigator' | 'reviewer';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  institution?: string;
}

export interface AuthSession {
  user: User;
  token: string;
  expiresAt: number;
  authenticatedAt: string;
}

export interface LoginCredentials {
  email: string;
  password?: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password?: string;
  institution?: string;
  role?: UserRole;
}
