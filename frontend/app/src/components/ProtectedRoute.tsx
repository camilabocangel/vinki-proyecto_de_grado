import { Navigate, Outlet } from 'react-router-dom'
import { Spin } from 'antd'
import { useAuth } from '../hooks/useAuth'

interface ProtectedRouteProps {
  roles?: string[]
}

export function ProtectedRoute({ roles }: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <Spin size="large" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />
  }

  if (roles && user && !roles.includes(user.role)) {
    const fallback = user.role === 'recruiter' ? '/recruiter' : '/dashboard'
    return <Navigate to={fallback} replace />
  }

  return <Outlet />
}
