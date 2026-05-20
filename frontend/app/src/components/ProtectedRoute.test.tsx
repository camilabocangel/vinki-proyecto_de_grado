import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'

// Mock de useAuth para controlar el estado de autenticación por test.
// Cubre RNF-07 (autorización por propiedad de los datos) a nivel de UI:
// solo los usuarios con el rol correcto pueden acceder a rutas restringidas.
const mockUseAuth = vi.fn()
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

function renderWithRouter(initialPath: string, roles?: string[]) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/" element={<div>Public Home</div>} />
        <Route path="/dashboard" element={<div>Student Dashboard</div>} />
        <Route path="/recruiter" element={<div>Recruiter Panel</div>} />
        <Route path="/admin/analytics" element={<div>Admin Analytics</div>} />
        <Route element={<ProtectedRoute roles={roles} />}>
          <Route path="/protected" element={<div>Protected Content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    mockUseAuth.mockReset()
  })

  it('should show a loading spinner while authentication is being resolved', () => {
    mockUseAuth.mockReturnValue({ user: null, isAuthenticated: false, isLoading: true })

    const { container } = renderWithRouter('/protected')

    // El Spin de Ant Design usa role="img" con aria-label específico, o
    // un span con clase .ant-spin. Verificamos por la presencia del spinner
    // y la ausencia del contenido protegido.
    expect(container.querySelector('.ant-spin')).toBeTruthy()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('should redirect to "/" when the user is not authenticated', () => {
    mockUseAuth.mockReturnValue({ user: null, isAuthenticated: false, isLoading: false })

    renderWithRouter('/protected')

    expect(screen.getByText('Public Home')).toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('should render the protected outlet when authenticated and no role restriction is set', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, role: 'student' },
      isAuthenticated: true,
      isLoading: false,
    })

    renderWithRouter('/protected') // sin `roles`

    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  it("should render the outlet when the user's role is included in the allowed roles", () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, role: 'admin' },
      isAuthenticated: true,
      isLoading: false,
    })

    renderWithRouter('/protected', ['admin', 'recruiter'])

    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  it("should redirect a student to /dashboard when accessing an admin-only route (RNF-07)", () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, role: 'student' },
      isAuthenticated: true,
      isLoading: false,
    })

    renderWithRouter('/protected', ['admin'])

    expect(screen.getByText('Student Dashboard')).toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('should redirect a recruiter to /recruiter when accessing a student-only route', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, role: 'recruiter' },
      isAuthenticated: true,
      isLoading: false,
    })

    renderWithRouter('/protected', ['student'])

    expect(screen.getByText('Recruiter Panel')).toBeInTheDocument()
  })

  it('should redirect an admin to /admin/analytics when accessing a route they cannot see', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, role: 'admin' },
      isAuthenticated: true,
      isLoading: false,
    })

    renderWithRouter('/protected', ['student'])

    expect(screen.getByText('Admin Analytics')).toBeInTheDocument()
  })
})
