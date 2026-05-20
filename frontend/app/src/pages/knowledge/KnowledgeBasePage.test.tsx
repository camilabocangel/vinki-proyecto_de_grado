import { render, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { App as AntdApp } from 'antd'
import '../../i18n'
import KnowledgeBasePage from './KnowledgeBasePage'

// KnowledgeBasePage cubre la UI de RF-29 a RF-31 (RAG: ingesta y búsqueda
// semántica). Test focal del render inicial sin crash + fetch del listado
// de documentos.

vi.mock('../../api/client', () => ({
  api: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
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
          <KnowledgeBasePage />
        </AntdApp>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('KnowledgeBasePage — RF-29 / RF-30 / RF-31 (smoke focal)', () => {
  it('should render without crashing while documents query is pending', async () => {
    ;(api.get as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}))

    const { container } = renderPage()

    await waitFor(() => {
      expect(container.querySelector('[class*="ant"]')).toBeTruthy()
    })
  })

  it('should fetch /knowledge endpoint on mount', async () => {
    ;(api.get as ReturnType<typeof vi.fn>).mockResolvedValue([])

    renderPage()

    await waitFor(() => {
      const calls = (api.get as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0] as string)
      expect(calls.some((u) => u.includes('/knowledge'))).toBe(true)
    })
  })

  it('should render gracefully when the knowledge base is empty', async () => {
    ;(api.get as ReturnType<typeof vi.fn>).mockResolvedValue([])

    expect(() => renderPage()).not.toThrow()
  })
})
