# Inspection Report — 2026-04-22

**Inspector:** Hermes Agent
**Repo:** `~/alesha-node` (JuniYadi/alesha-nov)
**Docs tracked at:** `~/ide-projects/alesha-node/`

---

## 1. Doc vs Code Accuracy

### README.md (root)
✅ Accurate. Workspace layout table matches actual package names (`apps/web`, `packages/auth`, `packages/auth-web`, `packages/auth-react`, `packages/config`, `packages/db`, `packages/email`). Version numbers are correct.

### PRD.md
✅ **Accurate** against current code with one exception:

- **Auth Core subpath exports (line 37):** Lists `/service` export. ✅ Correct — `packages/auth/src/index.ts` re-exports from `./service`.
- **Auth Core `AuditEvents/Hooks`:** PRD says "Audit events/hooks for auth lifecycle." ✅ Code has `auditSink` on `AuthServiceOptions` and `emitAuditEvent` calls in `signup`. Hook interface is present in options but the hook pattern is more limited than the PRD wording implies — no formal "hook registration" API, just an optional `auditSink` callback. **Minor: not a bug, just a note.**
- **Auth-web `RateLimiter` type:** PRD lists `RateLimiter` and `RateLimitOptions`. ✅ Both exported from `packages/auth-web/src/index.ts`.
- **Email retry/backoff:** PRD line 96 lists `withRetry`, `calculateExponentialBackoffDelay`, `defaultRetryableErrorStrategy`, `noRetryErrorStrategy`. ✅ All present in `packages/email/src/index.ts`.
- **Email OTP helpers:** PRD lists `generateOtp`, `generateVerificationToken`, `createTokenWithMetadata`, `createOtpWithMetadata`, `createVerificationTokenWithMetadata`. ✅ All present.

### PROGRESS.md
✅ **Accurate** with one minor discrepancy:
- Milestone #27 "Docker build fix (auth-react dist missing)" — marked as **Bug**. This is still open as issue #77 and not yet merged. ✅ Correct.
- PR #89 — "feat(web): integrate config and email packages in auth server" — marked as Open. ✅ Correct — PR is open.

### PLANNING.md
✅ **Accurate.** The "What's Missing / Needs Improvement" section correctly identifies:
- Bug #77 (auth-react dist missing)
- Issues #78, #79 (apps/web config/email integration)
- Issues #80-85 (UI flows, CORS, rate limiting, getUser resolver)
- Issues #86-87 (TanStack Query)
- Docs gaps: `docs/packages/README.md` outdated, `docs/releasing.md` referencing `NPM_TOKEN`, missing architecture diagram, getting-started guide, contributing guide.

---

## 2. Repo `docs/` Folder — What's Outdated

### `docs/packages/README.md` — **Completely outdated**
This doc was written when features were still missing. Every "Missing / On-going" item it lists has since been implemented:

| Item marked "Missing" | Current status |
|---|---|
| `auth-web`: OAuth authorize/callback abstraction | ✅ Implemented (PKCE flow in `service.oauth-pkce.test.ts`, route handlers in `auth-web/src/index.ts`) |
| `auth-web`: Email verification endpoints | ✅ Implemented (`POST /auth/email-verification/request`, `POST /auth/email-verification/verify`) |
| `auth-web`: CORS options, endpoint rate limiting | ✅ CORS (`CorsOptions` type) and rate limiter interface both exist |
| `auth-react`: OAuth hooks | ✅ `useOAuthLogin`, `useOAuthLink` hooks implemented |
| `auth-react`: Magic link hooks | ✅ `useMagicLinkRequest`, `useMagicLinkVerify` implemented |
| `auth-react`: Session-expiry-aware refresh | ✅ Present in `auth-react/src/hooks.ts` |
| `auth`: session/JWT issuance + refresh contract | ✅ Present via `InMemoryAuthSessionStrategy` |
| `auth`: brute-force/rate-limit/lockout | ✅ Present (`loginProtection`, `LoginAttemptState`, `recordLoginFailure`) |
| `auth`: Password policy enforcement | ✅ Present (`passwordPolicyValidator`, `defaultPasswordPolicyValidator`) |
| `auth`: OAuth PKCE authorize/callback | ✅ Present |
| `auth`: Audit hooks/events | ✅ Present (`auditSink` option, `emitAuditEvent`) |
| `email`: Template system | ✅ Present (`authTemplateRenderer`, `renderMagicLinkEmail`, `renderResetPasswordEmail`, etc.) |
| `email`: Retry/backoff | ✅ Present |
| `email`: Delivery status tracking | ✅ Present |
| `email`: Rate limiter | ✅ Present (`withRateLimit`) |
| `email`: OTP helpers | ✅ Present |

