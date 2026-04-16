---
"@alesha-nov/db": patch
---

Avoid exposing Bun SQL internals in client-capable code paths by resolving Bun DB access at runtime and keeping the auth route handler inside a server-only boundary.
