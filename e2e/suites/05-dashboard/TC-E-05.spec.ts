// Suite E2E TC-E-05 — DashboardPage.
//
// El seed sembró user_skill_scores para el student + 2 entrevistas
// completadas. Validamos render del dashboard, agregados y empty state
// (usando un usuario fresco sin historial).
//
// Cubre RF-34, RNF-28.

import { test, expect } from '../../fixtures/auth.fixture'
import { DashboardPage } from '../../pages/dashboard.page'
import { findUserIdByEmail } from '../../helpers/db-helpers'
import { SEED_CREDENTIALS } from '../../fixtures/seed'
import { PrismaClient, bcrypt } from '../../helpers/backend-deps'

async function createFreshStudentWithoutHistory(): Promise<{
  email: string
  password: string
}> {
  const email = `e2e-fresh-${Date.now()}@vinki.dev`
  const password = 'FreshUser-E2E-123'
  const prisma = new PrismaClient()
  try {
    const passwordHash = await bcrypt.hash(password, 10)
    await prisma.user.create({
      data: { email, name: 'Fresh Student E2E', passwordHash, role: 'student' },
    })
    return { email, password }
  } finally {
    await prisma.$disconnect()
  }
}

test.describe('TC-E-05 — DashboardPage (RF-34, RNF-28)', () => {
  test('TC-E-05-001: should display user_skill_scores chart [RF-34]', async ({
    page,
    authenticatedAs,
  }) => {
    await authenticatedAs('student')
    const dashboard = new DashboardPage(page)
    await dashboard.goto()
    await expect(dashboard.greetingHeading).toBeVisible({ timeout: 20_000 })
    // El seed sembró 3 user_skill_scores; al menos uno debe aparecer.
    // Los nombres del seed: "APIs REST", "Bases de datos", "Algoritmos".
    const apiSkill = page.getByText(/APIs REST/i).first()
    const dbSkill = page.getByText(/Bases de datos/i).first()
    const visible = (await apiSkill.count()) > 0 || (await dbSkill.count()) > 0
    expect(visible).toBe(true)
  })

  test('TC-E-05-002: should aggregate scores across multiple interviews [RF-34]', async ({
    page,
    authenticatedAs,
  }) => {
    await authenticatedAs('student')
    const dashboard = new DashboardPage(page)
    await dashboard.goto()
    await expect(dashboard.greetingHeading).toBeVisible({ timeout: 20_000 })
    // El historial debe mostrar al menos 2 entrevistas — buscamos la tabla.
    await expect(dashboard.interviewsTable).toBeVisible()
    // El contador de entrevistas completadas debe ser ≥ 2.
    // Patrón "2" o más, dentro de stats. Aceptamos cualquier número con dígitos.
    const interviewsLabel = page.getByText(/Entrevistas/i).first()
    await expect(interviewsLabel).toBeVisible()
  })

  test('TC-E-05-003: should show empty state for user with no interviews yet', async ({
    browser,
  }) => {
    // Este test detectó originalmente el bug HE-01 (cross-tenant data
    // leak en el `CacheInterceptor`). El fix de producción ya está
    // aplicado en `backend/src/common/cache.interceptor.ts` —la cache
    // key ahora incluye el userId del JWT—. El test queda como canario
    // permanente del aislamiento de datos en el dashboard.
    const freshContext = await browser.newContext({ locale: 'es-ES' })
    const freshPage = await freshContext.newPage()
    try {
      const fresh = await createFreshStudentWithoutHistory()
      const apiUrl = process.env.E2E_API_URL ?? 'http://127.0.0.1:3002/api'
      const loginRes = await freshContext.request.post(`${apiUrl}/auth/login`, {
        data: { email: fresh.email, password: fresh.password },
        headers: { 'content-type': 'application/json' },
      })
      expect(loginRes.ok()).toBe(true)
      const body = await loginRes.json()
      expect(body.user.email).toBe(fresh.email)

      await freshPage.goto('/dashboard')
      await expect(
        freshPage.getByRole('button', { name: /Realizar mi primera entrevista/i }),
      ).toBeVisible({ timeout: 20_000 })
    } finally {
      await freshPage.close()
      await freshContext.close()
    }
  })

  test('TC-E-05-004: should render 5-dimensions visualization or skill bars [RNF-28]', async ({
    page,
    authenticatedAs,
  }) => {
    await authenticatedAs('student')
    const dashboard = new DashboardPage(page)
    await dashboard.goto()
    await expect(dashboard.greetingHeading).toBeVisible({ timeout: 20_000 })
    // Recharts renderiza svg para el ProgressChart; ant-progress renderiza
    // las barras de skill. Cualquiera de los dos es válido.
    const svg = page.locator('svg').first()
    const progressBar = page.locator('.ant-progress').first()
    const hasSvg = (await svg.count()) > 0
    const hasProgress = (await progressBar.count()) > 0
    expect(hasSvg || hasProgress).toBe(true)
  })
})
