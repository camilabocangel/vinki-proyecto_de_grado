import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import RegisterPage from './RegisterPage'
import { TestWrapper } from '../../test/test-utils'

const mockUseAuth = vi.fn()
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

function setUseAuth(overrides: Partial<{
  register: ReturnType<typeof vi.fn>
  registerError: Error | null
}> = {}) {
  mockUseAuth.mockReturnValue({
    register: overrides.register ?? vi.fn().mockResolvedValue({}),
    registerError: overrides.registerError ?? null,
    isAuthenticated: false,
    isLoading: false,
  })
}

beforeEach(() => {
  mockNavigate.mockReset()
  setUseAuth()
})

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

  describe('submit flow (RF-01)', () => {
    it('should call useAuth.register with the typed name, email and password', async () => {
      const registerFn = vi.fn().mockResolvedValue({})
      setUseAuth({ register: registerFn })
      const user = userEvent.setup()
      render(<RegisterPage />, { wrapper: TestWrapper })

      const inputs = screen.getAllByRole('textbox')
      await user.type(inputs[0], 'Jane Doe')
      await user.type(inputs[1], 'jane@vinki.dev')
      await user.type(
        document.querySelector('input[type="password"]') as HTMLInputElement,
        'password123',
      )
      await user.click(screen.getByRole('button', { name: /crear cuenta|create account/i }))

      await waitFor(() => {
        expect(registerFn).toHaveBeenCalledWith({
          name: 'Jane Doe',
          email: 'jane@vinki.dev',
          password: 'password123',
        })
      })
    })

    it('should navigate to /dashboard on successful registration', async () => {
      const registerFn = vi.fn().mockResolvedValue({})
      setUseAuth({ register: registerFn })
      const user = userEvent.setup()
      render(<RegisterPage />, { wrapper: TestWrapper })

      const inputs = screen.getAllByRole('textbox')
      await user.type(inputs[0], 'Jane')
      await user.type(inputs[1], 'jane@vinki.dev')
      await user.type(
        document.querySelector('input[type="password"]') as HTMLInputElement,
        'password123',
      )
      await user.click(screen.getByRole('button', { name: /crear cuenta|create account/i }))

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
      })
    })

    it('should render the registerError Alert when useAuth exposes a registerError', () => {
      setUseAuth({ registerError: new Error('Email already registered') })

      render(<RegisterPage />, { wrapper: TestWrapper })

      expect(screen.getByText(/Email already registered/i)).toBeInTheDocument()
    })

    it('should not navigate when register rejects', async () => {
      const registerFn = vi.fn().mockRejectedValue(new Error('Conflict'))
      setUseAuth({ register: registerFn })
      const user = userEvent.setup()
      render(<RegisterPage />, { wrapper: TestWrapper })

      const inputs = screen.getAllByRole('textbox')
      await user.type(inputs[0], 'Jane')
      await user.type(inputs[1], 'jane@vinki.dev')
      await user.type(
        document.querySelector('input[type="password"]') as HTMLInputElement,
        'password123',
      )
      await user.click(screen.getByRole('button', { name: /crear cuenta|create account/i }))

      await waitFor(() => {
        expect(registerFn).toHaveBeenCalled()
      })
      expect(mockNavigate).not.toHaveBeenCalled()
    })
  })

  describe('form validation', () => {
    it('should not submit when name is missing', async () => {
      const registerFn = vi.fn()
      setUseAuth({ register: registerFn })
      const user = userEvent.setup()
      render(<RegisterPage />, { wrapper: TestWrapper })

      const inputs = screen.getAllByRole('textbox')
      // Solo email
      await user.type(inputs[1], 'jane@vinki.dev')
      await user.type(
        document.querySelector('input[type="password"]') as HTMLInputElement,
        'password123',
      )
      await user.click(screen.getByRole('button', { name: /crear cuenta|create account/i }))

      expect(registerFn).not.toHaveBeenCalled()
    })

    it('should not submit when password is shorter than 8 characters', async () => {
      const registerFn = vi.fn()
      setUseAuth({ register: registerFn })
      const user = userEvent.setup()
      render(<RegisterPage />, { wrapper: TestWrapper })

      const inputs = screen.getAllByRole('textbox')
      await user.type(inputs[0], 'Jane')
      await user.type(inputs[1], 'jane@vinki.dev')
      await user.type(
        document.querySelector('input[type="password"]') as HTMLInputElement,
        'short',
      )
      await user.click(screen.getByRole('button', { name: /crear cuenta|create account/i }))

      expect(registerFn).not.toHaveBeenCalled()
    })
  })
})
