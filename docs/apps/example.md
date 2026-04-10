# Example App — TanStack Start + @alesha-nov/\*

This example app demonstrates how to consume the `@alesha-nov/\*` packages inside a TanStack Start application.

## Packages Used

| Package | Purpose |
|---------|---------|
| `@alesha-nov/auth` | Core auth service (signup, login, magic-link, OAuth) |
| `@alesha-nov/auth-web` | HTTP route handlers with cookie sessions |
| `@alesha-nov/auth-react` | React provider, hooks, and `AuthGuard` component |
| `@alesha-nov/config` | DB config helpers (SQLite dev mode) |

## App Structure

```
apps/web/
  src/
    server/
      auth.ts          — Lazy-initialised auth-web handler singleton
    routes/
      __root.tsx       — Root layout: wires <AuthProvider>
      index.tsx        — Home page (shows auth status)
      signup.tsx       — Signup form
      login.tsx        — Login (email/password + magic link)
      dashboard.tsx     — Protected route (AuthGuard)
      auth/
        $.ts            — Server route: forwards /auth/* to handler
```

## How Auth Web Handler Is Wired

The `@alesha-nov/auth-web/tanstack` adapter (`createTanstackAuthHandler`) is
mounted at `/auth/*` via a TanStack Start server route:

```ts
// src/routes/auth/$.ts
export const Route = createFileRoute('/auth/$')({
  server: {
    handlers: {
      GET: async ({ request, next }) => {
        const handler = await getAuthHandler()
        const response = await handler(request)
        if (response.status === 404) return next() // fall through to SSR
        return response
      },
      POST: async ({ request, next }) => { /* same pattern */ },
      // ... PUT, DELETE, PATCH, HEAD, OPTIONS
    },
  },
})
```

The handler itself is built lazily in `src/server/auth.ts`:

```ts
export async function getAuthHandler() {
  authHandlerPromise ??= buildHandler()
  return authHandlerPromise
}
```

`buildHandler()` creates the auth service + web handler using environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `:memory:` | SQLite in-memory for dev |
| `DB_TYPE` | `sqlite` | `mysql` \| `postgresql` \| `sqlite` |
| `SESSION_SECRET` | `dev-session-secret...` | Must be ≥16 chars in prod |

## Running the App

```bash
# From repo root (after `bun install`):
bun run --filter web dev
# → http://localhost:3000
```

For a persistent SQLite database instead of in-memory:

```bash
DATABASE_URL=./dev.db DB_TYPE=sqlite bun run --filter web dev
```

For MySQL:

```bash
DATABASE_URL=mysql://user:pass@localhost:3306/mydb DB_TYPE=mysql \
  SESSION_SECRET=your-secret-here bun run --filter web dev
```

## Routes

| Path | Auth Required | Description |
|------|-------------|-------------|
| `/` | No | Home — shows current auth status |
| `/signup` | No | Create account |
| `/login` | No | Login (email/password or magic link) |
| `/dashboard` | Yes | Protected page; redirects to `/login` if unauthenticated |
| `/auth/signup` | No | `POST` — create account |
| `/auth/login` | No | `POST` — email+password login |
| `/auth/logout` | No | `POST` — clear session |
| `/auth/session` | No | `GET` — current session info |
| `/auth/magic-link/request` | No | `POST` — issue magic link token |
| `/auth/magic-link/verify` | No | `POST` — verify magic link token |

## Auth React Usage

`AuthProvider` is wired in `__root.tsx`:

```tsx
<AuthProvider config={{ basePath: '/auth' }}>
  {children}
</AuthProvider>
```

All hooks (`useLogin`, `useSignup`, `useLogout`, `useMagicLinkRequest`, `useMagicLinkVerify`) use the same `basePath: '/auth'`.

Protected route example (`dashboard.tsx`):

```tsx
<AuthGuard redirectTo="/login" fallback={<p>Checking session...</p>}>
  <section>
    <h1>Dashboard</h1>
    <button onClick={() => void logout()}>Logout</button>
  </section>
</AuthGuard>
```

## CI / Lint / Test

The app is included in the root workspace and CI pipeline:

```bash
# Lint
bun run --filter web lint

# Type-check
bun run --filter web typecheck

# Test
bun run --filter web test

# Build
bun run --filter web build

# Coverage
bun run --filter web test:coverage
```
