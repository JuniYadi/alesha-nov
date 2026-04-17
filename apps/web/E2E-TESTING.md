# E2E Testing Checklist

## Testing URL: http://172.25.131.143:3000/

---

## Feature Checklist

### 1. Home Page (`/`)

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 1.1 | Page loads successfully | Page renders without errors | ✅ |
| 1.2 | Auth status displays correctly | Shows `unauthenticated` when logged out | ✅ |
| 1.3 | Navigation links visible | Home, Signup, Login, Dashboard links present | ✅ |
| 1.4 | Click "Go to Signup" navigates to `/signup` | URL changes to `/signup` | ✅ |
| 1.5 | Click "Go to Login" navigates to `/login` | URL changes to `/login` | ✅ |
| 1.6 | Click "Open Dashboard" when logged out redirects | Redirects to `/login` | ✅ |

### 2. Signup Page (`/signup`)

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 2.1 | Page loads with signup form | Name, Email, Password fields + Submit button | ✅ |
| 2.2 | Submit empty form | HTML5 validation triggers | ✅ |
| 2.3 | Submit valid signup form | Account created, success message | ✅ |
| 2.4 | Signup then login flow | Full auth flow works end-to-end | ✅ |
| 2.5 | Authenticated user visits `/signup` | Redirects to `/dashboard` | ✅ |

### 3. Login Page (`/login`)

#### 3.1 Email/Password Login

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 3.1.1 | Page loads with login form | Email + Password fields + Login button | ✅ |
| 3.1.2 | Login with invalid credentials | Error message displayed | ✅ |
| 3.1.3 | Authenticated user visits `/login` | Redirects to `/dashboard` | ✅ |

#### 3.2 Magic Link Login

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 3.2.1 | Request magic link token | Button clickable, response shown | ✅ |

### 4. Dashboard Page (`/dashboard`) - Protected Route

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 4.1 | Access without login | Redirects to `/login` with `?redirect=` param | ✅ |
| 4.2 | Access while logged in | Shows user email and roles | ✅ |
| 4.3 | Logout button | Clears session, redirects to `/login` | ✅ |
| 4.4 | After logout, `/dashboard` redirects to `/login` | Session cleared, can no longer access | ✅ |

### 5. Theme Toggle

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 5.1 | Default theme is "Auto" | Shows "Auto" button text | ✅ |
| 5.2 | Cycles: Auto → Light → Dark → Auto | Theme changes accordingly | ✅ |
| 5.3 | Theme persists on page reload | Selected theme maintained | ✅ |
| 5.4 | Light mode applies `light` class | CSS class `light` on html element | ✅ |
| 5.5 | Dark mode applies `dark` class | CSS class `dark` on html element | ✅ |

### 6. Navigation / Header

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 6.1 | Header sticky at top | Header stays visible on scroll | ✅ |
| 6.2 | Nav links navigate correctly | Home, Signup, Login links work | ✅ |
| 6.3 | Logo links to home | Click "Alesha Auth Demo" → `/` | ✅ |
| 6.4 | Active link is highlighted | Current page link has different style | ✅ |
| 6.5 | Unauthenticated user sees Signup/Login, not Dashboard | Only public nav links visible | ✅ |
| 6.6 | Authenticated user sees Dashboard, not Signup/Login | Only Dashboard nav link visible | ✅ |

### 7. API Playground Page (`/api`)

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 7.1 | Page loads successfully | API Playground renders with current auth state | ✅ |
| 7.2 | Auth status shown | Displays `authenticated`/`unauthenticated` with user email | ✅ |
| 7.3 | Public endpoints accessible | Signup, Login, Magic Link cards visible | ✅ |
| 7.4 | Protected endpoints shown | Session, Me, Logout cards visible (auth-required label) | ✅ |
| 7.5 | POST /auth/signup via playground | Returns 200 with user object | ✅ |
| 7.6 | POST /auth/login via playground | Returns 200 with user object | ✅ |
| 7.7 | GET /auth/session without auth | Returns 401 | ✅ |
| 7.8 | curl examples section visible | Shows formatted curl commands | ✅ |
| 7.9 | Request history populated | After any request, history entry appears | ✅ |

