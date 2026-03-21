import { render, screen } from '@testing-library/react'
import { TestWrapper } from '../../test/test-utils'
import LoginPage from './LoginPage'

// Mock useAuth so it doesn't make real API calls
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    login: vi.fn(),
    loginError: null,
    isLoading: false,
    user: null,
    isAuthenticated: false,
    register: vi.fn(),
    logout: vi.fn(),
    registerError: null,
  }),
}))

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

    expect(screen.getByText('V')).toBeInTheDocument()
  })
})
