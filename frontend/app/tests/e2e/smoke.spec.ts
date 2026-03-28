import { test, expect } from '@playwright/test'

test.describe('Smoke Tests', () => {
  test('login page loads', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('text=Vinki')).toBeVisible()
    await expect(page.locator('input[type="text"], input[id*="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('register page loads', async ({ page }) => {
    await page.goto('/register')
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('redirects unauthenticated user to login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/login/)
  })
})
