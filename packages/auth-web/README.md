# @alesha-nov/auth-web

HTTP auth layer built on top of `@alesha-nov/auth` with cookie session handling and framework adapters.

## Implemented Features

- `createAuthWeb()` with `handleRequest(Request)`
- Cookie-based signed session token
- Routes for:
  - signup/login/logout
  - session + me
  - sessions revoke + revoke-all
  - magic-link request/verify
  - password-reset request/reset
  - email-verification request/verify
  - OAuth login/link (`google`/`github`)
  - OAuth authorize + callback endpoints
  - linked accounts
  - roles update
- Adapters:
  - `@alesha-nov/auth-web/next`
  - `@alesha-nov/auth-web/tanstack`
- Configurable CORS support
- Built-in/custom rate limiter support for public auth endpoints

## Required for Target Auth (Email/Password, Magic Link, Google/GitHub)

- Serve auth APIs consumed by frontend packages
- Set/clear secure cookie session
- Bridge OAuth identity data to auth service
- Expose endpoint contracts usable by SSR/API frameworks

## Remaining / Follow-up

- Document production-grade OAuth provider exchange wiring examples
- Improve persistence strategy for session revocation store if multi-instance deployment is required

## Tracking Issues

Create/update issues for newly discovered gaps. Historical issues #11/#34/#35/#36/#37 are closed.
