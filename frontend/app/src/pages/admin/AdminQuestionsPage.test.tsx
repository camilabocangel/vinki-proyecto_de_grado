import { render, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { App as AntdApp } from 'antd'
import '../../i18n'
import AdminQuestionsPage from './AdminQuestionsPage'

// AdminQuestionsPage (~639 líneas) cubre la UI del RF-42 (gestión del
// banco de preguntas). Test focal del render inicial + presencia de
// la tabla/lista paginada.

vi.mock('../../api/client', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
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
          <AdminQuestionsPage />
        </AntdApp>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('AdminQuestionsPage — RF-42 (gestión del banco de preguntas)', () => {
  it('should render without crashing while questions query is pending', async () => {
    ;(api.get as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}))

    const { container } = renderPage()

    await waitFor(() => {
      expect(container.querySelector('[class*="ant"]')).toBeTruthy()
    })
  })

  it('should fetch the admin questions endpoint on mount', async () => {
    ;(api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      pageSize: 20,
    })

    renderPage()

    await waitFor(() => {
      const calls = (api.get as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0] as string)
      expect(calls.some((u) => u.includes('admin/questions'))).toBe(true)
    })
  })

  it('should render the table-like structure when the question list resolves', async () => {
    // El page consulta catálogos (languages, levels, skills) además de la
    // lista de preguntas. Devolvemos arrays para los catálogos y el shape
    // paginado para `admin/questions`.
    ;(api.get as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url.includes('admin/questions')) {
        return Promise.resolve({
          data: [
            {
              id: 1,
              questionText: '¿Qué es REST?',
              type: 'open',
              language: { name: 'TS' },
              framework: null,
              level: { name: 'Junior' },
              skill: { name: 'APIs' },
            },
          ],
          total: 1,
          page: 1,
          pageSize: 20,
        })
      }
      // /catalogs/* devuelven arrays.
      return Promise.resolve([])
    })

    const { container } = renderPage()

    await waitFor(() => {
      expect(container.textContent).toContain('REST')
    })
  })
})
