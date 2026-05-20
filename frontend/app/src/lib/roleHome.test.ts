import { getRoleHome } from './roleHome'

// getRoleHome es la pieza centralizada del redirect post-login por rol.
// Fuente de verdad: si esto rompe, login, ProtectedRoute, HomePage y
// NotFoundPage redirigen mal. Cubre los 4 caminos posibles.

describe('getRoleHome (lib/roleHome) — redirect post-login por rol', () => {
  it('should route admin to /admin/analytics', () => {
    expect(getRoleHome('admin')).toBe('/admin/analytics')
  })

  it('should route recruiter to /recruiter', () => {
    expect(getRoleHome('recruiter')).toBe('/recruiter')
  })

  it('should route student to /dashboard', () => {
    expect(getRoleHome('student')).toBe('/dashboard')
  })

  it('should route undefined role to /dashboard (safe default)', () => {
    expect(getRoleHome(undefined)).toBe('/dashboard')
  })
})
