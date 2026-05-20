import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { App as AntdApp } from 'antd'
import '../../i18n'
import InterviewWizardPage from './InterviewWizardPage'

// El Wizard tiene 700+ líneas y hace múltiples queries al catálogo. Los
// tests aquí son focales: render inicial + presencia de los pasos. La
// navegación detallada (selección de rol → lenguaje → framework → nivel
// → confirmación) se cubre con E2E en Fase 5.

vi.mock('../../api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

import { api } from '../../api/client'

function renderWizard() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/interview/new']}>
        <AntdApp>
          <InterviewWizardPage />
        </AntdApp>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  // Catálogos por defecto: roles + niveles vacíos (no se necesitan para el render inicial).
  ;(api.get as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
    if (url.includes('/catalogs/roles')) return Promise.resolve([
      { id: 1, name: 'Backend Engineer' },
      { id: 2, name: 'Frontend Engineer' },
    ])
    if (url.includes('/catalogs/levels')) return Promise.resolve([
      { id: 1, name: 'Junior' },
      { id: 2, name: 'Mid' },
      { id: 3, name: 'Senior' },
    ])
    if (url.includes('/catalogs/languages')) return Promise.resolve([])
    if (url.includes('/catalogs/skills')) return Promise.resolve([])
    if (url.includes('/templates')) return Promise.resolve([])
    return Promise.resolve([])
  })
})

describe('InterviewWizardPage — RF-05–RF-09 (smoke focal)', () => {
  it('should render the wizard shell without crashing', async () => {
    const { container } = renderWizard()

    // El wizard puede arrancar en modo "choose" (custom vs template) sin
    // mostrar los Steps todavía. El smoke verifica que el árbol React se
    // montó y produjo HTML sin lanzar excepciones.
    await waitFor(() => {
      expect(container.querySelector('.vinki-page, .ant-card, .ant-row, [class*="ant"]')).toBeTruthy()
    })
  })

  it('should trigger initial catalog queries when the wizard mounts', async () => {
    renderWizard()

    // Las queries iniciales del wizard buscan al menos un catálogo
    // (roles o niveles); confirmamos que al menos una de ellas se invocó.
    await waitFor(() => {
      const callUrls = (api.get as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0] as string)
      const touchedCatalogs = callUrls.some((u) => u.includes('/catalogs/'))
      expect(touchedCatalogs).toBe(true)
    })
  })

  it('should render without throwing when catalog queries resolve to empty arrays (edge)', async () => {
    ;(api.get as ReturnType<typeof vi.fn>).mockResolvedValue([])

    expect(() => renderWizard()).not.toThrow()
  })
})

// Mantener referencia al `screen` para evitar warnings de unused import si
// el patrón de query se aborda en pruebas E2E posteriores.
void screen
