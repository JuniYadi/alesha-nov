# @alesha-nov/auth

## 0.3.0

### Minor Changes

- 2386071: Configure rate limiting and CORS in auth handler

  - Add IP-based rate limiting (100 req/60s) via x-forwarded-for/x-real-ip
  - Add CORS configuration reading from ALLOWED_ORIGINS env var
  - Closes #83, #84

## 0.2.7

### Patch Changes

- 3905e1d: Allow missing users to receive magic links by auto-creating accounts, wire magic-link email URLs to app origin, and reuse that link path for verification redirects.

  Also update the login demo page so the magic-link request input is separate from the password-login email field to avoid confusion.

- Updated dependencies [3905e1d]
  - @alesha-nov/config@0.3.1

## 0.2.6

### Patch Changes

- 8a2c4be: Fix magic link: API no longer returns token, email delivery handled by package

## 0.2.5

### Patch Changes

- Updated dependencies [490bc68]
  - @alesha-nov/db@0.2.2

## 0.2.4

### Patch Changes

- 1278ea7: Fix `/auth/me` flow by allowing callers to inject a shared database client into
  `createAuthService` and wiring a `getUser` lookup in the web auth handler.

## 0.2.3

### Patch Changes

- Updated dependencies [33cf861]
  - @alesha-nov/db@0.2.1

## 0.2.2

### Patch Changes

- 50357bc: Split database runtime and migration helpers out of `@alesha-nov/config` into a new `@alesha-nov/db` package.

  `@alesha-nov/config` is now focused on environment-based auth/email configuration resolution only, with no Bun SQL runtime surface.

  `@alesha-nov/auth` now consumes `@alesha-nov/db` for database client and migration primitives.

- Updated dependencies [50357bc]
  - @alesha-nov/db@0.2.0

## 0.2.1

### Patch Changes

- Updated dependencies [741a94f]
  - @alesha-nov/config@0.2.1

## 0.2.0

### Minor Changes

- f1e8366: chore: release all packages 0.1.0 → 0.2.0

### Patch Changes

- Updated dependencies [f1e8366]
  - @alesha-nov/config@0.2.0
  - @alesha-nov/email@0.2.0
