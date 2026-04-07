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

- [ ] Auth config types (`JWTConfig`, `SessionConfig`)
- [ ] OAuth config resolver (Google/GitHub client/secret/redirect)
- [ ] Magic-link/email config resolver (TTL, sender, transport)
- [ ] Auth-specific migration bundle export (users, sessions, oauth, magic tokens)
- [ ] Unit tests for auth config resolvers

## Suggested GitHub Issues

1. Add JWT/session config types and env resolvers
2. Add OAuth provider config types + validation
3. Add magic-link/email config types + defaults
4. Add auth migration export set
5. Add auth config test suite
