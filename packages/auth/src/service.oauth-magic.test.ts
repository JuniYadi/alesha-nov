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
    expect(sqlCalls.some((c) => c.text.includes("INSERT INTO auth_magic_link_tokens"))).toBe(true);
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
    expect(sqlCalls.some((c) => c.text.includes("UPDATE auth_magic_link_tokens"))).toBe(true);
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

  test("loginWithOAuth links to existing user by email and returns hydrated user", async () => {
    queue.push(
      [],
      [
        {
          id: "u-existing",
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
      [
        {
          id: "u-existing",
          email: "user@example.com",
          password_hash: "hash",
          name: "Updated User",
          image: "https://img.example/u.png",
          email_verified_at: "2024-01-01T00:00:00.000Z",
          created_at: "2024-01-01T00:00:00.000Z",
        },
      ],
      [{ role: "support.write" }]
    );

    const svc = await createAuthService({ type: "sqlite", url: ":memory:" });
    const user = await svc.loginWithOAuth({
      provider: "google",
      providerAccountId: "pid-existing",
      email: "USER@example.com",
      name: "Updated User",
      image: "https://img.example/u.png",
      emailVerified: true,
    });

    expect(user.id).toBe("u-existing");
    expect(user.roles).toEqual(["support.write"]);
    expect(sqlCalls.some((c) => c.text.includes("INSERT INTO auth_oauth_accounts"))).toBe(true);
  });

  test("loginWithOAuth creates new user, normalizes roles, and links oauth account", async () => {
    queue.push(
      [],
      [],
      [],
      [],
      [],
      [],
      [
        {
          id: "u-new",
          email: "new@example.com",
          password_hash: "oauth:google:pid-new",
          name: "New User",
          image: null,
          email_verified_at: "2024-01-01T00:00:00.000Z",
          created_at: "2024-01-01T00:00:00.000Z",
        },
      ],
      [{ role: "admin" }, { role: "billing.write" }]
    );

    const svc = await createAuthService({ type: "sqlite", url: ":memory:" });
    const user = await svc.loginWithOAuth({
      provider: "google",
      providerAccountId: "pid-new",
      email: "NEW@example.com",
      name: "New User",
      emailVerified: true,
      roles: ["Admin", "billing.write", "admin"],
    });

    expect(user.email).toBe("new@example.com");
    expect(user.roles).toEqual(["admin", "billing.write"]);
    expect(sqlCalls.filter((c) => c.text.includes("INSERT INTO auth_user_roles")).length).toBe(2);
  });

  test("loginWithOAuth throws when linked user cannot be reloaded", async () => {
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
      []
    );

    const svc = await createAuthService({ type: "sqlite", url: ":memory:" });

    await expect(
      svc.loginWithOAuth({
        provider: "google",
        providerAccountId: "pid-1",
        email: "linked@example.com",
        name: "Linked Updated",
      })
    ).rejects.toThrow("Linked user not found");
  });

  test("loginWithOAuth throws when oauth user cannot be loaded after insert", async () => {
    queue.push(
      [],
      [
        {
          id: "u-existing",
          email: "existing@example.com",
          password_hash: "hash",
          name: "Existing",
          image: null,
          email_verified_at: null,
          created_at: "2024-01-01T00:00:00.000Z",
        },
      ],
      [],
      [],
      []
    );

    const svc = await createAuthService({ type: "sqlite", url: ":memory:" });

    await expect(
      svc.loginWithOAuth({
        provider: "google",
        providerAccountId: "pid-existing",
        email: "existing@example.com",
      })
    ).rejects.toThrow("Failed to load OAuth user");
  });

  test("linkOAuthAccount returns existing link when provider account already belongs to user", async () => {
    queue.push(
      [
        {
          id: "u-1",
          email: "user@example.com",
          password_hash: "hash",
          name: "User",
          image: null,
          email_verified_at: null,
          created_at: "2024-01-01T00:00:00.000Z",
        },
      ],
      [{ role: "admin" }],
      [
        {
          id: "oa-1",
          user_id: "u-1",
          provider: "google",
          provider_account_id: "pid-1",
          provider_email: "user@example.com",
          created_at: "2024-01-01T00:00:00.000Z",
          updated_at: "2024-01-01T00:00:00.000Z",
        },
      ]
    );

    const svc = await createAuthService({ type: "sqlite", url: ":memory:" });
    const link = await svc.linkOAuthAccount({
      userId: "u-1",
      provider: "google",
      providerAccountId: "pid-1",
      providerEmail: "user@example.com",
    });

    expect(link.userId).toBe("u-1");
    expect(link.provider).toBe("google");
    expect(link.providerAccountId).toBe("pid-1");
  });

  test("linkOAuthAccount throws when provider account is already linked to another user", async () => {
    queue.push(
      [
        {
          id: "u-1",
          email: "user@example.com",
          password_hash: "hash",
          name: "User",
          image: null,
          email_verified_at: null,
          created_at: "2024-01-01T00:00:00.000Z",
        },
      ],
      [{ role: "admin" }],
      [
        {
          id: "oa-1",
          user_id: "u-2",
          provider: "google",
          provider_account_id: "pid-1",
          provider_email: "other@example.com",
          created_at: "2024-01-01T00:00:00.000Z",
          updated_at: "2024-01-01T00:00:00.000Z",
        },
      ]
    );

    const svc = await createAuthService({ type: "sqlite", url: ":memory:" });

    await expect(
      svc.linkOAuthAccount({
        userId: "u-1",
        provider: "google",
        providerAccountId: "pid-1",
      })
    ).rejects.toThrow("OAuth account already linked to another user");
  });

  test("linkOAuthAccount throws when user already linked to provider", async () => {
    queue.push(
      [
        {
          id: "u-1",
          email: "user@example.com",
          password_hash: "hash",
          name: "User",
          image: null,
          email_verified_at: null,
          created_at: "2024-01-01T00:00:00.000Z",
        },
      ],
      [{ role: "admin" }],
      [],
      [{ id: "oa-existing" }]
    );

    const svc = await createAuthService({ type: "sqlite", url: ":memory:" });

    await expect(
      svc.linkOAuthAccount({
        userId: "u-1",
        provider: "google",
        providerAccountId: "pid-2",
      })
    ).rejects.toThrow("User already linked with provider google");
  });

  test("linkOAuthAccount inserts and returns created link with normalized providerEmail", async () => {
    queue.push(
      [
        {
          id: "u-1",
          email: "user@example.com",
          password_hash: "hash",
          name: "User",
          image: null,
          email_verified_at: null,
          created_at: "2024-01-01T00:00:00.000Z",
        },
      ],
      [{ role: "admin" }],
      [],
      [],
      [],
      [
        {
          id: "oa-new",
          user_id: "u-1",
          provider: "google",
          provider_account_id: "pid-new",
          provider_email: "user@example.com",
          created_at: "2024-01-01T00:00:00.000Z",
          updated_at: "2024-01-01T00:00:00.000Z",
        },
      ]
    );

    const svc = await createAuthService({ type: "sqlite", url: ":memory:" });
    const link = await svc.linkOAuthAccount({
      userId: "u-1",
      provider: "google",
      providerAccountId: "pid-new",
      providerEmail: "USER@example.com",
    });

    expect(link.providerEmail).toBe("user@example.com");
    expect(sqlCalls.some((c) => c.text.includes("INSERT INTO auth_oauth_accounts"))).toBe(true);
  });

  test("linkOAuthAccount throws when created link cannot be loaded", async () => {
    queue.push(
      [
        {
          id: "u-1",
          email: "user@example.com",
          password_hash: "hash",
          name: "User",
          image: null,
          email_verified_at: null,
          created_at: "2024-01-01T00:00:00.000Z",
        },
      ],
      [{ role: "admin" }],
      [],
      [],
      [],
      []
    );

    const svc = await createAuthService({ type: "sqlite", url: ":memory:" });

    await expect(
      svc.linkOAuthAccount({
        userId: "u-1",
        provider: "google",
        providerAccountId: "pid-missing",
      })
    ).rejects.toThrow("Failed to load linked OAuth account");
  });

  test("linkOAuthAccount throws when user does not exist", async () => {
    queue.push([]);
    const svc = await createAuthService({ type: "sqlite", url: ":memory:" });

    await expect(
      svc.linkOAuthAccount({
        userId: "missing-user",
        provider: "google",
        providerAccountId: "pid-1",
      })
    ).rejects.toThrow("User not found");
  });

  test("linkOAuthAccount throws when providerAccountId is empty", async () => {
    const svc = await createAuthService({ type: "sqlite", url: ":memory:" });

    await expect(
      svc.linkOAuthAccount({
        userId: "u-1",
        provider: "google",
        providerAccountId: "   ",
      })
    ).rejects.toThrow("providerAccountId is required");
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
