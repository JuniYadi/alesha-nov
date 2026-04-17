# API Reference — TanStack Start Demo App

Complete HTTP API reference for `apps/web`, backed by `@alesha-nov/auth-web/tanstack`.

## Base URL

```
http://172.25.131.143:3000/auth
```

## Auth Endpoints

All endpoints return JSON. Protected endpoints require a valid `alesha_auth` cookie set by a prior `/auth/signup` or `/auth/login` call.

---

### POST /auth/signup

Create a new account. Sets the session cookie automatically on success.

```bash
curl -X POST http://172.25.131.143:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"secret123","name":"Alice"}'
```

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | Yes | Normalized to lowercase, trimmed |
| `password` | string | Yes | Min 8 chars |
| `name` | string | No | Display name |
| `roles` | string[] | No | Default `["user"]` |

**Success response (200):**

```json
{
  "user": {
    "id": "01921abc-1234-7890-abcd-ef0123456789",
    "email": "alice@example.com",
    "name": "Alice",
    "roles": ["user"]
  }
}
```

**Error responses:**

| Status | Body | Cause |
|--------|------|-------|
| `409` | `{"error":"User already exists"}` | Email already registered |
| `400` | `{"error":"..."}` | Validation failure |

---

### POST /auth/login

Authenticate with email and password. Sets the session cookie on success.

```bash
curl -X POST http://172.25.131.143:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"secret123"}'
```

**Request body:**

| Field | Type | Required |
|-------|------|----------|
| `email` | string | Yes |
| `password` | string | Yes |

**Success response (200):**

```json
{
  "user": {
    "id": "01921abc-1234-7890-abcd-ef0123456789",
    "email": "alice@example.com",
    "roles": ["user"]
  }
}
```

**Error responses:**

| Status | Body |
|--------|------|
| `401` | `{"error":"Invalid credentials"}` |

---

### POST /auth/logout

Revoke the current session and clear the cookie.

```bash
curl -X POST http://172.25.131.143:3000/auth/logout \
  -b "alesha_auth=<token>"
```

**Success response (200):**

```json
{ "ok": true }
```

**Error responses:**

| Status | Body | Cause |
|--------|------|-------|
| `401` | `{"error":"Unauthorized"}` | No cookie or invalid/expired session |

---

### GET /auth/session

Returns the current session for the provided cookie.

```bash
# Without cookie → 401
curl -i http://172.25.131.143:3000/auth/session

# With cookie → 200
curl -i -b "alesha_auth=<token>" http://172.25.131.143:3000/auth/session
```

**Success response (200):**

```json
{
  "session": {
    "userId": "01921abc-1234-7890-abcd-ef0123456789",
    "email": "alice@example.com",
    "roles": ["user"],
    "exp": 1744924800
  }
}
```

**Error responses:**

| Status | Body |
|--------|------|
| `401` | `{"error":"Unauthorized"}` |

---

### GET /auth/me

Returns the full user object for the current session. Requires `getUser` callback to be configured in `createAuthWeb`.

```bash
curl -i -b "alesha_auth=<token>" http://172.25.131.143:3000/auth/me
```

**Success response (200):**

```json
{
  "id": "01921abc-1234-7890-abcd-ef0123456789",
  "email": "alice@example.com",
  "name": "Alice",
  "roles": ["user"]
}
```

**Error responses:**

| Status | Body |
|--------|------|
| `401` | `{"error":"Unauthorized"}` |

---

### POST /auth/magic-link/request

Issue a magic link token. In demo mode the raw token is returned directly (no email sent).

```bash
curl -X POST http://172.25.131.143:3000/auth/magic-link/request \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com"}'
```

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | Yes | Target email address |
| `ttlSeconds` | number | No | Token lifetime in seconds (default 900) |

**Success response (200):**

```json
{
  "token": "ml_abc123..."
}
```

---

### POST /auth/magic-link/verify

Verify a magic link token and issue a session.

```bash
curl -X POST http://172.25.131.143:3000/auth/magic-link/verify \
  -H "Content-Type: application/json" \
  -d '{"token":"ml_abc123..."}'
```

**Success response (200):** Sets session cookie.

```json
{
  "user": {
    "id": "01921abc-1234-7890-abcd-ef0123456789",
    "email": "alice@example.com",
    "roles": ["user"]
  }
}
```

**Error responses:**

| Status | Body |
|--------|------|
| `401` | `{"error":"Invalid or expired token"}` |

---

### POST /auth/oauth/:provider/login

Log in or sign up via OAuth. Provider can be `google` or `github`.

```bash
curl -X POST http://172.25.131.143:3000/auth/oauth/google/login \
  -H "Content-Type: application/json" \
  -d '{
    "providerAccountId": "google_12345",
    "email": "alice@gmail.com",
    "name": "Alice",
    "emailVerified": true,
    "roles": ["user"]
  }'
```

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `provider` | string | In path | `google` or `github` |
| `providerAccountId` | string | Yes | OAuth provider's user ID |
| `email` | string | Yes | User's email |
| `name` | string | No | Display name |
| `image` | string | No | Avatar URL |
| `emailVerified` | boolean | No | Default `false` |
| `roles` | string[] | No | Default `["user"]` |

