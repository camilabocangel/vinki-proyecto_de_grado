import { expect, test } from '@playwright/test'

test('landing hero renders key actions', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: /vinki/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /iniciar simulación/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /ver demo guiada/i })).toBeVisible()
})
