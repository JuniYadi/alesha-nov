# alesha-nov monorepo (nodejs)

[![codecov](https://codecov.io/gh/JuniYadi/alesha-nov/graph/badge.svg?token=x0kbSnh7Ku)](https://codecov.io/gh/JuniYadi/alesha-nov)

Bun workspace monorepo for:

- `@alesha-nov/config` — auth/email environment config resolvers
- `@alesha-nov/db` — DB config + Bun SQL helpers + migration runner
- `@alesha-nov/auth` — email/password auth + magic link auth + auth migrations
- `@alesha-nov/email` — AWS SES and SMTP email providers
- `@alesha-nov/auth-web` — HTTP auth route handlers + adapters for TanStack Start and Next.js

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
