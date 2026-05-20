import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import { useAuth } from './useAuth'
import { useAuthStore } from '../store/auth.store'

// Mock del cliente HTTP — sin llamadas reales al backend.
vi.mock('../api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

import { api } from '../api/client'

// `userEvent` no se usa aquí (es un hook); RTL hooks bastan.

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

const studentUser = {
  id: 1,
  name: 'Test Student',
  email: 'student@vinki.dev',
  role: 'student' as const,
  createdAt: '2026-01-01',
}

describe('useAuth — fetchMe flow (RF-02 / RF-03)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset del store de Zustand entre tests.
    useAuthStore.setState({ user: null, isAuthenticated: false })
  })

  it('should expose the user and isAuthenticated=true when /auth/me succeeds', async () => {
    ;(api.get as ReturnType<typeof vi.fn>).mockResolvedValue(studentUser)

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() })

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true)
    })
    expect(result.current.user).toEqual(studentUser)
    expect(api.get).toHaveBeenCalledWith('/auth/me')
  })

  it('should attempt /auth/refresh + retry /auth/me when initial /auth/me fails', async () => {
    ;(api.get as ReturnType<typeof vi.fn>)
      .mockRejectedValueOnce(new Error('401'))
      .mockResolvedValueOnce(studentUser)
    ;(api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined)

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() })

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true)
    })
    expect(api.post).toHaveBeenCalledWith('/auth/refresh')
    expect(api.get).toHaveBeenCalledTimes(2)
  })

  it('should expose user=null and isAuthenticated=false when both /auth/me and /auth/refresh fail', async () => {
    ;(api.get as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('401'))
    ;(api.post as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('401'))

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeNull()
  })
})

describe('useAuth — login mutation (RF-02)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({ user: null, isAuthenticated: false })
  })

  it('should POST credentials to /auth/login and update the store on success', async () => {
    ;(api.get as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('401'))
    ;(api.post as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url === '/auth/login') return Promise.resolve({ user: studentUser })
      return Promise.reject(new Error('401'))
    })

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() })

    await act(async () => {
      await result.current.login({ email: 'student@vinki.dev', password: 'password123' })
    })

    expect(api.post).toHaveBeenCalledWith('/auth/login', {
      email: 'student@vinki.dev',
      password: 'password123',
    })
    // El store de Zustand recibe el usuario.
    expect(useAuthStore.getState().user).toEqual(studentUser)
    expect(useAuthStore.getState().isAuthenticated).toBe(true)
  })

  it('should expose loginError when /auth/login rejects', async () => {
    ;(api.get as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('401'))
    const loginErr = new Error('Invalid credentials')
    ;(api.post as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url === '/auth/login') return Promise.reject(loginErr)
      return Promise.reject(new Error('401'))
    })

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() })

    await act(async () => {
      try {
        await result.current.login({ email: 'x@x.com', password: 'bad' })
      } catch {
        /* expected */
      }
    })

    await waitFor(() => {
      expect(result.current.loginError).toBe(loginErr)
    })
  })
})

describe('useAuth — register mutation (RF-01)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({ user: null, isAuthenticated: false })
  })

  it('should POST to /auth/register and update the store on success', async () => {
    ;(api.get as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('401'))
    ;(api.post as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url === '/auth/register') return Promise.resolve({ user: studentUser })
      return Promise.reject(new Error('401'))
    })

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() })

    await act(async () => {
      await result.current.register({
        name: 'Test',
        email: 'student@vinki.dev',
        password: 'password123',
      })
    })

    expect(api.post).toHaveBeenCalledWith('/auth/register', {
      name: 'Test',
      email: 'student@vinki.dev',
      password: 'password123',
    })
    expect(useAuthStore.getState().user).toEqual(studentUser)
  })
})

describe('useAuth — logout mutation (RF-03)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({ user: studentUser, isAuthenticated: true })
  })

  it('should POST to /auth/logout and clear the store', async () => {
    // 1ª llamada a /auth/me devuelve user (login simulado). Tras logout,
    // queryClient.clear() refetchea; las siguientes llamadas fallan,
    // simulando cookie inválida → el useEffect del hook NO repobla el
    // store (porque data queda undefined).
    ;(api.get as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(studentUser)
      .mockRejectedValue(new Error('401'))
    ;(api.post as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url === '/auth/logout') return Promise.resolve(undefined)
      return Promise.reject(new Error('401')) // /auth/refresh tras clear
    })

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() })

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true)
    })

    await act(async () => {
      await result.current.logout()
    })

    expect(api.post).toHaveBeenCalledWith('/auth/logout')
    await waitFor(() => {
      expect(useAuthStore.getState().user).toBeNull()
      expect(useAuthStore.getState().isAuthenticated).toBe(false)
    })
  })
})
