# @alesha-nov/auth-web

HTTP route handlers for web authentication. Handles cookie-based sessions, OAuth callbacks, and role management over a standard `Request/Response` interface. Works in any Node.js/Bun HTTP framework (Hono, Express, Next.js, etc.).

## Install

```json
{
  "@alesha-nov/auth-web": "workspace:*"
}
```

## createAuthWeb

```ts
import { createAuthWeb } from "@alesha-nov/auth-web";
import { createAuthService } from "@alesha-nov/auth";
import { createDatabaseClient, resolveDBType } from "@alesha-nov/config";

const authService = await createAuthService({
  type: resolveDBType(),
  url: process.env.DATABASE_URL!,
});

const auth = createAuthWeb({
  authService,
  sessionSecret: process.env.SESSION_SECRET!,
  basePath: "/auth",          // optional, default "/auth"
  cookieName: "alesha_auth",  // optional
  sessionTtlSeconds: 60 * 60 * 24 * 7, // optional, default 7 days
  secureCookie: true,          // optional, default true
});

// Use as a fetch handler
Bun.serve({
  port: 3000,
  async fetch(request) {
    return auth.handleRequest(request);
  },
});
```

## Auth Routes

All routes are `POST` unless noted.

### POST /auth/signup

Create a new account and set session cookie.

```http
POST /auth/signup
Content-Type: application/json

{
  "email": "yadi@example.com",
  "password": "secret123",
  "name": "Juni Yadi"
}
```

**Response (200):**

```json
{
  "user": {
    "id": "...",
    "email": "yadi@example.com",
    "name": "Juni Yadi",
    "roles": ["user"]
  }
}
```

### POST /auth/login

```http
POST /auth/login
Content-Type: application/json

{
  "email": "yadi@example.com",
  "password": "secret123"
}
```

**Response (200):**

```json
{ "user": { "id": "...", "email": "...", "roles": ["user"] } }
```

**Response (401):**

```json
{ "error": "Invalid credentials" }
```

### POST /auth/logout

Clear the session cookie.

```http
POST /auth/logout
```

### GET /auth/session

Get current session (requires valid cookie).

```http
GET /auth/session
Cookie: alesha_auth=...
```

**Response (200):**

```json
{
  "session": {
    "userId": "...",
    "email": "...",
    "roles": ["user"],
    "exp": 1744218000
  }
}
```

**Response (401):**

```json
{ "error": "Unauthorized" }
```

### POST /auth/magic-link/request

Request a magic link token. The raw token must be sent to the user via email externally.

```http
POST /auth/magic-link/request
Content-Type: application/json

{ "email": "yadi@example.com", "ttlSeconds": 900 }
```

**Response (200):**

```json
{ "token": "raw-token-to-email-to-user" }
```

### POST /auth/magic-link/verify

Verify a magic link token and issue a session.

```http
POST /auth/magic-link/verify
Content-Type: application/json

{ "token": "raw-token-from-email" }
```

### POST /auth/oauth/:provider/login

OAuth login for a specific provider.

```http
POST /auth/oauth/google/login
Content-Type: application/json

{
  "providerAccountId": "google-12345",
  "email": "yadi@gmail.com",
  "name": "Juni Yadi",
  "emailVerified": true,
  "roles": ["user"]
}
```

### POST /auth/oauth/:provider/link

Link an OAuth account to the currently logged-in user.

```http
POST /auth/oauth/google/link
Cookie: alesha_auth=...
Content-Type: application/json

{ "providerAccountId": "google-12345", "providerEmail": "yadi@gmail.com" }
```

### GET /auth/linked-accounts

Get all OAuth accounts linked to the current user.

```http
GET /auth/linked-accounts
Cookie: alesha_auth=...
```

### PUT /auth/roles

Update roles for a user. Requires `support.write` or `billing.write` role to update other users.

```http
PUT /auth/roles
Cookie: alesha_auth=...
Content-Type: application/json

{ "userId": "target-user-id", "roles": ["user", "billing.read"] }
```

## AuthSession

```ts
interface AuthSession {
  userId: string;
  email: string;
  roles: string[];
  exp: number;  // Unix timestamp
}
```

## getSessionFromRequest

Standalone helper to read a session from a request without using `createAuthWeb`.

```ts
import { getSessionFromRequest } from "@alesha-nov/auth-web";

const session = await getSessionFromRequest(request, sessionSecret, cookieName);
// → AuthSession | null
```

## Session Token Format

The session token is a signed JWT-like structure: `{b64url(payload)}.{b64url(signature)}`, signed with HMAC-SHA256 using the `sessionSecret`. The payload contains the `AuthSession` object.
