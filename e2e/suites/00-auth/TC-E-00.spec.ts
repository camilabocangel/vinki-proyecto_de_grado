// Suite E2E TC-E-00 — Autenticación transversal.
//
// Valida los flujos básicos de auth contra el backend NestJS real:
//   - Login con credenciales válidas (student, admin)
//   - Login con credenciales inválidas
//   - Redirect por rol tras login
//   - Acceso protegido sin sesión → redirect a /login
//   - Logout limpia cookies
//   - RNF-07: usuario sin rol admin no puede entrar a rutas admin
//
// Cubre RF-02, RF-03, RNF-07.

import { test, expect } from '../../fixtures/auth.fixture'
import { LoginPage } from '../../pages/login.page'
import { SEED_CREDENTIALS } from '../../fixtures/seed'

test.describe('TC-E-00 — Autenticación transversal (RF-02, RF-03, RNF-07)', () => {
  test('TC-E-00-001: should login successfully with student credentials [RF-02, RF-03]', async ({
    page,
  }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.loginAs(SEED_CREDENTIALS.student.email, SEED_CREDENTIALS.student.password)
    // Tras login exitoso, redirect a /dashboard según roleHome.
    await page.waitForURL('**/dashboard', { timeout: 15_000 })
    expect(page.url()).toContain('/dashboard')
  })

  test('TC-E-00-002: should login successfully with admin and redirect to admin dashboard [RF-02, RF-03, RNF-07]', async ({
    page,
  }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.loginAs(SEED_CREDENTIALS.admin.email, SEED_CREDENTIALS.admin.password)
    await page.waitForURL('**/admin/analytics', { timeout: 15_000 })
    expect(page.url()).toContain('/admin/analytics')
  })

  test('TC-E-00-003: should reject login with wrong password and show error [RF-02]', async ({
    page,
  }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.loginAs(SEED_CREDENTIALS.student.email, 'WRONG-PASSWORD-X')
    // El backend devuelve 401; el frontend mantiene la URL en /login y
    // muestra un Alert con el error.
    await expect(loginPage.errorAlert).toBeVisible({ timeout: 10_000 })
    expect(page.url()).toContain('/login')
  })

  test('TC-E-00-004: should redirect unauthenticated user from protected route to home [RNF-07]', async ({
    page,
  }) => {
    await page.goto('/dashboard')
    // `ProtectedRoute` (src/components/ProtectedRoute.tsx) redirige a `/`
    // (home pública), NO a `/login`, cuando no hay sesión activa.
    await page.waitForURL((url) => url.pathname === '/' || url.pathname === '/login', {
      timeout: 15_000,
    })
    expect(page.url()).not.toContain('/dashboard')
  })

  test('TC-E-00-005: should logout and clear session cookie [RF-03]', async ({
    context,
    authenticatedAs,
  }) => {
    // Hacemos login y luego invocamos directamente `POST /api/auth/logout`
    // (mismo endpoint que dispara el botón). Comprobamos que las cookies
    // queden vacías o no presentes — sin depender de la UI del header.
    await authenticatedAs('student')
    const apiUrl = process.env.E2E_API_URL ?? 'http://127.0.0.1:3002/api'
    const res = await context.request.post(`${apiUrl}/auth/logout`)
    expect(res.status()).toBe(204)
    const cookies = await context.cookies()
    const access = cookies.find((c) => c.name === 'access_token')
    expect(access?.value ?? '').toBe('')
  })

  test('TC-E-00-006: should reject access to admin route for non-admin user [RNF-07]', async ({
    page,
    authenticatedAs,
  }) => {
    await authenticatedAs('student')
    await page.goto('/admin/questions')
    // ProtectedRoute con roles=['admin'] redirige al home del rol student
    // (/dashboard) — ver getRoleHome(). Esperamos NO terminar en la ruta admin.
    await page.waitForURL(
      (url) => url.pathname !== '/admin/questions',
      { timeout: 15_000 },
    )
    expect(page.url()).not.toContain('/admin/questions')
  })
})
