import { describe, expect, test } from "bun:test";
import { authMigrations } from "./index";

describe("auth migrations", () => {
  test("includes oauth and roles tables", () => {
    const sql = authMigrations.map((m) => m.sql).join("\n");
    expect(sql.includes("auth_user_roles")).toBe(true);
    expect(sql.includes("auth_oauth_accounts")).toBe(true);
  });
});