**This file needs a full rewrite or deletion.** Keeping it misleads contributors.

### `docs/releasing.md` — **Partially outdated**
- Lines 5-7 reference `NPM_TOKEN` repository secret for npm publishing. **This is incorrect.** The actual release workflow uses OIDC Trusted Publishing (no token). PR #62/#71 implemented this change. The doc should mention OIDC trusted publishing instead of `NPM_TOKEN`.

### `docs/development.md`
✅ Accurate. Setup instructions are correct.

### `docs/apps/api.md` and `docs/apps/example.md`
⚠️ **Status unknown.** These exist but haven't been audited. No indication they were updated during the docs audit.

---

## 3. Architecture & Dependency Flow — Correctness

### Dependency chain
```
config (standalone) ──┐
db (standalone) ──────┤
email (standalone) ───┼─→ auth (core)
                       ├─→ apps/web (TanStack Start)
                       └─→ auth-web (HTTP layer) ──→ auth-react (React)
```
✅ Matches `packages/auth/src/service.ts` imports:
- `auth` imports from `@alesha-nov/config`, `@alesha-nov/db`, `@alesha-nov/email`
- `auth-web` imports from `@alesha-nov/auth`
- `apps/web` imports all packages

### `apps/web` does NOT import `auth` directly — intentional
The `apps/web/src/server/auth.ts` imports `createAuthService` from `@alesha-nov/auth`. The PRD/PLANNING diagrams show `apps/web` consuming all packages. ✅ Correct.

### Email wiring in `auth`
`packages/auth/src/service.ts` has `resolveEmailOptionsFromEnv()` which calls `resolveEmailTransportConfig()` from `@alesha-nov/config`, then creates the SES or SMTP provider via `@alesha-nov/email`. This is the intended auto-wiring path. ✅ Correct.

### TanStack adapter
`packages/auth-web/tanstack.ts` is a thin wrapper around `createAuthWeb` that returns `handleRequest(request)`. ✅ Correct.

---

## 4. PR #89 — Config + Email Integration in `apps/web`

### What PR #89 adds (from PR body + diff)
- **`apps/web/src/server/auth-config.ts`** — Refactored to use `resolveSessionSecret` from shared config, plus `resolveSecureCookie`. Previously had hardcoded dev secret and custom cookie logic.
- **`apps/web/src/server/auth.ts`** — Now imports `createDatabaseClient` from `@alesha-nov/db`, uses `resolveDbType()` (shared), and passes `getUser` resolver.
- **`apps/web/src/server/email.ts`** — **New file.** Wires `resolveEmailTransportConfig`, `createSesProvider`/`createSmtpProvider`, wraps with `withRetry` and `withRateLimit`, dispatches delivery status events.
- **`packages/config/src/index.ts`** — Enhanced with `resolveSessionConfig()` (returns `{ cookieName, ttlSeconds, sameSite }`) and `resolveJWTSecret()`.
- **`apps/web/src/server/auth.test.ts`** — Tests for env-backed session secret and secure cookie resolution.

### Current state (pre-merge)
- `auth-config.ts` correctly uses `resolveSessionSecret` from shared config.
- **`auth.ts` does NOT pass email provider to `createAuthService` yet.** The PR body says it does, but the current `auth.ts` calls `createAuthService(dbConfig, {}, dbClient)` with an empty options object. Email is auto-resolved via `resolveEmailOptionsFromEnv()` inside `createAuthService` (when `options.email` is `undefined`).
- **`email.ts` exists but is NOT imported/used anywhere in the auth server.** It creates the provider but no code path passes it to `createAuthService`.
- **This is the intended PR scope to complete** — the `email.ts` wiring into `auth.ts` via `createAuthService({ email: emailProvider })` is likely the remaining step.