### 8. Auth Redirect Guards

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 8.1 | Unauthenticated → `/dashboard` | Redirects to `/login` | ✅ |
| 8.2 | Unauthenticated → `/dashboard` preserves `?redirect=` | URL contains `redirect` query param | ✅ |
| 8.3 | Authenticated → `/login` | Redirects to `/dashboard` | ✅ |
| 8.4 | Authenticated → `/signup` | Redirects to `/dashboard` | ✅ |
| 8.5 | After logout, `/login` and `/signup` are accessible again | Both pages render forms | ✅ |
| 8.6 | Login with redirect param navigates to original page | After login, lands on intended page | ✅ |

### 9. API Auth Verification

#### 8.1 Unauthenticated API Access

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 8.1.1 | `GET /auth/session` without cookie | Returns `401` | ✅ |
| 8.1.2 | `GET /auth/me` without cookie | Returns `401` | ✅ |
| 8.1.3 | `POST /auth/login` with wrong password | Returns `401` | ✅ |
| 8.1.4 | `POST /auth/signup` with duplicate email | Returns `409` | ✅ |

#### 8.2 Authenticated API Access

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 8.2.1 | `POST /auth/signup` creates account | Returns `200`, sets `alesha_auth` cookie | ✅ |
| 8.2.2 | `POST /auth/login` with valid credentials | Returns `200`, sets session cookie | ✅ |
| 8.2.3 | `GET /auth/session` with valid cookie | Returns `200` with session JSON | ✅ |
| 8.2.4 | `GET /auth/me` with valid cookie | Returns `200` with user JSON (includes email) | ✅ |
| 8.2.5 | `POST /auth/logout` with valid cookie | Returns `200`, clears session | ✅ |
| 8.2.6 | After logout, `GET /auth/session` with old cookie | Returns `401` | ✅ |

#### 8.3 API Examples

**Check session (no cookie):**
```bash
curl -i http://172.25.131.143:3000/auth/session
# HTTP/1.1 401 Unauthorized
```

**Check session (with cookie):**
```bash
curl -i -b "alesha_auth=<token>" http://172.25.131.143:3000/auth/session
# HTTP/1.1 200 OK
# { "userId": "...", "sessionId": "...", "email": "...", "roles": [...], "exp": ... }
```

**Get current user:**
```bash
curl -i -b "alesha_auth=<token>" http://172.25.131.143:3000/auth/me
# HTTP/1.1 200 OK
# { "id": "...", "email": "...", "name": "..." }
```

**Signup:**
```bash
curl -i -X POST http://172.25.131.143:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test"}'
# HTTP/1.1 200 OK
# Set-Cookie: alesha_auth=...
```

**Login:**
```bash
curl -i -X POST http://172.25.131.143:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
# HTTP/1.1 200 OK
# Set-Cookie: alesha_auth=...
```

**Logout:**
```bash
curl -i -X POST -b "alesha_auth=<token>" http://172.25.131.143:3000/auth/logout
# HTTP/1.1 200 OK
```

---

## Package Integration Checklist

### Monorepo Packages (`packages/`)

| Package | Version | Entry Points | Dependencies | E2E Tests Validating It |
|---------|---------|-------------|-------------|------------------------|
| `@alesha-nov/auth` | 0.2.4 | `.`, `./types`, `./utils`, `./migrations`, `./user-store`, `./service` | `@alesha-nov/db`, `@alesha-nov/email` | API auth tests (signup, login, session, logout) |
| `@alesha-nov/auth-web` | 0.2.4 | `.`, `./next`, `./tanstack` | `@alesha-nov/auth` | API auth tests (all `/auth/*` routes), dashboard protection |
| `@alesha-nov/auth-react` | 0.3.0 | `.`, `./context`, `./hooks` | peer: `react >=18` | Signup form, login form, dashboard AuthGuard, auth redirects |
| `@alesha-nov/config` | 0.3.0 | `.` | none | Indirect — session cookie config, auth config resolution |
| `@alesha-nov/db` | 0.2.1 | `.`, `./auth-migrations` | none (Bun runtime) | Indirect — user persistence across signup/login/logout |
| `@alesha-nov/email` | 0.2.0 | `.` | `@aws-sdk/client-ses`, `nodemailer` | Indirect — magic link email delivery |

