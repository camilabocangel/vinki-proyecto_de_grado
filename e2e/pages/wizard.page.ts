// Page Object: InterviewWizardPage (`/interview/new`).
//
// Estructura del wizard (modo "custom"): 5 pasos seleccionables como Cards
// clicables. El componente usa Ant Design Steps + Cards con onClick (no
// son `<button role="button">`), así que la selección se hace por texto.

import type { Locator, Page } from '@playwright/test'

export class WizardPage {
  readonly page: Page
  readonly title: Locator
  readonly nextButton: Locator
  readonly prevButton: Locator
  readonly startButton: Locator
  readonly modeChoiceCustom: Locator
  readonly modeChoiceTemplate: Locator

  constructor(page: Page) {
    this.page = page
    // El primer heading visible es "Elige el modo de entrevista". Cuando
    // se elige "Entrevista Personalizada", el wizard ya muestra los pasos
    // y "Configurar entrevista" aparece como subtítulo.
    this.title = page.getByRole('heading', { name: /Elige el modo|Configurar entrevista/i }).first()
    // El nombre accesible incluye el alt-text del icono ("Siguiente arrow-right").
    // Usamos match no-anclado para tolerarlo.
    this.nextButton = page.getByRole('button', { name: /Siguiente/i })
    this.prevButton = page
      .getByRole('button', { name: /Anterior|Volver a selección de modo/i })
      .first()
    this.startButton = page.getByRole('button', { name: /Iniciar entrevista/i })
    // El heading h4 "Entrevista Personalizada" es lo accesible más estable.
    this.modeChoiceCustom = page.getByRole('heading', { name: /Entrevista Personalizada/i })
    this.modeChoiceTemplate = page.getByRole('heading', { name: /Desde Plantilla/i })
  }

  async goto(): Promise<void> {
    await this.page.goto('/interview/new')
  }

  async chooseCustomMode(): Promise<void> {
    // El "card" de Entrevista Personalizada es un .ant-card con onClick.
    await this.page
      .locator('.ant-card')
      .filter({ has: this.modeChoiceCustom })
      .first()
      .click()
  }

  /**
   * Selecciona una card (rol, lenguaje, nivel) por su texto. Las cards de
   * Antd llevan `onClick` en el contenedor `.ant-card`. Clickeamos el card
   * filtrado por su texto en lugar del texto interior, porque algunos
   * elementos internos (íconos, descripción secundaria) pueden absorber
   * el click sin propagar al onClick del card.
   */
  private async clickCardByText(name: string): Promise<void> {
    await this.page
      .locator('.ant-card')
      .filter({ hasText: new RegExp(`^\\s*${name}`, 'i') })
      .first()
      .click()
  }

  async selectRole(name: string): Promise<void> {
    await this.clickCardByText(name)
  }

  async selectLanguage(name: string): Promise<void> {
    await this.clickCardByText(name)
  }

  /** Selecciona un framework del Select de Ant Design. */
  async selectFramework(name: string): Promise<void> {
    const selectInput = this.page.getByPlaceholder(/Selecciona un framework/i)
    await selectInput.click()
    // Ant Design renderiza opciones fuera del DOM tree; usar text exacto.
    await this.page.getByText(name, { exact: true }).first().click()
  }

  /** Selecciona el nivel (Junior/Mid/Senior). */
  async selectLevel(name: string): Promise<void> {
    await this.clickCardByText(name)
  }

  /** Selecciona el modo (practice/evaluation/behavioral). */
  async selectMode(label: string): Promise<void> {
    await this.clickCardByText(label)
  }

  async clickNext(): Promise<void> {
    await this.nextButton.click()
  }

  async clickPrev(): Promise<void> {
    await this.prevButton.click()
  }

  async clickStart(): Promise<void> {
    await this.startButton.click()
  }
}
