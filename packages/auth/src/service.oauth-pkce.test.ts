import { beforeEach, describe, expect, mock, test } from "bun:test";

const queue: unknown[][] = [];

const sqlTag = ((strings: TemplateStringsArray, ...values: unknown[]) => {
  void strings;
  void values;
  return Promise.resolve(queue.shift() ?? []);
}) as unknown as {
  (strings: TemplateStringsArray, ...values: unknown[]): Promise<unknown[]>;
  unsafe?: (query: string) => Promise<unknown[]>;
};

mock.module("@alesha-nov/config", () => ({
  createDatabaseClient: () => ({ sql: sqlTag }),
  runMigrations: async () => {},
}));

const { createAuthService } = await import("./service");

beforeEach(() => {
  queue.length = 0;
});

describe("createAuthService oauth pkce contracts", () => {
  test("buildOAuthAuthorizeRequest builds provider-specific authorize URL with PKCE fields", async () => {
    const svc = await createAuthService({ type: "sqlite", url: ":memory:" });

    const request = svc.buildOAuthAuthorizeRequest({
      provider: "google",
      clientId: "google-client-id",
      redirectUri: "https://app.example.com/oauth/google/callback",
      scope: ["openid", "email", "profile"],
      state: "state-fixed",
    });

    expect(request.provider).toBe("google");
    expect(request.state).toBe("state-fixed");
    expect(request.codeChallengeMethod).toBe("S256");
    expect(request.codeVerifier.length).toBeGreaterThan(42);
    expect(request.codeChallenge).toMatch(/^[a-f0-9]{64}$/);

    const parsed = new URL(request.authorizationUrl);
    expect(parsed.origin + parsed.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(parsed.searchParams.get("client_id")).toBe("google-client-id");
    expect(parsed.searchParams.get("redirect_uri")).toBe("https://app.example.com/oauth/google/callback");
    expect(parsed.searchParams.get("response_type")).toBe("code");
    expect(parsed.searchParams.get("scope")).toBe("openid email profile");
    expect(parsed.searchParams.get("state")).toBe("state-fixed");
    expect(parsed.searchParams.get("code_challenge")).toBe(request.codeChallenge);
    expect(parsed.searchParams.get("code_challenge_method")).toBe("S256");
  });

  test("buildOAuthAuthorizeRequest trims/joins scope and auto-generates state", async () => {
    const svc = await createAuthService({ type: "sqlite", url: ":memory:" });

    const request = svc.buildOAuthAuthorizeRequest({
      provider: "github",
      clientId: "gh-client-id",
      redirectUri: "https://app.example.com/oauth/github/callback",
      scope: [" read:user ", "", "user:email"],
    });

    expect(request.provider).toBe("github");
    expect(request.state.length).toBeGreaterThan(8);

    const parsed = new URL(request.authorizationUrl);
    expect(parsed.origin + parsed.pathname).toBe("https://github.com/login/oauth/authorize");
    expect(parsed.searchParams.get("scope")).toBe("read:user user:email");
    expect(parsed.searchParams.get("state")).toBe(request.state);
  });

  test("validateOAuthCallback rejects error callback and invalid state", async () => {
    const svc = await createAuthService({ type: "sqlite", url: ":memory:" });

    const oauthError = svc.validateOAuthCallback({
      callback: { provider: "google", error: "access_denied", state: "x", code: "c" },
      expectedState: "x",
      codeVerifier: "a".repeat(64),
    });
    expect(oauthError.valid).toBe(false);
    expect(oauthError.reason).toBe("access_denied");

    const stateMismatch = svc.validateOAuthCallback({
      callback: { provider: "google", state: "bad", code: "code" },
      expectedState: "good",
      codeVerifier: "a".repeat(64),
    });
    expect(stateMismatch.valid).toBe(false);
    expect(stateMismatch.reason).toBe("Invalid OAuth state");
  });

  test("validateOAuthCallback rejects missing code and short PKCE verifier", async () => {
    const svc = await createAuthService({ type: "sqlite", url: ":memory:" });

    const missingCode = svc.validateOAuthCallback({
      callback: { provider: "github", state: "s" },
      expectedState: "s",
      codeVerifier: "a".repeat(64),
    });
    expect(missingCode.valid).toBe(false);
    expect(missingCode.reason).toBe("Missing authorization code");

    const shortVerifier = svc.validateOAuthCallback({
      callback: { provider: "github", state: "s", code: "ok" },
      expectedState: "s",
      codeVerifier: "short",
    });
    expect(shortVerifier.valid).toBe(false);
    expect(shortVerifier.reason).toBe("Invalid PKCE code verifier");
  });

  test("validateOAuthCallback returns valid for matching state/code and verifier", async () => {
    const svc = await createAuthService({ type: "sqlite", url: ":memory:" });

    const result = svc.validateOAuthCallback({
      callback: { provider: "google", state: "state-ok", code: "auth-code" },
      expectedState: "state-ok",
      codeVerifier: "a".repeat(64),
    });

    expect(result).toEqual({ valid: true });
  });
});
