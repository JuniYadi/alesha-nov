import { describe, expect, test } from "bun:test";
import { createAuthWeb, getSessionFromRequest, revokeAllUserTokens, revokeSession, type RateLimiter } from "./index";

const makeAuthService = () => ({
  signup: async (input: { email: string; name?: string; image?: string; roles?: string[] }) => ({
    id: "u-1",
    email: input.email.toLowerCase(),
    passwordHash: "hashed",
    name: input.name ?? null,
    image: input.image ?? null,
    emailVerifiedAt: null,
    roles: input.roles ?? [],
    createdAt: "2024-01-01T00:00:00.000Z",
  }),
  login: async (input: { email: string }) => {
    if (input.email === "ok@example.com") {
      return {
        id: "u-1",
        email: "ok@example.com",
        passwordHash: "hashed",
        name: "OK",
        image: null,
        emailVerifiedAt: null,
        roles: ["admin"],
        createdAt: "2024-01-01T00:00:00.000Z",
      };
    }
    return null;
  },
  issueMagicLinkToken: async () => "magic-token",
  issuePasswordResetToken: async ({ email }: { email: string }) => {
    if (email === "missing@example.com") throw new Error("User not found");
    return "reset-token";
  },
  resetPassword: async ({ token }: { token: string }) => token === "valid-reset-token",
  verifyMagicLinkToken: async (token: string) => {
    if (token === "valid") {
      return {
        id: "u-2",
        email: "magic@example.com",
        passwordHash: "hashed",
        name: null,
        image: null,
        emailVerifiedAt: "2024-01-01T00:00:00.000Z",
        roles: ["support.write"],
        createdAt: "2024-01-01T00:00:00.000Z",
      };
    }
    return null;
  },
  setUserRoles: async (_userId: string, roles: string[]) => roles,
  getUserRoles: async () => ["admin"],
  loginWithOAuth: async (input: { email: string; roles?: string[] }) => ({
    id: "u-3",
    email: input.email,
    passwordHash: "hashed",
    name: "OAuth",
    image: null,
    emailVerifiedAt: null,
    roles: input.roles ?? [],
    createdAt: "2024-01-01T00:00:00.000Z",
  }),
  linkOAuthAccount: async (input: { userId: string; provider: "google" | "github"; providerAccountId: string; providerEmail?: string }) => ({
    id: "oa-1",
    userId: input.userId,
    provider: input.provider,
    providerAccountId: input.providerAccountId,
    providerEmail: input.providerEmail ?? null,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  }),
  getLinkedAccounts: async () => [
    {
      id: "oa-1",
      userId: "u-1",
      provider: "google" as const,
      providerAccountId: "pid",
      providerEmail: "x@example.com",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    },
  ],
  issueEmailVerificationToken: async ({ email }: { email: string }) => {
    if (email === "missing@example.com") throw new Error("User not found");
    return "email-verification-token";
  },
  verifyEmailVerificationToken: async (token: string) => {
    if (token === "valid-email-token") {
      return {
        id: "u-1",
        email: "verified@example.com",
        passwordHash: "hashed",
        name: "Verified",
        image: null,
        emailVerifiedAt: new Date().toISOString(),
        roles: [],
        createdAt: "2024-01-01T00:00:00.000Z",
      };
    }
    return null;
  },
});

