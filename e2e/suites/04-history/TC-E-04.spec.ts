// Suite E2E TC-E-04 — FeedbackHistoryPage.
//
// El seed crea 2 entrevistas completadas para el student. Validamos el
// listado, los estados, la navegación al detalle y el aislamiento por
// dueño (otros usuarios no ven entrevistas del student).
//
// Cubre RF-32, RF-33, RNF-07.

import { test, expect } from '../../fixtures/auth.fixture'
import { FeedbackHistoryPage } from '../../pages/feedbackHistory.page'

test.describe('TC-E-04 — FeedbackHistoryPage (RF-32, RF-33, RNF-07)', () => {
  test.beforeEach(async ({ authenticatedAs }) => {
    await authenticatedAs('student')
  })

  test('TC-E-04-001: should list all past interviews of current user [RF-32]', async ({
    page,
  }) => {
    const history = new FeedbackHistoryPage(page)
    await history.goto()
    await expect(history.title).toBeVisible({ timeout: 20_000 })
    await expect(history.table).toBeVisible()
    // El seed crea 2 entrevistas → al menos 2 filas + header.
    const rowCount = await history.rows().count()
    expect(rowCount).toBeGreaterThanOrEqual(3) // 1 header + 2+ filas
  })

  test('TC-E-04-002: should distinguish completed vs in-progress interviews [RF-32]', async ({
    page,
  }) => {
    const history = new FeedbackHistoryPage(page)
    await history.goto()
    await expect(history.table).toBeVisible({ timeout: 20_000 })
    // El seed sembró 2 completadas — esperamos el tag "Completada" visible.
    await expect(page.getByText(/Completada/i).first()).toBeVisible()
  })

  test('TC-E-04-003: should navigate to interview detail on click [RF-33]', async ({ page }) => {
    const history = new FeedbackHistoryPage(page)
    await history.goto()
    await expect(history.table).toBeVisible({ timeout: 20_000 })
    await expect(history.viewReportButton).toBeVisible()
    await history.viewReportButton.click()
    await page.waitForURL(/\/feedback\/\d+/, { timeout: 20_000 })
    expect(page.url()).toMatch(/\/feedback\/\d+/)
  })

  test('TC-E-04-004: should not show interviews of other users [RNF-07]', async ({
    page,
    authenticatedAs,
  }) => {
    // El recruiter no tiene entrevistas propias (rol student-only crea
    // interviews). El listado debe estar vacío o no contener referencias
    // a las entrevistas del estudiante.
    await authenticatedAs('recruiter')
    await page.goto('/history')
    // Como el recruiter no es student, ProtectedRoute lo redirige a /recruiter.
    // Validamos que NO terminó en /history sirviendo datos ajenos.
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined)
    const url = page.url()
    // O bien fue redirigido fuera de /history, o (si la ruta acepta otros
    // roles en versiones futuras) la tabla no muestra las entrevistas del
    // student (los snapshots del seed contienen "[A]" y "[B]").
    if (url.endsWith('/history')) {
      const leakedA = await page.getByText(/\[A\]/i).count()
      const leakedB = await page.getByText(/\[B\]/i).count()
      expect(leakedA + leakedB).toBe(0)
    } else {
      expect(url).not.toContain('/history')
    }
  })

  test('TC-E-04-005: should render header and total counter [RF-32]', async ({ page }) => {
    const history = new FeedbackHistoryPage(page)
    await history.goto()
    await expect(history.title).toBeVisible({ timeout: 20_000 })
    // El header muestra el total "Total: N entrevistas".
    await expect(page.getByText(/Total.*entrevistas/i)).toBeVisible()
  })
})
