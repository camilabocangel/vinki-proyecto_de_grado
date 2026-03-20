import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore, type User } from '../store/auth.store'
import { api } from '../api/client'

export function useAuth() {
  const { user, isAuthenticated, login, logout, setUser } = useAuthStore()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => api.get<User>('/auth/me'),
    retry: false,
    staleTime: 5 * 60 * 1000,
  })

  useEffect(() => {
    if (data) setUser(data)
  }, [data, setUser])

  const loginMutation = useMutation({
    mutationFn: (credentials: { email: string; password: string }) =>
      api.post<{ user: User }>('/auth/login', credentials),
    onSuccess: (data) => {
      login(data.user)
      queryClient.invalidateQueries({ queryKey: ['auth'] })
    },
  })

  const registerMutation = useMutation({
    mutationFn: (data: { name: string; email: string; password: string }) =>
      api.post<{ user: User }>('/auth/register', data),
    onSuccess: (data) => {
      login(data.user)
      queryClient.invalidateQueries({ queryKey: ['auth'] })
    },
  })

  const logoutMutation = useMutation({
    mutationFn: () => api.post('/auth/logout'),
    onSuccess: () => {
      logout()
      queryClient.clear()
    },
  })

  return {
    user,
    isAuthenticated,
    isLoading,
    login: loginMutation.mutateAsync,
    register: registerMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    loginError: loginMutation.error,
    registerError: registerMutation.error,
  }
}
