import { useAuthStore, type User } from './auth.store'

const userFixture: User = {
  id: 1,
  name: 'Test',
  email: 'test@vinki.dev',
  role: 'student',
  createdAt: '2026-01-01',
}

describe('useAuthStore — Zustand store de sesión (RF-03)', () => {
  beforeEach(() => {
    // Estado inicial entre tests.
    useAuthStore.setState({ user: null, isAuthenticated: false })
  })

  it('should start with user=null and isAuthenticated=false', () => {
    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.isAuthenticated).toBe(false)
  })

  describe('setUser()', () => {
    it('should set the user and derive isAuthenticated=true when a user is passed', () => {
      useAuthStore.getState().setUser(userFixture)

      const state = useAuthStore.getState()
      expect(state.user).toEqual(userFixture)
      expect(state.isAuthenticated).toBe(true)
    })

    it('should clear the user and set isAuthenticated=false when null is passed', () => {
      useAuthStore.setState({ user: userFixture, isAuthenticated: true })

      useAuthStore.getState().setUser(null)

      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
      expect(state.isAuthenticated).toBe(false)
    })
  })

  describe('login()', () => {
    it('should put the user in the store and mark as authenticated', () => {
      useAuthStore.getState().login(userFixture)

      const state = useAuthStore.getState()
      expect(state.user).toEqual(userFixture)
      expect(state.isAuthenticated).toBe(true)
    })
  })

  describe('logout()', () => {
    it('should clear the user and authentication flag', () => {
      useAuthStore.setState({ user: userFixture, isAuthenticated: true })

      useAuthStore.getState().logout()

      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
      expect(state.isAuthenticated).toBe(false)
    })
  })
})
