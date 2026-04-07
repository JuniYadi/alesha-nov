export interface SignupInput {
  email: string;
  password: string;
  name?: string;
  image?: string;
  roles?: string[];
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface MagicLinkInput {
  email: string;
  ttlSeconds?: number;
}

export interface PasswordResetInput {
  email: string;
  ttlSeconds?: number;
}

export interface ResetPasswordInput {
  token: string;
  newPassword: string;
}

export type OAuthProvider = "google" | "github";

export interface OAuthLoginInput {
  provider: OAuthProvider;
  providerAccountId: string;
  email: string;
  name?: string;
  image?: string;
  emailVerified?: boolean;
  roles?: string[];
}

export interface LinkOAuthAccountInput {
  userId: string;
  provider: OAuthProvider;
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

export interface AuthUser {
  id: string;
  email: string;
  passwordHash: string;
  name: string | null;
  image: string | null;
  emailVerifiedAt: string | null;
  roles: string[];
  createdAt: string;
}

export interface AuthService {
  signup(input: SignupInput): Promise<AuthUser>;
  login(input: LoginInput): Promise<AuthUser | null>;
  issueMagicLinkToken(input: MagicLinkInput): Promise<string>;
  verifyMagicLinkToken(token: string): Promise<AuthUser | null>;
  issuePasswordResetToken(input: PasswordResetInput): Promise<string>;
  resetPassword(input: ResetPasswordInput): Promise<boolean>;
  setUserRoles(userId: string, roles: string[]): Promise<string[]>;
  getUserRoles(userId: string): Promise<string[]>;
  loginWithOAuth(input: OAuthLoginInput): Promise<AuthUser>;
  linkOAuthAccount(input: LinkOAuthAccountInput): Promise<OAuthAccountLink>;
  getLinkedAccounts(userId: string): Promise<OAuthAccountLink[]>;
}

export type UserRow = {
  id: string;
  email: string;
  password_hash: string;
  name: string | null;
  image: string | null;
  email_verified_at: string | null;
  created_at: string;
};
