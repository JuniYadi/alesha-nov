import { describe, expect, test } from "bun:test";
import { createDatabaseClient, resolveDBType } from "./index";

const BunRuntime = globalThis as {
  Bun?: {
    sql?: unknown;
  };
};

function withBunSql<T>(nextSql: unknown, run: () => T): T {
  const bun = BunRuntime.Bun;
  const previousSql = bun?.sql;

  if (!bun) {
    throw new Error("Bun runtime is not available in this test environment.");
  }

  bun.sql = nextSql;
  try {
    return run();
  } finally {
    bun.sql = previousSql;
  }
}

describe("createDatabaseClient", () => {
  test("throws with clear error when Bun.sql is missing", () => {
    expect(() => {
      withBunSql(undefined, () => createDatabaseClient({ type: "sqlite", url: ":memory:" }));
    }).toThrow(
      "Bun SQL runtime is not available. Run the app in a Bun runtime to use @alesha-nov/db."
    );
  });

  test("throws with clear error when Bun.sql is not callable", () => {
    expect(() => {
      withBunSql({}, () => createDatabaseClient({ type: "sqlite", url: ":memory:" }));
    }).toThrow("Bun SQL runtime is not callable. Check the Bun environment version.");
  });

  test("returns configured client when Bun.sql is valid", () => {
    const fakeSql = function (_url: string, _options?: { max?: number }) {
      return {
        __url: _url,
        __options: _options,
      } as unknown as ReturnType<typeof createDatabaseClient>["sql"];
    };

    const client = withBunSql(fakeSql, () =>
      createDatabaseClient({ type: "sqlite", url: ":memory:", maxConnections: 12 })
    );

    expect(client.config).toEqual({ type: "sqlite", url: ":memory:", maxConnections: 12 });
    expect((client.sql as { __url?: string; __options?: { max?: number } }).__url).toBe(":memory:");
    expect((client.sql as { __options?: { max?: number } }).__options?.max).toBe(12);
  });
});

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
