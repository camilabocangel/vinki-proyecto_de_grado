// Suite E2E TC-E-06 — ProfilePage (`/settings`).
//
// Cubre RF-03 (gestión de sesión propia), RF-04 (registro de fecha de
// creación), RNF-07 (no acceso a perfil ajeno).

import { test, expect } from '../../fixtures/auth.fixture'
import { ProfilePage } from '../../pages/profile.page'
import { SEED_CREDENTIALS } from '../../fixtures/seed'

test.describe('TC-E-06 — ProfilePage (RF-03, RF-04, RNF-07)', () => {
  test.beforeEach(async ({ authenticatedAs }) => {
    await authenticatedAs('student')
  })

  test('TC-E-06-001: should display current user profile data [RF-03]', async ({ page }) => {
    const profile = new ProfilePage(page)
    await profile.goto()
    await expect(profile.title).toBeVisible({ timeout: 20_000 })
    // Email del seed se renderiza al menos una vez (header + body).
    await expect(page.getByText(SEED_CREDENTIALS.student.email).first()).toBeVisible()
    // El nombre también aparece varias veces; basta con que esté visible.
    await expect(page.getByText(SEED_CREDENTIALS.student.name).first()).toBeVisible()
  })

  test('TC-E-06-002: should show account creation date [RF-04]', async ({ page }) => {
    const profile = new ProfilePage(page)
    await profile.goto()
    await expect(profile.title).toBeVisible({ timeout: 20_000 })
    // La fecha de creación se formatea en español ("de" entre día/mes/año).
    // Aceptamos cualquier patrón de mes en español.
    const mesPattern = /(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/i
    await expect(page.getByText(mesPattern).first()).toBeVisible()
  })

  test('TC-E-06-003: should open edit profile form on click [RF-03]', async ({ page }) => {
    const profile = new ProfilePage(page)
    await profile.goto()
    await expect(profile.editProfileButton).toBeVisible({ timeout: 20_000 })
    await profile.editProfileButton.click()
    // Aparece el input editable de nombre.
    await expect(profile.nameInput).toBeVisible()
    await expect(profile.saveChangesButton).toBeVisible()
  })

  test('TC-E-06-004: should not expose another user identity via /settings [RNF-07]', async ({
    page,
    authenticatedAs,
  }) => {
    // El recruiter accede a su propio /settings. El email del student no
    // debe aparecer en ningún lado del DOM.
    await authenticatedAs('recruiter')
    await page.goto('/settings')
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined)
    const leaked = await page.getByText(SEED_CREDENTIALS.student.email).count()
    expect(leaked).toBe(0)
    // Y el email del recruiter SÍ está visible (es su perfil) — aparece
    // tanto en el header del avatar como en el body de Profile, por lo
    // que usamos `.first()` para evitar strict mode violation.
    await expect(page.getByText(SEED_CREDENTIALS.recruiter.email).first()).toBeVisible({
      timeout: 15_000,
    })
  })
})
