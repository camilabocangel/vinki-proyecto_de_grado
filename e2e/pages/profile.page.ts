// Page Object: ProfilePage (`/settings`).

import type { Locator, Page } from '@playwright/test'

export class ProfilePage {
  readonly page: Page
  readonly title: Locator
  readonly editProfileButton: Locator
  readonly nameInput: Locator
  readonly saveChangesButton: Locator
  readonly cancelButton: Locator
  readonly currentPasswordInput: Locator
  readonly newPasswordInput: Locator
  readonly confirmPasswordInput: Locator
  readonly changePasswordButton: Locator

  constructor(page: Page) {
    this.page = page
    this.title = page.getByRole('heading', { name: /Mi perfil/i })
    this.editProfileButton = page.getByRole('button', { name: /Editar perfil/i })
    // Form fields aparecen tras entrar en modo edición.
    this.nameInput = page.getByLabel(/Nombre/i).first()
    this.saveChangesButton = page.getByRole('button', { name: /Guardar cambios/i })
    this.cancelButton = page.getByRole('button', { name: /Cancelar/i })
    this.currentPasswordInput = page.getByLabel(/Contraseña actual/i)
    this.newPasswordInput = page.getByLabel(/Nueva contraseña/i)
    this.confirmPasswordInput = page.getByLabel(/Confirmar contraseña/i)
    this.changePasswordButton = page.getByRole('button', { name: /Cambiar contraseña/i }).last()
  }

  async goto(): Promise<void> {
    await this.page.goto('/settings')
  }
}
