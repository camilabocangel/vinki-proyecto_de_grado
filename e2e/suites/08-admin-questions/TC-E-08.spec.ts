// Suite E2E TC-E-08 — AdminQuestionsPage (`/admin/questions`).
//
// Ruta protegida por `roles=['admin']`. CRUD admin del banco de preguntas.
//
// Cubre RF-42, RNF-07.

import { mergeTests } from '@playwright/test'
import { test as authTest, expect } from '../../fixtures/auth.fixture'
import { test as llmTest } from '../../fixtures/llm-mock.fixture'
import { AdminQuestionsPage } from '../../pages/adminQuestions.page'

const test = mergeTests(authTest, llmTest)

test.describe('TC-E-08 — AdminQuestionsPage (RF-42, RNF-07)', () => {
  test.describe('Como admin', () => {
    test.beforeEach(async ({ authenticatedAs }) => {
      await authenticatedAs('admin')
    })

    test('TC-E-08-001: should list all questions with metadata [RF-42]', async ({
      page,
    }) => {
      const admin = new AdminQuestionsPage(page)
      await admin.goto()
      await expect(admin.questionsTable).toBeVisible({ timeout: 20_000 })
      // El seed sembró 20+ preguntas — al menos 5 filas visibles.
      const rows = await admin.rows().count()
      expect(rows).toBeGreaterThanOrEqual(5)
      // Botones principales presentes.
      await expect(admin.newQuestionButton).toBeVisible()
      await expect(admin.searchInput).toBeVisible()
    })

    test('TC-E-08-002: should open modal to create new question with valid fields [RF-42]', async ({
      page,
    }) => {
      const admin = new AdminQuestionsPage(page)
      await admin.goto()
      await expect(admin.newQuestionButton).toBeVisible({ timeout: 20_000 })
      await admin.newQuestionButton.click()
      // El modal abre y tiene textarea para el texto de la pregunta.
      await expect(admin.modalQuestionTextarea).toBeVisible()
      await admin.modalQuestionTextarea.fill('¿Qué es la inversión de control en NestJS? (E2E)')
      // El botón de submit es visible y habilitado.
      await expect(admin.modalSubmitButton).toBeVisible()
    })

    test('TC-E-08-003: should allow opening edit modal for existing question [RF-42]', async ({
      page,
    }) => {
      const admin = new AdminQuestionsPage(page)
      await admin.goto()
      await expect(admin.questionsTable).toBeVisible({ timeout: 20_000 })
      // El primer botón "Editar" / icono de edición en la tabla.
      const editButtons = page.getByRole('button', { name: /Editar|Edit/i })
      const count = await editButtons.count()
      expect(count).toBeGreaterThan(0)
      await editButtons.first().click()
      // El modal de edición tiene el textarea prellenado.
      await expect(admin.modalQuestionTextarea).toBeVisible()
      const value = await admin.modalQuestionTextarea.inputValue().catch(() => '')
      expect(value.length).toBeGreaterThan(0)
    })

    test('TC-E-08-004: should show delete confirmation popover [RF-42]', async ({
      page,
    }) => {
      const admin = new AdminQuestionsPage(page)
      await admin.goto()
      await expect(admin.questionsTable).toBeVisible({ timeout: 20_000 })
      // Botón "Eliminar" / icono de delete. Ant Popconfirm muestra "Sí/No" o similar.
      const deleteBtn = page.getByRole('button', { name: /Eliminar|Delete/i }).first()
      await expect(deleteBtn).toBeVisible()
      await deleteBtn.click()
      // Aparece el Popconfirm con un botón de confirmar.
      const confirmButton = page.getByRole('button', { name: /Sí|Confirmar|OK/i })
      await expect(confirmButton.first()).toBeVisible({ timeout: 10_000 })
    })

    test('TC-E-08-005: should validate question text required when creating [RF-42]', async ({
      page,
    }) => {
      const admin = new AdminQuestionsPage(page)
      await admin.goto()
      await admin.newQuestionButton.click()
      await expect(admin.modalQuestionTextarea).toBeVisible({ timeout: 15_000 })
      // Submit sin contenido: Antd Form muestra error de validación inline,
      // o el dialog permanece abierto. Validamos que el modal sigue
      // mostrado y la pregunta sigue editable (no se cerró).
      await admin.modalSubmitButton.click()
      // El dialog sigue abierto porque la validación bloqueó el submit.
      // Antd Form muestra un mensaje de error inline ("Required" o similar);
      // verificamos que el modal NO se cerró — basta con que la textarea
      // siga siendo accesible.
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5_000 })
      await expect(admin.modalQuestionTextarea).toBeVisible()
    })
  })

  test.describe('Como student (RNF-07)', () => {
    test('TC-E-08-006: should reject access for non-admin user [RNF-07]', async ({
      page,
      authenticatedAs,
    }) => {
      await authenticatedAs('student')
      await page.goto('/admin/questions')
      // ProtectedRoute redirige al home del rol student.
      await page.waitForURL(/(\/dashboard|\/login)/, { timeout: 15_000 })
      expect(page.url()).not.toContain('/admin/questions')
    })
  })
})