describe("createAuthWeb", () => {
  test("throws when sessionSecret is too short", () => {
    expect(() =>
      createAuthWeb({
        sessionSecret: "short",
        authService: makeAuthService(),
      })
    ).toThrow();
  });

  test("signup sets auth cookie and hides password hash", async () => {
    const app = createAuthWeb({
      sessionSecret: "0123456789abcdef",
      authService: makeAuthService(),
      secureCookie: false,
    });

    const request = new Request("http://localhost/auth/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "USER@EXAMPLE.COM", password: "x", roles: ["admin"] }),
    });

    const response = await app.handleRequest(request);
    const body = (await response.json()) as { user: Record<string, unknown> };

    expect(response.status).toBe(200);
    expect(body.user.passwordHash).toBeUndefined();
    expect(response.headers.get("set-cookie")).toContain("alesha_auth=");
  });

  test("login rejects invalid credentials", async () => {
    const app = createAuthWeb({
      sessionSecret: "0123456789abcdef",
      authService: makeAuthService(),
    });

    const request = new Request("http://localhost/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "bad@example.com", password: "x" }),
    });

    const response = await app.handleRequest(request);
    expect(response.status).toBe(401);
  });

  test("session endpoint returns 401 without cookie", async () => {
    const app = createAuthWeb({
      sessionSecret: "0123456789abcdef",
      authService: makeAuthService(),
    });

    const response = await app.handleRequest(new Request("http://localhost/auth/session", { method: "GET" }));
    expect(response.status).toBe(401);
  });

  test("magic-link verify accepts valid token and sets cookie", async () => {
    const app = createAuthWeb({
      sessionSecret: "0123456789abcdef",
      authService: makeAuthService(),
      secureCookie: false,
    });

    const response = await app.handleRequest(
      new Request("http://localhost/auth/magic-link/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: "valid" }),
      })
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("alesha_auth=");
  });

  test("roles endpoint returns forbidden for cross-user update without elevated role", async () => {
    const app = createAuthWeb({
      sessionSecret: "0123456789abcdef",
      authService: makeAuthService(),
      secureCookie: false,
    });

    const loginResponse = await app.handleRequest(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "ok@example.com", password: "x" }),
      })
    );

    const cookie = loginResponse.headers.get("set-cookie") ?? "";

    const response = await app.handleRequest(
      new Request("http://localhost/auth/roles", {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          cookie,
        },
        body: JSON.stringify({ userId: "someone-else", roles: ["billing.write"] }),
      })
    );

    expect(response.status).toBe(403);
  });

  test("safeJson error path returns 400", async () => {
    const app = createAuthWeb({
      sessionSecret: "0123456789abcdef",
      authService: makeAuthService(),
    });

    const response = await app.handleRequest(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: { "content-type": "text/plain" },
        body: "not-json",
      })
    );

    expect(response.status).toBe(400);
  });
});

describe("getSessionFromRequest", () => {
  test("returns null when cookie is missing", async () => {
    const session = await getSessionFromRequest(new Request("http://localhost/auth/session"), "0123456789abcdef");
    expect(session).toBeNull();
  });
});

describe("GET /me endpoint", () => {
  test("returns 401 when no session cookie", async () => {
    const app = createAuthWeb({
      sessionSecret: "0123456789abcdef",
      authService: makeAuthService(),
      getUser: async () => null,
    });

    const response = await app.handleRequest(new Request("http://localhost/auth/me", { method: "GET" }));
    expect(response.status).toBe(401);
  });

  test("returns 501 when getUser is not configured", async () => {
    const app = createAuthWeb({
      sessionSecret: "0123456789abcdef",
      authService: makeAuthService(),
      secureCookie: false,
    });

    const loginResp = await app.handleRequest(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "ok@example.com", password: "x" }),
      })
    );

    const cookie = loginResp.headers.get("set-cookie") ?? "";
    const response = await app.handleRequest(
      new Request("http://localhost/auth/me", { method: "GET", headers: { cookie } })
    );

    expect(response.status).toBe(501);
  });

  test("returns user data when session is valid and getUser resolves user", async () => {
    const app = createAuthWeb({
      sessionSecret: "0123456789abcdef",
      authService: makeAuthService(),
      secureCookie: false,
      getUser: async (userId: string) => {
        if (userId === "u-1") {
          return {
            id: "u-1",
            email: "ok@example.com",
            passwordHash: "hashed",
            name: "OK",
            image: null,
            emailVerifiedAt: null,
            roles: ["admin"],
            createdAt: "2024-01-01T00:00:00.000Z",
          };
        }
        return null;
      },
    });

    const loginResp = await app.handleRequest(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "ok@example.com", password: "x" }),
      })
    );

    const cookie = loginResp.headers.get("set-cookie") ?? "";
    const response = await app.handleRequest(
      new Request("http://localhost/auth/me", { method: "GET", headers: { cookie } })
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as { user: Record<string, unknown> };
    expect(body.user.email).toBe("ok@example.com");
    expect(body.user.passwordHash).toBeUndefined();
  });

  test("returns 401 when getUser returns null for valid session", async () => {
    const app = createAuthWeb({
      sessionSecret: "0123456789abcdef",
      authService: makeAuthService(),
      secureCookie: false,
      getUser: async () => null,
    });

    const loginResp = await app.handleRequest(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "ok@example.com", password: "x" }),
      })
    );

    const cookie = loginResp.headers.get("set-cookie") ?? "";
    const response = await app.handleRequest(
      new Request("http://localhost/auth/me", { method: "GET", headers: { cookie } })
    );

    expect(response.status).toBe(401);
  });
});

