---
'@alesha-nov/auth': patch
---

Fix `/auth/me` flow by allowing callers to inject a shared database client into
`createAuthService` and wiring a `getUser` lookup in the web auth handler.
