import { renderHook, act } from '@testing-library/react'
import { useThemeState } from './useTheme'

describe('useThemeState', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
  })

  it('defaults to light theme', () => {
    const { result } = renderHook(() => useThemeState())
    expect(result.current.isDark).toBe(false)
  })

  it('toggles theme', () => {
    const { result } = renderHook(() => useThemeState())
    act(() => result.current.toggle())
    expect(result.current.isDark).toBe(true)
    expect(localStorage.getItem('vinki-theme')).toBe('dark')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('reads saved theme from localStorage', () => {
    localStorage.setItem('vinki-theme', 'dark')
    const { result } = renderHook(() => useThemeState())
    expect(result.current.isDark).toBe(true)
  })

  it('toggles back to light', () => {
    const { result } = renderHook(() => useThemeState())
    act(() => result.current.toggle())
    expect(result.current.isDark).toBe(true)
    act(() => result.current.toggle())
    expect(result.current.isDark).toBe(false)
    expect(localStorage.getItem('vinki-theme')).toBe('light')
  })
})