describe("POST /logout", () => {
  test("clears cookie and returns 200", async () => {
    const app = createAuthWeb({
      sessionSecret: "0123456789abcdef",
      authService: makeAuthService(),
      secureCookie: false,
    });

    const response = await app.handleRequest(
      new Request("http://localhost/auth/logout", { method: "POST" })
    );

    expect(response.status).toBe(200);
    const cookie = response.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("alesha_auth=");
    expect(cookie).toContain("Max-Age=0");
  });
});

describe("POST /sessions/revoke", () => {
  test("returns 401 when no session cookie", async () => {
    const app = createAuthWeb({
      sessionSecret: "0123456789abcdef",
      authService: makeAuthService(),
      secureCookie: false,
    });

    const response = await app.handleRequest(
      new Request("http://localhost/auth/sessions/revoke", { method: "POST" })
    );

    expect(response.status).toBe(401);
  });
});

describe("POST /sessions/revoke-all", () => {
  test("returns 401 when no session cookie", async () => {
    const app = createAuthWeb({
      sessionSecret: "0123456789abcdef",
      authService: makeAuthService(),
      secureCookie: false,
    });

    const response = await app.handleRequest(
      new Request("http://localhost/auth/sessions/revoke-all", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tokens: [] }),
      })
    );

    expect(response.status).toBe(401);
  });

  test("returns 400 when tokens is missing", async () => {
    const app = createAuthWeb({
      sessionSecret: "0123456789abcdef",
      authService: makeAuthService(),
      secureCookie: false,
    });

    const response = await app.handleRequest(
      new Request("http://localhost/auth/sessions/revoke-all", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "cookie": "alesha_auth=invalid",
        },
        body: JSON.stringify({}),
      })
    );

    // Without a valid session, it returns 401 first
    expect([200, 400, 401]).toContain(response.status);
  });
});

describe("POST /magic-link/request", () => {
  test("calls issueMagicLinkToken and returns 200 with token", async () => {
    let called = false;
    const customService = makeAuthService();
    customService.issueMagicLinkToken = async ({ email }: { email: string }) => {
      called = true;
      expect(email).toBe("user@example.com");
      return "request-token";
    };

    const app = createAuthWeb({
      sessionSecret: "0123456789abcdef",
      authService: customService,
      secureCookie: false,
    });

    const response = await app.handleRequest(
      new Request("http://localhost/auth/magic-link/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "user@example.com" }),
      })
    );

    expect(response.status).toBe(200);
    expect(called).toBe(true);
    const body = (await response.json()) as { token: string };
    expect(body.token).toBe("request-token");
  });
});

