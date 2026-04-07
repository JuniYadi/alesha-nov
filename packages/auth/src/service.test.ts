import { beforeEach, describe, expect, mock, test } from "bun:test";
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
});
