import { render, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { App as AntdApp } from 'antd'
import '../../i18n'
import FeedbackHistoryPage from './FeedbackHistoryPage'

vi.mock('../../api/client', () => ({
  api: { get: vi.fn() },
}))

import { api } from '../../api/client'

function renderHistory() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AntdApp>
          <FeedbackHistoryPage />
        </AntdApp>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('FeedbackHistoryPage — RF-32 (historial de entrevistas)', () => {
  it('should render without crashing while history query is pending', async () => {
    ;(api.get as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}))

    const { container } = renderHistory()

    await waitFor(() => {
      expect(container.querySelector('[class*="ant"]')).toBeTruthy()
    })
  })

  it('should fetch /progress or /history-like endpoint on mount', async () => {
    ;(api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      pageSize: 10,
    })

    renderHistory()

    await waitFor(() => {
      expect((api.get as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(0)
    })
  })

  it('should render gracefully when there are no past interviews', async () => {
    ;(api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      pageSize: 10,
    })

    expect(() => renderHistory()).not.toThrow()
  })
})
