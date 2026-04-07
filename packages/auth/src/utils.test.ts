import { describe, expect, test } from "bun:test";
import { assertProvider, hashPassword, hashToken, normalizeEmail, normalizeRoles, verifyPassword } from "./utils";

describe("auth utils", () => {
  test("normalizeEmail trims and lowercases", () => {
    expect(normalizeEmail("  USER@Example.COM  ")).toBe("user@example.com");
  });

  test("normalizeRoles trims, lowercases, de-duplicates, and removes empties", () => {
    expect(normalizeRoles([" Admin ", "admin", "", "Billing.Write "])).toEqual(["admin", "billing.write"]);
  });

  test("normalizeRoles rejects invalid role format", () => {
    expect(() => normalizeRoles(["bad role"])).toThrow("Invalid role format");
  });

  test("hashPassword and verifyPassword roundtrip", () => {
    const hash = hashPassword("s3cr3t");
    expect(hash.includes(":")).toBe(true);
    expect(verifyPassword("s3cr3t", hash)).toBe(true);
    expect(verifyPassword("wrong", hash)).toBe(false);
  });

  test("verifyPassword returns false on malformed hash", () => {
    expect(verifyPassword("x", "not-a-valid-hash")).toBe(false);
  });

  test("hashToken is deterministic sha256", () => {
    expect(hashToken("token")).toBe("3c469e9d6c5875d37a43f353d4f88e61fcf812c66eee3457465a40b0da4153e0");
  });

  test("assertProvider accepts known providers and rejects unknown", () => {
    expect(() => assertProvider("google")).not.toThrow();
    expect(() => assertProvider("github")).not.toThrow();
    expect(() => assertProvider("discord")).toThrow("Unsupported OAuth provider");
  });
});
