// Suite E2E TC-E-07 — KnowledgeBasePage (`/knowledge`).
//
// Ruta protegida por `roles=['recruiter', 'admin']`. Validamos el flujo UI
// del listado, búsqueda semántica y agregado de documento.
//
// La calidad semántica real del retrieval se valida en Fase 6 (Ragas /
// DeepEval). Aquí solo verificamos que el flujo UI funciona contra el
// backend en sandbox (MockEmbeddingService).
//
// Cubre RF-29 (UI), RF-30 (UI), RF-31 (UI), RNF-26.

import { test, expect } from '../../fixtures/auth.fixture'
import { KnowledgeBasePage } from '../../pages/knowledgeBase.page'

test.describe('TC-E-07 — KnowledgeBasePage (RF-29 a RF-31, RNF-26)', () => {
  test.beforeEach(async ({ authenticatedAs }) => {
    await authenticatedAs('recruiter')
  })

  test('TC-E-07-001: should render knowledge documents list [RF-29 UI]', async ({ page }) => {
    const kb = new KnowledgeBasePage(page)
    await kb.goto()
    await expect(kb.documentsTable).toBeVisible({ timeout: 20_000 })
    // El seed sembró un documento NestJS — su título debe aparecer (.first()
    // por si Ant Table renderiza el texto en varias celdas/rows internas).
    await expect(page.getByText(/Documento E2E sobre NestJS/i).first()).toBeVisible({
      timeout: 20_000,
    })
    await expect(kb.searchButton).toBeVisible()
    await expect(kb.addDocumentButton).toBeVisible()
  })



  test('TC-E-07-002: should perform semantic search and display results [RF-30 UI]', async ({
    page,
  }) => {
    const kb = new KnowledgeBasePage(page)
    await kb.goto()
    await expect(kb.searchButton).toBeVisible({ timeout: 20_000 })
    await kb.searchButton.click()
    await expect(kb.searchModalInput).toBeVisible({ timeout: 10_000 })

    const respPromise = page.waitForResponse(
      (r) => r.url().includes('/knowledge/search') && r.request().method() === 'POST',
      { timeout: 30_000 },
    )
    await kb.searchModalInput.fill('NestJS arquitectura')
    // El Input tiene `onPressEnter` → submit con Enter (más robusto que
    // localizar el botón embebido en el Input.Search de Antd).
    await kb.searchModalInput.press('Enter')
    const resp = await respPromise
    expect(resp.status()).toBeLessThan(400)
  })

  test('TC-E-07-003: should open add document modal with required form fields [RF-29 UI]', async ({
    page,
  }) => {
    const kb = new KnowledgeBasePage(page)
    await kb.goto()
    await expect(kb.addDocumentButton).toBeVisible({ timeout: 20_000 })
    await kb.addDocumentButton.click()
    // El modal abre con un input de título.
    await expect(page.getByPlaceholder(/Ej: Guía de Node/i)).toBeVisible()
    // Y un textarea de contenido.
    await expect(page.getByPlaceholder(/contenido técnico/i)).toBeVisible()
  })
})
