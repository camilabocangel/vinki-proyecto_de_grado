import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TestWrapper } from '../test/test-utils'
import NotFoundPage from './NotFoundPage'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

const mockUseAuth = vi.fn()
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

describe('NotFoundPage', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    mockUseAuth.mockReset()
  })

  it('should render the 404 result with the localized "go home" button', () => {
    mockUseAuth.mockReturnValue({ user: null })

    render(<NotFoundPage />, { wrapper: TestWrapper })

    expect(screen.getByText('404')).toBeInTheDocument()
    // El Result de antd usa role="alert" + heading "404"; el botón es la
    // acción extra.
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('should navigate to /dashboard when an unauthenticated user clicks the button', async () => {
    const user = userEvent.setup()
    mockUseAuth.mockReturnValue({ user: null })

    render(<NotFoundPage />, { wrapper: TestWrapper })

    await user.click(screen.getByRole('button'))

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
  })

  it('should navigate to /admin/analytics when an admin clicks the button', async () => {
    const user = userEvent.setup()
    mockUseAuth.mockReturnValue({ user: { role: 'admin' } })

    render(<NotFoundPage />, { wrapper: TestWrapper })

    await user.click(screen.getByRole('button'))

    expect(mockNavigate).toHaveBeenCalledWith('/admin/analytics')
  })

  it('should navigate to /recruiter when a recruiter clicks the button', async () => {
    const user = userEvent.setup()
    mockUseAuth.mockReturnValue({ user: { role: 'recruiter' } })

    render(<NotFoundPage />, { wrapper: TestWrapper })

    await user.click(screen.getByRole('button'))

    expect(mockNavigate).toHaveBeenCalledWith('/recruiter')
  })
})
