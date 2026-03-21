import { test, expect } from '@playwright/test'

test.describe('Interview Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.fill('input[id*="email"]', 'student@vinki.dev')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/dashboard', { timeout: 10000 })
  })

  test('dashboard loads with user greeting', async ({ page }) => {
    await expect(page.locator('text=Hola')).toBeVisible({ timeout: 5000 })
  })

  test('can navigate to interview wizard', async ({ page }) => {
    await page.click('text=Iniciar simulación, text=Start simulation')
    await expect(page).toHaveURL(/interview\/new/)
  })

  test('interview wizard shows steps', async ({ page }) => {
    await page.goto('/interview/new')
    await expect(page.locator('.ant-steps')).toBeVisible()
    await expect(page.locator('.ant-select')).toBeVisible()
  })
})
