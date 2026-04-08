# @alesha-nov/auth-react

React client toolkit for authentication state, hooks, and route guarding.

## Implemented Features

- `AuthProvider` to fetch `/session` + `/me`
- `useAuth()` state hook
- `useLogin()`, `useSignup()`, `useLogout()` mutation hooks
- `useAuthGuard()` and `AuthGuard` component
- Configurable `baseUrl` + `basePath`

## Required for Target Auth (Email/Password, Magic Link, Google/GitHub)

- Consume auth-web endpoints consistently
- Keep client auth state synchronized with cookie session
- Provide auth guard for protected routes

## Missing / On-going (Track Here)

- [ ] OAuth client hooks (`useOAuthLogin`, `useOAuthLink`) — [#12](https://github.com/JuniYadi/alesha-nov/issues/12)
- [ ] Magic link hooks (`request`, `verify`) — [#38](https://github.com/JuniYadi/alesha-nov/issues/38)
- [ ] Session expiry proactive refresh handling — [#39](https://github.com/JuniYadi/alesha-nov/issues/39)
- [ ] Router-agnostic redirect adapter (instead of `window.location.href` only) — [#40](https://github.com/JuniYadi/alesha-nov/issues/40)

## Already Implemented (was previously tracked as missing)

- [x] Forgot/reset password hooks (`usePasswordResetRequest`, `useResetPassword`)
- [x] Dedicated package docs under `docs/packages/auth-react.md`

## Tracking Issues

- [#12](https://github.com/JuniYadi/alesha-nov/issues/12) Add OAuth hooks for Google/GitHub login and linking (@alesha-nov/auth-react)
- [#38](https://github.com/JuniYadi/alesha-nov/issues/38) Add magic-link hooks request/verify (@alesha-nov/auth-react)
- [#39](https://github.com/JuniYadi/alesha-nov/issues/39) Add session-expiry-aware auto refresh/refetch (@alesha-nov/auth-react)
- [#40](https://github.com/JuniYadi/alesha-nov/issues/40) Add pluggable navigation adapter for route guards (@alesha-nov/auth-react)