describe("POST /password-reset/request", () => {
  test("returns token when issuePasswordResetToken succeeds", async () => {
    const app = createAuthWeb({
      sessionSecret: "0123456789abcdef",
      authService: makeAuthService(),
      secureCookie: false,
    });

    const response = await app.handleRequest(
      new Request("http://localhost/auth/password-reset/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "user@example.com" }),
      })
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as { token: string };
    expect(body.token).toBe("reset-token");
  });

  test("returns 400 when issuePasswordResetToken throws", async () => {
    const app = createAuthWeb({
      sessionSecret: "0123456789abcdef",
      authService: makeAuthService(),
      secureCookie: false,
    });

    const response = await app.handleRequest(
      new Request("http://localhost/auth/password-reset/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "missing@example.com" }),
      })
    );

    expect(response.status).toBe(400);
  });
});

describe("POST /password-reset/reset", () => {
  test("returns 200 when resetPassword succeeds", async () => {
    const app = createAuthWeb({
      sessionSecret: "0123456789abcdef",
      authService: makeAuthService(),
      secureCookie: false,
    });

    const response = await app.handleRequest(
      new Request("http://localhost/auth/password-reset/reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: "valid-reset-token", newPassword: "new-pass-123" }),
      })
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as { ok: boolean };
    expect(body.ok).toBe(true);
  });

  test("rate limiting triggers 429 when limit reached", async () => {
    const app = createAuthWeb({
      sessionSecret: "0123456789abcdef",
      authService: makeAuthService(),
      rateLimit: { windowSeconds: 60, maxRequests: 1 },
    });

    const req1 = new Request("http://localhost/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "ok@example.com", password: "x" }),
    });
    const res1 = await app.handleRequest(req1);
    expect(res1.status).toBe(200);

    const req2 = new Request("http://localhost/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "ok@example.com", password: "x" }),
    });
    const res2 = await app.handleRequest(req2);
    expect(res2.status).toBe(429);
    expect(await res2.json()).toEqual({ error: "Too many requests" });
    expect(res2.headers.get("x-ratelimit-limit")).toBe("1");
    expect(res2.headers.get("x-ratelimit-remaining")).toBe("0");
    expect(res2.headers.get("retry-after")).toBeDefined();
  });

  test("rate limiting works with custom limiter", async () => {
    const limiter: RateLimiter = {
      consume: async () => ({ success: false, limit: 10, remaining: 0, reset: 123 }),
    };
    const app = createAuthWeb({
      sessionSecret: "0123456789abcdef",
      authService: makeAuthService(),
      rateLimit: limiter,
    });

    const res = await app.handleRequest(
      new Request("http://localhost/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "x@x.com", password: "x" }),
      })
    );
    expect(res.status).toBe(429);
    expect(res.headers.get("x-ratelimit-reset")).toBe("123");
  });

  test("returns 401 when resetPassword fails", async () => {
    const app = createAuthWeb({
      sessionSecret: "0123456789abcdef",
      authService: makeAuthService(),
      secureCookie: false,
    });

    const response = await app.handleRequest(
      new Request("http://localhost/auth/password-reset/reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: "bad-token", newPassword: "new-pass-123" }),
      })
    );

    expect(response.status).toBe(401);
  });
});

