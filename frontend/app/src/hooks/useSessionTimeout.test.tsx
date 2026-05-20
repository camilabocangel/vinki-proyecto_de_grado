import { renderHook, act } from '@testing-library/react'
import { useSessionTimeout } from './useSessionTimeout'

// Mock del cliente HTTP — sin llamadas reales para el refresh silencioso.
vi.mock('../api/client', () => ({
  api: {
    post: vi.fn(),
  },
}))

import { api } from '../api/client'

describe('useSessionTimeout — RF-03 gestión de sesión', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return showWarning=false initially when authenticated', () => {
    const { result } = renderHook(() => useSessionTimeout(true))

    expect(result.current.showWarning).toBe(false)
  })

  it('should NOT install listeners or polling when isAuthenticated=false', () => {
    const addSpy = vi.spyOn(window, 'addEventListener')
    renderHook(() => useSessionTimeout(false))

    // El effect retorna temprano cuando no hay autenticación.
    expect(addSpy).not.toHaveBeenCalledWith('click', expect.any(Function))
    expect(addSpy).not.toHaveBeenCalledWith('keydown', expect.any(Function))
  })

  it('should attach click/keydown listeners when authenticated', () => {
    const addSpy = vi.spyOn(window, 'addEventListener')
    renderHook(() => useSessionTimeout(true))

    expect(addSpy).toHaveBeenCalledWith('click', expect.any(Function))
    expect(addSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
  })

  it('should remove listeners on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    const { unmount } = renderHook(() => useSessionTimeout(true))

    unmount()

    expect(removeSpy).toHaveBeenCalledWith('click', expect.any(Function))
    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
  })

  it('should expose a dismissWarning function that clears the warning flag', async () => {
    const { result } = renderHook(() => useSessionTimeout(true))

    await act(async () => {
      result.current.dismissWarning()
    })

    expect(result.current.showWarning).toBe(false)
  })

  it('should attempt /auth/refresh when warning window is reached and clear the warning on success', async () => {
    ;(api.post as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)

    const { result } = renderHook(() => useSessionTimeout(true))

    // Forzar el "lastActivity" muy lejos en el pasado para que el intervalo
    // detecte que entró en la ventana de aviso.
    // El hook revisa: elapsed > SESSION_DURATION - WARNING_BEFORE (= 13 min)
    // Avanzamos el reloj 14 min y disparamos un interval (30 s).
    await act(async () => {
      vi.advanceTimersByTime(14 * 60 * 1000)
    })
    await act(async () => {
      vi.advanceTimersByTime(30 * 1000) // dispara el setInterval
      // Resolver microtasks del fetch refresh.
      await Promise.resolve()
    })

    expect(api.post).toHaveBeenCalledWith('/auth/refresh')
    // Refresh OK → warning cleared.
    expect(result.current.showWarning).toBe(false)
  })

  it('should keep the warning visible when /auth/refresh fails', async () => {
    ;(api.post as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('expired'))

    const { result } = renderHook(() => useSessionTimeout(true))

    await act(async () => {
      vi.advanceTimersByTime(14 * 60 * 1000)
    })
    await act(async () => {
      vi.advanceTimersByTime(30 * 1000)
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(api.post).toHaveBeenCalledWith('/auth/refresh')
    // Tras fallo, showWarning queda en true (no se limpia).
    expect(result.current.showWarning).toBe(true)
  })
})