### Dependency Graph

```
@alesha-nov/config     (standalone)
@alesha-nov/db         (standalone, Bun runtime)
@alesha-nov/email      (standalone, SES/SMTP)
      ↓
@alesha-nov/auth       → db, email
      ↓
@alesha-nov/auth-web   → auth
      ↓
apps/web               → all packages
      ↕
@alesha-nov/auth-react (peer: react, used in apps/web)
```

### Package → E2E Feature Mapping

| E2E Feature | `auth` | `auth-web` | `auth-react` | `config` | `db` | `email` |
|-------------|--------|------------|-------------|----------|------|---------|
| Signup page flow | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| Login page flow | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| Magic link flow | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Dashboard protection | — | ✅ | ✅ | — | — | — |
| Auth redirects | — | ✅ | — | — | — | — |
| API session verify | ✅ | ✅ | — | ✅ | ✅ | — |
| API signup/login | ✅ | ✅ | — | ✅ | ✅ | — |
| Logout + session clear | ✅ | ✅ | ✅ | — | ✅ | — |
| Theme toggle | — | — | — | — | — | — |
| Navigation | — | — | — | — | — | — |

### Testing Packages

| Package | Purpose | Used For |
|---------|---------|----------|
| `vitest` | Unit/Component testing | `apps/web` route guards, smoke tests |
| `bun:test` | Unit testing | All `@alesha-nov/*` packages |
| `@testing-library/react` | React component testing | Component rendering |
| `@playwright/test` | Browser automation E2E | Full end-to-end flows |

---

## Feature Coverage Matrix

| Feature | Unit Tests | Integration Tests | E2E Tests |
|---------|------------|-------------------|-----------|
| Signup API | ✅ `auth-web` | ✅ Route tests | ✅ Signup page + API |
| Login API | ✅ `auth-web` | ✅ Route tests | ✅ Login page + API |
| Magic Link API | ✅ `auth-web` | ✅ Route tests | ✅ Magic link section |
| Session Management | ✅ `auth-web` | ✅ Route tests | ✅ Full auth flow + API |
| Protected Routes | ✅ Unit | ✅ Route guard | ✅ Dashboard |
| Auth Redirects (post-login) | — | — | ✅ Auth redirect tests |
| API Token Verification | ✅ `auth-web` | ✅ Handler tests | ✅ API auth tests |
| Theme Toggle | ❌ No tests | ❌ No tests | ✅ Theme tests |
| Navigation | ❌ No tests | ❌ No tests | ✅ Nav tests |

---

## Running E2E Tests

```bash
# Install browsers (one-time)
npx playwright install chromium

# Run all E2E tests
bun run test:e2e

# Run with UI mode
bun run test:e2e:ui

# Run headed (see browser)
bun run test:e2e:headed
```

### Test Files

```
apps/web/
├── e2e/
│   ├── home.spec.ts          # Home page tests
│   ├── signup.spec.ts        # Signup page + flow
│   ├── login.spec.ts         # Login page + magic link
│   ├── dashboard.spec.ts     # Protected route tests
│   ├── theme.spec.ts         # Theme toggle tests
│   ├── navigation.spec.ts    # Header/nav tests + conditional nav links
│   ├── auth-redirect.spec.ts # Auth redirect guard tests
│   └── api-auth.spec.ts      # API auth verification tests
├── playwright.config.ts      # Playwright configuration
```

### Notes

- E2E tests run with a single worker to avoid state pollution from shared cookies/localStorage
- Tests target `http://172.25.131.143:3000` by default
- The dev server is automatically started by Playwright if not running
- API tests use Playwright's `request` context for direct HTTP calls without browser
- Auth redirect tests verify both `beforeLoad` server guards and client-side `AuthGuard` behavior
