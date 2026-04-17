import { test, expect } from '@playwright/test'

async function signup(page: import('@playwright/test').Page, email: string, name = 'Redirect Test') {
  await page.goto('/signup')
  await page.fill('input[placeholder="Name"]', name)
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', 'password123')
  await page.click('button[type="submit"]')
  await expect(page.locator('text=/Signed up/')).toBeVisible({ timeout: 10000 })
}

test.describe('Auth Redirect Guards', () => {
  test('unauthenticated user accessing /dashboard redirects to /login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })

  test('unauthenticated user accessing /dashboard preserves redirect param', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
    const url = new URL(page.url())
    expect(url.searchParams.get('redirect')).toContain('dashboard')
  })

  test('authenticated user visiting /login redirects to /dashboard', async ({ page }) => {
    const timestamp = Date.now()
    const email = `redir-login${timestamp}@example.com`
    await signup(page, email)

    await page.goto('/login')
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })
  })

  test('authenticated user visiting /signup redirects to /dashboard', async ({ page }) => {
    const timestamp = Date.now()
    const email = `redir-signup${timestamp}@example.com`
    await signup(page, email)

    await page.goto('/signup')
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })
  })

  test('after logout, /login and /signup are accessible again', async ({ page }) => {
    const timestamp = Date.now()
    const email = `redir-logout${timestamp}@example.com`
    await signup(page, email)

    await page.goto('/dashboard')
    await page.click('button:has-text("Logout")')
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })

    await page.goto('/login')
    await expect(page).toHaveURL('/login')
    await expect(page.locator('h2:has-text("Login with email/password")')).toBeVisible()

    await page.goto('/signup')
    await expect(page).toHaveURL('/signup')
    await expect(page.locator('h1')).toContainText('Signup')
  })

  test('login with redirect param navigates to original page after auth', async ({ page }) => {
    const timestamp = Date.now()
    const email = `redir-param${timestamp}@example.com`

    await page.goto('/signup')
    await page.fill('input[placeholder="Name"]', 'Redirect Param')
    await page.fill('input[type="email"]', email)
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')
    await expect(page.locator('text=/Signed up/')).toBeVisible({ timeout: 10000 })

    await page.goto('/dashboard')
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible({ timeout: 10000 })
  })
})
