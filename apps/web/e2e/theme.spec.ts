import { test, expect } from '@playwright/test'

test.describe('Theme Toggle', () => {
  test('shows Auto by default on fresh page', async ({ page, context }) => {
    await context.clearCookies()
    await page.goto('/')
    await expect(page.locator('button:has-text("Auto")')).toBeVisible()
  })

  test('cycles through theme modes on click', async ({ page, context }) => {
    await context.clearCookies()
    await page.goto('/')
    
    const themeButton = page.locator('[title*="Theme mode"]')
    
    await expect(page.locator('button:has-text("Auto")')).toBeVisible()
    
    await themeButton.click()
    await expect(page.locator('button:has-text("Light")')).toBeVisible()
    
    await themeButton.click()
    await expect(page.locator('button:has-text("Dark")')).toBeVisible()
    
    await themeButton.click()
    await expect(page.locator('button:has-text("Auto")')).toBeVisible()
  })

  test('theme persists after page reload', async ({ page, context }) => {
    await context.clearCookies()
    await page.goto('/')
    
    const themeButton = page.locator('[title*="Theme mode"]')
    await themeButton.click()
    await expect(page.locator('button:has-text("Light")')).toBeVisible()
    
    await page.reload()
    await expect(page.locator('button:has-text("Light")')).toBeVisible()
  })

  test('clicking Light mode applies light class to html', async ({ page, context }) => {
    await context.clearCookies()
    await page.goto('/')
    
    const themeButton = page.locator('[title*="Theme mode"]')
    await themeButton.click()
    
    const html = page.locator('html')
    await expect(html).toHaveClass(/light/)
  })

  test('clicking Dark mode applies dark class to html', async ({ page, context }) => {
    await context.clearCookies()
    await page.goto('/')
    
    const themeButton = page.locator('[title*="Theme mode"]')
    await themeButton.click()
    await themeButton.click()
    
    const html = page.locator('html')
    await expect(html).toHaveClass(/dark/)
  })
})
