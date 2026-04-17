# @alesha-nov/db

## 0.2.2

### Patch Changes

- 490bc68: Fix SQLite connection by prefixing `sqlite://` scheme to file paths for Bun.SQL

## 0.2.1

### Patch Changes

- 33cf861: Avoid exposing Bun SQL internals in client-capable code paths by resolving Bun DB access at runtime and keeping the auth route handler inside a server-only boundary.

## 0.2.0

### Minor Changes

- 50357bc: Split database runtime and migration helpers out of `@alesha-nov/config` into a new `@alesha-nov/db` package.

  `@alesha-nov/config` is now focused on environment-based auth/email configuration resolution only, with no Bun SQL runtime surface.

  `@alesha-nov/auth` now consumes `@alesha-nov/db` for database client and migration primitives.
