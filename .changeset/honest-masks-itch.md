---
"@alesha-nov/auth-react": minor
---

Add `useOAuthLink` hook for linking authenticated users with OAuth provider accounts.

This hook wraps `POST /oauth/:provider/link` with typed request/response models and exposes `{ link, data, loading, error }`, including auth-required handling for unauthenticated usage.
