# @alesha-nov/db

Database client factory and migration primitives for the monorepo.

## Implemented Features

- `resolveDBType()` for `mysql | postgresql | sqlite`
- `createDatabaseClient(DBConfig)` using Bun SQL
- `ensureMigrationsTable()` for `alesha_migrations`
- `runMigrations()` idempotent migration execution
- Exported types: `DBType`, `DBConfig`, `Migration`, `DatabaseClient`
- `authMigrationsBundle` export for auth package consumption

## Required for Target Auth (Email/Password, Magic Link, Google/GitHub)

- Stable DB connection for all auth packages
- Shared migration runner used by `@alesha-nov/auth`