**Success response (200):** Sets session cookie.

```json
{
  "user": {
    "id": "01921abc-1234-7890-abcd-ef0123456789",
    "email": "alice@gmail.com",
    "roles": ["user"]
  }
}
```

---

### POST /auth/oauth/:provider/link

Link an OAuth account to an existing logged-in user.

```bash
curl -X POST http://172.25.131.143:3000/auth/oauth/google/link \
  -H "Content-Type: application/json" \
  -b "alesha_auth=<token>" \
  -d '{"providerAccountId":"google_12345","providerEmail":"alice@gmail.com"}'
```

**Error responses:**

| Status | Body | Cause |
|--------|------|-------|
| `401` | `{"error":"Unauthorized"}` | No session |
| `409` | `{"error":"Account already linked"}` | OAuth account already linked to another user |

---

### GET /auth/linked-accounts

List all OAuth accounts linked to the current user.

```bash
curl -b "alesha_auth=<token>" http://172.25.131.143:3000/auth/linked-accounts
```

**Success response (200):**

```json
{
  "accounts": [
    {
      "provider": "google",
      "providerAccountId": "google_12345",
      "email": "alice@gmail.com"
    }
  ]
}
```

---

### PUT /auth/roles

Update roles for a user. Requires session with `support.write` or `billing.write` role to update other users.

```bash
curl -X PUT http://172.25.131.143:3000/auth/roles \
  -H "Content-Type: application/json" \
  -b "alesha_auth=<token>" \
  -d '{"userId":"01921abc-...","roles":["user","support.read"]}'
```

**Request body:**

| Field | Type | Required |
|-------|------|----------|
| `userId` | string | Yes |
| `roles` | string[] | Yes |

**Success response (200):**

```json
{
  "roles": ["user", "support.read"]
}
```

**Error responses:**

| Status | Body | Cause |
|--------|------|-------|
| `401` | `{"error":"Unauthorized"}` | No session |
| `403` | `{"error":"Insufficient permissions"}` | Not allowed to update this user |

---

### POST /auth/sessions/revoke

Revoke a specific session by ID.

```bash
curl -X POST http://172.25.131.143:3000/auth/sessions/revoke \
  -H "Content-Type: application/json" \
  -b "alesha_auth=<token>" \
  -d '{"sessionId":"<session-id>"}'
```

---

### POST /auth/sessions/revoke-all

Revoke all sessions for the current user.

```bash
curl -X POST http://172.25.131.143:3000/auth/sessions/revoke-all \
  -b "alesha_auth=<token>"
```

---

## Complete curl Workflow

### Signup → Session Check → Logout

```bash
# 1. Signup (creates account + sets cookie)
curl -X POST http://172.25.131.143:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"bob@example.com","password":"password123","name":"Bob"}' \
  -c cookies.txt

# 2. Check session using saved cookie
curl -b cookies.txt http://172.25.131.143:3000/auth/session

# 3. Get current user
curl -b cookies.txt http://172.25.131.143:3000/auth/me

# 4. Logout (revokes session)
curl -X POST http://172.25.131.143:3000/auth/logout \
  -b cookies.txt

# 5. Session is now invalid
curl -b cookies.txt http://172.25.131.143:3000/auth/session
# → 401 Unauthorized
```

### Login → Update Roles → Logout

```bash
# 1. Login
curl -X POST http://172.25.131.143:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"bob@example.com","password":"password123"}' \
  -c cookies.txt

# 2. Check session
curl -b cookies.txt http://172.25.131.143:3000/auth/session

# 3. Logout
curl -X POST http://172.25.131.143:3000/auth/logout \
  -b cookies.txt
```

---

## Error Reference

| HTTP Status | Error Message | Description |
|-------------|---------------|-------------|
| `400` | `Invalid request` | Malformed JSON or missing required fields |
| `400` | `Password must be at least 8 characters` | Password policy violation |
| `401` | `Invalid credentials` | Wrong email or password |
| `401` | `Unauthorized` | No session or session expired/revoked |
| `403` | `Insufficient permissions` | Role-based access denied |
| `404` | `Not found` | Route does not exist |
| `409` | `User already exists` | Email already registered |
| `409` | `Account already linked` | OAuth account already linked to another user |
| `422` | `Invalid or expired token` | Magic link or reset token |
| `429` | `Too many requests` | Rate limit exceeded |
| `500` | Internal server error | Unexpected server error |

---

## Session Cookie

The session cookie is named `alesha_auth` by default. It is:
- **HTTP-only** — not accessible via JavaScript
- **Signed** — HMAC-SHA256 with `SESSION_SECRET`
- **Scoped** — `Path=/`, `SameSite=Lax`
- **Configurable** — `secureCookie` is `true` in production, `false` in development

### Cookie Format

```
alesha_auth=<base64url-encoded-payload>.<base64url-encoded-signature>
```

### Verifying a Session Programmatically

```ts
import { getSessionFromRequest } from '@alesha-nov/auth-web'

const session = await getSessionFromRequest(
  request,
  process.env.SESSION_SECRET!,
  'alesha_auth'
)
// → AuthSession | null
```
