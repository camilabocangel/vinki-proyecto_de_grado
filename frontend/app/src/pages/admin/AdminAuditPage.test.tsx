import { render, waitFor, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { App as AntdApp } from 'antd'
import '../../i18n'
import AdminAuditPage from './AdminAuditPage'

// AdminAuditPage es la vista admin transversal al RF-42 (auditoría del
// banco de preguntas y otras acciones). Test del render + fetch a
// /admin/audit-logs + render de una entrada de log.

vi.mock('../../api/client', () => ({
  api: { get: vi.fn() },
}))

import { api } from '../../api/client'

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AntdApp>
          <AdminAuditPage />
        </AntdApp>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('AdminAuditPage — auditoría transversal RF-42 / RNF-24', () => {
  it('should fetch /admin/audit-logs on mount with paging params', async () => {
    ;(api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 20,
    })

    renderPage()

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/admin/audit-logs', {
        page: '1',
        limit: '20',
      })
    })
  })

  it('should render an empty state when there are no audit log entries', async () => {
    ;(api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 20,
    })

    const { container } = renderPage()

    await waitFor(() => {
      // antd Table renderiza un placeholder "No data" cuando dataSource está vacío.
      expect(container.querySelector('.ant-empty')).toBeTruthy()
    })
  })

  it('should render audit entries with the user email visible', async () => {
    ;(api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [
        {
          id: 1,
          userId: 7,
          action: 'login',
          entity: 'user',
          entityId: 7,
          details: null,
          createdAt: new Date().toISOString(),
          user: {
            id: 7,
            name: 'Jane Doe',
            email: 'jane@vinki.dev',
            role: 'student',
          },
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    })

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('jane@vinki.dev')).toBeInTheDocument()
    })
    expect(screen.getByText('Jane Doe')).toBeInTheDocument()
  })
})
