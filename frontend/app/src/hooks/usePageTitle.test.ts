import { renderHook } from '@testing-library/react'
import { usePageTitle } from './usePageTitle'

describe('usePageTitle', () => {
  afterEach(() => {
    document.title = 'Vinki'
  })

  it('sets page title with suffix', () => {
    renderHook(() => usePageTitle('Dashboard'))
    expect(document.title).toBe('Dashboard | Vinki')
  })

  it('sets just Vinki when title is empty', () => {
    renderHook(() => usePageTitle(''))
    expect(document.title).toBe('Vinki')
  })

  it('restores title on unmount', () => {
    const { unmount } = renderHook(() => usePageTitle('Test'))
    expect(document.title).toBe('Test | Vinki')
    unmount()
    expect(document.title).toBe('Vinki')
  })
})
