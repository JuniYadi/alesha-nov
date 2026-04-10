# @alesha-nov/auth

Core auth service for signup/login, magic link, OAuth account login/linking, and security controls.

## Implemented Features

- Email/password signup + login
- Password hashing and verification utilities
- Password strength policy checks
- Brute-force/rate-limit/lockout controls for login
- Magic link issue + verify (hashed token storage)
- Password reset issue + verify flows
- Email verification issue + verify flows
- OAuth login for `google` and `github`
- OAuth account linking + linked accounts list
- OAuth PKCE authorize request + callback validation helpers
- Role assignment (`setUserRoles`, `getUserRoles`)
- Session issuance + refresh contracts (strategy-based)
- Audit events/hooks for auth lifecycle events
- Auto migrations for auth tables

## Required for Target Auth (Email/Password, Magic Link, Google/GitHub)

- `signup`, `login`
- `issueMagicLinkToken`, `verifyMagicLinkToken`
- `loginWithOAuth(provider=google|github)`
- Multi-role user model and retrieval
- Session + refresh strategy integration

## Remaining / Follow-up

- Add/extend persistence-backed session strategy examples for production
- Expand docs with reference architecture for distributed deployments

## Tracking Issues

Create/update issues for newly discovered gaps. Historical issues #23/#24/#25/#26/#27 are closed.
