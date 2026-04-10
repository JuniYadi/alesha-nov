import { beforeEach, describe, expect, mock, test } from "bun:test";
import type { EmailMessage } from "@alesha-nov/email";
import { hashPassword } from "./utils";

const sqlCalls: Array<{ text: string; values: unknown[] }> = [];
const queue: unknown[][] = [];

const sqlTag = ((strings: TemplateStringsArray, ...values: unknown[]) => {
  sqlCalls.push({ text: strings.join("?"), values });
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
  sqlCalls.length = 0;
  queue.length = 0;
});

describe("createAuthService", () => {
  test("login returns null when user does not exist", async () => {
    queue.push([]);

    const svc = await createAuthService({ type: "sqlite", url: ":memory:" });
    const result = await svc.login({ email: "none@example.com", password: "x" });

    expect(result).toBeNull();
    expect(sqlCalls.length).toBe(1);
  });

  test("login returns null when password is invalid", async () => {
    queue.push([
      {
        id: "u-1",
        email: "user@example.com",
        password_hash: hashPassword("correct-password"),
        name: null,
        image: null,
        email_verified_at: null,
        created_at: "2024-01-01T00:00:00.000Z",
      },
    ]);

    const svc = await createAuthService({ type: "sqlite", url: ":memory:" });
    const result = await svc.login({ email: "user@example.com", password: "wrong-password" });

    expect(result).toBeNull();
  });

  test("issueMagicLinkToken throws when user does not exist", async () => {
    queue.push([]);
    const svc = await createAuthService({ type: "sqlite", url: ":memory:" });

    await expect(svc.issueMagicLinkToken({ email: "missing@example.com" })).rejects.toThrow("User not found");
  });

  test("issueMagicLinkToken auto-delivers email when provider is configured", async () => {
    queue.push([{ id: "u-1" }], []);
    const sentMessages: EmailMessage[] = [];
    const svc = await createAuthService(
      { type: "sqlite", url: ":memory:" },
      {
        email: {
          from: "noreply@example.com",
          provider: {
            send: async (message) => {
              sentMessages.push(message);
              return { id: "msg-1" };
            },
          },
        },
      }
    );

    await svc.issueMagicLinkToken({ email: "User@Example.com", ttlSeconds: 120 });

    expect(sentMessages).toHaveLength(1);
    expect(sentMessages[0]?.to).toBe("user@example.com");
    expect(sentMessages[0]?.from).toBe("noreply@example.com");
    expect(sentMessages[0]?.subject).toBe("Your Magic Link");
  });

  test("issueMagicLinkToken skips auto-delivery when flow is disabled", async () => {
    queue.push([{ id: "u-1" }], []);
    let sends = 0;
    const svc = await createAuthService(
      { type: "sqlite", url: ":memory:" },
      {
        email: {
          from: "noreply@example.com",
          provider: {
            send: async () => {
              sends += 1;
              return { id: "msg-1" };
            },
          },
          magicLink: {
            enabled: false,
          },
        },
      }
    );

    await svc.issueMagicLinkToken({ email: "user@example.com" });

    expect(sends).toBe(0);
  });

  test("verifyMagicLinkToken returns null when token has been used", async () => {
    queue.push([
      {
        user_id: "u-1",
        expires_at: "2999-01-01T00:00:00.000Z",
        used_at: "2024-01-01T00:00:00.000Z",
        id: "u-1",
        email: "user@example.com",
        password_hash: "ignored",
        name: null,
        image: null,
        email_verified_at: null,
        created_at: "2024-01-01T00:00:00.000Z",
      },
    ]);

    const svc = await createAuthService({ type: "sqlite", url: ":memory:" });
    const result = await svc.verifyMagicLinkToken("token");

    expect(result).toBeNull();
  });

  test("setUserRoles throws when user does not exist", async () => {
    queue.push([]);
    const svc = await createAuthService({ type: "sqlite", url: ":memory:" });

    await expect(svc.setUserRoles("missing-user", ["admin"])).rejects.toThrow("User not found");
  });

  test("issuePasswordResetToken throws when user does not exist", async () => {
    queue.push([]);
    const svc = await createAuthService({ type: "sqlite", url: ":memory:" });

    await expect(svc.issuePasswordResetToken({ email: "missing@example.com" })).rejects.toThrow("User not found");
  });

  test("resetPassword returns false when token does not exist", async () => {
    queue.push([]);
    const svc = await createAuthService({ type: "sqlite", url: ":memory:" });

    await expect(svc.resetPassword({ token: "missing", newPassword: "new-pass-123" })).resolves.toBe(false);
  });

  test("resetPassword returns false when token already used", async () => {
    queue.push([{ user_id: "u-1", expires_at: "2999-01-01T00:00:00.000Z", used_at: "2024-01-01T00:00:00.000Z" }]);
    const svc = await createAuthService({ type: "sqlite", url: ":memory:" });

    await expect(svc.resetPassword({ token: "used-token", newPassword: "new-pass-123" })).resolves.toBe(false);
  });

  test("resetPassword returns false when token expired", async () => {
    queue.push([{ user_id: "u-1", expires_at: "2000-01-01T00:00:00.000Z", used_at: null }]);
    const svc = await createAuthService({ type: "sqlite", url: ":memory:" });

    await expect(svc.resetPassword({ token: "expired-token", newPassword: "new-pass-123" })).resolves.toBe(false);
  });

  test("resetPassword updates password and marks token used when valid", async () => {
    queue.push([{ user_id: "u-1", expires_at: "2999-01-01T00:00:00.000Z", used_at: null }], [], []);
    const svc = await createAuthService({ type: "sqlite", url: ":memory:" });

    const ok = await svc.resetPassword({ token: "valid-token", newPassword: "new-pass-123" });

    expect(ok).toBe(true);
    expect(sqlCalls.some((c) => c.text.includes("UPDATE auth_users") && c.text.includes("password_hash"))).toBe(true);
    expect(sqlCalls.some((c) => c.text.includes("UPDATE auth_password_reset_tokens") && c.text.includes("SET used_at"))).toBe(true);
  });

  test("issuePasswordResetToken creates token with custom TTL", async () => {
    queue.push([{ id: "u-1" }], []);
    const svc = await createAuthService({ type: "sqlite", url: ":memory:" });

    const token = await svc.issuePasswordResetToken({ email: "user@example.com", ttlSeconds: 120 });

    expect(typeof token).toBe("string");
    expect(sqlCalls.some((c) => c.text.includes("INSERT INTO auth_password_reset_tokens"))).toBe(true);
    const insertCall = sqlCalls.find((c) => c.text.includes("INSERT INTO auth_password_reset_tokens"));
    expect(insertCall?.values).toContain("u-1");
  });

  test("issuePasswordResetToken auto-delivers email with custom renderer", async () => {
    queue.push([{ id: "u-1" }], []);
    const sentMessages: EmailMessage[] = [];
    const svc = await createAuthService(
      { type: "sqlite", url: ":memory:" },
      {
        email: {
          from: "noreply@example.com",
          provider: {
            send: async (message) => {
              sentMessages.push(message);
              return { id: "msg-2" };
            },
          },
          passwordReset: {
            to: (context) => `alerts+${context.email}`,
            from: "security@example.com",
            render: (context) => ({
              subject: "Reset credentials",
              html: `<p>${context.flow}:${context.token}</p>`,
              text: `${context.flow}:${context.token}`,
            }),
          },
        },
      }
    );

    await svc.issuePasswordResetToken({ email: "user@example.com", ttlSeconds: 300 });

    expect(sentMessages).toHaveLength(1);
    expect(sentMessages[0]?.to).toBe("alerts+user@example.com");
    expect(sentMessages[0]?.from).toBe("security@example.com");
    expect(sentMessages[0]?.subject).toBe("Reset credentials");
  });

  test("issueEmailVerificationToken throws when user does not exist", async () => {
    queue.push([]);
    const svc = await createAuthService({ type: "sqlite", url: ":memory:" });

    await expect(svc.issueEmailVerificationToken({ email: "missing@example.com" })).rejects.toThrow("User not found");
  });

  test("issueEmailVerificationToken creates token with default TTL", async () => {
    queue.push([{ id: "u-1" }], []);
    const svc = await createAuthService({ type: "sqlite", url: ":memory:" });

    const token = await svc.issueEmailVerificationToken({ email: "user@example.com" });

    expect(typeof token).toBe("string");
    const insertCall = sqlCalls.find((c) => c.text.includes("INSERT INTO auth_email_verification_tokens"));
    expect(insertCall).toBeDefined();
    expect(insertCall?.values).toContain("u-1");
  });

  test("issueEmailVerificationToken auto-delivers email and allows custom recipient", async () => {
    queue.push([{ id: "u-1" }], []);
    const sentMessages: EmailMessage[] = [];
    const svc = await createAuthService(
      { type: "sqlite", url: ":memory:" },
      {
        email: {
          from: "noreply@example.com",
          provider: {
            send: async (message) => {
              sentMessages.push(message);
              return { id: "msg-3" };
            },
          },
          emailVerification: {
            to: () => ["user@example.com", "audit@example.com"],
          },
        },
      }
    );

    await svc.issueEmailVerificationToken({ email: "user@example.com", ttlSeconds: 90 });

    expect(sentMessages).toHaveLength(1);
    expect(sentMessages[0]?.to).toEqual(["user@example.com", "audit@example.com"]);
    expect(sentMessages[0]?.subject).toBe("Verify Your Email");
  });

  test("verifyEmailVerificationToken returns null when token not found", async () => {
    queue.push([]);
    const svc = await createAuthService({ type: "sqlite", url: ":memory:" });

    const user = await svc.verifyEmailVerificationToken("missing-token");
    expect(user).toBeNull();
  });

  test("verifyEmailVerificationToken returns null when token already used", async () => {
    queue.push([
      {
        user_id: "u-1",
        expires_at: "2999-01-01T00:00:00.000Z",
        used_at: "2024-01-01T00:00:00.000Z",
        id: "u-1",
        email: "user@example.com",
        password_hash: "hash",
        name: null,
        image: null,
        email_verified_at: null,
        created_at: "2024-01-01T00:00:00.000Z",
      },
    ]);
    const svc = await createAuthService({ type: "sqlite", url: ":memory:" });

    const user = await svc.verifyEmailVerificationToken("used-token");
    expect(user).toBeNull();
  });

  test("verifyEmailVerificationToken returns null when token expired", async () => {
    queue.push([
      {
        user_id: "u-1",
        expires_at: "2000-01-01T00:00:00.000Z",
        used_at: null,
        id: "u-1",
        email: "user@example.com",
        password_hash: "hash",
        name: null,
        image: null,
        email_verified_at: null,
        created_at: "2024-01-01T00:00:00.000Z",
      },
    ]);
    const svc = await createAuthService({ type: "sqlite", url: ":memory:" });

    const user = await svc.verifyEmailVerificationToken("expired-token");
    expect(user).toBeNull();
  });

  test("verifyEmailVerificationToken marks token used, updates user, and returns hydrated user", async () => {
    queue.push(
      [
        {
          user_id: "u-1",
          expires_at: "2999-01-01T00:00:00.000Z",
          used_at: null,
          id: "u-1",
          email: "user@example.com",
          password_hash: "hash",
          name: "User",
          image: null,
          email_verified_at: null,
          created_at: "2024-01-01T00:00:00.000Z",
        },
      ],
      [],
      [],
      [{ role: "admin" }]
    );
    const svc = await createAuthService({ type: "sqlite", url: ":memory:" });

    const user = await svc.verifyEmailVerificationToken("valid-token");

    expect(user).not.toBeNull();
    expect(user?.id).toBe("u-1");
    expect(sqlCalls.some((c) => c.text.includes("UPDATE auth_email_verification_tokens") && c.text.includes("SET used_at"))).toBe(true);
    expect(sqlCalls.some((c) => c.text.includes("UPDATE auth_users") && c.text.includes("email_verified_at"))).toBe(true);
  });
});
