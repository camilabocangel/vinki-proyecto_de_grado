// Page Object: AdminQuestionsPage (`/admin/questions`).

import type { Locator, Page } from '@playwright/test'

export class AdminQuestionsPage {
  readonly page: Page
  readonly newQuestionButton: Locator
  readonly generateWithAiButton: Locator
  readonly importButton: Locator
  readonly exportButton: Locator
  readonly searchInput: Locator
  readonly questionsTable: Locator
  readonly modalQuestionTextarea: Locator
  readonly modalSubmitButton: Locator
  readonly modalCancelButton: Locator

  constructor(page: Page) {
    this.page = page
    this.newQuestionButton = page.getByRole('button', { name: /Nueva pregunta/i }).first()
    this.generateWithAiButton = page.getByRole('button', { name: /Generar con IA/i })
    this.importButton = page.getByRole('button', { name: /^Importar$/i })
    this.exportButton = page.getByRole('button', { name: /^Exportar$/i })
    this.searchInput = page.getByPlaceholder(/Buscar por texto/i)
    this.questionsTable = page.getByRole('table').first()
    // El form usa label "Pregunta" → getByLabel coincide con el textbox.
    this.modalQuestionTextarea = page.getByLabel(/^Pregunta$/i).first()
    // El botón de submit del modal reutiliza el texto del título ("Nueva
    // pregunta" en modo crear, "Guardar" en modo edición). Lo localizamos
    // dentro del dialog → último button "Nueva pregunta" o "Guardar".
    this.modalSubmitButton = page
      .getByRole('dialog')
      .getByRole('button', { name: /Nueva pregunta|^Guardar$/i })
      .last()
    this.modalCancelButton = page
      .getByRole('dialog')
      .getByRole('button', { name: /Cancelar/i })
  }

  async goto(): Promise<void> {
    await this.page.goto('/admin/questions')
  }

  rows(): Locator {
    return this.questionsTable.getByRole('row')
  }
}