### ⚠️ Question for Pak RT:
> **PR #89 scope vs. what's wired end-to-end:** The PR adds `apps/web/src/server/email.ts` with full provider setup and `apps/web/src/server/auth.test.ts` testing the config resolvers. However, `email.ts` is not yet imported in `auth.ts`, and `createAuthService` is called without an explicit email option (email is auto-resolved via env, which works). Is the intent to (a) explicitly wire `email.ts` into `auth.ts` so the email provider is construction-time rather than env-resolution-time, or (b) consider this sufficient since auto-resolution via env works? I cannot determine from the diff whether this is a remaining commit or intentional design.

---

## 5. Missing Documentation

### High Priority (should exist but doesn't)

**1. Architecture diagram**
- No architecture diagram exists anywhere in the repo or docs.
- The ASCII diagram in `PRD.md` (lines 136-152) is the closest thing. It is accurate but informal.
- **Recommendation:** Add a `docs/architecture.md` with a proper diagram (e.g., Mermaid or ASCII). The PRD ASCII diagram could be moved/copied there and expanded.

**2. Getting-started guide for consuming packages independently**
- A developer who wants to use `@alesha-nov/auth` in a non-TanStack project has no guidance.
- `docs/packages/` has per-package subdirs (`config/`, `db/`, etc.) with no content (empty dirs with just a README stub).
- **Recommendation:** Add `docs/packages/getting-started.md` showing minimal usage of each package standalone.

**3. Contributing guide**
- No `CONTRIBUTING.md` at repo root or in `docs/`.
- The release process is documented in `docs/releasing.md` but there's no guide for setting up dev environment, branching conventions, PR etiquette, or testing requirements.
- **Recommendation:** Add `CONTRIBUTING.md` at root covering: branch naming, PR checklist, changeset creation, test requirements, and review process.

