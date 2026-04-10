# @alesha-nov/config

Database primitives and auth/email configuration resolvers for the monorepo.

## Implemented Features

- `resolveDBType()` for `mysql | postgresql | sqlite`
- `createDatabaseClient(DBConfig)` using Bun SQL
- `ensureMigrationsTable()` for `alesha_migrations`
- `runMigrations()` idempotent migration execution
- Exported types: `DBType`, `DBConfig`, `Migration`, `DatabaseClient`
- Auth config types (`JWTConfig`, `SessionConfig`)
- `resolveJWTSecret()`
- `resolveSessionConfig()`
- `resolveMagicLinkConfig()`
- `resolveEmailTransportConfig()` (SES/SMTP with validation)
- `resolveOAuthConfig()` (Google/GitHub)
- `authMigrationsBundle` export for auth package consumption

## Required for Target Auth (Email/Password, Magic Link, Google/GitHub)

- Stable DB connection for all auth packages
- Shared migration runner used by `@alesha-nov/auth`
- Environment-driven DB + auth/email transport resolution

## Remaining / Follow-up

- Keep docs aligned when new env keys/resolvers are added
- Expand examples for production env profiles

## Tracking Issues

Create/update issues for newly discovered gaps. Historical issues #21/#22 are closed.
