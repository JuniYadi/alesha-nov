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

- [ ] Session/JWT issuance + refresh strategy contract — [#23](https://github.com/JuniYadi/alesha-nov/issues/23)
- [ ] Brute-force/rate-limit/lockout protections — [#24](https://github.com/JuniYadi/alesha-nov/issues/24)
- [ ] Password strength policy enforcement — [#25](https://github.com/JuniYadi/alesha-nov/issues/25)
- [ ] OAuth PKCE/authorize-callback flow abstraction — [#27](https://github.com/JuniYadi/alesha-nov/issues/27)
- [ ] Audit events/hooks (`LOGIN`, `LOGIN_FAIL`, `SIGNUP`, etc.) — [#26](https://github.com/JuniYadi/alesha-nov/issues/26)

## Already Implemented (was previously tracked as missing)

- [x] Forgot password + reset password flow
- [x] Node compatibility for UUID generation (Bun v7 with Node fallback)

## Tracking Issues

- [#23](https://github.com/JuniYadi/alesha-nov/issues/23) Implement session/JWT issuance + refresh strategy contract (@alesha-nov/auth)
- [#24](https://github.com/JuniYadi/alesha-nov/issues/24) Add brute-force protection and rate-limit/lockout (@alesha-nov/auth)
- [#25](https://github.com/JuniYadi/alesha-nov/issues/25) Add password strength policy enforcement (@alesha-nov/auth)
- [#26](https://github.com/JuniYadi/alesha-nov/issues/26) Add auth audit events/hooks interface (@alesha-nov/auth)
- [#27](https://github.com/JuniYadi/alesha-nov/issues/27) Add OAuth PKCE authorize/callback abstraction (@alesha-nov/auth)
