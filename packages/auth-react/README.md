# @alesha-nov/auth-react

React client toolkit for authentication state, hooks, and route guarding.

## Implemented Features

- `AuthProvider` to fetch `/session` + `/me`
- `useAuth()` state hook
- `useLogin()`, `useSignup()`, `useLogout()` mutation hooks
- `usePasswordResetRequest()`, `useResetPassword()` hooks
- `useMagicLinkRequest()`, `useMagicLinkVerify()` hooks
- `useOAuthLogin()` hook for provider authorize redirect
- `useAuthGuard()` and `AuthGuard` component
- Session-expiry-aware refresh scheduling in provider
- Navigation adapter support for route guards (`push`/`replace`)
- Configurable `baseUrl` + `basePath`

## Required for Target Auth (Email/Password, Magic Link, Google/GitHub)

- Consume auth-web endpoints consistently
- Keep client auth state synchronized with cookie session
- Provide route protection UX for protected views

## Remaining / Follow-up

- OAuth account-linking hook (`useOAuthLink`) is not exposed yet
- Recommended: add SSR-first guard patterns in app router (outside this package)

## Tracking Issues

Create/update issues for any new gaps discovered. Historical issues #12/#38/#39/#40 are closed.
