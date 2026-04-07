# @alesha-nov/auth-react

React client helpers for authentication state and guard flow.

## Install

```json
{
  "@alesha-nov/auth-react": "workspace:*"
}
```

## Implemented Features

- `AuthProvider`
- `useAuth`
- `useLogin`
- `useSignup`
- `useLogout`
- `useAuthGuard`
- `AuthGuard`

## API Contract with `@alesha-nov/auth-web`

Expected endpoints under `/auth`:

- `POST /signup`
- `POST /login`
- `POST /logout`
- `GET /session`
- `GET /me`

All requests use `credentials: include`.

## Missing / On-going

- OAuth hooks and callbacks UX
- Magic-link hooks
- Forgot/reset password hooks
- Session expiry pre-emptive refresh
- Router-integrated navigation hook

## Tracking

- Track missing features in this file and package README.
- Open corresponding GitHub issues using titles from package README.
