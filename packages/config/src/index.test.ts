import { afterEach, describe, expect, test } from "bun:test";
import {
  authMigrationsBundle,
  resolveDBType,
  resolveJWTSecret,
  resolveOAuthConfig,
} from "./index";

afterEach(() => {
  delete process.env.AUTH_JWT_SECRET;
  delete process.env.JWT_SECRET;
  delete process.env.AUTH_OAUTH_GOOGLE_CLIENT_ID;
  delete process.env.AUTH_OAUTH_GOOGLE_CLIENT_SECRET;
  delete process.env.AUTH_OAUTH_GOOGLE_REDIRECT_URI;
  delete process.env.AUTH_OAUTH_GITHUB_CLIENT_ID;
  delete process.env.AUTH_OAUTH_GITHUB_CLIENT_SECRET;
  delete process.env.AUTH_OAUTH_GITHUB_REDIRECT_URI;
});

describe("resolveDBType", () => {
  test("maps postgres alias", () => {
    expect(resolveDBType("postgres")).toBe("postgresql");
  });

  test("throws on invalid value", () => {
    expect(() => resolveDBType("oracle")).toThrow();
  });
});

describe("resolveJWTSecret", () => {
  test("prefers explicit input", () => {
    process.env.AUTH_JWT_SECRET = "env-secret";
    expect(resolveJWTSecret("input-secret")).toBe("input-secret");
  });

  test("falls back to environment", () => {
    process.env.AUTH_JWT_SECRET = "env-secret";
    expect(resolveJWTSecret()).toBe("env-secret");
  });

  test("throws when missing", () => {
    expect(() => resolveJWTSecret()).toThrow("Missing JWT secret");
  });
});

describe("resolveOAuthConfig", () => {
  test("returns provider configs from env", () => {
    process.env.AUTH_OAUTH_GOOGLE_CLIENT_ID = "google-id";
    process.env.AUTH_OAUTH_GOOGLE_CLIENT_SECRET = "google-secret";
    process.env.AUTH_OAUTH_GOOGLE_REDIRECT_URI = "https://app.local/google/callback";

    const oauth = resolveOAuthConfig();

    expect(oauth.google).toEqual({
      clientId: "google-id",
      clientSecret: "google-secret",
      redirectUri: "https://app.local/google/callback",
    });
    expect(oauth.github).toBeUndefined();
  });

  test("throws when provider config is incomplete", () => {
    process.env.AUTH_OAUTH_GITHUB_CLIENT_ID = "github-id";
    expect(() => resolveOAuthConfig()).toThrow("Incomplete github OAuth env");
  });
});

describe("auth migrations bundle", () => {
  test("contains required auth migration tables", () => {
    const sql = authMigrationsBundle.map((m) => m.sql).join("\n");
    expect(sql.includes("auth_users")).toBe(true);
    expect(sql.includes("auth_sessions")).toBe(true);
    expect(sql.includes("auth_oauth_accounts")).toBe(true);
    expect(sql.includes("auth_magic_link_tokens")).toBe(true);
  });
});
