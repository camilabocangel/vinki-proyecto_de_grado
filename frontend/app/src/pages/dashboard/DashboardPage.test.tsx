import { render, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { App as AntdApp } from 'antd'
import '../../i18n'
import DashboardPage from './DashboardPage'

// DashboardPage es uno de los archivos más grandes (~771 líneas) — tests
// focales. Cubren render inicial sin errores. Interacciones específicas
// (filtros, exports) corresponden a E2E.

vi.mock('../../api/client', () => ({
  api: { get: vi.fn() },
}))

// `useSSE` depende de la API `EventSource` (no presente en jsdom). El hook
// está diferido por D-7 y no se testea aquí; lo mockeamos a un noop para
// evitar el ReferenceError al montar el dashboard.
vi.mock('../../hooks/useSSE', () => ({
  useSSE: () => undefined,
  default: () => undefined,
}))

import { api } from '../../api/client'

function renderDashboard() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AntdApp>
          <DashboardPage />
        </AntdApp>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('DashboardPage — RF-32 / RF-34 (smoke focal)', () => {
  it('should render without crashing while queries are pending', async () => {
    ;(api.get as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}))

    const { container } = renderDashboard()

    await waitFor(() => {
      expect(container.querySelector('[class*="ant"]')).toBeTruthy()
    })
  })

  it('should fetch dashboard data on mount', async () => {
    ;(api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      stats: { totalInterviews: 0, averageScore: 0, pendingEvaluations: 0 },
      skills: [],
      recentInterviews: [],
    })

    renderDashboard()

    await waitFor(() => {
      expect((api.get as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(0)
    })
  })

  it('should render gracefully with empty data (no interviews yet)', async () => {
    ;(api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      stats: { totalInterviews: 0, averageScore: 0, pendingEvaluations: 0 },
      skills: [],
      recentInterviews: [],
    })

    expect(() => renderDashboard()).not.toThrow()
  })
})
