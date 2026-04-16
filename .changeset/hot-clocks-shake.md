---
"@alesha-nov/config": minor
"@alesha-nov/db": minor
"@alesha-nov/auth": patch
---

Split database runtime and migration helpers out of `@alesha-nov/config` into a new `@alesha-nov/db` package.

`@alesha-nov/config` is now focused on environment-based auth/email configuration resolution only, with no Bun SQL runtime surface.

`@alesha-nov/auth` now consumes `@alesha-nov/db` for database client and migration primitives.
