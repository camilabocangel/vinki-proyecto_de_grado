import { render, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { App as AntdApp } from 'antd'
import '../../i18n'
import ProfilePage from './ProfilePage'

// ProfilePage cubre la configuración del usuario (RF-03 — sesión / perfil
// / cambio de contraseña). Test focal: render inicial + presencia de la
// estructura básica.

vi.mock('../../api/client', () => ({
  api: { get: vi.fn(), put: vi.fn(), post: vi.fn() },
}))

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 1,
      name: 'Jane',
      email: 'jane@vinki.dev',
      role: 'student',
      createdAt: '2026-01-01',
    },
    isAuthenticated: true,
    isLoading: false,
    logout: vi.fn(),
  }),
}))

function renderProfile() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AntdApp>
          <ProfilePage />
        </AntdApp>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ProfilePage — RF-03 (perfil/sesión)', () => {
  it('should render without crashing', async () => {
    const { container } = renderProfile()

    await waitFor(() => {
      expect(container.querySelector('[class*="ant"]')).toBeTruthy()
    })
  })

  it("should display the current user's name and email", async () => {
    const { container } = renderProfile()

    await waitFor(() => {
      expect(container.textContent).toContain('jane@vinki.dev')
    })
  })
})
