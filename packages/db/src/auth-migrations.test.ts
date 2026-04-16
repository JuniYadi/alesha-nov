import { describe, expect, test } from "bun:test";
import { authMigrationsBundle } from "./auth-migrations";
import { createDatabaseClient, runMigrations } from "./index";

describe("authMigrationsBundle", () => {
  test("has unique and ordered migration ids", () => {
    const ids = authMigrationsBundle.map((m) => m.id);
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

  test("includes full auth table set required by auth service", () => {
    const sql = authMigrationsBundle.map((migration) => migration.sql).join("\n");

    expect(sql.includes("auth_users")).toBe(true);
    expect(sql.includes("auth_sessions")).toBe(true);
    expect(sql.includes("auth_magic_link_tokens")).toBe(true);
    expect(sql.includes("auth_user_roles")).toBe(true);
    expect(sql.includes("auth_oauth_accounts")).toBe(true);
    expect(sql.includes("auth_password_reset_tokens")).toBe(true);
    expect(sql.includes("auth_email_verification_tokens")).toBe(true);
  });

  test("runs idempotently against sqlite integration", async () => {
    const client = createDatabaseClient({ type: "sqlite", url: ":memory:" });

    await runMigrations(client, authMigrationsBundle);
    await runMigrations(client, authMigrationsBundle);

    const [{ count }] = (await client.sql`
      SELECT COUNT(*) AS count
      FROM alesha_migrations
    `) as Array<{ count: number }>;

    expect(count).toBe(authMigrationsBundle.length);

    const tables = await client.sql`
      SELECT name
      FROM sqlite_master
      WHERE type = 'table'
        AND name IN (
          'auth_users',
          'auth_sessions',
          'auth_magic_link_tokens',
          'auth_user_roles',
          'auth_oauth_accounts',
          'auth_password_reset_tokens',
          'auth_email_verification_tokens'
        )
    `;

    expect(tables.length).toBe(7);
  });
});
