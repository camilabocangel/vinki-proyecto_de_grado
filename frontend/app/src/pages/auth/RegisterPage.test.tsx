import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import RegisterPage from './RegisterPage'
import { TestWrapper } from '../../test/test-utils'

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    register: vi.fn(),
    registerError: null,
    isAuthenticated: false,
    isLoading: false,
  }),
}))

describe('RegisterPage', () => {
  it('renders name, email and password fields', () => {
    render(<RegisterPage />, { wrapper: TestWrapper })
    // Text inputs (name, email)
    const inputs = screen.getAllByRole('textbox')
    expect(inputs.length).toBeGreaterThanOrEqual(2)
    // Password field is type=password, not textbox
    const passwordInputs = document.querySelectorAll('input[type="password"]')
    expect(passwordInputs.length).toBeGreaterThanOrEqual(1)
  })

  it('has a submit button', () => {
    render(<RegisterPage />, { wrapper: TestWrapper })
    expect(
      screen.getByRole('button', { name: /crear cuenta|create account/i }),
    ).toBeInTheDocument()
  })

  it('has a link to login page', () => {
    render(<RegisterPage />, { wrapper: TestWrapper })
    expect(
      screen.getByRole('link', { name: /inicia sesión|sign in/i }),
    ).toBeInTheDocument()
  })

  it('shows Vinki branding', () => {
    render(<RegisterPage />, { wrapper: TestWrapper })
    expect(screen.getByText('V')).toBeInTheDocument()
  })
})
