# Alesha Node Monorepo

Bun-powered TypeScript monorepo for authentication, email, and configuration packages.

## Packages

| Package | Description |
|---------|-------------|
| [`@alesha-nov/config`](packages/config) | Database client, migrations, env helpers |
| [`@alesha-nov/auth`](packages/auth) | Auth service: signup, login, magic links, OAuth |
| [`@alesha-nov/email`](packages/email) | Email via AWS SES or SMTP |
| [`@alesha-nov/auth-web`](packages/auth-web) | HTTP route handlers + cookie sessions |

## Quick Start

```bash
bun install
bun run build
bun test
```