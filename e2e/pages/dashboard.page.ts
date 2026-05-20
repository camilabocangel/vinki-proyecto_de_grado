// Page Object: DashboardPage (`/dashboard`).

import type { Locator, Page } from '@playwright/test'

export class DashboardPage {
  readonly page: Page
  readonly greetingHeading: Locator
  readonly startSimButton: Locator
  readonly interviewsTable: Locator
  readonly emptyStateCta: Locator

  constructor(page: Page) {
    this.page = page
    // Antd Card title "Hola, <Nombre>" — primer h3 con texto "Hola, ".
    this.greetingHeading = page.getByRole('heading', { name: /Hola,/i }).first()
    // El botón principal de iniciar simulación. Texto exacto i18n.
    this.startSimButton = page.getByRole('button', { name: /Iniciar simulación/i }).first()
    // Tabla del historial reciente.
    this.interviewsTable = page.getByRole('table').first()
    // Empty state cuando no hay entrevistas.
    this.emptyStateCta = page.getByRole('button', {
      name: /Realizar mi primera entrevista/i,
    })
  }

  async goto(): Promise<void> {
    await this.page.goto('/dashboard')
  }
}
