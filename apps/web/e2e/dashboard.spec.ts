import { test, expect } from '@playwright/test'

test.describe('Dashboard Page (Protected Route)', () => {
  test('redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })

  test('shows dashboard when authenticated', async ({ page }) => {
    await page.goto('/signup')
    const timestamp = Date.now()
    const email = `dashboard${timestamp}@example.com`
    
    await page.fill('input[placeholder="Name"]', 'Dashboard Test')
    await page.fill('input[type="email"]', email)
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')
    await expect(page.locator('text=/Signed up/')).toBeVisible({ timeout: 10000 })
    
    await page.goto('/dashboard')
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible()
    await expect(page.locator(`text=${email}`)).toBeVisible()
  })

  test('logout button is visible and functional', async ({ page }) => {
    await page.goto('/signup')
    const timestamp = Date.now()
    const email = `logout${timestamp}@example.com`
    
    await page.fill('input[placeholder="Name"]', 'Logout Test')
    await page.fill('input[type="email"]', email)
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')
    await expect(page.locator('text=/Signed up/')).toBeVisible({ timeout: 10000 })
    
    await page.goto('/dashboard')
    await page.click('button:has-text("Logout")')
    
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })
})
