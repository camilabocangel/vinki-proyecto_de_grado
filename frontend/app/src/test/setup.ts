// Setup global de Vitest para el frontend.
// Cargado vía `test.setupFiles` en `vite.config.ts`.

import '@testing-library/jest-dom'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// Cleanup automático del DOM virtual después de cada test.
afterEach(() => {
  cleanup()
})

// matchMedia: jsdom no lo implementa; algunos hooks (theming responsive,
// detección de viewport) lo consultan al montar.
if (!window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  })
}

// IntersectionObserver: usado por componentes con lazy loading u observación
// de visibilidad (carousel del Home, listas paginadas).
class MockIntersectionObserver {
  readonly root = null
  readonly rootMargin = ''
  readonly thresholds: ReadonlyArray<number> = []
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
  takeRecords = vi.fn(() => [] as IntersectionObserverEntry[])
}
if (!('IntersectionObserver' in window)) {
  ;(window as unknown as { IntersectionObserver: typeof IntersectionObserver }).IntersectionObserver =
    MockIntersectionObserver as unknown as typeof IntersectionObserver
}

// ResizeObserver: usado por componentes de Ant Design y Recharts para
// recalcular tamaños al redimensionar.
class MockResizeObserver {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}
if (!('ResizeObserver' in window)) {
  ;(window as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver =
    MockResizeObserver as unknown as typeof ResizeObserver
}
