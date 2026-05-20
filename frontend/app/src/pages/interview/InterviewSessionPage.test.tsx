import { render, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { App as AntdApp } from 'antd'
import '../../i18n'
import InterviewSessionPage from './InterviewSessionPage'

// La InterviewSessionPage es uno de los componentes más complejos
// (~690 líneas). Test focal: render inicial sin crash + fetch de la
// entrevista por ID. Las interacciones (timer, submit answer, follow-up,
// modo práctica con evaluación inmediata, audio) se cubren con E2E.

vi.mock('../../api/client', () => ({
  api: { get: vi.fn(), post: vi.fn() },
}))

import { api } from '../../api/client'

// Mock Monaco editor del CodeEditor (transitivo).
vi.mock('@monaco-editor/react', () => ({
  default: ({ value, onChange }: { value?: string; onChange?: (v: string | undefined) => void }) => (
    <textarea
      data-testid="monaco-editor-mock"
      value={value ?? ''}
      onChange={(e) => onChange?.(e.target.value)}
    />
  ),
}))

function renderSessionAt(path: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <AntdApp>
          <Routes>
            <Route path="/interview/:id" element={<InterviewSessionPage />} />
          </Routes>
        </AntdApp>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('InterviewSessionPage — RF-10–RF-18 (smoke focal)', () => {
  it('should render without crashing while the interview query is pending', async () => {
    ;(api.get as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}))

    const { container } = renderSessionAt('/interview/1')

    // Verifica que el árbol React se montó (existe algún wrapper antd).
    await waitFor(() => {
      expect(container.querySelector('[class*="ant"]')).toBeTruthy()
    })
  })

  it('should fetch /interviews/:id when mounted (RF-10/RF-13)', async () => {
    ;(api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 1,
      mode: 'evaluation',
      finishedAt: null,
      questions: [
        {
          id: 10,
          orderNumber: 1,
          questionTextSnapshot: '¿Qué es REST?',
          answers: [],
          question: { source: null },
        },
      ],
    })

    renderSessionAt('/interview/1')

    await waitFor(() => {
      const calls = (api.get as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0] as string)
      expect(calls.some((u) => u.includes('/interviews/1'))).toBe(true)
    })
  })

  it('should render the question text snapshot once the interview loads', async () => {
    ;(api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 1,
      mode: 'evaluation',
      finishedAt: null,
      questions: [
        {
          id: 10,
          orderNumber: 1,
          questionTextSnapshot: '¿Qué es la inyección de dependencias?',
          answers: [],
          question: { source: null },
        },
      ],
    })

    const { container } = renderSessionAt('/interview/1')

    await waitFor(() => {
      expect(container.textContent).toContain('inyección de dependencias')
    })
  })
})
