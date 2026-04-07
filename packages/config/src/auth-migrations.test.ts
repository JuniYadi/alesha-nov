import { describe, expect, test } from "bun:test";
import { authMigrationsBundle } from "./auth-migrations";

describe("authMigrationsBundle", () => {
  test("has unique and ordered migration ids", () => {
    const ids = authMigrationsBundle.map((m) => m.id);
    const unique = new Set(ids);

    expect(unique.size).toBe(ids.length);
    expect(ids).toEqual([
      "001_create_auth_users",
      "002_create_auth_sessions",
      "003_create_auth_oauth_accounts",
      "004_create_auth_magic_link_tokens",
    ]);
  });
});
