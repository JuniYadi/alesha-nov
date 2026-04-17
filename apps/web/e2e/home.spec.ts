import { test, expect } from '@playwright/test'

test.describe('Home Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('page loads successfully', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('TanStack Start')
  })

  test('auth status shows unauthenticated', async ({ page }) => {
    await expect(page.locator('text=Auth status:')).toBeVisible()
    await expect(page.getByText('unauthenticated').first()).toBeVisible()
  })

  test('navigation links are visible', async ({ page }) => {
    await expect(page.locator('nav >> text=Home')).toBeVisible()
    await expect(page.locator('nav >> text=Signup')).toBeVisible()
    await expect(page.locator('nav >> text=Login')).toBeVisible()
    await expect(page.locator('nav >> text=Dashboard')).toBeVisible()
  })

  test('clicking signup link navigates to signup', async ({ page }) => {
    await page.click('text=Go to Signup')
    await expect(page).toHaveURL('/signup')
  })

  test('clicking login link navigates to login', async ({ page }) => {
    await page.click('text=Go to Login')
    await expect(page).toHaveURL('/login')
  })

  test('clicking dashboard when logged out redirects to login', async ({ page }) => {
    await page.click('text=Open Dashboard')
    await expect(page).toHaveURL(/\/login/)
  })
})
