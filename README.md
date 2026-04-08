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

Current readiness summary (verified from code):
- Core primitives: **available** (`auth`, `auth-web`, `auth-react`)
- Password reset flow: **available** in `auth`, `auth-web`, and `auth-react`
- Integration hardening still **on-going**:
  - OAuth redirect/callback flow (`auth-web`) — [#11](https://github.com/JuniYadi/alesha-nov/issues/11)
  - OAuth client hooks (`auth-react`) — [#12](https://github.com/JuniYadi/alesha-nov/issues/12)
  - Rate limiting / lockout (`auth`, `auth-web`) — [#24](https://github.com/JuniYadi/alesha-nov/issues/24), [#36](https://github.com/JuniYadi/alesha-nov/issues/36)
  - Session refresh strategy (`auth-react`) — [#39](https://github.com/JuniYadi/alesha-nov/issues/39)

## Package-Level Tracking

Per-package tracking lives in:

- `packages/config/README.md`
- `packages/auth/README.md`
- `packages/email/README.md`
- `packages/auth-web/README.md`
- `packages/auth-react/README.md`

Docs mirror and consolidated matrix:
- `docs/packages/`
- `docs/packages/README.md`

Open tracking issues (current):
- config: [#21](https://github.com/JuniYadi/alesha-nov/issues/21), [#22](https://github.com/JuniYadi/alesha-nov/issues/22)
- auth: [#23](https://github.com/JuniYadi/alesha-nov/issues/23), [#24](https://github.com/JuniYadi/alesha-nov/issues/24), [#25](https://github.com/JuniYadi/alesha-nov/issues/25), [#26](https://github.com/JuniYadi/alesha-nov/issues/26), [#27](https://github.com/JuniYadi/alesha-nov/issues/27)
- email: [#28](https://github.com/JuniYadi/alesha-nov/issues/28), [#29](https://github.com/JuniYadi/alesha-nov/issues/29), [#30](https://github.com/JuniYadi/alesha-nov/issues/30), [#31](https://github.com/JuniYadi/alesha-nov/issues/31), [#32](https://github.com/JuniYadi/alesha-nov/issues/32), [#33](https://github.com/JuniYadi/alesha-nov/issues/33)
- auth-web: [#11](https://github.com/JuniYadi/alesha-nov/issues/11), [#34](https://github.com/JuniYadi/alesha-nov/issues/34), [#35](https://github.com/JuniYadi/alesha-nov/issues/35), [#36](https://github.com/JuniYadi/alesha-nov/issues/36), [#37](https://github.com/JuniYadi/alesha-nov/issues/37)
- auth-react: [#12](https://github.com/JuniYadi/alesha-nov/issues/12), [#38](https://github.com/JuniYadi/alesha-nov/issues/38), [#39](https://github.com/JuniYadi/alesha-nov/issues/39), [#40](https://github.com/JuniYadi/alesha-nov/issues/40)

> Note: Issues #41 and #42 were created by delegated audit outside requested scope and then closed as not planned.
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
