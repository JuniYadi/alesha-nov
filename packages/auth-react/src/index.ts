export { AuthProvider, AuthContext, useAuth } from "./context";
export type { AuthContextValue, AuthState } from "./context";

export {
  useSignup,
  useLogin,
  useLogout,
  usePasswordResetRequest,
  useResetPassword,
  useMagicLinkRequest,
  useMagicLinkVerify,
  useOAuthLogin,
  useAuthGuard,
} from "./hooks";

export { AuthGuard } from "./auth-guard";

export type {
  PublicUser,
  AuthSession,
  SignupInput,
  LoginInput,
  AuthApiConfig,
  AuthGuardNavigationAdapter,
  MagicLinkRequestInput,
  MagicLinkVerifyInput,
  UseAuthGuardOptions,
} from "./types";
