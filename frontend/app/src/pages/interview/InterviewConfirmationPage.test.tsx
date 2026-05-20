import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { App as AntdApp } from 'antd'
import '../../i18n'
import InterviewConfirmationPage from './InterviewConfirmationPage'

vi.mock('../../api/client', () => ({
  api: { get: vi.fn() },
}))

import { api } from '../../api/client'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

function renderAt(path = '/interview/1/confirmation') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <AntdApp>
          <Routes>
            <Route
              path="/interview/:id/confirmation"
              element={<InterviewConfirmationPage />}
            />
          </Routes>
        </AntdApp>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('InterviewConfirmationPage — RF-11 (finalización)', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    vi.clearAllMocks()
  })

  it('should render the success icon and a primary "go to dashboard" button', () => {
    ;(api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 1,
      evaluationStatus: 'processing',
      mode: 'evaluation',
      questions: [],
      startedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      finishedAt: new Date().toISOString(),
    })

    renderAt()

    // El botón "go to dashboard" siempre se muestra (primary).
    expect(screen.getByRole('button', { name: /dashboard/i })).toBeInTheDocument()
    // El botón "try another interview" también.
    expect(
      screen.getAllByRole('button').some((b) => b.querySelector('.anticon-thunderbolt')),
    ).toBe(true)
  })

  it('should show summary stats (answered/total + duration + status tag) once data loads', async () => {
    ;(api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 1,
      evaluationStatus: 'processing',
      mode: 'evaluation',
      questions: [
        { id: 1, answers: [{ answerText: 'a' }] },
        { id: 2, answers: [{ answerText: null }] },
        { id: 3, answers: [{ answerText: 'b' }] },
      ],
      startedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      finishedAt: new Date().toISOString(),
    })

    renderAt()

    await waitFor(() => {
      expect(screen.getByText('2/3')).toBeInTheDocument()
    })
    expect(screen.getByText(/30 min/)).toBeInTheDocument()
  })

  it('should NOT show "view report" button while evaluation is still processing', async () => {
    ;(api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 1,
      evaluationStatus: 'processing',
      mode: 'evaluation',
      questions: [{ id: 1, answers: [{ answerText: 'a' }] }],
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
    })

    renderAt()

    await waitFor(() => {
      expect(screen.getByText('1/1')).toBeInTheDocument()
    })
    // El eye icon corresponde a "view report"; no debe aparecer.
    expect(
      screen.getAllByRole('button').some((b) => b.querySelector('.anticon-eye')),
    ).toBe(false)
  })

  it('should show "view report" button when evaluationStatus === completed', async () => {
    ;(api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 1,
      evaluationStatus: 'completed',
      mode: 'evaluation',
      questions: [{ id: 1, answers: [{ answerText: 'a' }] }],
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
    })

    renderAt()

    await waitFor(() => {
      expect(
        screen.getAllByRole('button').some((b) => b.querySelector('.anticon-eye')),
      ).toBe(true)
    })
  })

  it('should navigate to /dashboard when the primary button is clicked', async () => {
    ;(api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 1,
      evaluationStatus: 'processing',
      mode: 'evaluation',
      questions: [],
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
    })
    const user = userEvent.setup()
    renderAt()

    await user.click(screen.getByRole('button', { name: /dashboard/i }))

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
  })

  it('should navigate to /interview/new when "try another" is clicked', async () => {
    ;(api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 1,
      evaluationStatus: 'processing',
      mode: 'evaluation',
      questions: [],
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
    })
    const user = userEvent.setup()
    renderAt()

    const buttons = screen.getAllByRole('button')
    const tryAnotherBtn = buttons.find((b) => b.querySelector('.anticon-thunderbolt'))
    if (!tryAnotherBtn) throw new Error('try-another button not found')
    await user.click(tryAnotherBtn)

    expect(mockNavigate).toHaveBeenCalledWith('/interview/new')
  })
})
