// Smoke E2E del proyecto Vinki.
//
// Verifica que la SPA del frontend levanta y responde:
//   1. La home pública carga (`/` no requiere autenticación).
//   2. El título de la página contiene "Vinki".
//   3. No se registran errores críticos de consola (warnings filtrados).
//
// No requiere backend ni datos seed. La suite 00-smoke es la primera
// barrera de calidad: si esto falla, el resto de los E2E no se ejecutan.

import { test, expect, type ConsoleMessage } from '@playwright/test'

const isCriticalConsoleError = (msg: ConsoleMessage): boolean => {
  if (msg.type() !== 'error') return false
  const text = msg.text()
  // Filtrado de ruido conocido en desarrollo (no son fallos del SUT):
  if (text.includes('React DevTools')) return false
  if (text.includes('Download the React DevTools')) return false
  if (text.includes('Failed to load resource')) return false // assets de desarrollo
  if (text.includes('vite')) return false
  return true
}

test.describe('Smoke — frontend Vinki', () => {
  test('la home pública carga y muestra el branding', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (isCriticalConsoleError(msg)) {
        consoleErrors.push(msg.text())
      }
    })

    // `domcontentloaded` evita esperar todas las imágenes/SVGs decorativos
    // del Home; basta con que el DOM esté listo para evaluar el branding.
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    // 1. El título HTML contiene "Vinki".
    await expect(page).toHaveTitle(/Vinki/i)

    // 2. El marcado visible incluye la palabra "Vinki" (logo o headings).
    await expect(page.getByText(/Vinki/i).first()).toBeVisible()

    // 3. Sin errores críticos en consola.
    expect(consoleErrors).toEqual([])
  })
})
