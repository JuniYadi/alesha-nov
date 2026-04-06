import { describe, expect, test } from "bun:test";
import { authMigrations, hashToken, normalizeEmail } from "./index";

describe("auth public barrel exports", () => {
  test("re-exports migration list", () => {
    expect(Array.isArray(authMigrations)).toBe(true);
    expect(authMigrations.length > 0).toBe(true);
  });

  test("re-exports utility helpers", () => {
    expect(normalizeEmail("  USER@example.com ")).toBe("user@example.com");
    expect(hashToken("token")).toBe("3c469e9d6c5875d37a43f353d4f88e61fcf812c66eee3457465a40b0da4153e0");
  });
});
