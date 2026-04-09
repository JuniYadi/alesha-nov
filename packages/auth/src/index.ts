export { authMigrations } from "./migrations";
export { createAuthService } from "./service";
export { assertProvider, hashPassword, hashToken, newId, normalizeEmail, normalizeRoles, verifyPassword } from "./utils";
export { buildAuthUser, getUserById, getUserRolesInternal } from "./user-store";
export type {
  AuthService,
  AuthUser,
  EmailVerificationInput,
  LinkOAuthAccountInput,
  LoginInput,
  MagicLinkInput,
  OAuthAccountLink,
  OAuthAuthorizeInput,
  OAuthAuthorizeRequest,
  OAuthCallbackInput,
  OAuthCallbackValidationInput,
  OAuthCallbackValidationResult,
  OAuthLoginInput,
  OAuthPKCEProviderMap,
  OAuthProvider,
  PasswordResetInput,
  ResetPasswordInput,
  SignupInput,
  UserRow,
} from "./types";
