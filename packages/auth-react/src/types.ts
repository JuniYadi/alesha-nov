export interface PublicUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  emailVerifiedAt: string | null;
  createdAt: string;
  roles: string[];
}

export interface AuthSession {
  userId: string;
  email: string;
  roles: string[];
  exp: number;
}

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export interface AuthState {
  status: AuthStatus;
  session: AuthSession | null;
  user: PublicUser | null;
}

export interface AuthContextValue extends AuthState {
  refetch: () => Promise<void>;
}

export interface SignupInput {
  email: string;
  password: string;
  name?: string;
  roles?: string[];
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthApiConfig {
  basePath?: string;
  baseUrl?: string;
}
