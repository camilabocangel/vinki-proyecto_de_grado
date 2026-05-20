// Suite E2E TC-E-01 — InterviewWizardPage.
//
// Cubre RF-05, RF-06, RF-07, RF-08, RF-09, RF-10, RNF-26, RNF-27.

import { test, expect } from '../../fixtures/auth.fixture'
import { WizardPage } from '../../pages/wizard.page'
import {
  finishActiveInterviewsForUser,
  findUserIdByEmail,
} from '../../helpers/db-helpers'
import { SEED_CREDENTIALS } from '../../fixtures/seed'

async function chooseCustomAndStartRole(wizard: WizardPage, page: any): Promise<void> {
  await wizard.goto()
  await expect(wizard.modeChoiceCustom).toBeVisible({ timeout: 20_000 })
  await wizard.chooseCustomMode()
  // Esperamos a que aparezca el primer paso (rol) — el "Backend Engineer"
  // card es la señal de que entramos en modo custom.
  await expect(page.getByText('Backend Engineer', { exact: true })).toBeVisible({
    timeout: 15_000,
  })
}

test.describe('TC-E-01 — InterviewWizardPage (RF-05 a RF-10)', () => {
  test.beforeEach(async ({ authenticatedAs }) => {
    const studentId = await findUserIdByEmail(SEED_CREDENTIALS.student.email)
    await finishActiveInterviewsForUser(studentId)
    await authenticatedAs('student')
  })

  test.afterEach(async () => {
    const studentId = await findUserIdByEmail(SEED_CREDENTIALS.student.email)
    await finishActiveInterviewsForUser(studentId)
  })

  test('TC-E-01-001: should complete wizard flow selecting role, language, framework, level [RF-05, RF-06, RF-07, RF-08]', async ({
    page,
  }) => {
    const wizard = new WizardPage(page)
    await chooseCustomAndStartRole(wizard, page)

    // Paso 1: Rol.
    await wizard.selectRole('Backend Engineer')
    await wizard.clickNext()

    // Paso 2: Lenguaje — esperamos a que aparezca al menos un lenguaje
    // (el GET de catálogos puede tardar). TypeScript está en el seed.
    await expect(page.getByText('TypeScript', { exact: true })).toBeVisible({ timeout: 15_000 })
    await wizard.selectLanguage('TypeScript')
    await wizard.clickNext()

    // Paso 3: Framework (opcional). Saltamos sin seleccionar.
    await wizard.clickNext()

    // Paso 4: Nivel.
    await expect(page.getByText('Junior', { exact: true })).toBeVisible({ timeout: 15_000 })
    await wizard.selectLevel('Junior')
    await wizard.clickNext()

    // Paso 5: el botón "Iniciar entrevista" debe ser visible.
    await expect(wizard.startButton).toBeVisible({ timeout: 10_000 })
  })

  test('TC-E-01-002: should persist interview configuration on start [RF-09]', async ({
    page,
  }) => {
    const wizard = new WizardPage(page)
    await chooseCustomAndStartRole(wizard, page)
    await wizard.selectRole('Backend Engineer')
    await wizard.clickNext()
    await expect(page.getByText('TypeScript', { exact: true })).toBeVisible({ timeout: 15_000 })
    await wizard.selectLanguage('TypeScript')
    await wizard.clickNext()
    await wizard.clickNext() // framework opcional
    await expect(page.getByText('Junior', { exact: true })).toBeVisible({ timeout: 15_000 })
    await wizard.selectLevel('Junior')
    await wizard.clickNext()
    await expect(wizard.startButton).toBeVisible({ timeout: 15_000 })

    const responsePromise = page.waitForResponse(
      (r) => /\/api\/interviews$/.test(r.url()) && r.request().method() === 'POST',
      { timeout: 60_000 },
    )
    await wizard.clickStart()
    const res = await responsePromise
    expect(res.status()).toBeLessThan(400)
    await page.waitForURL(/\/interview\/\d+/, { timeout: 60_000 })
  })

  test('TC-E-01-003: should validate framework belongs to selected language [RF-07]', async ({
    page,
  }) => {
    const wizard = new WizardPage(page)
    await chooseCustomAndStartRole(wizard, page)
    await wizard.selectRole('Backend Engineer')
    await wizard.clickNext()
    await expect(page.getByText('TypeScript', { exact: true })).toBeVisible({ timeout: 15_000 })
    await wizard.selectLanguage('TypeScript')

    // Esperamos a que el GET /catalogs/languages/X/frameworks complete antes
    // de avanzar — garantiza que la lista esté lista cuando entremos al paso.
    const frameworksResp = page.waitForResponse(
      (r) => r.url().includes('/catalogs/languages/') && r.url().includes('/frameworks'),
      { timeout: 15_000 },
    )
    await wizard.clickNext()
    await frameworksResp.catch(() => undefined)

    // Antd Select tiene un input invisible `role=combobox`. Lo localizamos
    // dentro del CARD de Framework (no del header de idioma).
    const frameworkCard = page.locator('.ant-card-body').filter({
      hasText: 'Selecciona un framework (opcional)',
    })
    await expect(frameworkCard).toBeVisible({ timeout: 15_000 })
    // Click programático en el combobox dispara `onDropdownVisibleChange`.
    const combobox = frameworkCard.locator('input[role="combobox"]')
    await combobox.click({ force: true })
    // Las opciones aparecen en un portal de Antd con `.ant-select-item-option`.
    await expect(
      page.locator('.ant-select-item-option').filter({ hasText: 'NestJS' }).first(),
    ).toBeVisible({ timeout: 15_000 })
    // Django (Python-only) NO debe aparecer en el dropdown.
    expect(
      await page.locator('.ant-select-item-option').filter({ hasText: 'Django' }).count(),
    ).toBe(0)
  })

  test('TC-E-01-004: should show progress indicator across wizard steps [RNF-27]', async ({
    page,
  }) => {
    const wizard = new WizardPage(page)
    await chooseCustomAndStartRole(wizard, page)
    // Los títulos de los pasos están renderizados como tabs/labels Ant Steps.
    await expect(page.getByText('Rol', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Lenguaje', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Nivel', { exact: true }).first()).toBeVisible()
  })

  test('TC-E-01-005: should allow navigation back and forth between steps without data loss [RNF-26]', async ({
    page,
  }) => {
    const wizard = new WizardPage(page)
    await chooseCustomAndStartRole(wizard, page)
    await wizard.selectRole('Backend Engineer')
    await wizard.clickNext()
    await expect(page.getByText('TypeScript', { exact: true })).toBeVisible({ timeout: 15_000 })
    await wizard.selectLanguage('TypeScript')
    await wizard.clickNext()
    // Estamos en paso framework. Hacemos clickPrev → volvemos al paso 1
    // (Rol). El estado de las cards previas debe seguir vivo. El botón
    // "Anterior" del paso framework lleva al paso 2 (Language).
    await wizard.clickPrev()
    // En el paso 2 (Language) sigue marcada TypeScript.
    await expect(page.getByText('TypeScript', { exact: true })).toBeVisible({ timeout: 10_000 })
    // Volvemos a avanzar — placeholder del framework debe estar visible.
    await wizard.clickNext()
    await expect(page.getByText('Selecciona un framework (opcional)')).toBeVisible({
      timeout: 15_000,
    })
  })

  test('TC-E-01-006: should redirect to session page after successful start [RF-10]', async ({
    page,
  }) => {
    const wizard = new WizardPage(page)
    await chooseCustomAndStartRole(wizard, page)
    await wizard.selectRole('Backend Engineer')
    await wizard.clickNext()
    await expect(page.getByText('TypeScript', { exact: true })).toBeVisible({ timeout: 15_000 })
    await wizard.selectLanguage('TypeScript')
    await wizard.clickNext()
    await wizard.clickNext()
    await expect(page.getByText('Junior', { exact: true })).toBeVisible({ timeout: 15_000 })
    await wizard.selectLevel('Junior')
    await wizard.clickNext()
    await expect(wizard.startButton).toBeVisible({ timeout: 15_000 })
    await wizard.clickStart()
    await page.waitForURL(/\/interview\/\d+/, { timeout: 60_000 })
    expect(page.url()).toMatch(/\/interview\/\d+/)
  })
})
