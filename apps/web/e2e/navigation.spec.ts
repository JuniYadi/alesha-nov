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
})
