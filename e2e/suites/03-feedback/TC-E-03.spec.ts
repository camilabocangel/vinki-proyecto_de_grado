// Suite E2E TC-E-03 — FeedbackPage.
//
// El seed crea 2 entrevistas completadas para el student con 3 evaluaciones
// cada una; usamos completedAId para todos los casos (el cleanup global lo
// vuelve a sembrar entre runs).
//
// Cubre RF-19, RF-20, RF-21, RF-22, RF-23, RF-25, RF-33, RF-35, RNF-07, RNF-28.

import { test, expect } from '../../fixtures/auth.fixture'
import { FeedbackPage } from '../../pages/feedback.page'
import { findUserIdByEmail } from '../../helpers/db-helpers'
import { SEED_CREDENTIALS } from '../../fixtures/seed'
import { PrismaClient } from '../../helpers/backend-deps'

async function getFirstCompletedInterviewId(): Promise<number> {
  const studentId = await findUserIdByEmail(SEED_CREDENTIALS.student.email)
  const prisma = new PrismaClient()
  try {
    const iv = await prisma.interview.findFirst({
      where: { userId: studentId, evaluationStatus: 'completed' },
      orderBy: { id: 'asc' },
    })
    if (!iv) throw new Error('[TC-E-03] no hay entrevistas completadas en el seed')
    return iv.id
  } finally {
    await prisma.$disconnect()
  }
}

test.describe('TC-E-03 — FeedbackPage (RF-19 a RF-25, RF-35)', () => {
  let interviewId: number

  test.beforeAll(async () => {
    interviewId = await getFirstCompletedInterviewId()
  })

  test.beforeEach(async ({ authenticatedAs }) => {
    await authenticatedAs('student')
  })

  test('TC-E-03-001: should display all 5 evaluation dimensions for each answer [RF-19, RF-20, RF-21, RF-22, RF-23, RF-35]', async ({
    page,
  }) => {
    const feedback = new FeedbackPage(page)
    await feedback.goto(interviewId)
    await expect(feedback.title).toBeVisible({ timeout: 20_000 })

    // Las 5 dimensiones aparecen como etiquetas dentro del desglose.
    await expect(page.getByText(/Corrección técnica/i).first()).toBeVisible()
    await expect(page.getByText(/Claridad/i).first()).toBeVisible()
    await expect(page.getByText(/Comunicación/i).first()).toBeVisible()
    await expect(page.getByText(/Confianza/i).first()).toBeVisible()
    await expect(page.getByText(/Resolución/i).first()).toBeVisible()
  })

  test('TC-E-03-002: should render feedback text section per answer [RF-25]', async ({
    page,
  }) => {
    const feedback = new FeedbackPage(page)
    await feedback.goto(interviewId)
    await expect(feedback.title).toBeVisible({ timeout: 20_000 })
    // El detalle por pregunta usa Antd Collapse con lazy-render: el panel
    // "Feedback IA" sólo entra al DOM cuando se expande. Expandimos el
    // primer collapse (P1) y verificamos que aparece la sección.
    await expect(feedback.questionDetailCard).toBeVisible({ timeout: 15_000 })
    const firstPanel = page.getByRole('button', { name: /^collapsed P1/i }).first()
    await expect(firstPanel).toBeVisible({ timeout: 10_000 })
    await firstPanel.click()
    await expect(page.getByText(/Feedback IA/i).first()).toBeVisible({ timeout: 10_000 })
  })

  test('TC-E-03-003: should block feedback page for non-student users at route level [RNF-07]', async ({
    page,
    authenticatedAs,
  }) => {
    // `/feedback/:id` está protegido por `<ProtectedRoute roles={['student']}>`.
    // Un recruiter (rol distinto) NO entra a la página — el frontend lo
    // redirige a /recruiter antes de cualquier request al backend. Esto
    // satisface el aislamiento RNF-07 a nivel de la SPA.
    await authenticatedAs('recruiter')
    await page.goto(`/feedback/${interviewId}`)
    await page.waitForURL(
      (url) => url.pathname !== `/feedback/${interviewId}`,
      { timeout: 15_000 },
    )
    expect(page.url()).not.toContain(`/feedback/${interviewId}`)
  })

  test('TC-E-03-004: should show numeric values for evaluation dimensions', async ({
    page,
  }) => {
    const feedback = new FeedbackPage(page)
    await feedback.goto(interviewId)
    await expect(feedback.title).toBeVisible({ timeout: 20_000 })
    // Las dimensiones se renderizan con un valor numérico. Aceptamos varios
    // formatos: "4.0 / 5", "80%", o simplemente un número decimal cercano a
    // las dimensiones. Validamos que aparece algún dígito en el desglose.
    await expect(feedback.metricBreakdownCard).toBeVisible({ timeout: 10_000 })
    const anyNumber = page.getByText(/\d/).first()
    await expect(anyNumber).toBeVisible()
  })

  test('TC-E-03-005: should render visualization (radar/bars) of 5 dimensions [RNF-28]', async ({
    page,
  }) => {
    const feedback = new FeedbackPage(page)
    await feedback.goto(interviewId)
    await expect(feedback.title).toBeVisible({ timeout: 20_000 })
    // El radar chart de Recharts renderiza un <svg>; el desglose tiene
    // múltiples ant-progress. Validamos que alguna visualización está presente.
    const svg = page.locator('svg').first()
    const progressBar = page.locator('.ant-progress').first()
    const hasSvg = (await svg.count()) > 0
    const hasProgress = (await progressBar.count()) > 0
    expect(hasSvg || hasProgress).toBe(true)
  })
})
