---
title: Alesha Node Monorepo
---

# Alesha Node Monorepo

A Bun-powered TypeScript monorepo containing reusable packages for authentication, email, and configuration.

## Packages

| Package | Description |
|---------|-------------|
| [`@alesha-nov/config`](packages/config) | Database client, migrations, and environment config helpers |
| [`@alesha-nov/auth`](packages/auth) | Authentication service: signup, login, magic links, OAuth |
| [`@alesha-nov/email`](packages/email) | Email delivery via AWS SES or SMTP |
| [`@alesha-nov/auth-web`](packages/auth-web) | HTTP route handlers for web auth (cookies, sessions) |

## Quick Install

```bash
# Install all workspace dependencies
bun install

# Build all packages
bun run build

# Run tests
bun test
```

## Project Structure

```
alesha-node/
├── packages/
│   ├── config/       # @alesha-nov/config
│   ├── auth/         # @alesha-nov/auth
│   ├── email/        # @alesha-nov/email
│   └── auth-web/     # @alesha-nov/auth-web
├── docs/             # Docsify documentation
├── tsconfig.base.json
└── package.json      # Workspace root
```
