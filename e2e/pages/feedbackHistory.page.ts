// Page Object: FeedbackHistoryPage (`/history`).

import type { Locator, Page } from '@playwright/test'

export class FeedbackHistoryPage {
  readonly page: Page
  readonly title: Locator
  readonly table: Locator
  readonly viewReportButton: Locator
  readonly continueButton: Locator
  readonly statusFilter: Locator

  constructor(page: Page) {
    this.page = page
    this.title = page.getByRole('heading', { name: /Historial/i })
    this.table = page.getByRole('table').first()
    this.viewReportButton = page.getByRole('button', { name: /Ver reporte/i }).first()
    this.continueButton = page.getByRole('button', { name: /^Continuar$/i }).first()
    this.statusFilter = page.getByRole('combobox').first()
  }

  async goto(): Promise<void> {
    await this.page.goto('/history')
  }

  /** Devuelve las filas de la tabla (excluyendo header). */
  rows(): Locator {
    return this.table.getByRole('row')
  }
}
