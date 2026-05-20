// Page Object: InterviewSessionPage (`/interview/:id`).

import type { Locator, Page } from '@playwright/test'

export class SessionPage {
  readonly page: Page
  readonly questionTitle: Locator
  readonly answerTextarea: Locator
  readonly saveAnswerButton: Locator
  readonly nextQuestionButton: Locator
  readonly prevQuestionButton: Locator
  readonly finishButton: Locator
  readonly recordButton: Locator
  readonly stopButton: Locator
  readonly followUpButton: Locator
  readonly timer: Locator

  constructor(page: Page) {
    this.page = page
    // El h3 dentro del Card lleva el texto de la pregunta.
    this.questionTitle = page.getByRole('heading', { level: 3 }).first()
    this.answerTextarea = page.getByPlaceholder(/Escribe tu respuesta/i)
    this.saveAnswerButton = page.getByRole('button', { name: /Guardar respuesta/i }).first()
    this.nextQuestionButton = page.getByRole('button', { name: /^Siguiente$/i })
    this.prevQuestionButton = page.getByRole('button', { name: /^Anterior$/i })
    this.finishButton = page.getByRole('button', { name: /Finalizar entrevista/i })
    this.recordButton = page.getByRole('button', { name: /Grabar respuesta/i })
    this.stopButton = page.getByRole('button', { name: /^Detener$/i })
    this.followUpButton = page.getByRole('button', { name: /Profundizar con IA/i })
    this.timer = page.getByLabel(/Tiempo restante/i)
  }

  async goto(interviewId: number): Promise<void> {
    await this.page.goto(`/interview/${interviewId}`)
  }

  async typeAnswer(text: string): Promise<void> {
    await this.answerTextarea.fill(text)
  }

  async saveAnswer(): Promise<void> {
    await this.saveAnswerButton.click()
  }

  async clickNext(): Promise<void> {
    await this.nextQuestionButton.click()
  }

  async clickPrev(): Promise<void> {
    await this.prevQuestionButton.click()
  }

  async clickFinish(): Promise<void> {
    await this.finishButton.click()
  }

  async startRecording(): Promise<void> {
    await this.recordButton.click()
  }

  async stopRecording(): Promise<void> {
    await this.stopButton.click()
  }
}
