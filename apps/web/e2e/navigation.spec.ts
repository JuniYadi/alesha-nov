import { test, expect } from '@playwright/test'

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('header is sticky at top', async ({ page }) => {
    const header = page.locator('header')
    await expect(header).toBeVisible()
    const position = await header.evaluate(el => getComputedStyle(el).position)
    expect(position).toBe('sticky')
  })

  test('nav links navigate to correct pages', async ({ page }) => {
    await page.click('nav >> text=Signup')
    await expect(page).toHaveURL('/signup')
    
    await page.click('nav >> text=Login')
    await expect(page).toHaveURL('/login')
    
    await page.click('nav >> text=Home')
    await expect(page).toHaveURL('/')
  })

  test('logo links to home', async ({ page }) => {
    await page.goto('/login')
    await page.click('header a:has-text("Alesha Auth Demo")')
    await expect(page).toHaveURL('/')
  })

  test('active link is highlighted', async ({ page }) => {
    await page.goto('/login')
    const activeLink = page.locator('nav a:has-text("Login").is-active, nav a:has-text("Login").nav-link.is-active')
    await expect(activeLink).toBeVisible()
  })

  test('authenticated user sees Dashboard link, not Signup/Login', async ({ page }) => {
    await page.goto('/signup')
    const timestamp = Date.now()
    const email = `nav-auth${timestamp}@example.com`
    await page.fill('input[placeholder="Name"]', 'Nav Auth Test')
    await page.fill('input[type="email"]', email)
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')
    await expect(page.locator('text=/Signed up/')).toBeVisible({ timeout: 10000 })

    await page.goto('/')
    await expect(page.locator('nav >> text=Dashboard')).toBeVisible()
    await expect(page.locator('nav >> text=Signup')).not.toBeVisible()
    await expect(page.locator('nav >> text=Login')).not.toBeVisible()
  })

  test('unauthenticated user sees Signup/Login links, not Dashboard', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('nav >> text=Signup')).toBeVisible()
    await expect(page.locator('nav >> text=Login')).toBeVisible()
    await expect(page.locator('nav >> text=Dashboard')).not.toBeVisible()
  })
})
