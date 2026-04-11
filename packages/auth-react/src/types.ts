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

export type OAuthProvider = "google" | "github";

export interface AuthApiConfig {
  basePath?: string;
  baseUrl?: string;
  sessionRefreshBufferSeconds?: number;
}

export interface AuthGuardNavigationAdapter {
  push?: (to: string) => void;
  replace?: (to: string) => void;
}

export interface MagicLinkRequestInput {
  email: string;
  ttlSeconds?: number;
}

export interface MagicLinkVerifyInput {
  token: string;
}

export interface OAuthAccountLinkInput {
  providerAccountId: string;
  providerEmail?: string;
}

export interface OAuthAccountLink {
  id: string;
  userId: string;
  provider: OAuthProvider;
  providerAccountId: string;
  providerEmail: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UseAuthGuardOptions {
  redirectTo?: string;
  navigationAdapter?: AuthGuardNavigationAdapter;
  replace?: boolean;
}

export type OAuthOrMagicProvider = OAuthProvider | "magic-link";

export type AuthRevalidationStatus = "idle" | "scheduled";

export const DEFAULT_SESSION_REFRESH_BUFFER_SECONDS = 30;
