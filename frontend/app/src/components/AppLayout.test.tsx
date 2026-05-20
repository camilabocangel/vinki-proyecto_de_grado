import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { App as AntdApp } from 'antd'
import '../i18n'
import { AppLayout } from './AppLayout'

// AppLayout es el sidebar dinámico que muestra opciones por rol
// (estudiante / reclutador / admin). Es uno de los cambios recientes
// del proyecto: el admin ya NO debe ver el menú del estudiante. Aquí
// se valida ese comportamiento + presencia de los ítems de Gestión.

const mockUseAuth = vi.fn()
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

vi.mock('../hooks/useSessionTimeout', () => ({
  useSessionTimeout: () => ({ showWarning: false }),
}))

vi.mock('../api/client', () => ({
  api: { get: vi.fn().mockResolvedValue({ count: 0, items: [] }), post: vi.fn() },
}))

function renderLayoutFor(role: 'student' | 'recruiter' | 'admin') {
  mockUseAuth.mockReturnValue({
    user: { id: 1, name: 'Test', email: 'test@vinki.dev', role },
    isAuthenticated: true,
    isLoading: false,
    logout: vi.fn(),
  })

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/dashboard']}>
        <AntdApp>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<div>Dashboard content</div>} />
            </Route>
          </Routes>
        </AntdApp>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('AppLayout — sidebar por rol (RNF-26 — flujo intuitivo)', () => {
  beforeEach(() => {
    mockUseAuth.mockReset()
  })

  describe('cuando el usuario es estudiante', () => {
    it('should NOT render management items meant for recruiters/admin', async () => {
      renderLayoutFor('student')

      // El sidebar tarda en renderizar; esperamos al menos un menu item.
      await waitFor(() => {
        expect(document.querySelectorAll('.ant-menu-item').length).toBeGreaterThan(0)
      })
      // Talento/Analíticas son de Gestión (admin/recruiter): no deben verse.
      expect(screen.queryByText(/Talento|Talent/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/Analíticas|Analytics/i)).not.toBeInTheDocument()
    })
  })

  describe('cuando el usuario es admin', () => {
    it('should render management items including Analíticas as first', async () => {
      renderLayoutFor('admin')

      await waitFor(() => {
        expect(screen.getByText(/Analíticas|Analytics/i)).toBeInTheDocument()
      })
    })

    it('should NOT render student-only menu items (e.g. Plan de estudio)', async () => {
      renderLayoutFor('admin')

      await waitFor(() => {
        expect(screen.getByText(/Analíticas|Analytics/i)).toBeInTheDocument()
      })
      // El admin NO debe ver "Plan de estudio" en su sidebar (cambio
      // reciente: admin solo ve Gestión + General + Logout).
      expect(screen.queryByText(/Plan de estudio|Study plan/i)).not.toBeInTheDocument()
    })
  })

  describe('cuando el usuario es reclutador', () => {
    it('should render the management menu (Talento)', async () => {
      renderLayoutFor('recruiter')

      await waitFor(() => {
        expect(screen.getByText(/Talento|Talent/i)).toBeInTheDocument()
      })
    })

    it('should NOT render the student main menu', async () => {
      renderLayoutFor('recruiter')

      await waitFor(() => {
        expect(screen.getByText(/Talento|Talent/i)).toBeInTheDocument()
      })
      expect(screen.queryByText(/Plan de estudio|Study plan/i)).not.toBeInTheDocument()
    })
  })
})
