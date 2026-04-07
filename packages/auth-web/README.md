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

- [ ] OAuth redirect/callback flow endpoints (authorize + callback)
- [ ] Forgot/reset password API endpoints
- [ ] Email verification endpoints
- [ ] CORS configuration options
- [ ] Rate limiting for public auth endpoints
- [ ] Session invalidation/revocation strategy beyond cookie clear

## Suggested GitHub Issues

1. Add OAuth authorize + callback endpoints (Google/GitHub)
2. Add password reset endpoints (`forgot`/`reset`)
3. Add email verification endpoints + resend flow
4. Add configurable CORS policy support
5. Add built-in auth endpoint rate limiting
6. Add server-side session revocation mechanism
