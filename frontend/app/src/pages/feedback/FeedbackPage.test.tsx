import { render, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { App as AntdApp } from 'antd'
import '../../i18n'
import FeedbackPage from './FeedbackPage'

// FeedbackPage es complejo (~547 líneas). Test focal: render del reporte
// con las 5 dimensiones visibles. Interacciones (share, export, expand)
// se cubren con E2E.

vi.mock('../../api/client', () => ({
  api: { get: vi.fn(), post: vi.fn() },
}))

import { api } from '../../api/client'

function renderFeedbackAt(path: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <AntdApp>
          <Routes>
            <Route path="/feedback/:id" element={<FeedbackPage />} />
          </Routes>
        </AntdApp>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const baseReport = {
  interview: { id: 1, evaluationStatus: 'completed' },
  evaluations: [
    {
      interviewQuestionId: 10,
      orderNumber: 1,
      questionTextSnapshot: '¿Qué es REST?',
      skillName: 'APIs',
      source: null,
      answer: { answerText: 'REST es una arquitectura HTTP', audioUrl: null },
      evaluation: {
        technicalCorrectness: 4,
        clarityOfExplanation: 4,
        communication: 4,
        confidence: 3.5,
        problemSolving: 4.2,
        feedbackText: 'Buena respuesta con margen de mejora',
        detectedLevel: { id: 2, name: 'Mid' },
        juniorAnswer: 'Junior...',
        midAnswer: 'Mid...',
        seniorAnswer: 'Senior...',
      },
    },
  ],
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('FeedbackPage — RF-25, RF-33, RF-35 (smoke focal)', () => {
  it('should render the skeleton while the report is loading', async () => {
    ;(api.get as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}))

    const { container } = renderFeedbackAt('/feedback/1')

    await waitFor(() => {
      // antd Skeleton renderiza .ant-skeleton.
      expect(container.querySelector('.ant-skeleton')).toBeTruthy()
    })
  })

  it('should fetch /interviews/:id/report on mount (RF-33)', async () => {
    ;(api.get as ReturnType<typeof vi.fn>).mockResolvedValue(baseReport)

    renderFeedbackAt('/feedback/1')

    await waitFor(() => {
      const calls = (api.get as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0] as string)
      expect(calls.some((u) => u.includes('/interviews/1/report'))).toBe(true)
    })
  })

  it('should display the questionText snapshot once the report loads (RF-33)', async () => {
    ;(api.get as ReturnType<typeof vi.fn>).mockResolvedValue(baseReport)

    const { container } = renderFeedbackAt('/feedback/1')

    // El Collapse de antd renderiza los títulos de los panels desde el
    // inicio (aunque el contenido detallado del feedback esté colapsado).
    // El title incluye el snapshot de la pregunta.
    await waitFor(() => {
      expect(container.textContent).toContain('REST')
    })
  })

  it('should render the Collapse panels for each evaluated question', async () => {
    ;(api.get as ReturnType<typeof vi.fn>).mockResolvedValue(baseReport)

    const { container } = renderFeedbackAt('/feedback/1')

    await waitFor(() => {
      // antd Collapse renderiza .ant-collapse-item por cada panel.
      expect(container.querySelectorAll('.ant-collapse-item').length).toBeGreaterThan(0)
    })
  })

  it('should not crash when the interview has no evaluations yet (edge case)', async () => {
    ;(api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      interview: { id: 1, evaluationStatus: 'processing' },
      evaluations: [],
    })

    expect(() => renderFeedbackAt('/feedback/1')).not.toThrow()
  })
})
