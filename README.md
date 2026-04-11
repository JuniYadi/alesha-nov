# alesha-nov monorepo (nodejs)

[![codecov](https://codecov.io/gh/JuniYadi/alesha-nov/graph/badge.svg?token=x0kbSnh7Ku)](https://codecov.io/gh/JuniYadi/alesha-nov)
[![Release](https://github.com/JuniYadi/alesha-nov/actions/workflows/release.yml/badge.svg)](https://github.com/JuniYadi/alesha-nov/actions/workflows/release.yml)

Bun workspace monorepo for auth-focused packages and a TanStack Start SSR demo app.

## Workspace layout

- `apps/web` — TanStack Start SSR app demonstrating auth flows
- `packages/config` — DB + auth/email config resolvers, migration primitives
- `packages/auth` — auth core service (email/password, magic link, OAuth, roles)
- `packages/auth-web` — HTTP auth routes + TanStack/Next adapters
- `packages/auth-react` — React provider/hooks/guard for auth-web endpoints
- `packages/email` — SES/SMTP providers + templates/retry/rate-limit/status helpers

## Quick start

```bash
cd ~/alesha-node
bun install
bun run build
bun run typecheck
bun run lint
bun run test
```

## TanStack SSR/API/auth wiring (current)

Implemented in `apps/web`:

- SSR app via `@tanstack/react-start` (`vite.config.ts` uses TanStack Start plugin)
- Auth API route passthrough at `src/routes/auth/$.ts` to `getAuthHandler()`
- Auth handler in `src/server/auth.ts` using `@alesha-nov/auth-web/tanstack`
- Client auth provider in `src/routes/__root.tsx` using `AuthProvider`
- Demo auth pages (`/signup`, `/login`) and protected page (`/dashboard`)

Production hardening implemented in `apps/web`:

- `/dashboard` now enforces route-level SSR auth checks in `beforeLoad` (not client-guard-only)
- `src/server/auth.ts` now fails fast if `SESSION_SECRET` is missing in production
- Secure cookie behavior is environment-aware (`secureCookie: true` by default in production)

Remaining recommended hardening:

- Add deployment pipeline (GitHub Actions + GHCR)

## Package status snapshot

Each package README tracks details. Highlights:

- `auth`: core + security hardening pieces implemented
- `auth-web`: OAuth authorize/callback, email verification, CORS, rate limiting, session revoke endpoints implemented
- `auth-react`: OAuth login + magic-link hooks + session refresh + navigation adapter implemented
- `config`: session/magic-link/email transport/OAuth env resolvers implemented
- `email`: templates, retry/backoff, delivery status mapping, rate limiting, OTP/token helpers implemented

## Docker deployment (first baseline)

A root `Dockerfile` is provided for running `apps/web` SSR server.

### Build image (local)

```bash
docker build -t alesha-web:local .
```

### Run image (local)

```bash
docker run --rm -p 3000:3000 \
  -e DB_TYPE=sqlite \
  -e DATABASE_URL=':memory:' \
  -e SESSION_SECRET='replac...cret' \
  alesha-web:local
```

Then open: `http://localhost:3000`

### Pull and run from GHCR (`main` tag)

The `Docker GHCR` workflow (`.github/workflows/docker-ghcr.yml`) publishes:

- `ghcr.io/<owner>/alesha-web:sha-<shortsha>`
- `ghcr.io/<owner>/alesha-web:main` (default branch)

```bash
docker run --rm -p 3000:3000 \
  -e DB_TYPE=sqlite \
  -e DATABASE_URL=':memory:' \
  -e SESSION_SECRET='replac...cret' \
  ghcr.io/<owner>/alesha-web:main
```

Replace `<owner>` with your GitHub org/user (for this repo: `juniyadi`).

Then open: `http://localhost:3000`

### Required runtime env (minimum)

- `DB_TYPE` (`mysql|postgresql|sqlite`)
- `DATABASE_URL`
- `SESSION_SECRET`

### Auth hardening env contract

- In `NODE_ENV=production`, `SESSION_SECRET` is mandatory (startup fails fast if missing)
- `secureCookie` defaults to `true` in production and `false` in non-production
- Optional override: `AUTH_SECURE_COOKIE=true|false` (or `1|0`)

For production, also set real DB/email/OAuth env values.

## Release / publish

Packages are released with Changesets:

```bash
bun run changeset
# merge to main
# release workflow publishes packages
```

Current workflows in `.github/workflows/` focus on lint/test/release. Container build/push pipeline is tracked separately.
