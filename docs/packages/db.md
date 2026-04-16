# @alesha-nov/db

Database client factory, migration runner, and auth migration bundle.

## Install

```json
{
  "@alesha-nov/db": "workspace:*"
}
```

## Exports

```ts
export {
  resolveDBType,
  createDatabaseClient,
  ensureMigrationsTable,
  runMigrations,
  authMigrationsBundle,
}
export type { DBType, DBConfig, Migration, DatabaseClient }
```

## Usage

```ts
import {
  resolveDBType,
  createDatabaseClient,
  runMigrations,
} from "@alesha-nov/db";

const client = createDatabaseClient({
  type: resolveDBType(),
  url: process.env.DATABASE_URL!,
});

await runMigrations(client, [
  {
    id: "001_create_users",
    sql: "CREATE TABLE users (id VARCHAR(36) PRIMARY KEY)",
  },
]);
```

Auth migrations are also available via:

```ts
import { authMigrationsBundle } from "@alesha-nov/db/auth-migrations";
```
