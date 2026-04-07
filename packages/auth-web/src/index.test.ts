import { describe, expect, test } from "bun:test";
import { createAuthWeb, getSessionFromRequest } from "./index";

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
