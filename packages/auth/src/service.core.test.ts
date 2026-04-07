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

describe("createAuthService core auth", () => {
  test("signup inserts user, roles, then returns hydrated user", async () => {
    queue.push(
      [],
      [],
      [],
      [
        {
          id: "u-1",
          email: "new@example.com",
          password_hash: "hash",
          name: "New",
          image: null,
          email_verified_at: null,
          created_at: "2024-01-01T00:00:00.000Z",
        },
      ],
      [{ role: "admin" }, { role: "billing.write" }]
    );

    const svc = await createAuthService({ type: "sqlite", url: ":memory:" });
    const result = await svc.signup({
      email: "NEW@example.com",
      password: "secret",
      name: "New",
      roles: ["Admin", "billing.write"],
    });

    expect(result.email).toBe("new@example.com");
    expect(result.roles).toEqual(["admin", "billing.write"]);
    expect(sqlCalls.some((c) => c.text.includes("INSERT INTO auth_users"))).toBe(true);
    expect(sqlCalls.filter((c) => c.text.includes("INSERT INTO auth_user_roles")).length).toBe(2);
  });

  test("login success returns hydrated user", async () => {
    queue.push(
      [
        {
          id: "u-2",
          email: "user@example.com",
          password_hash: hashPassword("correct-password"),
          name: "User",
          image: null,
          email_verified_at: null,
          created_at: "2024-01-01T00:00:00.000Z",
        },
      ],
      [{ role: "support.write" }]
    );

    const svc = await createAuthService({ type: "sqlite", url: ":memory:" });
    const user = await svc.login({ email: "USER@example.com", password: "correct-password" });

    expect(user?.id).toBe("u-2");
    expect(user?.roles).toEqual(["support.write"]);
  });

  test("setUserRoles normalizes and replaces roles", async () => {
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
      [],
      [],
      [],
      [{ role: "user" }, { role: "admin" }]
    );

    const svc = await createAuthService({ type: "sqlite", url: ":memory:" });
    const roles = await svc.setUserRoles("u-1", ["ADMIN", "  user  ", "admin"]);

    expect(roles).toEqual(["admin", "user"]);
    expect(sqlCalls.some((c) => c.text.includes("DELETE FROM auth_user_roles"))).toBe(true);
    expect(sqlCalls.filter((c) => c.text.includes("INSERT INTO auth_user_roles")).length).toBe(2);
  });

  test("getUserRoles returns roles for user", async () => {
    queue.push([{ role: "admin" }, { role: "editor" }]);

    const svc = await createAuthService({ type: "sqlite", url: ":memory:" });
    const roles = await svc.getUserRoles("u-1");

    expect(roles).toEqual(["admin", "editor"]);
    expect(sqlCalls.some((c) => c.text.includes("SELECT role") && c.text.includes("FROM auth_user_roles"))).toBe(true);
  });
});
