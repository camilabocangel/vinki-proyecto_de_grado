import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('shows validation on empty login submit', async ({ page }) => {
    await page.goto('/login')
    await page.click('button[type="submit"]')
    // Should show validation errors
    await expect(page.locator('.ant-form-item-explain-error')).toBeVisible()
  })

  test('navigate between login and register', async ({ page }) => {
    await page.goto('/login')
    // Find the register link and click it
    const registerLink = page.locator(
      'a[href="/register"], text=Regístrate, text=Sign up',
    )
    await registerLink.first().click()
    await expect(page).toHaveURL(/register/)
  })

  test('login with valid credentials', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[id*="email"]', 'student@vinki.dev')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')
    // Should redirect to dashboard after successful login
    await page.waitForURL('**/dashboard', { timeout: 10000 })
    await expect(page).toHaveURL(/dashboard/)
  })
})
