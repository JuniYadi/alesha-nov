# Development

## Prerequisites

- **Bun** >= 1.0

## Setup

```bash
git clone https://github.com/alesha-nov/alesha-node.git
cd alesha-node
bun install
bun run build
```

## Workspace Scripts

```bash
bun run build      # Build all packages
bun run typecheck # Type-check all packages
bun run lint      # Lint all packages
bun run test      # Run all tests
```

## Per-Package Build

```bash
bun run --filter @alesha-nov/auth build
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Full database connection URL |
| `DB_TYPE` | `mysql` \| `postgresql` \| `sqlite` |
| `SESSION_SECRET` | ≥16 chars, for signing auth-web session cookies |
| `AWS_ACCESS_KEY_ID` | AWS SES access key |
| `AWS_SECRET_ACCESS_KEY` | AWS SES secret |

## Local Docs Server

```bash
npm i docsify-cli -g
cd docs
docsify serve .
# → http://localhost:3000
```