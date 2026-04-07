# @alesha-nov/config

Database client factory, migration runner, and environment config helpers. Supports **MySQL**, **PostgreSQL**, and **SQLite**.

## Install

```json
{
  "@alesha-nov/config": "workspace:*"
}
```

## Exports

```ts
export {
  resolveDBType,      // Resolve DB_TYPE env var to DBType
  createDatabaseClient, // Create SQL client + config wrapper
  ensureMigrationsTable,
  runMigrations,
}
export type { DBType, DBConfig, Migration, DatabaseClient }
```

## DBType

```ts
type DBType = "mysql" | "postgresql" | "sqlite";
```

## DBConfig

```ts
interface DBConfig {
  type: DBType;
  url: string;           // e.g. "mysql://user:pass@localhost:3306/mydb"
  maxConnections?: number;
}
```

## Migration

```ts
interface Migration {
  id: string;   // Unique migration identifier, e.g. "001_create_users"
  sql: string;   // Raw SQL to execute
}
```

## Usage

```ts
import {
  resolveDBType,
  createDatabaseClient,
  runMigrations,
  ensureMigrationsTable,
} from "@alesha-nov/config";

// Auto-detect from DB_TYPE env var
const dbType = resolveDBType(); // throws on invalid value

const client = createDatabaseClient({
  type: dbType,
  url: process.env.DATABASE_URL!,
  maxConnections: 10,
});

// Run migrations
await runMigrations(client, [
  {
    id: "001_create_users",
    sql: `CREATE TABLE users (id VARCHAR(36) PRIMARY KEY, email VARCHAR(320) NOT NULL UNIQUE)`,
  },
]);

// Query
const rows = await client.sql`SELECT * FROM users WHERE id = ${userId}`;
```

> **Note:** This package is typically not used directly in application code. It is imported internally by `@alesha-nov/auth` and serves as the database foundation for the monorepo.
