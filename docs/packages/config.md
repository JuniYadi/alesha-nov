# @alesha-nov/config

Environment-driven auth and email configuration helpers.

## Install

```json
{
  "@alesha-nov/config": "workspace:*"
}
```

## Exports

```ts
export {
  resolveJWTSecret,
  resolveSessionConfig,
  resolveMagicLinkConfig,
  resolveEmailTransportConfig,
  resolveOAuthConfig,
}
export type {
  JWTConfig,
  SessionConfig,
  SessionSameSite,
  MagicLinkConfig,
  EmailTransportConfig,
  EmailSESTransportConfig,
  EmailSMTPTransportConfig,
  OAuthConfig,
  OAuthProviderConfig,
}
```

## Usage

```ts
import {
  resolveJWTSecret,
  resolveSessionConfig,
  resolveMagicLinkConfig,
  resolveEmailTransportConfig,
  resolveOAuthConfig,
} from "@alesha-nov/config";

const jwtSecret = resolveJWTSecret();
const session = resolveSessionConfig();
const magicLink = resolveMagicLinkConfig();
const emailTransport = resolveEmailTransportConfig();
const oauth = resolveOAuthConfig();
```

## Scope Boundary

- `@alesha-nov/config` only resolves env/config values.
- Database client and migrations are provided by `@alesha-nov/db`.
