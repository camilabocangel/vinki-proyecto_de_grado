// Fixture base de autenticación para suites E2E — Fase 4.
//
// Decisión D-11: el login se hace contra la API real (`POST /api/auth/login`)
// vía `request.post` del contexto de Playwright, que comparte la jar de
// cookies con `page`. De esta forma:
//   - Una sola request HTTP, sin tocar la UI (rápido y robusto).
//   - Las cookies httpOnly emitidas por el backend quedan disponibles para
//     `page.goto(...)` posterior.
//
// El seed E2E (`e2e/fixtures/seed.ts`) pre-crea los 3 usuarios canónicos
// con contraseñas conocidas (SEED_CREDENTIALS). Esta fixture los expone
// como atajos.

import { test as base, type Page, type APIRequestContext } from '@playwright/test'
import { SEED_CREDENTIALS } from './seed'

export type RoleHint = 'student' | 'recruiter' | 'admin'

export interface AuthCredentials {
  email: string
  password: string
}

export interface AuthFixtures {
  /**
   * Autentica el contexto del browser con las credenciales indicadas.
   * Las cookies httpOnly se instalan en el contexto compartido con `page`.
   * Tras `authenticatedAs(...)` la siguiente `page.goto('/dashboard')` ya
   * tiene sesión.
   */
  authenticatedAs: (
    role: RoleHint,
    overrides?: Partial<AuthCredentials>,
  ) => Promise<AuthCredentials>
}

// Usamos 127.0.0.1 (no `localhost`) porque en Windows Playwright resuelve
// `localhost` a IPv6 (::1) y el backend de Nest sólo escucha en IPv4 →
// `ECONNREFUSED ::1:3000`. Forzar IPv4 elimina el flake.
const API_BASE_URL =
  process.env.E2E_API_URL ?? 'http://127.0.0.1:3000/api'

async function loginViaApi(
  request: APIRequestContext,
  credentials: AuthCredentials,
): Promise<void> {
  const res = await request.post(`${API_BASE_URL}/auth/login`, {
    data: credentials,
    headers: { 'content-type': 'application/json' },
  })
  if (!res.ok()) {
    const body = await res.text().catch(() => '<no body>')
    throw new Error(
      `auth.fixture: login falló (${res.status()} ${res.statusText()}): ${body}`,
    )
  }
}

export const test = base.extend<AuthFixtures>({
  authenticatedAs: async ({ page, context }, use) => {
    const fn: AuthFixtures['authenticatedAs'] = async (role, overrides) => {
      const seed = SEED_CREDENTIALS[role]
      const credentials: AuthCredentials = {
        email: overrides?.email ?? seed.email,
        password: overrides?.password ?? seed.password,
      }
      await loginViaApi(context.request, credentials)
      return credentials
    }
    await use(fn)
    // Teardown: limpiar cookies del contexto al final de cada test es
    // suficiente; el contexto se descarta con el test scope por defecto.
    void (page as Page)
  },
})

export { expect } from '@playwright/test'
