# web (TanStack Start SSR demo)

TanStack Start SSR app demonstrating how `@alesha-nov/*` packages are used together.

## What this app includes

- TanStack Start SSR setup
- Auth API passthrough route: `src/routes/auth/$.ts`
- Auth handler factory: `src/server/auth.ts`
- `AuthProvider` integration at root route
- Demo pages:
  - `/signup` (email/password signup)
  - `/login` (email/password + magic-link demo)
  - `/dashboard` (protected via `AuthGuard`)

## Local run

From repo root:

```bash
bun install
bun run --filter web dev
```

Or from `apps/web`:

```bash
bun install
bun run dev
```

## Build and start

```bash
bun run --filter web build
bun apps/web/dist/server/server.js
```

App runs on port `3000` by default.

## Environment

Use `.env.example` as a base:

```bash
cd apps/web
cp .env.example .env
```

Minimum for meaningful auth run:

- `DB_TYPE` (`mysql|postgresql|sqlite`)
- `DATABASE_URL`
- `SESSION_SECRET`
- `AUTH_SECURE_COOKIE` (optional, defaults to `true` in production)

Current server defaults are demo-friendly (fallback secret / insecure cookie).
`apps/web/.env.example` contains a safe local starter profile.

For production, replace insecure defaults and set `NODE_ENV=production`.

## Docker (from monorepo root)

```bash
docker build -t alesha-web:local .
docker run --rm -p 3000:3000 \
  -e DB_TYPE=sqlite \
  -e DATABASE_URL=':memory:' \
  -e SESSION_SECRET='replace-with-strong-secret' \
  alesha-web:local
```

## Notes for production hardening

- Add SSR route-level auth guards/loaders for protected routes
- Fail fast when `SESSION_SECRET` is missing
- Use secure cookie settings in production
- Replace demo magic-link UX with real email delivery flow
