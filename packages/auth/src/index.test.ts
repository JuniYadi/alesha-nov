import { describe, expect, test } from "bun:test";
import { authMigrations } from "./migrations";

describe("auth migrations surface", () => {
  test("contains expected migration identifiers", () => {
    expect(authMigrations[0]?.id).toBe("001_create_auth_users");
    expect(authMigrations[authMigrations.length - 1]?.id).toBe("009_create_password_reset_tokens");
  });
});
