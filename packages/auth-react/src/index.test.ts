import { describe, expect, test } from "bun:test";

describe("auth-react exports", () => {
  test("context exports are defined", async () => {
    const { AuthProvider, AuthContext, useAuth } = await import("./context");

    expect(AuthProvider).toBeDefined();
    expect(AuthContext).toBeDefined();
    expect(useAuth).toBeDefined();
    expect(AuthContext.$$typeof).toBe(Symbol.for("react.context"));
  });

  test("hooks exports are defined", async () => {
    const { useSignup, useLogin, useLogout, usePasswordResetRequest, useResetPassword, useOAuthLogin, useAuthGuard } = await import("./hooks");

    expect(useSignup).toBeDefined();
    expect(useLogin).toBeDefined();
    expect(useLogout).toBeDefined();
    expect(usePasswordResetRequest).toBeDefined();
    expect(useResetPassword).toBeDefined();
    expect(useOAuthLogin).toBeDefined();
    expect(useAuthGuard).toBeDefined();
  });

  test("AuthGuard component is defined", async () => {
    const { AuthGuard } = await import("./auth-guard");
    expect(AuthGuard).toBeDefined();
  });

  test("index barrel re-exports everything", async () => {
    const mod = await import("./index");

    expect(mod.AuthProvider).toBeDefined();
    expect(mod.useAuth).toBeDefined();
    expect(mod.useSignup).toBeDefined();
    expect(mod.useLogin).toBeDefined();
    expect(mod.useLogout).toBeDefined();
    expect(mod.usePasswordResetRequest).toBeDefined();
    expect(mod.useResetPassword).toBeDefined();
    expect(mod.useAuthGuard).toBeDefined();
    expect(mod.AuthGuard).toBeDefined();
  });
});
