export { authMigrations } from "./migrations";
export { createAuthService } from "./service";
export { assertProvider, hashPassword, hashToken, newId, normalizeEmail, normalizeRoles, verifyPassword } from "./utils";
export { buildAuthUser, getUserById, getUserRolesInternal } from "./user-store";
export type {
  AuthService,
  AuthUser,
  LinkOAuthAccountInput,
  LoginInput,
  MagicLinkInput,
  OAuthAccountLink,
  OAuthLoginInput,
  OAuthProvider,
  SignupInput,
  UserRow,
} from "./types";