**4. Bearer token auth documentation**
- `auth-web` now supports bearer token sessions (PR #108 — merged). There is no doc for this.
- **Recommendation:** Add usage doc in `docs/apps/api.md` or a new `docs/auth/bearer-token.md`.

**5. Role permissions system documentation**
- `auth-web` supports role-permission checks (`hasPermission`, `roles:write`, `roles:write:any`). No doc exists.
- **Recommendation:** Add `docs/auth/roles.md` covering: default roles, assigning roles, permission strings, protecting routes.

**6. API playground page documentation**
- `apps/web` has an `/api` route with tabs for Auth, Session, Magic Link, and cURL examples. No doc explains what this page is or how to use it for testing.
- **Recommendation:** Add a section in `docs/apps/` or a banner in the playground page.

### Medium Priority

**7. Deployment guide beyond Docker basics**
- `docs/development.md` covers setup. No deployment/production guide exists.
- Missing: reverse proxy config (Caddy/Traefik), environment variable reference for production, health check endpoints, scaling considerations.
- **Recommendation:** Add `docs/deployment.md`.

**8. `docs/packages/README.md` — needs rewrite or deletion**
- As documented in Section 2, this file is actively misleading. It lists every feature as "Missing" when everything has been implemented.
- **Recommendation:** Rewrite as a verified feature checklist (like this inspection report does) or delete it entirely.

---

## 6. Security & Code Quality Observations

### Security

**✅ Good:**
- Passwords hashed via `hashPassword` (uses `crypto.scrypt` or equivalent).
- Session tokens are HMAC-signed (`verifySessionToken` uses `timingSafeEqual`).
- OAuth PKCE (`codeChallengeMethod: "S256"`) is enforced.
- Role permission checks in `auth-web` (`hasPermission`) gate `roles:write` and `roles:write:any`.
- Brute-force protection via `loginProtection` config with lockout.
- `NODE_ENV=production` gating for required secrets (`SESSION_SECRET`).

**⚠️ Needs attention:**
- **`authMigrations` executes DDL without explicit transaction wrapping in `createAuthService`.** In `packages/auth/src/service.ts`, migrations run via `await runMigrations(client, authMigrations)`. If a migration fails mid-way on some DB types, state could be inconsistent. Not a bug per se, but worth noting for MySQL which doesn't have transaction-scoped DDL.

- **Magic link token in URL query param (GET `/auth/magic-link/verify?token=xxx`):** The token appears in server logs if `console.log` is used. `service.ts` uses `tokenHash` for storage — token itself is transmitted in plaintext to the client. This is standard practice but worth documenting that magic link URLs should be treated as secrets (not shared, not bookmarked in public terminals).

- **`resolveEmailOptionsFromEnv()` reads AWS credentials from env vars directly (`process.env.AWS_ACCESS_KEY_ID`, `process.env.AWS_SECRET_ACCESS_KEY`).** This is fine for deployment but there is no `AWS_SESSION_TOKEN` support for ephemeral credentials. If deployed on AWS (ECS, Lambda, etc.) using IAM roles, this fails silently and email won't send. **This is a gap for AWS deployments.**

### Code Quality

**✅ Good:**
- Consistent use of TypeScript strict mode.
- In-memory session strategy (`InMemoryAuthSessionStrategy`) is appropriate for demo but clearly marked as not production-persistent.
- `LoginAttemptState` uses `Map<string, LoginAttemptState>` — in-process only, won't survive server restarts. Appropriately scoped for the demo app.
- `apps/web/src/server/auth.ts` uses module-level promise caching (`authHandlerPromise`) to avoid rebuilding the handler on every request. ✅ Good pattern for SSR.
- Tests are co-located with source files (`.test.ts` next to `.ts`).

**⚠️ Minor quality notes:**
- `auth.ts` in `apps/web` manually defines `resolveDbType()` instead of importing `resolveDBType` from `@alesha-nov/db`. This is technically duplicative — `resolveDBType` exists in `@alesha-nov/db`. This duplication is what PR #89 was supposed to fix, and it does refactor some of it, but `resolveDbType` in `auth.ts` remains duplicated.

---

## 7. Summary of Questions for Pak RT

1. **PR #89 email wiring:** See Section 4 above. Is `email.ts` supposed to be wired into `createAuthService` call in `auth.ts`, or is auto-resolution via env considered sufficient?

2. **`docs/packages/README.md`:** Should this be rewritten as a verified feature checklist or deleted entirely?

3. **Architecture diagram:** Should I add `docs/architecture.md` with the PRD's ASCII diagram expanded, or do you prefer a different format/tool?

4. **Contributing guide:** Should I draft a `CONTRIBUTING.md` based on what's inferable from the repo (branch conventions, changeset workflow, test requirements)?

5. **AWS session token support:** `resolveEmailOptionsFromEnv()` doesn't handle `AWS_SESSION_TOKEN` for short-lived IAM role credentials. Should this be added to `@alesha-nov/config`'s SES resolver?

---

## Appendix: Verified File States

| File | Status |
|---|---|
| `README.md` | ✅ Accurate |
| `PRD.md` | ✅ Accurate |
| `PROGRESS.md` | ✅ Accurate |
| `PLANNING.md` | ✅ Accurate |
| `docs/packages/README.md` | ❌ Severely outdated — needs rewrite or deletion |
| `docs/releasing.md` | ⚠️ Partially outdated — NPM_TOKEN reference wrong |
| `docs/development.md` | ✅ Accurate |
| `docs/apps/api.md` | ⚠️ Not audited |
| `docs/apps/example.md` | ⚠️ Not audited |
| `apps/web/src/server/auth.ts` | ✅ Uses shared config + db packages correctly |
| `apps/web/src/server/email.ts` | ✅ Created by PR #89, not yet wired in |
| `packages/auth/src/service.ts` | ✅ Email auto-resolves via env when not provided |
| `packages/auth-web/src/index.ts` | ✅ Full route surface area matches PRD |
| `packages/config/src/index.ts` | ✅ All resolver functions present |
| `packages/email/src/index.ts` | ✅ All exports match PRD |
