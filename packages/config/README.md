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
- `config(key, options)` generic env/config helper

## Required for Target Auth (Email/Password, Magic Link, Google/GitHub)

- Stable DB connection for all auth packages
- Shared migration runner used by `@alesha-nov/auth`
- Environment-driven DB + auth/email transport resolution

## Remaining / Follow-up

- Keep docs aligned when new env keys/resolvers are added
- Expand examples for production env profiles

## Tracking Issues

Create/update issues for newly discovered gaps. Historical issues #21/#22 are closed.

## `config(key, options)`

Utility helper for Laravel-style lookups in a shared package context.

- `config('aws_s3_bucket')` resolves `AWS_S3_BUCKET`
- `config('filesystem.s3.bucket.name')` resolves `FILESYSTEM_S3_BUCKET_NAME`
- Supports optional parsing and fallback defaults.

```ts
import { config } from '@alesha-nov/config'

const bucket = config('filesystem.s3.bucket.name')
const maxItems = config('pagination.max_items', { defaultValue: 20 })
const debug = config('feature.debug', { defaultValue: false })
const port = config('service.port', { parse: Number })
```
