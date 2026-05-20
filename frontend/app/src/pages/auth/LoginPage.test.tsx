import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TestWrapper } from '../../test/test-utils'
import LoginPage from './LoginPage'

// Mock controlable de useAuth — algunos tests inyectan login distinto o
// loginError. El default es seguro: sin error, login es un noop async.
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
  login: ReturnType<typeof vi.fn>
  loginError: Error | null
}> = {}) {
  mockUseAuth.mockReturnValue({
    login: overrides.login ?? vi.fn().mockResolvedValue({}),
    loginError: overrides.loginError ?? null,
    isLoading: false,
    user: null,
    isAuthenticated: false,
    register: vi.fn(),
    logout: vi.fn(),
    registerError: null,
  })
}

beforeEach(() => {
  mockNavigate.mockReset()
  setUseAuth()
})

describe('LoginPage', () => {
  it('renders email and password fields', () => {
    render(
      <TestWrapper>
        <LoginPage />
      </TestWrapper>,
    )

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/contra|password/i)).toBeInTheDocument()
  })

  it('has a submit button', () => {
    render(
      <TestWrapper>
        <LoginPage />
      </TestWrapper>,
    )

    expect(
      screen.getByRole('button', { name: /iniciar|login|entrar|sign in/i }),
    ).toBeInTheDocument()
  })

  it('has a link to the register page', () => {
    render(
      <TestWrapper>
        <LoginPage />
      </TestWrapper>,
    )

    const registerLink = screen.getByRole('link', {
      name: /regis|sign up|crear/i,
    })
    expect(registerLink).toBeInTheDocument()
    expect(registerLink).toHaveAttribute('href', '/register')
  })

  it('shows Vinki branding', () => {
    render(
      <TestWrapper>
        <LoginPage />
      </TestWrapper>,
    )

    // El logo "V" se reemplazó por copy textual. El branding ahora vive
    // en la cadena de bienvenida (`auth.welcomeTo` -> "Bienvenido a Vinki"
    // en ES / "Welcome to Vinki" en EN). Se valida la presencia textual
    // de "Vinki" — ámbito mínimo y resiliente a cambios de copy.
    expect(screen.getByText(/Vinki/i)).toBeInTheDocument()
  })

  describe('submit flow (RF-02)', () => {
    it('should call useAuth.login with the email/password typed by the user', async () => {
      const login = vi.fn().mockResolvedValue({ user: { id: 1, role: 'student' } })
      setUseAuth({ login })
      const user = userEvent.setup()
      render(<LoginPage />, { wrapper: TestWrapper })

      await user.type(screen.getByLabelText(/email/i), 'student@vinki.dev')
      await user.type(screen.getByLabelText(/contra|password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /iniciar|login|entrar|sign in/i }))

      await waitFor(() => {
        expect(login).toHaveBeenCalledWith({
          email: 'student@vinki.dev',
          password: 'password123',
        })
      })
    })

    it('should redirect to /dashboard when a student logs in successfully', async () => {
      const login = vi.fn().mockResolvedValue({ user: { id: 1, role: 'student' } })
      setUseAuth({ login })
      const user = userEvent.setup()
      render(<LoginPage />, { wrapper: TestWrapper })

      await user.type(screen.getByLabelText(/email/i), 's@x.com')
      await user.type(screen.getByLabelText(/contra|password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /iniciar|login|entrar|sign in/i }))

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
      })
    })

    it('should redirect to /admin/analytics when an admin logs in successfully', async () => {
      const login = vi.fn().mockResolvedValue({ user: { id: 1, role: 'admin' } })
      setUseAuth({ login })
      const user = userEvent.setup()
      render(<LoginPage />, { wrapper: TestWrapper })

      await user.type(screen.getByLabelText(/email/i), 'a@x.com')
      await user.type(screen.getByLabelText(/contra|password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /iniciar|login|entrar|sign in/i }))

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/admin/analytics')
      })
    })

    it('should redirect to /recruiter when a recruiter logs in successfully', async () => {
      const login = vi.fn().mockResolvedValue({ user: { id: 1, role: 'recruiter' } })
      setUseAuth({ login })
      const user = userEvent.setup()
      render(<LoginPage />, { wrapper: TestWrapper })

      await user.type(screen.getByLabelText(/email/i), 'r@x.com')
      await user.type(screen.getByLabelText(/contra|password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /iniciar|login|entrar|sign in/i }))

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/recruiter')
      })
    })

    it('should render the loginError Alert when useAuth exposes a loginError', () => {
      setUseAuth({ loginError: new Error('Credenciales inválidas') })

      render(<LoginPage />, { wrapper: TestWrapper })

      expect(screen.getByText(/Credenciales inválidas/i)).toBeInTheDocument()
    })

    it('should not navigate when login rejects (caught by the page handler)', async () => {
      const login = vi.fn().mockRejectedValue(new Error('Invalid creds'))
      setUseAuth({ login })
      const user = userEvent.setup()
      render(<LoginPage />, { wrapper: TestWrapper })

      await user.type(screen.getByLabelText(/email/i), 's@x.com')
      await user.type(screen.getByLabelText(/contra|password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /iniciar|login|entrar|sign in/i }))

      await waitFor(() => {
        expect(login).toHaveBeenCalled()
      })
      expect(mockNavigate).not.toHaveBeenCalled()
    })
  })

  describe('form validation', () => {
    it('should not submit when email is empty', async () => {
      const login = vi.fn()
      setUseAuth({ login })
      const user = userEvent.setup()
      render(<LoginPage />, { wrapper: TestWrapper })

      // Solo escribimos password.
      await user.type(screen.getByLabelText(/contra|password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /iniciar|login|entrar|sign in/i }))

      // antd Form bloquea el submit cuando faltan campos requeridos.
      expect(login).not.toHaveBeenCalled()
    })

    it('should not submit when email format is invalid', async () => {
      const login = vi.fn()
      setUseAuth({ login })
      const user = userEvent.setup()
      render(<LoginPage />, { wrapper: TestWrapper })

      await user.type(screen.getByLabelText(/email/i), 'not-an-email')
      await user.type(screen.getByLabelText(/contra|password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /iniciar|login|entrar|sign in/i }))

      expect(login).not.toHaveBeenCalled()
    })
  })
})
