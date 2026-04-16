import { beforeEach, describe, expect, mock, test } from "bun:test";
import { hashPassword } from "./utils";

type SqlCall = { text: string; values: unknown[] };

const sqlCalls: SqlCall[] = [];
const queue: unknown[][] = [];

const sqlTag = ((strings: TemplateStringsArray, ...values: unknown[]) => {
  sqlCalls.push({ text: strings.join("?"), values });
  return Promise.resolve(queue.shift() ?? []);
}) as unknown as {
  (strings: TemplateStringsArray, ...values: unknown[]): Promise<unknown[]>;
  unsafe?: (query: string) => Promise<unknown[]>;
};

mock.module("@alesha-nov/db", () => ({
  createDatabaseClient: () => ({ sql: sqlTag }),
  runMigrations: async () => {},
}));

const { createAuthService } = await import("./service");

beforeEach(() => {
  sqlCalls.length = 0;
  queue.length = 0;
});

describe("createAuthService security + auth contracts", () => {
  test("signup enforces password policy and returns merged errors", async () => {
    const svc = await createAuthService(
      { type: "sqlite", url: ":memory:" },
      {
        passwordPolicyValidator: {
          validate: () => ({ valid: false, errors: ["too short", "missing symbol"] }),
        },
      }
    );

    await expect(
      svc.signup({ email: "u@example.com", password: "weak", name: "Weak User" })
    ).rejects.toThrow("too short; missing symbol");

    expect(sqlCalls.length).toBe(0);
  });

  test("signup emits SIGNUP audit event", async () => {
    const events: Array<{ type: string; userId?: string; email?: string }> = [];

    queue.push(
      [],
      [],
      [
        {
          id: "u-signup",
          email: "new@example.com",
          password_hash: "hash",
          name: "New",
          image: null,
          email_verified_at: null,
          created_at: "2024-01-01T00:00:00.000Z",
        },
      ],
      [{ role: "admin" }]
    );

    const svc = await createAuthService(
      { type: "sqlite", url: ":memory:" },
      {
        auditSink: {
          emit: async (event) => {
            events.push({ type: event.type, userId: event.userId, email: event.email });
          },
        },
      }
    );

    await svc.signup({
      email: "new@example.com",
      password: "StrongPass1",
      roles: ["admin"],
    });

    expect(events.some((event) => event.type === "SIGNUP" && event.userId === "u-signup")).toBe(true);
  });

  test("login emits LOGIN_FAIL on invalid credentials and LOGIN on success", async () => {
    const events: Array<{ type: string; email?: string; userId?: string }> = [];

    queue.push(
      [
        {
          id: "u-login",
          email: "user@example.com",
          password_hash: hashPassword("GoodPass1"),
          name: null,
          image: null,
          email_verified_at: null,
          created_at: "2024-01-01T00:00:00.000Z",
        },
      ],
      [
        {
          id: "u-login",
          email: "user@example.com",
          password_hash: hashPassword("GoodPass1"),
          name: null,
          image: null,
          email_verified_at: null,
          created_at: "2024-01-01T00:00:00.000Z",
        },
      ],
      [{ role: "admin" }]
    );

    const svc = await createAuthService(
      { type: "sqlite", url: ":memory:" },
      {
        auditSink: {
          emit: async (event) => {
            events.push({ type: event.type, email: event.email, userId: event.userId });
          },
        },
        loginProtection: {
          maxAttempts: 5,
          lockoutSeconds: 5,
          windowSeconds: 60,
        },
      }
    );

    await expect(svc.login({ email: "user@example.com", password: "bad" })).resolves.toBeNull();
    await expect(svc.login({ email: "user@example.com", password: "GoodPass1" })).resolves.not.toBeNull();

    expect(events.some((event) => event.type === "LOGIN_FAIL")).toBe(true);
    expect(events.some((event) => event.type === "LOGIN" && event.userId === "u-login")).toBe(true);
  });

  test("login lockout denies attempts after threshold", async () => {
    queue.push(
      [
        {
          id: "u-lock",
          email: "lock@example.com",
          password_hash: "invalid",
          name: null,
          image: null,
          email_verified_at: null,
          created_at: "2024-01-01T00:00:00.000Z",
        },
      ],
      [
        {
          id: "u-lock",
          email: "lock@example.com",
          password_hash: "invalid",
          name: null,
          image: null,
          email_verified_at: null,
          created_at: "2024-01-01T00:00:00.000Z",
        },
      ]
    );

    const svc = await createAuthService(
      { type: "sqlite", url: ":memory:" },
      {
        loginProtection: {
          maxAttempts: 2,
          lockoutSeconds: 60,
          windowSeconds: 60,
        },
      }
    );

    await expect(svc.login({ email: "lock@example.com", password: "bad-1" })).resolves.toBeNull();
    await expect(svc.login({ email: "lock@example.com", password: "bad-2" })).resolves.toBeNull();
    await expect(svc.login({ email: "lock@example.com", password: "bad-3" })).rejects.toThrow("Account locked.");
  });

  test("resetPassword enforces password policy", async () => {
    queue.push([{ user_id: "u-1", expires_at: "2999-01-01T00:00:00.000Z", used_at: null }]);

    const svc = await createAuthService(
      { type: "sqlite", url: ":memory:" },
      {
        passwordPolicyValidator: {
          validate: () => ({ valid: false, errors: ["missing complexity"] }),
        },
      }
    );

    await expect(svc.resetPassword({ token: "t-1", newPassword: "weak" })).rejects.toThrow("missing complexity");
  });

  test("resetPassword emits PASSWORD_RESET and PASSWORD_RESET_FAIL events", async () => {
    const events: string[] = [];

    queue.push(
      [{ user_id: "u-1", expires_at: "2999-01-01T00:00:00.000Z", used_at: null }],
      [],
      [],
      []
    );

    const svc = await createAuthService(
      { type: "sqlite", url: ":memory:" },
      {
        auditSink: {
          emit: async (event) => {
            events.push(event.type);
          },
        },
      }
    );

    await expect(svc.resetPassword({ token: "ok-token", newPassword: "StrongPass1" })).resolves.toBe(true);
    await expect(svc.resetPassword({ token: "missing-token", newPassword: "StrongPass1" })).resolves.toBe(false);

    expect(events).toContain("PASSWORD_RESET");
    expect(events).toContain("PASSWORD_RESET_FAIL");
  });

  test("issueSession returns session contract and emits SESSION_ISSUED", async () => {
    const events: string[] = [];

    queue.push(
      [
        {
          id: "u-session",
          email: "sess@example.com",
          password_hash: "x",
          name: null,
          image: null,
          email_verified_at: null,
          created_at: "2024-01-01T00:00:00.000Z",
        },
      ],
      [{ role: "member" }]
    );

    const svc = await createAuthService(
      { type: "sqlite", url: ":memory:" },
      {
        auditSink: {
          emit: async (event) => {
            events.push(event.type);
          },
        },
      }
    );

    const session = await svc.issueSession("u-session");

    expect(session.subject).toBe("u-session");
    expect(session.accessToken.length).toBeGreaterThan(10);
    expect(session.refreshToken.length).toBeGreaterThan(10);
    expect(events).toContain("SESSION_ISSUED");
  });

  test("refreshSession emits success and failure events", async () => {
    const events: string[] = [];

    const customStrategy = {
      issueSession: async () => ({
        accessToken: "a",
        refreshToken: "r-ok",
        tokenType: "Bearer",
        expiresInSeconds: 60,
        refreshExpiresInSeconds: 120,
        subject: "u-1",
      }),
      refreshSession: async (refreshToken: string) => {
        if (refreshToken === "r-ok") {
          return {
            accessToken: "a2",
            refreshToken: "r-next",
            tokenType: "Bearer",
            expiresInSeconds: 60,
            refreshExpiresInSeconds: 120,
            subject: "u-1",
          };
        }
        return null;
      },
    };

    queue.push(
      [
        {
          id: "u-1",
          email: "u@example.com",
          password_hash: "x",
          name: null,
          image: null,
          email_verified_at: null,
          created_at: "2024-01-01T00:00:00.000Z",
        },
      ],
      []
    );

    const svc = await createAuthService(
      { type: "sqlite", url: ":memory:" },
      {
        sessionStrategy: customStrategy,
        auditSink: {
          emit: async (event) => {
            events.push(event.type);
          },
        },
      }
    );

    await svc.issueSession("u-1");
    await expect(svc.refreshSession("r-ok")).resolves.not.toBeNull();
    await expect(svc.refreshSession("bad")).resolves.toBeNull();

    expect(events).toContain("SESSION_REFRESH");
    expect(events).toContain("SESSION_REFRESH_FAIL");
  });

  test("default in-memory session strategy refreshes valid token", async () => {
    queue.push(
      [
        {
          id: "u-default-refresh",
          email: "default-refresh@example.com",
          password_hash: "x",
          name: null,
          image: null,
          email_verified_at: null,
          created_at: "2024-01-01T00:00:00.000Z",
        },
      ],
      [{ role: "member" }]
    );

    const svc = await createAuthService({ type: "sqlite", url: ":memory:" });

    const session = await svc.issueSession("u-default-refresh");
    const refreshed = await svc.refreshSession(session.refreshToken);

    expect(refreshed).not.toBeNull();
    expect(refreshed?.subject).toBe("u-default-refresh");
    expect(refreshed?.refreshToken).not.toBe(session.refreshToken);
    await expect(svc.refreshSession(session.refreshToken)).resolves.toBeNull();
  });

  test("default in-memory session strategy rejects expired refresh token", async () => {
    const originalNow = Date.now;
    let now = 1700000000000;
    Date.now = () => now;

    try {
      queue.push(
        [
          {
            id: "u-expired-refresh",
            email: "expired-refresh@example.com",
            password_hash: "x",
            name: null,
            image: null,
            email_verified_at: null,
            created_at: "2024-01-01T00:00:00.000Z",
          },
        ],
        [{ role: "member" }]
      );

      const svc = await createAuthService({ type: "sqlite", url: ":memory:" });
      const session = await svc.issueSession("u-expired-refresh");

      now += 8 * 24 * 60 * 60 * 1000;
      await expect(svc.refreshSession(session.refreshToken)).resolves.toBeNull();
    } finally {
      Date.now = originalNow;
    }
  });
});
