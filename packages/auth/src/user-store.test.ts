import { beforeEach, describe, expect, mock, test } from "bun:test";

const queue: unknown[][] = [];

const sqlTag = ((_: TemplateStringsArray, ...__values: unknown[]) => {
  return Promise.resolve(queue.shift() ?? []);
}) as unknown as (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown[]>;

mock.module("@alesha-nov/config", () => ({
  createDatabaseClient: () => ({ sql: sqlTag }),
}));

const { buildAuthUser, getUserById, getUserRolesInternal } = await import("./user-store");

const client = { sql: sqlTag } as unknown as { sql: typeof sqlTag };

beforeEach(() => {
  queue.length = 0;
});

describe("user-store", () => {
  test("getUserRolesInternal returns sorted role list from rows", async () => {
    queue.push([{ role: "admin" }, { role: "billing.write" }]);

    const roles = await getUserRolesInternal(client as never, "u-1");

    expect(roles).toEqual(["admin", "billing.write"]);
  });

  test("buildAuthUser maps database row to AuthUser shape", async () => {
    queue.push([{ role: "admin" }]);

    const user = await buildAuthUser(client as never, {
      id: "u-1",
      email: "user@example.com",
      password_hash: "hash",
      name: "User",
      image: null,
      email_verified_at: null,
      created_at: "2024-01-01T00:00:00.000Z",
    });

    expect(user).toEqual({
      id: "u-1",
      email: "user@example.com",
      passwordHash: "hash",
      name: "User",
      image: null,
      emailVerifiedAt: null,
      roles: ["admin"],
      createdAt: "2024-01-01T00:00:00.000Z",
    });
  });

  test("getUserById returns null when user is missing", async () => {
    queue.push([]);

    const user = await getUserById(client as never, "missing");

    expect(user).toBeNull();
  });

  test("getUserById returns hydrated AuthUser when present", async () => {
    queue.push([
      {
        id: "u-2",
        email: "u2@example.com",
        password_hash: "hash2",
        name: null,
        image: null,
        email_verified_at: "2024-01-01T00:00:00.000Z",
        created_at: "2024-01-01T00:00:00.000Z",
      },
    ]);
    queue.push([{ role: "support.write" }]);

    const user = await getUserById(client as never, "u-2");

    expect(user?.id).toBe("u-2");
    expect(user?.roles).toEqual(["support.write"]);
    expect(user?.passwordHash).toBe("hash2");
  });
});
