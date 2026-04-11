# @alesha-nov/auth-react

React client toolkit for authentication state, hooks, and route guarding.

## Implemented Features

- `AuthProvider` to fetch `/session` + `/me`
- `useAuth()` state hook
- `useLogin()`, `useSignup()`, `useLogout()` mutation hooks
- `usePasswordResetRequest()`, `useResetPassword()` hooks
- `useMagicLinkRequest()`, `useMagicLinkVerify()` hooks
- `useOAuthLogin()` hook for provider authorize redirect
- `useOAuthLink()` hook to link provider account credentials to authenticated users
- `useAuthGuard()` and `AuthGuard` component
- Session-expiry-aware refresh scheduling in provider
- Navigation adapter support for route guards (`push`/`replace`)
- Configurable `baseUrl` + `basePath`

## Required for Target Auth (Email/Password, Magic Link, Google/GitHub)

- Consume auth-web endpoints consistently
- Keep client auth state synchronized with cookie session
- Provide route protection UX for protected views

## Remaining / Follow-up

- Recommended: add SSR-first guard patterns in app router (outside this package)

## Usage: useOAuthLink

```ts
import { useOAuthLink, useOAuthLogin } from "@alesha-nov/auth-react";
import type { OAuthAccountLinkInput } from "@alesha-nov/auth-react";

function LinkGoogleAccount() {
  const { link, data, loading, error } = useOAuthLink();

  const handleSubmit = async () => {
    try {
      const input: OAuthAccountLinkInput = {
        providerAccountId: "google-oauth-account-id",
        providerEmail: "user@gmail.com",
      };
      await link("google", input);
    } catch {
      // handle error
    }
  };

  return {
    loading,
    error,
    linkedProvider: data?.provider,
    providerAccountId: data?.providerAccountId,
  };
}
```

Notes:
- This hook requires an authenticated `AuthProvider` context.
- The request targets `POST /oauth/:provider/link` and returns the created/linked account.

## Tracking Issues

Create/update issues for any new gaps discovered. Historical issues #12/#38/#39/#40 are closed.
