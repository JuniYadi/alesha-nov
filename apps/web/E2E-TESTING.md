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

### 3. Login Page (`/login`)

#### 3.1 Email/Password Login

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 3.1.1 | Page loads with login form | Email + Password fields + Login button | ✅ |
| 3.1.2 | Login with invalid credentials | Error message displayed | ✅ |

#### 3.2 Magic Link Login

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 3.2.1 | Request magic link token | Button clickable, response shown | ✅ |

### 4. Dashboard Page (`/dashboard`) - Protected Route

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 4.1 | Access without login | Redirects to `/login` | ✅ |
| 4.2 | Access while logged in | Shows user email and roles | ✅ |
| 4.3 | Logout button | Clears session, redirects to `/login` | ✅ |

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

---

## Package Comparison

### Existing Testing Packages

| Package | Purpose | Used For |
|---------|---------|----------|
| `vitest` | Unit/Component testing | `apps/web` route guards, smoke tests |
| `bun:test` | Unit testing | All `@alesha-nov/*` packages |
| `@testing-library/react` | React component testing | Component rendering |
| `@playwright/test` | Browser automation E2E | **Now installed** |

### Feature Coverage Matrix

| Feature | Unit Tests | Integration Tests | E2E Tests |
|---------|------------|-------------------|-----------|
| Signup API | ✅ `auth-web` | ✅ Route tests | ✅ Signup page |
| Login API | ✅ `auth-web` | ✅ Route tests | ✅ Login page |
| Magic Link API | ✅ `auth-web` | ✅ Route tests | ✅ Magic link section |
| Session Management | ✅ `auth-web` | ✅ Route tests | ✅ Full auth flow |
| Protected Routes | ✅ Unit | ✅ Route guard | ✅ Dashboard |
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
│   ├── home.spec.ts        # Home page tests
│   ├── signup.spec.ts      # Signup page + flow
│   ├── login.spec.ts       # Login page + magic link
│   ├── dashboard.spec.ts   # Protected route tests
│   ├── theme.spec.ts       # Theme toggle tests
│   └── navigation.spec.ts  # Header/nav tests
├── playwright.config.ts    # Playwright configuration
```

### Notes

- E2E tests run with a single worker to avoid state pollution from shared cookies/localStorage
- Tests target `http://172.25.131.143:3000` by default
- The dev server is automatically started by Playwright if not running
