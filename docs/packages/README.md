# Packages

## [@alesha-nov/config](config)

Database client, migration runner, and environment config helpers. Supports MySQL, PostgreSQL, and SQLite.

**Tracking status**
- Implemented: DB type resolver, SQL client factory, migration runner
- Missing: auth-specific config contracts (JWT/session/oauth/magic-link)

## [@alesha-nov/auth](auth)

Authentication core: email/password signup/login, magic links, OAuth (Google, GitHub), and role handling.

**Tracking status**
- Implemented: signup/login, magic-link, oauth login/link, roles
- Missing: password reset, rate limit/lockout, audit events

## [@alesha-nov/email](email)

Email delivery via AWS SES or SMTP with a simple provider interface.

**Tracking status**
- Implemented: SES + SMTP providers
- Missing: auth templates, retries, delivery tracking

## [@alesha-nov/auth-web](auth-web)

HTTP route handlers for web authentication. Cookie-based sessions, OAuth login/link, role management.

**Tracking status**
- Implemented: auth routes + session cookie + framework adapters
- Missing: OAuth redirect/callback, password reset APIs, rate limiting

## [@alesha-nov/auth-react](auth-react)

React auth client helpers: provider, hooks, and guard components.

**Tracking status**
- Implemented: provider + login/signup/logout hooks + guard
- Missing: OAuth/magic-link/reset hooks, session refresh strategy
