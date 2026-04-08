import { describe, expect, test } from "bun:test";
import { authMigrations } from "./migrations";

describe("auth migrations", () => {
  test("includes oauth and roles tables", () => {
    const sql = authMigrations.map((m) => m.sql).join("\n");
    expect(sql.includes("auth_user_roles")).toBe(true);
    expect(sql.includes("auth_oauth_accounts")).toBe(true);
  });

  test("migration ids are unique and ordered", () => {
    const ids = authMigrations.map((m) => m.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
    expect(ids[0]).toBe("001_create_auth_users");
    expect(ids[ids.length - 1]).toBe("010_create_email_verification_tokens");
  });
});
