import { test, expect } from '@playwright/test'

test.describe('Signup Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/signup')
  })

  test('page loads with signup form', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Signup')
    await expect(page.locator('input[placeholder="Name"]')).toBeVisible()
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('submit empty form shows validation', async ({ page }) => {
    await page.click('button[type="submit"]')
    await expect(page.locator('input[type="email"]')).toHaveAttribute('required', '')
  })

  test('submit valid signup form', async ({ page }) => {
    const timestamp = Date.now()
    const email = `test${timestamp}@example.com`
    
    await page.fill('input[placeholder="Name"]', 'Test User')
    await page.fill('input[type="email"]', email)
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')
    
    await expect(page.locator('text=/Signed up|Signed up:/')).toBeVisible({ timeout: 10000 })
  })

  test('signup creates account and allows login', async ({ page, context }) => {
    const timestamp = Date.now()
    const email = `logintest${timestamp}@example.com`
    const password = 'password123'
    
    await page.fill('input[placeholder="Name"]', 'Login Test')
    await page.fill('input[type="email"]', email)
    await page.fill('input[type="password"]', password)
    await page.click('button[type="submit"]')
    
    await expect(page.locator('text=/Signed up/')).toBeVisible({ timeout: 10000 })
    
    await page.goto('/login')
    await page.fill('input[type="email"]', email)
    await page.fill('input[type="password"]', password)
    await page.click('button:has-text("Login")')
    
    await page.waitForURL(/dashboard|/, { timeout: 10000 })
  })
})
