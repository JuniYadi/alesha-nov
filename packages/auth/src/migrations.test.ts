import { describe, expect, test } from "bun:test";
import { authMigrationsBundle } from "@alesha-nov/config/auth-migrations";
import { authMigrations } from "./migrations";

describe("auth migrations", () => {
  test("re-exports config auth migration bundle as canonical source", () => {
    expect(authMigrations).toBe(authMigrationsBundle);
  });

  test("includes oauth and roles tables", () => {
    const sql = authMigrations.map((m) => m.sql).join("\n");
    expect(sql.includes("auth_user_roles")).toBe(true);
    expect(sql.includes("auth_oauth_accounts")).toBe(true);
  });

  test("migration ids are unique and ordered", () => {
    const ids = authMigrations.map((m) => m.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
    expect(ids).toEqual([
      "001_create_auth_users",
      "002_create_auth_sessions",
      "003_create_auth_magic_link_tokens",
      "004_create_auth_user_roles",
      "005_create_auth_oauth_accounts",
      "006_create_auth_password_reset_tokens",
      "007_create_auth_email_verification_tokens",
    ]);
  });
});