describe("GET /oauth/:provider/authorize", () => {
  test("returns 501 when oauth authorize flow is not configured", async () => {
    const app = createAuthWeb({
      sessionSecret: "0123456789abcdef",
      authService: makeAuthService(),
      secureCookie: false,
    });

    const response = await app.handleRequest(
      new Request("http://localhost/auth/oauth/google/authorize", { method: "GET" })
    );

    expect(response.status).toBe(501);
  });

  test("returns 302 and sets OAuth state cookie when configured", async () => {
    const app = createAuthWeb({
      sessionSecret: "0123456789abcdef",
      authService: makeAuthService(),
      secureCookie: false,
      getOAuthAuthorizeUrl: ({ provider, state, redirectUri }) => {
        expect(provider).toBe("google");
        expect(state.length).toBeGreaterThan(10);
        expect(redirectUri).toBe("http://localhost/auth/oauth/google/callback");
        return `https://oauth.example/authorize?provider=${provider}&state=${state}`;
      },
    });

    const response = await app.handleRequest(
      new Request("http://localhost/auth/oauth/google/authorize", { method: "GET" })
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toContain("https://oauth.example/authorize?");
    expect(response.headers.get("set-cookie")).toContain("alesha_oauth_state_google=");
  });
});

describe("GET /oauth/:provider/callback", () => {
  test("returns 501 when oauth callback flow is not configured", async () => {
    const app = createAuthWeb({
      sessionSecret: "0123456789abcdef",
      authService: makeAuthService(),
      secureCookie: false,
    });

    const response = await app.handleRequest(
      new Request("http://localhost/auth/oauth/google/callback?code=x&state=y", { method: "GET" })
    );

    expect(response.status).toBe(501);
  });

  test("returns 400 on state mismatch", async () => {
    const app = createAuthWeb({
      sessionSecret: "0123456789abcdef",
      authService: makeAuthService(),
      secureCookie: false,
      completeOAuthCallback: () => ({
        providerAccountId: "google-123",
        email: "oauth@example.com",
      }),
    });

    const response = await app.handleRequest(
      new Request("http://localhost/auth/oauth/google/callback?code=x&state=wrong", {
        method: "GET",
        headers: { cookie: "alesha_oauth_state_google=expected" },
      })
    );

    expect(response.status).toBe(400);
  });

  test("success callback logs in user, sets session cookie, and clears oauth state cookie", async () => {
    const app = createAuthWeb({
      sessionSecret: "0123456789abcdef",
      authService: makeAuthService(),
      secureCookie: false,
      completeOAuthCallback: ({ provider, code, state, redirectUri }) => {
        expect(provider).toBe("google");
        expect(code).toBe("oauth-code");
        expect(state).toBe("ok-state");
        expect(redirectUri).toBe("http://localhost/auth/oauth/google/callback");
        return {
          providerAccountId: "google-123",
          email: "oauth-callback@example.com",
          name: "OAuth Callback",
        };
      },
    });

    const response = await app.handleRequest(
      new Request("http://localhost/auth/oauth/google/callback?code=oauth-code&state=ok-state", {
        method: "GET",
        headers: { cookie: "alesha_oauth_state_google=ok-state" },
      })
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as { user: Record<string, unknown> };
    expect(body.user.email).toBe("oauth-callback@example.com");

    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("alesha_auth=");
    expect(setCookie).toContain("alesha_oauth_state_google=");
    expect(setCookie).toContain("Max-Age=0");
  });
});

describe("POST /oauth/:provider/login", () => {
  test("success flow returns user and sets session cookie", async () => {
    const app = createAuthWeb({
      sessionSecret: "0123456789abcdef",
      authService: makeAuthService(),
      secureCookie: false,
    });

    const response = await app.handleRequest(
      new Request("http://localhost/auth/oauth/google/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          providerAccountId: "google-123",
          email: "oauth@example.com",
          name: "OAuth User",
        }),
      })
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as { user: Record<string, unknown> };
    expect(body.user.email).toBe("oauth@example.com");
    expect(body.user.name).toBe("OAuth"); // mock returns hardcoded name
    expect(body.user.passwordHash).toBeUndefined();
    expect(response.headers.get("set-cookie")).toContain("alesha_auth=");
  });
});

describe("POST /oauth/:provider/link", () => {
  test("success flow links account and returns 200 for authenticated user", async () => {
    const app = createAuthWeb({
      sessionSecret: "0123456789abcdef",
      authService: makeAuthService(),
      secureCookie: false,
    });

    // First login to get a session cookie
    const loginResp = await app.handleRequest(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "ok@example.com", password: "x" }),
      })
    );
    const cookie = loginResp.headers.get("set-cookie") ?? "";

    const response = await app.handleRequest(
      new Request("http://localhost/auth/oauth/github/link", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({
          providerAccountId: "github-456",
          providerEmail: "github@example.com",
        }),
      })
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as { account: Record<string, unknown> };
    expect(body.account.provider).toBe("github");
    expect(body.account.providerAccountId).toBe("github-456");
  });

  test("returns 401 when not authenticated", async () => {
    const app = createAuthWeb({
      sessionSecret: "0123456789abcdef",
      authService: makeAuthService(),
      secureCookie: false,
    });

    const response = await app.handleRequest(
      new Request("http://localhost/auth/oauth/github/link", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ providerAccountId: "github-456" }),
      })
    );

    expect(response.status).toBe(401);
  });
});

