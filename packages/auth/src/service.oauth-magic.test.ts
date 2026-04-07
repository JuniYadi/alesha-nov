import { beforeEach, describe, expect, mock, test } from "bun:test";

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

describe("createAuthService oauth + magic-link", () => {
  test("issueMagicLinkToken creates token for existing user", async () => {
    queue.push([{ id: "u-1" }], []);

    const svc = await createAuthService({ type: "sqlite", url: ":memory:" });
    const token = await svc.issueMagicLinkToken({ email: "user@example.com", ttlSeconds: 60 });

    expect(typeof token).toBe("string");
    expect(token.length > 10).toBe(true);
    expect(sqlCalls.some((c) => c.text.includes("INSERT INTO auth_magic_links"))).toBe(true);
  });

  test("verifyMagicLinkToken returns user and marks token used", async () => {
    queue.push(
      [
        {
          user_id: "u-1",
          expires_at: "2999-01-01T00:00:00.000Z",
          used_at: null,
          id: "u-1",
          email: "user@example.com",
          password_hash: "hash",
          name: null,
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
    const user = await svc.verifyMagicLinkToken("valid-token");

    expect(user?.id).toBe("u-1");
    expect(user?.roles).toEqual(["admin"]);
    expect(sqlCalls.some((c) => c.text.includes("UPDATE auth_magic_links"))).toBe(true);
    expect(sqlCalls.some((c) => c.text.includes("UPDATE auth_users"))).toBe(true);
  });

  test("verifyMagicLinkToken returns null when expired", async () => {
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
    const user = await svc.verifyMagicLinkToken("expired-token");

    expect(user).toBeNull();
  });

  test("loginWithOAuth throws when providerAccountId is empty", async () => {
    const svc = await createAuthService({ type: "sqlite", url: ":memory:" });

    await expect(
      svc.loginWithOAuth({
        provider: "google",
        providerAccountId: "   ",
        email: "user@example.com",
      })
    ).rejects.toThrow("providerAccountId is required");
  });

  test("loginWithOAuth returns already-linked user", async () => {
    queue.push(
      [
        {
          id: "u-linked",
          email: "linked@example.com",
          password_hash: "hash",
          name: "Linked",
          image: null,
          email_verified_at: null,
          created_at: "2024-01-01T00:00:00.000Z",
        },
      ],
      [],
      [
        {
          id: "u-linked",
          email: "linked@example.com",
          password_hash: "hash",
          name: "Linked Updated",
          image: null,
          email_verified_at: null,
          created_at: "2024-01-01T00:00:00.000Z",
        },
      ],
      [{ role: "support.write" }]
    );

    const svc = await createAuthService({ type: "sqlite", url: ":memory:" });
    const user = await svc.loginWithOAuth({
      provider: "google",
      providerAccountId: "pid-1",
      email: "linked@example.com",
      name: "Linked Updated",
    });

    expect(user.id).toBe("u-linked");
    expect(user.roles).toEqual(["support.write"]);
  });

  test("getLinkedAccounts maps rows to output shape", async () => {
    queue.push([
      {
        id: "oa-1",
        user_id: "u-1",
        provider: "google",
        provider_account_id: "pid-1",
        provider_email: "u@example.com",
        created_at: "2024-01-01T00:00:00.000Z",
        updated_at: "2024-01-01T00:00:00.000Z",
      },
    ]);

    const svc = await createAuthService({ type: "sqlite", url: ":memory:" });
    const accounts = await svc.getLinkedAccounts("u-1");

    expect(accounts).toEqual([
      {
        id: "oa-1",
        userId: "u-1",
        provider: "google",
        providerAccountId: "pid-1",
        providerEmail: "u@example.com",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      },
    ]);
  });
});
