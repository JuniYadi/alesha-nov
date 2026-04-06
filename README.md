# alesha-node monorepo

Bun workspace monorepo for:

- `@alesha-nov/config` — DB config + Bun SQL helpers + migration runner
- `@alesha-nov/auth` — email/password auth + magic link auth + auth migrations
- `@alesha-nov/email` — AWS SES and SMTP email providers
- `@alesha-nov/auth-web` — HTTP auth route handlers + adapters for TanStack Start and Next.js

## Quick start

```bash
cd ~/alesha-node
bun install
bun run build
bun run typecheck
```