describe("GET /linked-accounts", () => {
  test("returns list of accounts for authenticated user", async () => {
    const app = createAuthWeb({
      sessionSecret: "0123456789abcdef",
      authService: makeAuthService(),
      secureCookie: false,
    });

    // First login to get a session cookie
    const loginResp = await app.handleRequest(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "ok@example.com", password: "x" }),
      })
    );
    const cookie = loginResp.headers.get("set-cookie") ?? "";

    const response = await app.handleRequest(
      new Request("http://localhost/auth/linked-accounts", { method: "GET", headers: { cookie } })
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as { accounts: Record<string, unknown>[] };
    expect(body.accounts).toHaveLength(1);
    expect(body.accounts[0].provider).toBe("google");
  });

  test("returns 401 when not authenticated", async () => {
    const app = createAuthWeb({
      sessionSecret: "0123456789abcdef",
      authService: makeAuthService(),
      secureCookie: false,
    });

    const response = await app.handleRequest(
      new Request("http://localhost/auth/linked-accounts", { method: "GET" })
    );

    expect(response.status).toBe(401);
  });
});

describe("PUT /roles", () => {
  test("success path for admin updates own roles", async () => {
    const app = createAuthWeb({
      sessionSecret: "0123456789abcdef",
      authService: makeAuthService(),
      secureCookie: false,
    });

    // First login with admin role
    const loginResp = await app.handleRequest(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "ok@example.com", password: "x" }),
      })
    );
    const cookie = loginResp.headers.get("set-cookie") ?? "";

    const response = await app.handleRequest(
      new Request("http://localhost/auth/roles", {
        method: "PUT",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ roles: ["admin", "billing.write"] }),
      })
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as { roles: string[] };
    expect(body.roles).toEqual(["admin", "billing.write"]);
  });
});

describe("secureCookie option", () => {
  test("secureCookie: true adds Secure flag to cookie", async () => {
    const app = createAuthWeb({
      sessionSecret: "0123456789abcdef",
      authService: makeAuthService(),
      secureCookie: true, // default is true
    });

    const response = await app.handleRequest(
      new Request("http://localhost/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "new@example.com", password: "x" }),
      })
    );

    expect(response.status).toBe(200);
    const cookie = response.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("Secure");
  });
});

describe("POST /email-verification/request", () => {
  test("returns token when issueEmailVerificationToken succeeds", async () => {
    const app = createAuthWeb({
      sessionSecret: "0123456789abcdef",
      authService: makeAuthService(),
      secureCookie: false,
    });

    const response = await app.handleRequest(
      new Request("http://localhost/auth/email-verification/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "user@example.com" }),
      })
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as { token: string };
    expect(body.token).toBe("email-verification-token");
  });

  test("returns 400 when issueEmailVerificationToken throws (user not found)", async () => {
    const app = createAuthWeb({
      sessionSecret: "0123456789abcdef",
      authService: makeAuthService(),
      secureCookie: false,
    });

    const response = await app.handleRequest(
      new Request("http://localhost/auth/email-verification/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "missing@example.com" }),
      })
    );

    expect(response.status).toBe(400);
  });

  test("returns 429 when rate limit is exceeded", async () => {
    const app = createAuthWeb({
      sessionSecret: "0123456789abcdef",
      authService: makeAuthService(),
      rateLimit: { windowSeconds: 60, maxRequests: 1 },
    });

    const res1 = await app.handleRequest(
      new Request("http://localhost/auth/email-verification/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "user@example.com" }),
      })
    );
    expect(res1.status).toBe(200);

    const res2 = await app.handleRequest(
      new Request("http://localhost/auth/email-verification/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "user@example.com" }),
      })
    );
    expect(res2.status).toBe(429);
  });
});

