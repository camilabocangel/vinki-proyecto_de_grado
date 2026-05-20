// Page Object: KnowledgeBasePage (`/knowledge`).

import type { Locator, Page } from '@playwright/test'

export class KnowledgeBasePage {
  readonly page: Page
  readonly searchButton: Locator
  readonly addDocumentButton: Locator
  readonly documentsTable: Locator
  readonly searchModalInput: Locator
  readonly searchModalSubmit: Locator

  constructor(page: Page) {
    this.page = page
    // Textos hardcoded en la página (no usan t()). El nombre accesible
    // del botón incluye el alt-text del icono ("search Buscar"), por lo
    // que el match debe ser sub-string (no anclado).
    this.searchButton = page.getByRole('button', { name: /Buscar/i }).first()
    this.addDocumentButton = page.getByRole('button', { name: /Agregar documento/i })
    this.documentsTable = page.getByRole('table').first()
    this.searchModalInput = page.getByPlaceholder(/Escribe tu consulta/i)
    // El botón de submit del modal está dentro de un Input.Search con icono.
    this.searchModalSubmit = page
      .getByRole('dialog')
      .getByRole('button', { name: /Buscar|search/i })
      .last()
  }

  async goto(): Promise<void> {
    await this.page.goto('/knowledge')
  }
}
