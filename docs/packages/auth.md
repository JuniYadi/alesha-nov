# @alesha-nov/auth

Full-featured authentication service: email/password signup & login, magic links, and OAuth (Google, GitHub). Works with MySQL, PostgreSQL, and SQLite.

## Install

```json
{
  "@alesha-nov/auth": "workspace:*"
}
```

## Setup

Create the auth service by passing a database config from `@alesha-nov/db`. The service auto-runs migrations on startup.

```ts
import { createAuthService } from "@alesha-nov/auth";
import { resolveDBType } from "@alesha-nov/db";

const dbConfig = {
  type: resolveDBType(),
  url: process.env.DATABASE_URL!,
};

const authService = await createAuthService(dbConfig);
```

## AuthService Interface

```ts
interface AuthService {
  signup(input: SignupInput): Promise<AuthUser>;
  login(input: LoginInput): Promise<AuthUser | null>;
  issueMagicLinkToken(input: MagicLinkInput): Promise<string>;
  verifyMagicLinkToken(token: string): Promise<AuthUser | null>;
  setUserRoles(userId: string, roles: string[]): Promise<string[]>;
  getUserRoles(userId: string): Promise<string[]>;
  loginWithOAuth(input: OAuthLoginInput): Promise<AuthUser>;
  linkOAuthAccount(input: LinkOAuthAccountInput): Promise<OAuthAccountLink>;
  getLinkedAccounts(userId: string): Promise<OAuthAccountLink[]>;
}
```

## Input Types

### SignupInput

```ts
interface SignupInput {
  email: string;
  password: string;
  name?: string;
  image?: string;
  roles?: string[];
}
```

### LoginInput

```ts
interface LoginInput {
  email: string;
  password: string;
}
```

### MagicLinkInput

```ts
interface MagicLinkInput {
  email: string;
  ttlSeconds?: number; // default 15 * 60 (15 minutes)
}
```

### OAuthLoginInput

```ts
type OAuthProvider = "google" | "github";

interface OAuthLoginInput {
  provider: OAuthProvider;
  providerAccountId: string;
  email: string;
  name?: string;
  image?: string;
  emailVerified?: boolean;
  roles?: string[];
}
```

## AuthUser

```ts
interface AuthUser {
  id: string;
  email: string;
  passwordHash: string;   // never expose this to the client
  name: string | null;
  image: string | null;
  emailVerifiedAt: string | null;
  roles: string[];
  createdAt: string;
}
```

## Role Format

Roles must match `/^[a-z0-9]+[a-z0-9._-]*$/`. Example valid roles:

```
user
admin
support.read
billing.write
```

## Example: Signup & Login

```ts
// Sign up
const user = await authService.signup({
  email: "yadi@example.com",
  password: "super-secret",
  roles: ["user"],
});

// Login
const loggedIn = await authService.login({
  email: "yadi@example.com",
  password: "super-secret",
});
// → AuthUser | null
```

## Example: Magic Link

```ts
// 1. Issue a magic link token (send this to the user via email)
const token = await authService.issueMagicLinkToken({
  email: "yadi@example.com",
  ttlSeconds: 15 * 60,
});
// → "raw-token-to-send-via-email"

// 2. Verify the token (typically in a /verify route)
const user = await authService.verifyMagicLinkToken(token);
// → AuthUser | null
```

## Optional: Auto email delivery during token issuance

`createAuthService` now supports optional email delivery for:
- `issueMagicLinkToken`
- `issuePasswordResetToken`
- `issueEmailVerificationToken`

When `options.email` is configured, the service will auto-send using `@alesha-nov/email` after token persistence succeeds.

```ts
import { createAuthService } from "@alesha-nov/auth";
import { createSesProvider } from "@alesha-nov/email";

const authService = await createAuthService(dbConfig, {
  email: {
    from: "noreply@example.com",
    provider: createSesProvider({
      region: "us-east-1",
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    }),

    // optional per-flow overrides
    magicLink: {
      // enabled defaults to true when email provider exists
      enabled: true,
      render: ({ token, ttlSeconds }) => ({
        subject: "Your sign-in link",
        html: `<p>Use this link: <a href="${token}">Sign in</a></p>`,
        text: `Use this link to sign in: ${token} (expires in ${ttlSeconds}s)`,
      }),
    },
    passwordReset: {
      to: ({ email }) => `security+${email}`,
    },
    emailVerification: {
      enabled: false, // opt out for a specific flow
    },
  },
});
```

### Behavior notes
- If `options.email` is omitted, behavior is unchanged: token methods return raw tokens only.
- If `options.email` is provided and a flow is not disabled, default templates are used from `@alesha-nov/email` (`magic-link`, `reset-password`, `verify-email`).
- `render` and `to` let apps fully customize payloads/recipients per flow.

## Example: OAuth Login

```ts
// After the OAuth provider returns the user info
const user = await authService.loginWithOAuth({
  provider: "google",
  providerAccountId: "google-12345",
  email: "yadi@gmail.com",
  name: "Juni Yadi",
  emailVerified: true,
  roles: ["user"],
});
```

## Example: Role Management

```ts
// Set roles for a user
const roles = await authService.setUserRoles(userId, ["user", "billing.read"]);

// Get current roles
const currentRoles = await authService.getUserRoles(userId);
// → ["billing.read", "user"]
```

## Database Tables Created

The service auto-creates these tables via migrations:

| Table | Purpose |
|-------|---------|
| `auth_users` | Core user records (id, email, password_hash, name, image) |
| `auth_sessions` | Session records (token hash, expiry, user linkage) |
| `auth_magic_link_tokens` | Magic link tokens (hashed, with expiry) |
| `auth_user_roles` | Role assignments per user |
| `auth_oauth_accounts` | Linked OAuth accounts per user |
| `auth_password_reset_tokens` | Password reset tokens (hashed, with expiry) |
| `auth_email_verification_tokens` | Email verification tokens (hashed, with expiry) |

## Utils

```ts
import {
  normalizeEmail,
  normalizeRoles,
  hashPassword,
  verifyPassword,
  hashToken,
  newId,
} from "@alesha-nov/auth";
```

| Function | Description |
|----------|-------------|
| `normalizeEmail(e)` | Trim + lowercase |
| `normalizeRoles(r)` | Validate + deduplicate roles |
| `hashPassword(pw)` | scrypt hash with random salt → `"salt:digest"` |
| `verifyPassword(pw, stored)` | Returns `boolean` |
| `hashToken(token)` | SHA-256 hex digest |
| `newId()` | UUIDv7 |
