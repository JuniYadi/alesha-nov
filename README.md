# alesha-nov monorepo (nodejs)

[![codecov](https://codecov.io/gh/JuniYadi/alesha-nov/graph/badge.svg?token=x0kbSnh7Ku)](https://codecov.io/gh/JuniYadi/alesha-nov)

Bun workspace monorepo for:

- `@alesha-nov/config` — DB config + Bun SQL helpers + migration runner
- `@alesha-nov/auth` — email/password auth + magic link auth + OAuth core
- `@alesha-nov/email` — AWS SES and SMTP email providers
- `@alesha-nov/auth-web` — HTTP auth route handlers + adapters for TanStack Start and Next.js
- `@alesha-nov/auth-react` — React provider/hooks/guard for auth-web endpoints

## Target Product Auth Capabilities

Target state:
- Login by email + password
- Login by magic link (email)
- Login by Google / GitHub

Current readiness summary:
- Core primitives: **mostly available** (`auth`, `auth-web`, `auth-react`)
- Integration hardening: **on-going** (reset flow, OAuth redirect flow, rate limits, refresh strategy)

## Package-Level Tracking

Each package has tracking sections in its own README:

- `packages/config/README.md`
- `packages/auth/README.md`
- `packages/email/README.md`
- `packages/auth-web/README.md`
- `packages/auth-react/README.md`

Each README includes:
- Implemented features
- Required features for target auth
- Missing / on-going checklist
- Suggested GitHub issue titles

Docs mirror:
- `docs/packages/`

## Quick start

```bash
cd ~/alesha-node
bun install
bun run build
bun run typecheck
bun run lint
bun run test
bun run test:coverage
```
