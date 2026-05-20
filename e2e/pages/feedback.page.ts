// Page Object: FeedbackPage (`/feedback/:id`).

import type { Locator, Page } from '@playwright/test'

export class FeedbackPage {
  readonly page: Page
  readonly title: Locator
  readonly statusTag: Locator
  readonly avgMetricsCard: Locator
  readonly metricBreakdownCard: Locator
  readonly questionDetailCard: Locator
  readonly aiFeedbackBlock: Locator
  readonly pdfButton: Locator
  readonly csvButton: Locator
  readonly shareButton: Locator

  constructor(page: Page) {
    this.page = page
    this.title = page.getByRole('heading', { name: /Reporte de entrevista/i })
    // El estado se muestra en una etiqueta — usamos el texto literal i18n.
    this.statusTag = page
      .getByText(/Evaluación completada|En proceso/i)
      .first()
    this.avgMetricsCard = page.getByText(/Métricas promedio/i).first()
    this.metricBreakdownCard = page.getByText(/Desglose por métrica/i).first()
    this.questionDetailCard = page.getByText(/Detalle por pregunta/i).first()
    this.aiFeedbackBlock = page.getByText(/Feedback IA/i).first()
    this.pdfButton = page.getByRole('button', { name: /PDF/i })
    this.csvButton = page.getByRole('button', { name: /CSV/i })
    this.shareButton = page.getByRole('button', { name: /Compartir/i })
  }

  async goto(interviewId: number): Promise<void> {
    await this.page.goto(`/feedback/${interviewId}`)
  }

  /** Localiza la barra de Progress para una dimensión específica. */
  metricBar(label: 'Corrección técnica' | 'Claridad' | 'Comunicación' | 'Confianza' | 'Resolución'): Locator {
    return this.page.getByText(label, { exact: false }).first()
  }
}
