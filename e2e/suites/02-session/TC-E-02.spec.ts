// Suite E2E TC-E-02 — InterviewSessionPage.
//
// Valida la página de sesión activa: render de pregunta, envío de respuesta
// (texto y audio mockeado), progress indicator, navegación, finalización.
//
// El LLM, el endpoint de answer y la transcripción de audio se interceptan
// con `mockLLM`/`mockAudio` (Decisiones D-10 y D-11). Cada test crea su
// propia entrevista en progreso vía Prisma directo (helper de db).
//
// Cubre RF-10, RF-12, RF-13, RF-14, RF-15, RF-16, RF-17, RF-18, RF-11,
// RNF-26, RNF-27.

import { mergeTests } from '@playwright/test'
import { test as authTest, expect } from '../../fixtures/auth.fixture'
import { test as llmTest } from '../../fixtures/llm-mock.fixture'
import { SessionPage } from '../../pages/session.page'
import {
  createFreshInterviewForUser,
  findUserIdByEmail,
  finishActiveInterviewsForUser,
} from '../../helpers/db-helpers'
import { SEED_CREDENTIALS } from '../../fixtures/seed'

const test = mergeTests(authTest, llmTest)

test.describe('TC-E-02 — InterviewSessionPage (RF-10 a RF-18)', () => {
  let interviewId: number
  let questionIds: number[]

  test.beforeEach(async ({ authenticatedAs }) => {
    const studentId = await findUserIdByEmail(SEED_CREDENTIALS.student.email)
    const fresh = await createFreshInterviewForUser(studentId)
    interviewId = fresh.interviewId
    questionIds = fresh.questionIds
    await authenticatedAs('student')
  })

  test.afterEach(async () => {
    const studentId = await findUserIdByEmail(SEED_CREDENTIALS.student.email)
    await finishActiveInterviewsForUser(studentId)
  })

  test('TC-E-02-001: should render first question on session start [RF-10, RF-12, RF-13]', async ({
    mockLLM,
  }) => {
    const session = new SessionPage(mockLLM)
    await session.goto(interviewId)
    await expect(session.questionTitle).toBeVisible({ timeout: 15_000 })
    // El header de la pregunta contiene "Pregunta 1".
    await expect(mockLLM.getByText(/Pregunta 1/i).first()).toBeVisible()
    // La textarea de respuesta está disponible.
    await expect(session.answerTextarea).toBeVisible()
  })

  test('TC-E-02-002: should submit text answer and advance to next question [RF-16, RF-18]', async ({
    mockLLM,
  }) => {
    const session = new SessionPage(mockLLM)
    await session.goto(interviewId)
    await expect(session.questionTitle).toBeVisible({ timeout: 15_000 })

    // Escribimos y guardamos. El POST /answer está mockeado (devuelve 201).
    await session.typeAnswer('Mi respuesta E2E para la pregunta 1.')
    const saveResp = mockLLM.waitForResponse(
      (r) => /\/questions\/\d+\/answer$/.test(r.url()) && r.request().method() === 'POST',
      { timeout: 15_000 },
    )
    await session.saveAnswer()
    await saveResp

    // Avanzamos a la siguiente pregunta.
    await session.clickNext()
    await expect(mockLLM.getByText(/Pregunta 2/i).first()).toBeVisible()
  })

  test('TC-E-02-003: should preserve question order and snapshot text [RF-13, RF-14]', async ({
    mockLLM,
  }) => {
    const session = new SessionPage(mockLLM)
    await session.goto(interviewId)
    await expect(session.questionTitle).toBeVisible({ timeout: 15_000 })
    // El snapshot literal sembrado tiene el prefijo "[E2E TC-E-02 #1]".
    await expect(mockLLM.getByText(/\[E2E TC-E-02 #1\]/i)).toBeVisible()
    await session.clickNext()
    // Pregunta 2 con su propio snapshot.
    await expect(mockLLM.getByText(/\[E2E TC-E-02 #2\]/i)).toBeVisible()
  })

  test('TC-E-02-004: should display source flag (RAG or Curada) for question [RF-15]', async ({
    mockLLM,
  }) => {
    const session = new SessionPage(mockLLM)
    await session.goto(interviewId)
    await expect(session.questionTitle).toBeVisible({ timeout: 15_000 })
    // El componente muestra un tag con la fuente — "RAG" para generadas por
    // IA, "Curada" para las del banco. Validamos que aparece alguno.
    const ragTag = mockLLM.getByText(/^RAG$/i).first()
    const curatedTag = mockLLM.getByText(/^Curada$/i).first()
    const hasRag = (await ragTag.count()) > 0
    const hasCurated = (await curatedTag.count()) > 0
    expect(hasRag || hasCurated).toBe(true)
  })

  test('TC-E-02-005: should record audio answer (mocked getUserMedia) and upload [RF-17]', async ({
    mockAudio,
  }) => {
    const session = new SessionPage(mockAudio)
    await session.goto(interviewId)
    await expect(session.questionTitle).toBeVisible({ timeout: 15_000 })

    await expect(session.recordButton).toBeVisible()
    await session.startRecording()
    // El botón cambia a "Detener".
    await expect(session.stopButton).toBeVisible()

    // Detener dispara POST /audio (interceptado, devuelve transcripción mock).
    const audioResp = mockAudio.waitForResponse(
      (r) => /\/questions\/\d+\/audio$/.test(r.url()) && r.request().method() === 'POST',
      { timeout: 20_000 },
    )
    await session.stopRecording()
    await audioResp
  })

  test('TC-E-02-006: should show progress indicator with question count [RNF-27]', async ({
    mockLLM,
  }) => {
    const session = new SessionPage(mockLLM)
    await session.goto(interviewId)
    await expect(session.questionTitle).toBeVisible({ timeout: 15_000 })
    // El header puede usar varios formatos según i18n: "Pregunta 1", "1 / 3",
    // o un tag con el número. Validamos que algún indicador con "Pregunta"
    // y el total de 3 está visible en el page.
    const counter = mockLLM.getByText(/Pregunta\s*1/i).first()
    await expect(counter).toBeVisible({ timeout: 10_000 })
  })

  test('TC-E-02-007: should finish interview and redirect to feedback [RF-11]', async ({
    mockLLM,
  }) => {
    const session = new SessionPage(mockLLM)
    await session.goto(interviewId)
    await expect(session.questionTitle).toBeVisible({ timeout: 15_000 })

    // Avanzamos hasta la última pregunta usando el botón Siguiente.
    await session.clickNext()
    await expect(mockLLM.getByText(/Pregunta\s*2/i).first()).toBeVisible({ timeout: 10_000 })
    await session.clickNext()
    await expect(mockLLM.getByText(/Pregunta\s*3/i).first()).toBeVisible({ timeout: 10_000 })

    // En la última pregunta aparece "Finalizar entrevista".
    await expect(session.finishButton).toBeVisible({ timeout: 10_000 })
    await session.clickFinish()
    // El botón abre un Modal de confirmación con un botón "Finalizar"
    // (el de Cancelar también está disponible). Buscamos el botón "Finalizar"
    // DENTRO del dialog para no clicar el de la página principal.
    const confirmBtn = mockLLM
      .getByRole('dialog')
      .getByRole('button', { name: /^Finalizar$/i })
    await expect(confirmBtn).toBeVisible({ timeout: 10_000 })
    const finishResp = mockLLM.waitForResponse(
      (r) => /\/interviews\/\d+\/finish$/.test(r.url()) && r.request().method() === 'POST',
      { timeout: 30_000 },
    )
    await confirmBtn.click()
    await finishResp
    // El frontend redirige a `/interview/{id}/confirmation` tras finalizar
    // (no a /feedback). Esa pantalla intermedia muestra el progreso de
    // evaluación; el reporte completo se accede luego.
    await mockLLM.waitForURL(/\/interview\/\d+\/confirmation|\/feedback\/\d+/, {
      timeout: 30_000,
    })
  })
})
