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
