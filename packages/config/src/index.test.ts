import { describe, expect, test } from "bun:test";
import { resolveDBType } from "./index";

describe("resolveDBType", () => {
  test("maps postgres alias", () => {
    expect(resolveDBType("postgres")).toBe("postgresql");
  });

  test("throws on invalid value", () => {
    expect(() => resolveDBType("oracle")).toThrow();
  });
});

import { resolveJWTSecret } from "./index";

describe("resolveJWTSecret", () => {
  const originalEnv = process.env.JWT_SECRET;

  test("resolves from input", () => {
    expect(resolveJWTSecret("input-secret")).toBe("input-secret");
  });

  test("resolves from process.env", () => {
    process.env.JWT_SECRET = "env-secret";
    expect(resolveJWTSecret()).toBe("env-secret");
    delete process.env.JWT_SECRET;
  });

  test("throws if no secret found", () => {
    delete process.env.JWT_SECRET;
    expect(() => resolveJWTSecret()).toThrow("JWT_SECRET is not defined");
  });

  // Cleanup
  process.env.JWT_SECRET = originalEnv;
});