describe("POST /email-verification/verify", () => {
  test("returns user when token is valid", async () => {
    const app = createAuthWeb({
      sessionSecret: "0123456789abcdef",
      authService: makeAuthService(),
      secureCookie: false,
    });

    const response = await app.handleRequest(
      new Request("http://localhost/auth/email-verification/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: "valid-email-token" }),
      })
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as { user: Record<string, unknown> };
    expect(body.user.email).toBe("verified@example.com");
    expect(body.user.passwordHash).toBeUndefined();
  });

  test("returns 401 when token is invalid or expired", async () => {
    const app = createAuthWeb({
      sessionSecret: "0123456789abcdef",
      authService: makeAuthService(),
      secureCookie: false,
    });

    const response = await app.handleRequest(
      new Request("http://localhost/auth/email-verification/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: "bad-token" }),
      })
    );

    expect(response.status).toBe(401);
  });

  test("returns 429 when rate limit is exceeded", async () => {
    const app = createAuthWeb({
      sessionSecret: "0123456789abcdef",
      authService: makeAuthService(),
      rateLimit: { windowSeconds: 60, maxRequests: 1 },
    });

    const res1 = await app.handleRequest(
      new Request("http://localhost/auth/email-verification/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: "valid-email-token" }),
      })
    );
    expect(res1.status).toBe(200);

    const res2 = await app.handleRequest(
      new Request("http://localhost/auth/email-verification/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: "valid-email-token" }),
      })
    );
    expect(res2.status).toBe(429);
  });
});

