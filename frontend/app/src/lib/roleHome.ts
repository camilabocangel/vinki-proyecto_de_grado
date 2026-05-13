import type { User } from '../store/auth.store'

export function getRoleHome(role: User['role'] | undefined): string {
  switch (role) {
    case 'admin':
      return '/admin/analytics'
    case 'recruiter':
      return '/recruiter'
    default:
      return '/dashboard'
  }
}
