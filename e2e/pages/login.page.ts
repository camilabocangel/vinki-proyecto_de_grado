// Page Object: LoginPage (`/login`).
// Encapsula selectores y acciones. NO contiene aserciones.

import type { Locator, Page } from '@playwright/test'

export class LoginPage {
  readonly page: Page
  readonly emailInput: Locator
  readonly passwordInput: Locator
  readonly submitButton: Locator
  readonly errorAlert: Locator
  readonly signUpLink: Locator

  constructor(page: Page) {
    this.page = page
    // Inputs por placeholder (definidos literalmente en el componente).
    this.emailInput = page.getByPlaceholder('tu@email.com')
    this.passwordInput = page.getByPlaceholder('Tu contraseña')
    // El botón principal del form tiene label = t('auth.login') = "Iniciar sesión".
    this.submitButton = page.getByRole('button', { name: /Iniciar sesión/i })
    // Antd Alert con role="alert" cuando se muestra error.
    this.errorAlert = page.getByRole('alert')
    this.signUpLink = page.getByRole('link', { name: /Reg(í|i)strate/i })
  }

  async goto(): Promise<void> {
    await this.page.goto('/login')
  }

  async fillCredentials(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)
  }

  async submit(): Promise<void> {
    await this.submitButton.click()
  }

  async loginAs(email: string, password: string): Promise<void> {
    await this.fillCredentials(email, password)
    await this.submit()
  }
}
