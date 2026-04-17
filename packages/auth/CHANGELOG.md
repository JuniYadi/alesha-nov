# @alesha-nov/auth

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
