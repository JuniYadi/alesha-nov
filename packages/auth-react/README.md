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

- [ ] OAuth client hooks (`useOAuthLogin`, `useOAuthLink`)
- [ ] Magic link hooks (`request`, `verify`)
- [ ] Forgot/reset password hooks
- [ ] Session expiry proactive refresh handling
- [ ] Router-agnostic redirect adapter (instead of `window.location.href` only)
- [ ] Dedicated package docs under `docs/packages/auth-react.md`

## Suggested GitHub Issues

1. Add OAuth hooks for Google/GitHub login and linking
2. Add magic-link hooks for request/verify flow
3. Add forgot/reset password hooks
4. Add session-expiry-aware auto refetch/refresh behavior
5. Add pluggable navigation support for route guards
6. Add docs page `docs/packages/auth-react.md`
