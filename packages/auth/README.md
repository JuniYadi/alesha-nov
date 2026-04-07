# @alesha-nov/auth

Core auth service for signup/login, magic link, and OAuth account login/linking.

## Implemented Features

- Email/password signup + login
- Password hashing and verification utilities
- Magic link issue + verify (hashed token storage)
- OAuth login for `google` and `github`
- OAuth account linking + linked accounts list
- Role assignment (`setUserRoles`, `getUserRoles`)
- Auto migrations for auth tables

## Required for Target Auth (Email/Password, Magic Link, Google/GitHub)

- `signup`, `login`
- `issueMagicLinkToken`, `verifyMagicLinkToken`
- `loginWithOAuth(provider=google|github)`
- Multi-role user model and retrieval

## Missing / On-going (Track Here)

- [ ] Forgot password + reset password flow
- [ ] Session/JWT issuance + refresh strategy contract
- [ ] Brute-force/rate-limit/lockout protections
- [ ] Password strength policy enforcement
- [ ] OAuth PKCE/authorize-callback flow abstraction
- [ ] Audit events/hooks (`LOGIN`, `LOGIN_FAIL`, `SIGNUP`, etc.)
- [ ] Node compatibility for UUID generation (replace Bun-only `randomUUIDv7`)

## Suggested GitHub Issues

1. Add forgot/reset password flow + migrations
2. Add structured session/JWT contract for auth-web integration
3. Add login/signup/magic-link rate limiting and lockout
4. Add password policy validator + tests
5. Add auth event/audit hook interface
6. Replace Bun-only UUID API with Node-compatible strategy
