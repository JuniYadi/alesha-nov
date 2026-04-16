import { SQL } from "bun";

export type DBType = "mysql" | "postgresql" | "sqlite";

export interface DBConfig {
  type: DBType;
  url: string;
  maxConnections?: number;
}

export interface Migration {
  id: string;
  sql: string;
}

export interface DatabaseClient {
  sql: SQL;
  config: DBConfig;
}

export function resolveDBType(input?: string): DBType {
  switch ((input ?? process.env.DB_TYPE ?? "").toLowerCase()) {
    case "mysql":
      return "mysql";
    case "postgresql":
    case "postgres":
      return "postgresql";
    case "sqlite":
      return "sqlite";
    default:
      throw new Error(
        "Invalid DB_TYPE. Supported values: mysql | postgresql | sqlite"
      );
  }
}

export function createDatabaseClient(config: DBConfig): DatabaseClient {
  const sql = new SQL(config.url, {
    max: config.maxConnections ?? 10,
  });

  return { sql, config };
}

export async function ensureMigrationsTable(client: DatabaseClient): Promise<void> {
  const tableSql = `
    CREATE TABLE IF NOT EXISTS alesha_migrations (
      id VARCHAR(255) PRIMARY KEY,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await client.sql.unsafe(tableSql);
}

export async function runMigrations(
  client: DatabaseClient,
  migrations: Migration[]
): Promise<void> {
  await ensureMigrationsTable(client);

  for (const migration of migrations) {
    const existing = await client.sql`
      SELECT id FROM alesha_migrations WHERE id = ${migration.id}
    `;

    if (existing.length > 0) continue;

    await client.sql.unsafe(migration.sql);
    await client.sql`
      INSERT INTO alesha_migrations (id)
      VALUES (${migration.id})
    `;
  }
}

export { authMigrationsBundle } from "./auth-migrations";
