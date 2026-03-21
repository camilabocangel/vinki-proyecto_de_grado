import { describe, it, expect, vi, beforeEach } from 'vitest'

// We test the rate limit detection logic
describe('API Client', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('throws on 429 rate limit', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        headers: new Headers({ 'retry-after': '60' }),
        json: () => Promise.resolve({ message: 'Too many requests' }),
      }),
    )

    // Dynamic import to get fresh module
    const { api } = await import('./client')
    await expect(api.get('/test')).rejects.toThrow()
  })

  it('throws with message on 4xx errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        headers: new Headers(),
        json: () => Promise.resolve({ message: 'Bad request' }),
      }),
    )

    const { api } = await import('./client')
    await expect(api.get('/test')).rejects.toThrow('Bad request')
  })

  it('returns undefined for 204 responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
        headers: new Headers(),
      }),
    )

    const { api } = await import('./client')
    const result = await api.get('/test')
    expect(result).toBeUndefined()
  })
})
