import { afterEach, describe, expect, test } from "bun:test";
import {
  authMigrationsBundle,
  resolveDBType,
  resolveEmailTransportConfig,
  resolveJWTSecret,
  resolveMagicLinkConfig,
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
  "AUTH_MAGIC_LINK_TTL_SECONDS",
  "MAGIC_LINK_TTL_SECONDS",
  "AUTH_MAGIC_LINK_SENDER",
  "MAGIC_LINK_SENDER",
  "AUTH_EMAIL_FROM",
  "EMAIL_FROM",
  "AUTH_EMAIL_TRANSPORT",
  "EMAIL_TRANSPORT",
  "AUTH_EMAIL_SES_REGION",
  "EMAIL_SES_REGION",
  "AUTH_EMAIL_SMTP_HOST",
  "EMAIL_SMTP_HOST",
  "AUTH_EMAIL_SMTP_PORT",
  "EMAIL_SMTP_PORT",
  "AUTH_EMAIL_SMTP_SECURE",
  "EMAIL_SMTP_SECURE",
  "AUTH_EMAIL_SMTP_USERNAME",
  "EMAIL_SMTP_USERNAME",
  "AUTH_EMAIL_SMTP_PASSWORD",
  "EMAIL_SMTP_PASSWORD",
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

describe("resolveMagicLinkConfig", () => {
  test("uses defaults with auth sender", () => {
    process.env.AUTH_MAGIC_LINK_SENDER = "noreply@example.com";
    expect(resolveMagicLinkConfig()).toEqual({
      ttlSeconds: 900,
      sender: "noreply@example.com",
    });
  });

  test("uses explicit ttl and fallback sender key", () => {
    process.env.MAGIC_LINK_TTL_SECONDS = "1800";
    process.env.EMAIL_FROM = "support@example.com";

    expect(resolveMagicLinkConfig()).toEqual({
      ttlSeconds: 1800,
      sender: "support@example.com",
    });
  });

  test("throws when sender is missing", () => {
    expect(() => resolveMagicLinkConfig()).toThrow("Missing magic-link sender");
  });

  test("throws when sender is invalid", () => {
    process.env.AUTH_MAGIC_LINK_SENDER = "invalid";
    expect(() => resolveMagicLinkConfig()).toThrow("Invalid magic-link sender");
  });

  test("throws when ttl is invalid", () => {
    process.env.AUTH_MAGIC_LINK_SENDER = "noreply@example.com";
    process.env.AUTH_MAGIC_LINK_TTL_SECONDS = "-1";
    expect(() => resolveMagicLinkConfig()).toThrow("Invalid magic-link ttlSeconds");
  });
});

describe("resolveEmailTransportConfig", () => {
  test("returns undefined when no email env is present", () => {
    expect(resolveEmailTransportConfig()).toBeUndefined();
  });

  test("resolves ses transport by explicit type", () => {
    process.env.AUTH_EMAIL_TRANSPORT = "ses";
    process.env.AUTH_EMAIL_SES_REGION = "ap-southeast-1";

    expect(resolveEmailTransportConfig()).toEqual({
      type: "ses",
      ses: { region: "ap-southeast-1" },
    });
  });

  test("resolves smtp transport by explicit type", () => {
    process.env.AUTH_EMAIL_TRANSPORT = "smtp";
    process.env.AUTH_EMAIL_SMTP_HOST = "smtp.example.com";
    process.env.AUTH_EMAIL_SMTP_PORT = "465";
    process.env.AUTH_EMAIL_SMTP_SECURE = "true";
    process.env.AUTH_EMAIL_SMTP_USERNAME = "user";
    process.env.AUTH_EMAIL_SMTP_PASSWORD = "pass";

    expect(resolveEmailTransportConfig()).toEqual({
      type: "smtp",
      smtp: {
        host: "smtp.example.com",
        port: 465,
        secure: true,
        username: "user",
        password: "pass",
      },
    });
  });

  test("auto-detects ses transport from env", () => {
    process.env.EMAIL_SES_REGION = "us-east-1";

    expect(resolveEmailTransportConfig()).toEqual({
      type: "ses",
      ses: { region: "us-east-1" },
    });
  });

  test("auto-detects smtp transport from env with defaults", () => {
    process.env.EMAIL_SMTP_HOST = "smtp.mail.local";

    expect(resolveEmailTransportConfig()).toEqual({
      type: "smtp",
      smtp: {
        host: "smtp.mail.local",
        port: 587,
        secure: false,
        username: undefined,
        password: undefined,
      },
    });
  });

  test("throws when both ses and smtp are present without explicit type", () => {
    process.env.EMAIL_SES_REGION = "us-east-1";
    process.env.EMAIL_SMTP_HOST = "smtp.mail.local";

    expect(() => resolveEmailTransportConfig()).toThrow(
      "Ambiguous email transport config"
    );
  });

  test("throws for invalid transport type", () => {
    process.env.AUTH_EMAIL_TRANSPORT = "sendgrid";
    expect(() => resolveEmailTransportConfig()).toThrow("Invalid email transport");
  });

  test("throws when ses transport misses region", () => {
    process.env.AUTH_EMAIL_TRANSPORT = "ses";
    expect(() => resolveEmailTransportConfig()).toThrow("Missing SES region");
  });

  test("throws when smtp transport misses host", () => {
    process.env.AUTH_EMAIL_TRANSPORT = "smtp";
    expect(() => resolveEmailTransportConfig()).toThrow("Missing SMTP host");
  });

  test("throws when smtp secure is invalid", () => {
    process.env.AUTH_EMAIL_TRANSPORT = "smtp";
    process.env.AUTH_EMAIL_SMTP_HOST = "smtp.mail.local";
    process.env.AUTH_EMAIL_SMTP_SECURE = "1";

    expect(() => resolveEmailTransportConfig()).toThrow("Invalid smtp secure");
  });

  test("throws when smtp port is out of range", () => {
    process.env.AUTH_EMAIL_TRANSPORT = "smtp";
    process.env.AUTH_EMAIL_SMTP_HOST = "smtp.mail.local";
    process.env.AUTH_EMAIL_SMTP_PORT = "70000";

    expect(() => resolveEmailTransportConfig()).toThrow("Invalid smtp port");
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
