import { describe, expect, test } from "bun:test";
import { ensureMigrationsTable, runMigrations, type Migration } from "./index";

describe("db migrations", () => {
  test("ensureMigrationsTable executes CREATE TABLE statement", async () => {
    const unsafeCalls: string[] = [];
    const client = {
      sql: Object.assign(
        async () => [],
        {
          unsafe: async (query: string) => {
            unsafeCalls.push(query);
            return [];
          },
        }
      ),
    } as never;

    await ensureMigrationsTable(client);

    expect(unsafeCalls.length).toBe(1);
    expect(unsafeCalls[0]).toContain("CREATE TABLE IF NOT EXISTS alesha_migrations");
  });

  test("runMigrations runs only pending migrations", async () => {
    const applied: string[] = [];
    const insertedIds: string[] = [];
    const checkResults = [[], [{ id: "002" }]];

    const sqlTag = (async (strings: TemplateStringsArray, ...values: unknown[]) => {
      const query = strings.join("?");
      if (query.includes("SELECT id FROM alesha_migrations")) {
        return checkResults.shift() ?? [];
      }
      if (query.includes("INSERT INTO alesha_migrations")) {
        insertedIds.push(String(values[0]));
        return [];
      }
      return [];
    }) as unknown as {
      (strings: TemplateStringsArray, ...values: unknown[]): Promise<unknown[]>;
      unsafe: (query: string) => Promise<unknown[]>;
    };

    sqlTag.unsafe = async (query: string) => {
      applied.push(query);
      return [];
    };

    const client = { sql: sqlTag } as never;

    const migrations: Migration[] = [
      { id: "001", sql: "CREATE TABLE a(id INT);" },
      { id: "002", sql: "CREATE TABLE b(id INT);" },
    ];

    await runMigrations(client, migrations);

    expect(applied.some((q) => q.includes("alesha_migrations"))).toBe(true);
    expect(applied).toContain("CREATE TABLE a(id INT);");
    expect(applied).not.toContain("CREATE TABLE b(id INT);");
    expect(insertedIds).toEqual(["001"]);
  });
});
