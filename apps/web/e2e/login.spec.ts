import { test, expect } from '@playwright/test'

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  test('page loads with login form', async ({ page }) => {
    await expect(page.locator('h2:has-text("Login with email/password")')).toBeVisible()
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button:has-text("Login")')).toBeVisible()
  })

  test('magic link section is visible', async ({ page }) => {
    await expect(page.locator('h2:has-text("Magic link demo")')).toBeVisible()
    await expect(page.locator('button:has-text("Request magic link token")')).toBeVisible()
  })

  test('login with invalid credentials shows error message', async ({ page }) => {
    await page.fill('input[type="email"]', 'nonexistent@example.com')
    await page.fill('input[type="password"]', 'wrongpassword')
    await page.click('button:has-text("Login")')
    
    await expect(page.getByText(/invalid|failed|error/i)).toBeVisible({ timeout: 10000 })
  })

  test('magic link request button is clickable', async ({ page }) => {
    await page.locator('input[placeholder="Email"]').first().fill('test@example.com')
    await page.click('button:has-text("Request magic link token")')
    
    await expect(page.locator('p.text-red-600, p.text-emerald-700')).toBeVisible({ timeout: 10000 })
  })
})
