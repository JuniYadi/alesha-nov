# @alesha-nov/auth-web

HTTP auth layer built on top of `@alesha-nov/auth` with cookie session handling and framework adapters.

## Implemented Features

- `createAuthWeb()` with `handleRequest(Request)`
- Cookie-based signed session token
- Routes for:
  - signup/login/logout
  - session + me
  - magic-link request/verify
  - OAuth login/link (`google`/`github`)
  - linked accounts
  - roles update
- Adapters:
  - `@alesha-nov/auth-web/next`
  - `@alesha-nov/auth-web/tanstack`

## Required for Target Auth (Email/Password, Magic Link, Google/GitHub)

- Serve auth APIs consumed by frontend packages
- Set/clear secure cookie session
- Bridge OAuth identity data to auth service

## Missing / On-going (Track Here)

- [ ] OAuth redirect/callback flow endpoints (authorize + callback) — [#11](https://github.com/JuniYadi/alesha-nov/issues/11)
- [ ] Email verification endpoints — [#34](https://github.com/JuniYadi/alesha-nov/issues/34)
- [ ] CORS configuration options — [#35](https://github.com/JuniYadi/alesha-nov/issues/35)
- [ ] Rate limiting for public auth endpoints — [#36](https://github.com/JuniYadi/alesha-nov/issues/36)
- [ ] Session invalidation/revocation strategy beyond cookie clear — [#37](https://github.com/JuniYadi/alesha-nov/issues/37)

## Already Implemented (was previously tracked as missing)

- [x] Forgot/reset password API endpoints (`/password-reset/request`, `/password-reset/reset`)

## Tracking Issues

- [#11](https://github.com/JuniYadi/alesha-nov/issues/11) Add OAuth authorize + callback endpoints (@alesha-nov/auth-web)
- [#34](https://github.com/JuniYadi/alesha-nov/issues/34) Add email verification + resend endpoints (@alesha-nov/auth-web)
- [#35](https://github.com/JuniYadi/alesha-nov/issues/35) Add configurable CORS policy support (@alesha-nov/auth-web)
- [#36](https://github.com/JuniYadi/alesha-nov/issues/36) Add rate limiting for public auth endpoints (@alesha-nov/auth-web)
- [#37](https://github.com/JuniYadi/alesha-nov/issues/37) Add server-side session revocation mechanism (@alesha-nov/auth-web)
