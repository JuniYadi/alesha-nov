# @alesha-nov/config

Database primitives for the monorepo: DB type resolution, SQL client creation, and migration runner.

## Implemented Features

- `resolveDBType()` for `mysql | postgresql | sqlite`
- `createDatabaseClient(DBConfig)` using Bun SQL
- `ensureMigrationsTable()` for `alesha_migrations`
- `runMigrations()` idempotent migration execution
- Exported types: `DBType`, `DBConfig`, `Migration`, `DatabaseClient`

## Required for Target Auth (Email/Password, Magic Link, Google/GitHub)

- Stable DB connection for all auth packages
- Shared migration runner used by `@alesha-nov/auth`
- Environment-driven DB type + URL

## Missing / On-going (Track Here)

- [ ] Session config env resolver (`resolveSessionConfig`) — [#21](https://github.com/JuniYadi/alesha-nov/issues/21)
- [ ] Magic-link/email config resolver (TTL, sender, transport) — [#22](https://github.com/JuniYadi/alesha-nov/issues/22)

## Already Implemented (was previously tracked as missing)

- [x] Auth config types (`JWTConfig`, `SessionConfig`)
- [x] OAuth config resolver (Google/GitHub client/secret/redirect)
- [x] Auth-specific migration bundle export (`authMigrationsBundle`)
- [x] Unit tests for auth config resolvers

## Tracking Issues

- [#21](https://github.com/JuniYadi/alesha-nov/issues/21) Add session config env resolver (@alesha-nov/config)
- [#22](https://github.com/JuniYadi/alesha-nov/issues/22) Add magic-link/email configuration resolver (@alesha-nov/config)