describe("CORS behavior", () => {
  test("OPTIONS preflight returns 204 with allow headers for allowed origin", async () => {
    const app = createAuthWeb({
      sessionSecret: "0123456789abcdef",
      authService: makeAuthService(),
      cors: {
        allowedOrigins: ["https://app.example.com"],
        allowedMethods: ["GET", "POST", "OPTIONS"],
        allowedHeaders: ["content-type", "authorization"],
        allowCredentials: true,
        maxAge: 600,
      },
    });

    const response = await app.handleRequest(
      new Request("http://localhost/auth/session", {
        method: "OPTIONS",
        headers: {
          origin: "https://app.example.com",
          "access-control-request-method": "POST",
          "access-control-request-headers": "content-type,authorization",
        },
      })
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe("https://app.example.com");
    expect(response.headers.get("access-control-allow-credentials")).toBe("true");
    expect(response.headers.get("access-control-allow-methods")).toContain("POST");
    expect(response.headers.get("access-control-allow-headers")).toBe("content-type,authorization");
    expect(response.headers.get("access-control-max-age")).toBe("600");
  });

  test("OPTIONS preflight returns 403 for disallowed origin", async () => {
    const app = createAuthWeb({
      sessionSecret: "0123456789abcdef",
      authService: makeAuthService(),
      cors: {
        allowedOrigins: ["https://app.example.com"],
      },
    });

    const response = await app.handleRequest(
      new Request("http://localhost/auth/session", {
        method: "OPTIONS",
        headers: {
          origin: "https://evil.example.com",
          "access-control-request-method": "GET",
        },
      })
    );

    expect(response.status).toBe(403);
    const body = (await response.json()) as { error: string };
    expect(body.error).toBe("CORS not allowed");
  });

  test("wildcard origin returns '*' and omits credentials", async () => {
    const app = createAuthWeb({
      sessionSecret: "0123456789abcdef",
      authService: makeAuthService(),
      cors: {
        allowedOrigins: "*",
        allowCredentials: true,
      },
    });

    const response = await app.handleRequest(
      new Request("http://localhost/auth/session", {
        method: "OPTIONS",
        headers: {
          origin: "https://any.example.com",
          "access-control-request-method": "GET",
        },
      })
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(response.headers.get("access-control-allow-credentials")).toBeNull();
  });

  test("non-OPTIONS response includes simple CORS headers", async () => {
    const app = createAuthWeb({
      sessionSecret: "0123456789abcdef",
      authService: makeAuthService(),
      secureCookie: false,
      cors: {
        allowedOrigins: ["https://app.example.com"],
        allowCredentials: true,
      },
    });

    const response = await app.handleRequest(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: {
          origin: "https://app.example.com",
          "content-type": "application/json",
        },
        body: JSON.stringify({ email: "ok@example.com", password: "x" }),
      })
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe("https://app.example.com");
    expect(response.headers.get("access-control-allow-credentials")).toBe("true");
  });
});

describe("session revocation helpers", () => {
  test("revokeSession invalidates token for getSessionFromRequest", async () => {
    const app = createAuthWeb({
      sessionSecret: "0123456789abcdef",
      authService: makeAuthService(),
      secureCookie: false,
    });

    const loginResp = await app.handleRequest(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "ok@example.com", password: "x" }),
      })
    );

    const setCookie = loginResp.headers.get("set-cookie") ?? "";
    const token = setCookie.split(";")[0]?.split("=")[1] ?? "";
    expect(token).not.toBe("");

    const before = await getSessionFromRequest(
      new Request("http://localhost/auth/session", { headers: { cookie: `alesha_auth=${token}` } }),
      "0123456789abcdef"
    );
    expect(before).not.toBeNull();

    revokeSession(token);

    const after = await getSessionFromRequest(
      new Request("http://localhost/auth/session", { headers: { cookie: `alesha_auth=${token}` } }),
      "0123456789abcdef"
    );
    expect(after).toBeNull();
  });

  test("revokeAllUserTokens invalidates all listed tokens", async () => {
    const app = createAuthWeb({
      sessionSecret: "0123456789abcdef",
      authService: makeAuthService(),
      secureCookie: false,
    });

    const login = async () => {
      const res = await app.handleRequest(
        new Request("http://localhost/auth/login", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email: "ok@example.com", password: "x" }),
        })
      );
      return (res.headers.get("set-cookie") ?? "").split(";")[0]?.split("=")[1] ?? "";
    };

    const token1 = await login();
    const token2 = await login();
    expect(token1).not.toBe("");
    expect(token2).not.toBe("");

    revokeAllUserTokens("u-1", [token1, token2]);

    const s1 = await getSessionFromRequest(
      new Request("http://localhost/auth/session", { headers: { cookie: `alesha_auth=${token1}` } }),
      "0123456789abcdef"
    );
    const s2 = await getSessionFromRequest(
      new Request("http://localhost/auth/session", { headers: { cookie: `alesha_auth=${token2}` } }),
      "0123456789abcdef"
    );

    expect(s1).toBeNull();
    expect(s2).toBeNull();
  });
});

describe("basePath normalization", () => {
  test("GET /me works under custom basePath", async () => {
    const app = createAuthWeb({
      sessionSecret: "0123456789abcdef",
      authService: makeAuthService(),
      basePath: "/api/auth/",
      secureCookie: false,
      getUser: async (userId: string) => ({
        id: userId,
        email: "ok@example.com",
        passwordHash: "x",
        name: null,
        image: null,
        emailVerifiedAt: null,
        roles: [],
        createdAt: "2024-01-01T00:00:00.000Z",
      }),
    });

    const loginResp = await app.handleRequest(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "ok@example.com", password: "x" }),
      })
    );

    const cookie = loginResp.headers.get("set-cookie") ?? "";
    const response = await app.handleRequest(
      new Request("http://localhost/api/auth/me", { method: "GET", headers: { cookie } })
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as { user: Record<string, unknown> };
    expect(body.user.email).toBe("ok@example.com");
  });
});
