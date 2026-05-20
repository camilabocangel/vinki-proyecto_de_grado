// Playwright config — nivel raíz del repositorio.
// Aloja las suites E2E del proyecto Vinki (Fase 4 del plan maestro de QA).
//
// Convenciones:
//   - testDir: ./e2e/suites — cada subdirectorio numerado define un grupo
//     funcional (00-smoke, 00-auth, 01-wizard, ..., 08-admin-questions).
//   - Fixtures comunes (auth, mock de LLM) en ./e2e/fixtures.
//   - Page Objects en ./e2e/pages.
//   - Helpers transversales en ./e2e/helpers.
//   - globalSetup ejecuta seed determinista contra DB de TEST (5434).
//   - globalTeardown limpia la DB de test al final de toda la suite.
//
// La configuración existente en `frontend/app/playwright.config.ts` se
// conserva para la suite legacy interna del frontend; este config raíz
// es el oficial para el proyecto en su conjunto.

import { defineConfig, devices } from '@playwright/test'
import * as fs from 'node:fs'
import * as path from 'node:path'

const isCI = !!process.env.CI

// Cargamos backend/.env.test antes de definir env para webServer:
// necesitamos DATABASE_URL, REDIS_URL, JWT_*, LLM_SANDBOX, etc.
function loadEnvTest(): Record<string, string> {
  const envPath = path.resolve(__dirname, 'backend', '.env.test')
  const env: Record<string, string> = {}
  if (!fs.existsSync(envPath)) return env
  const content = fs.readFileSync(envPath, 'utf-8')
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq === -1) continue
    const key = line.slice(0, eq).trim()
    const value = line.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
    env[key] = value
  }
  return env
}

const TEST_ENV = loadEnvTest()

// Propaga las vars de test al process.env del runner Playwright. Esto es
// crítico para que `e2e/global-setup.ts` (y sus imports estáticos:
// seed.ts → @prisma/client) tengan DATABASE_URL apuntando a la DB de TEST
// (5434) antes de cualquier construcción de PrismaClient. Sin esto, los
// imports estáticos pueden ver DATABASE_URL vacío y caer a defaults.
for (const [key, value] of Object.entries(TEST_ENV)) {
  if (!process.env[key]) process.env[key] = value
}

const BACKEND_PORT = TEST_ENV.PORT ?? '3000'

// `e2e/fixtures/auth.fixture.ts` lee E2E_API_URL para hacer login vía
// `request.post`. Lo seteamos aquí para que apunte al puerto real del
// backend (3002 en .env.test) en lugar del default 3000.
if (!process.env.E2E_API_URL) {
  process.env.E2E_API_URL = `http://127.0.0.1:${BACKEND_PORT}/api`
}
const FRONTEND_PORT = '5400'
// IMPORTANTE: usamos 127.0.0.1 (no `localhost`) en TODA la stack E2E.
// Razón: en Windows Playwright resuelve `localhost` a IPv6 (::1) mientras
// que NestJS sólo escucha en IPv4 — causa `ECONNREFUSED ::1:3000`. Forzando
// 127.0.0.1 de extremo a extremo, las cookies de sesión también se
// comparten correctamente entre el contexto y la navegación del browser.
const FRONTEND_URL = `http://127.0.0.1:${FRONTEND_PORT}`
const API_URL = `http://127.0.0.1:${BACKEND_PORT}/api`

export default defineConfig({
  testDir: './e2e/suites',
  fullyParallel: false, // backend único + seed compartido → serial es más seguro
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: 1,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  globalSetup: require.resolve('./e2e/global-setup.ts'),
  globalTeardown: require.resolve('./e2e/global-teardown.ts'),
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? FRONTEND_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    // Navegación: 60 s. El primer arranque de Vite con HMR compila ~70+
    // módulos de Ant Design y Recharts, lo que en Windows puede tardar
    // varios segundos antes del evento `load`.
    navigationTimeout: 60_000,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // i18next detecta locale por `navigator.language` cuando no hay
        // entry en localStorage. Forzamos 'es-ES' para que la app cargue
        // los strings españoles (fallbackLng=es ya estaba configurado).
        locale: 'es-ES',
      },
    },
  ],
  webServer: [
    {
      // Backend NestJS apuntando a la DB de test (5434) + Redis test (6381)
      // + LLM_SANDBOX=true. Las claves RSA reales vienen de backend/.env.test.
      command: 'npm --prefix backend run start',
      url: `http://127.0.0.1:${BACKEND_PORT}/api/health`,
      reuseExistingServer: !isCI,
      timeout: 180_000,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        ...TEST_ENV,
        NODE_ENV: 'test',
        PORT: BACKEND_PORT,
        FRONTEND_URL,
        // Garantiza que CORS habilita el origen del frontend Playwright.
        // Reafirma sandbox aunque venga de .env.test.
        LLM_SANDBOX: 'true',
      },
    },
    {
      // Frontend Vite apuntando al backend levantado arriba.
      command:
        `npm --prefix frontend/app run dev -- --host 127.0.0.1 --port ${FRONTEND_PORT}`,
      port: Number(FRONTEND_PORT),
      reuseExistingServer: !isCI,
      timeout: 180_000,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        VITE_API_URL: API_URL,
      },
    },
  ],
})
