import { describe, expect, test } from "bun:test";
import { resolveDBType } from "./index";

describe("resolveDBType", () => {
  test("returns mysql", () => {
    expect(resolveDBType("mysql")).toBe("mysql");
  });

  test("maps postgres alias", () => {
    expect(resolveDBType("postgres")).toBe("postgresql");
  });

  test("returns sqlite", () => {
    expect(resolveDBType("sqlite")).toBe("sqlite");
  });

  test("throws on invalid value", () => {
    expect(() => resolveDBType("oracle")).toThrow();
  });
});
