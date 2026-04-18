# @alesha-nov/config

## 0.3.1

### Patch Changes

- 3905e1d: Allow missing users to receive magic links by auto-creating accounts, wire magic-link email URLs to app origin, and reuse that link path for verification redirects.

  Also update the login demo page so the magic-link request input is separate from the password-login email field to avoid confusion.

## 0.3.0

### Minor Changes

- 50357bc: Split database runtime and migration helpers out of `@alesha-nov/config` into a new `@alesha-nov/db` package.

  `@alesha-nov/config` is now focused on environment-based auth/email configuration resolution only, with no Bun SQL runtime surface.

  `@alesha-nov/auth` now consumes `@alesha-nov/db` for database client and migration primitives.

## 0.2.1

### Patch Changes

- 741a94f: Add GHCR docker workflow validation coverage and align release-workflow test expectation with public access config.

## 0.2.0

### Minor Changes

- f1e8366: chore: release all packages 0.1.0 → 0.2.0
