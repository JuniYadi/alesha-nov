import type { EmailProvider } from "@alesha-nov/email";

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

export interface OAuthAuthorizeInput {
  provider: OAuthProvider;
  clientId: string;
  redirectUri: string;
  scope: string[];
  state?: string;
}

export interface OAuthAuthorizeRequest {
  provider: OAuthProvider;
  authorizationUrl: string;
  state: string;
  codeVerifier: string;
  codeChallenge: string;
  codeChallengeMethod: "S256";
}

export interface OAuthCallbackInput {
  provider: OAuthProvider;
  code?: string;
  state?: string;
  error?: string;
}

export interface OAuthCallbackValidationInput {
  callback: OAuthCallbackInput;
  expectedState: string;
  codeVerifier: string;
}

export interface OAuthCallbackValidationResult {
  valid: boolean;
  reason?: string;
}

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

export interface EmailVerificationInput {
  email: string;
  ttlSeconds?: number;
}

export type PasswordPolicyValidationResult = {
  valid: boolean;
  errors?: string[];
};

export interface PasswordPolicyValidator {
  validate(password: string): PasswordPolicyValidationResult;
}

export type AuthAuditEventType =
  | "SIGNUP"
  | "LOGIN"
  | "LOGIN_FAIL"
  | "PASSWORD_RESET"
  | "PASSWORD_RESET_FAIL"
  | "SESSION_ISSUED"
  | "SESSION_REFRESH"
  | "SESSION_REFRESH_FAIL";

export interface AuthAuditEvent {
  type: AuthAuditEventType;
  userId?: string;
  email?: string;
  provider?: OAuthProvider;
  reason?: string;
  metadata?: Record<string, string | number | boolean | null>;
  occurredAt: string;
}

export interface AuthAuditSink {
  emit(event: AuthAuditEvent): Promise<void>;
}

export interface LoginProtectionConfig {
  maxAttempts: number;
  lockoutSeconds: number;
  windowSeconds: number;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresInSeconds: number;
  refreshExpiresInSeconds?: number;
  subject: string;
}

export interface AuthSessionStrategy {
  issueSession(user: AuthUser): Promise<AuthSession>;
  refreshSession(refreshToken: string): Promise<AuthSession | null>;
}

export type AuthEmailFlow = "magic-link" | "password-reset" | "email-verification";

export interface AuthEmailDeliveryContext {
  flow: AuthEmailFlow;
  email: string;
  token: string;
  ttlSeconds: number;
  expiresAt: string;
}

export interface AuthEmailDeliveryTemplate {
  subject: string;
  html?: string;
  text?: string;
}

export interface AuthEmailFlowDeliveryOptions {
  enabled?: boolean;
  from?: string;
  render?: (context: AuthEmailDeliveryContext) => AuthEmailDeliveryTemplate;
  to?: (context: AuthEmailDeliveryContext) => string | string[];
}

export interface AuthEmailOptions {
  provider: EmailProvider;
  from: string;
  magicLink?: AuthEmailFlowDeliveryOptions;
  passwordReset?: AuthEmailFlowDeliveryOptions;
  emailVerification?: AuthEmailFlowDeliveryOptions;
}

export interface AuthServiceOptions {
  passwordPolicyValidator?: PasswordPolicyValidator;
  auditSink?: AuthAuditSink;
  loginProtection?: LoginProtectionConfig;
  sessionStrategy?: AuthSessionStrategy;
  email?: AuthEmailOptions;
}

export interface OAuthAuthorizationProviderConfig {
  authorizeUrl: string;
}

export interface OAuthPKCEProviderMap {
  google: OAuthAuthorizationProviderConfig;
  github: OAuthAuthorizationProviderConfig;
}

export interface AuthService {
  signup(input: SignupInput): Promise<AuthUser>;
  login(input: LoginInput): Promise<AuthUser | null>;
  buildOAuthAuthorizeRequest(input: OAuthAuthorizeInput): OAuthAuthorizeRequest;
  validateOAuthCallback(input: OAuthCallbackValidationInput): OAuthCallbackValidationResult;
  issueSession(userId: string): Promise<AuthSession>;
  refreshSession(refreshToken: string): Promise<AuthSession | null>;
  issueMagicLinkToken(input: MagicLinkInput): Promise<void>;
  verifyMagicLinkToken(token: string): Promise<AuthUser | null>;
  issuePasswordResetToken(input: PasswordResetInput): Promise<string>;
  resetPassword(input: ResetPasswordInput): Promise<boolean>;
  issueEmailVerificationToken(input: EmailVerificationInput): Promise<string>;
  verifyEmailVerificationToken(token: string): Promise<AuthUser | null>;
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
