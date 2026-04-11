# @alesha-nov/auth-react

## 0.3.0

### Minor Changes

- 80e8513: Add `useOAuthLink` hook for linking authenticated users with OAuth provider accounts.

  This hook wraps `POST /oauth/:provider/link` with typed request/response models and exposes `{ link, data, loading, error }`, including auth-required handling for unauthenticated usage.

## 0.2.0

### Minor Changes

- f1e8366: chore: release all packages 0.1.0 → 0.2.0

### Patch

- Added `useOAuthLink` hook for linking OAuth provider accounts from authenticated sessions.
