import { createContext, useContext, useState, useEffect, useCallback } from 'react'

interface ThemeContextType {
  isDark: boolean
  toggle: () => void
}

export const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  toggle: () => {},
})

export function useThemeState() {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('vinki-theme')
    if (saved) return saved === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
    localStorage.setItem('vinki-theme', isDark ? 'dark' : 'light')
  }, [isDark])

  const toggle = useCallback(() => setIsDark((d) => !d), [])

  return { isDark, toggle }
}

export function useTheme() {
  return useContext(ThemeContext)
}
