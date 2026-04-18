# @alesha-nov/config

Auth and email environment configuration resolvers for the monorepo.

## Implemented Features

- Auth config types (`JWTConfig`, `SessionConfig`)
- `resolveJWTSecret()`
- `resolveSessionConfig()`
- `resolveMagicLinkConfig()`
- `resolveEmailTransportConfig()` (SES/SMTP with validation)
- `resolveOAuthConfig()` (Google/GitHub)
- `resolveAppConfig()`

## Required for Target Auth (Email/Password, Magic Link, Google/GitHub)

- Environment-driven auth/email transport resolution

## Scope

- This package is runtime-agnostic and only resolves config values.
- Database client and migration primitives live in `@alesha-nov/db`.

## Remaining / Follow-up

- Keep docs aligned when new env keys/resolvers are added
- Expand examples for production env profiles

## Tracking Issues

Create/update issues for newly discovered gaps. Historical issues #21/#22 are closed.
