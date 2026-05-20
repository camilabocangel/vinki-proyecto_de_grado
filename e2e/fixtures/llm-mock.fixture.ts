// Fixture de mock del LLM + audio para suites E2E — Fase 4.
//
// Decisión D-10 (LLM): la calidad real del LLM se valida en Fase 6
// (Ragas/DeepEval). En E2E el LLM siempre se mockea con respuestas
// deterministas para evitar costos, no determinismo y falsos negativos
// (R-1 / R-2 del plan maestro).
//
// Decisión D-11 (audio): TC-E-02 ejercita la captura de audio sin tocar
// el micrófono real. Stubeamos `navigator.mediaDevices.getUserMedia`
// con un MediaStream sintético y interceptamos el POST de audio para
// devolver una transcripción determinista.
//
// Endpoints interceptados (prefijo /api):
//   - POST /api/interviews/*/questions/*/answer        → guarda respuesta
//   - POST /api/interviews/*/questions/*/evaluate-now  → evaluación inmediata (practice)
//   - POST /api/interviews/*/questions/*/followup      → pregunta de seguimiento
//   - POST /api/interviews/*/questions/*/audio         → upload + transcripción
//
// IMPORTANTE: solo interceptamos rutas que llegan al frontend con
// `credentials: 'include'`. Las rutas de catálogos, dashboard, reporte y
// CRUD admin se dejan pasar para que peguen al backend real (con su
// MockEvaluatorService / MockEmbeddingService — backend ya está en
// `LLM_SANDBOX=true`).

import { test as base, type Page } from '@playwright/test'

export interface LlmMockFixtures {
  /**
   * Página con las rutas LLM y de audio interceptadas. Equivalente a
   * `page` con `page.route()` aplicado para los endpoints del LLM.
   */
  mockLLM: Page

  /**
   * Página adicional con stub de `navigator.mediaDevices.getUserMedia`
   * instalado vía `addInitScript`. Solo necesario para TC-E-02 (audio).
   */
  mockAudio: Page
}

/**
 * Respuesta determinista de evaluación. Cumple:
 *   - 5 dimensiones ∈ [0, 5] (RNF-18)
 *   - feedback_text no vacío (RF-25)
 *   - detected_level y respuestas de referencia por nivel
 */
const MOCK_EVALUATION = {
  id: 9_999,
  answer_id: 9_999,
  technical_correctness: 4.2,
  clarity_of_explanation: 4.0,
  communication: 3.8,
  confidence: 4.1,
  problem_solving: 4.3,
  detected_level: 'Mid',
  detected_level_id: 2,
  feedback_text:
    'Respuesta sólida. Demuestra comprensión del concepto y aplica trade-offs razonables. Para llegar a Senior, profundiza en escalabilidad y métricas operacionales.',
  junior_answer: 'Un Junior describiría el concepto y daría un ejemplo simple.',
  mid_answer: 'Un Mid añadiría patrones comunes y trade-offs.',
  senior_answer: 'Un Senior discutiría arquitectura, escalabilidad y observabilidad.',
}

/** Estructura de answer que devuelve el backend tras submit. */
const MOCK_ANSWER = {
  id: 9_999,
  answerText: 'Respuesta mock — escrita por E2E.',
  audioUrl: null,
  answeredAt: new Date().toISOString(),
}

const MOCK_FOLLOWUP = {
  followUpQuestion:
    '¿Cómo escalarías esta solución a 10k usuarios concurrentes? (mock E2E)',
}

const MOCK_TRANSCRIPTION = {
  transcription: 'Esta es una respuesta dictada por voz (transcripción mock E2E).',
}

async function installLlmRoutes(page: Page): Promise<void> {
  // POST /api/interviews/*/questions/*/answer — guarda respuesta.
  await page.route('**/api/interviews/*/questions/*/answer', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_ANSWER),
      })
    } else {
      await route.continue()
    }
  })

  // POST /api/interviews/*/questions/*/evaluate-now — evaluación inline.
  await page.route('**/api/interviews/*/questions/*/evaluate-now', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_EVALUATION),
      })
    } else {
      await route.continue()
    }
  })

  // POST /api/interviews/*/questions/*/followup — follow-up RAG.
  await page.route('**/api/interviews/*/questions/*/followup', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_FOLLOWUP),
      })
    } else {
      await route.continue()
    }
  })

  // POST /api/interviews/*/questions/*/audio — upload + transcripción mock.
  // Cubre la D-11: no llegamos a Whisper ni a S3 real.
  await page.route('**/api/interviews/*/questions/*/audio', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ ...MOCK_ANSWER, ...MOCK_TRANSCRIPTION }),
      })
    } else {
      await route.continue()
    }
  })

  // POST /api/catalogs/questions/generate — generación admin de preguntas
  // por IA. Devuelve set fijo de 3 preguntas mock que respetan el filtro.
  await page.route('**/api/catalogs/questions/generate', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          questions: [
            'Pregunta IA mock #1 — explica fundamentos del tema.',
            'Pregunta IA mock #2 — aplica el concepto a un caso real.',
            'Pregunta IA mock #3 — discute trade-offs de la solución.',
          ],
        }),
      })
    } else {
      await route.continue()
    }
  })
}

/**
 * Stub de `navigator.mediaDevices.getUserMedia` + `MediaRecorder` mínimo.
 * Se inyecta vía `addInitScript` (antes de cualquier script de la app).
 * El stub emite un evento `dataavailable` con un Blob vacío al `stop()`.
 */
const GET_USER_MEDIA_STUB = `
(() => {
  if (!navigator.mediaDevices) {
    Object.defineProperty(navigator, 'mediaDevices', { value: {}, configurable: true });
  }
  navigator.mediaDevices.getUserMedia = async () => {
    // MediaStream stub mínimo — solo necesita .getTracks() para que
    // el código de la app pueda llamar a .stop() sin error.
    return {
      getTracks: () => [{ stop: () => undefined }],
      getAudioTracks: () => [{ stop: () => undefined }],
      getVideoTracks: () => [],
    };
  };
  class FakeMediaRecorder {
    constructor(stream, opts) {
      this.stream = stream;
      this.state = 'inactive';
      this.ondataavailable = null;
      this.onstop = null;
    }
    start() {
      this.state = 'recording';
    }
    stop() {
      this.state = 'inactive';
      if (typeof this.ondataavailable === 'function') {
        const blob = new Blob(['mock-audio-bytes'], { type: 'audio/webm' });
        this.ondataavailable({ data: blob });
      }
      if (typeof this.onstop === 'function') {
        this.onstop();
      }
    }
  }
  window.MediaRecorder = FakeMediaRecorder;
  window.MediaRecorder.isTypeSupported = () => true;
})();
`

export const test = base.extend<LlmMockFixtures>({
  mockLLM: async ({ page }, use) => {
    await installLlmRoutes(page)
    await use(page)
  },

  mockAudio: async ({ page }, use) => {
    await page.addInitScript(GET_USER_MEDIA_STUB)
    await installLlmRoutes(page)
    await use(page)
  },
})

export { expect } from '@playwright/test'
