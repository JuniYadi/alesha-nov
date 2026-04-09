import { afterEach, describe, expect, test } from "bun:test";
import {
  authMigrationsBundle,
  resolveDBType,
  resolveJWTSecret,
  resolveOAuthConfig,
  resolveSessionConfig,
} from "./index";

const ENV_KEYS = [
  "AUTH_JWT_SECRET",
  "JWT_SECRET",
  "AUTH_OAUTH_GOOGLE_CLIENT_ID",
  "AUTH_OAUTH_GOOGLE_CLIENT_SECRET",
  "AUTH_OAUTH_GOOGLE_REDIRECT_URI",
  "AUTH_OAUTH_GITHUB_CLIENT_ID",
  "AUTH_OAUTH_GITHUB_CLIENT_SECRET",
  "AUTH_OAUTH_GITHUB_REDIRECT_URI",
  "AUTH_SESSION_COOKIE_NAME",
  "SESSION_COOKIE_NAME",
  "AUTH_SESSION_TTL_SECONDS",
  "SESSION_TTL_SECONDS",
  "AUTH_SESSION_SECURE",
  "SESSION_SECURE",
  "AUTH_SESSION_SAME_SITE",
  "SESSION_SAME_SITE",
] as const;

afterEach(() => {
  for (const key of ENV_KEYS) {
    delete process.env[key];
  }
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

describe("resolveSessionConfig", () => {
  test("returns defaults when env is missing", () => {
    expect(resolveSessionConfig()).toEqual({
      cookieName: "alesha_session",
      ttlSeconds: 604800,
      secure: false,
      sameSite: "lax",
    });
  });

  test("resolves explicit auth session env vars", () => {
    process.env.AUTH_SESSION_COOKIE_NAME = "auth_cookie";
    process.env.AUTH_SESSION_TTL_SECONDS = "1200";
    process.env.AUTH_SESSION_SECURE = "true";
    process.env.AUTH_SESSION_SAME_SITE = "strict";

    expect(resolveSessionConfig()).toEqual({
      cookieName: "auth_cookie",
      ttlSeconds: 1200,
      secure: true,
      sameSite: "strict",
    });
  });

  test("supports fallback session env keys", () => {
    process.env.SESSION_COOKIE_NAME = "legacy_cookie";
    process.env.SESSION_TTL_SECONDS = "3600";
    process.env.SESSION_SECURE = "false";
    process.env.SESSION_SAME_SITE = "none";

    expect(resolveSessionConfig()).toEqual({
      cookieName: "legacy_cookie",
      ttlSeconds: 3600,
      secure: false,
      sameSite: "none",
    });
  });

  test("throws for invalid sameSite value", () => {
    process.env.AUTH_SESSION_SAME_SITE = "invalid";
    expect(() => resolveSessionConfig()).toThrow("Invalid session sameSite value");
  });

  test("throws for invalid ttl value", () => {
    process.env.AUTH_SESSION_TTL_SECONDS = "0";
    expect(() => resolveSessionConfig()).toThrow("Invalid session ttlSeconds");
  });

  test("throws for invalid secure boolean", () => {
    process.env.AUTH_SESSION_SECURE = "yes";
    expect(() => resolveSessionConfig()).toThrow("Invalid session secure");
  });
});

describe("resolveOAuthConfig", () => {
  test("returns provider configs from env", () => {
    process.env.AUTH_OAUTH_GOOGLE_CLIENT_ID = "google-id";
    process.env.AUTH_OAUTH_GOOGLE_CLIENT_SECRET = "google-secret";
    process.env.AUTH_OAUTH_GOOGLE_REDIRECT_URI =
      "https://app.local/google/callback";

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
