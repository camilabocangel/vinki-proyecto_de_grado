import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore, type User } from '../store/auth.store'
import { api } from '../api/client'

async function fetchMe(): Promise<User> {
  try {
    return await api.get<User>('/auth/me')
  } catch {
    // If access_token expired, try refresh first
    try {
      await api.post('/auth/refresh')
      return await api.get<User>('/auth/me')
    } catch {
      throw new Error('Not authenticated')
    }
  }
}

export function useAuth() {
  const { login, logout, setUser } = useAuthStore()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: fetchMe,
    retry: false,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  })

  // Sync query data to Zustand store (for use outside React Query context)
  useEffect(() => {
    if (data) setUser(data)
  }, [data, setUser])

  // Derive auth state directly from query data — no useEffect lag
  const user = data ?? null
  const isAuthenticated = !!data

  const loginMutation = useMutation({
    mutationFn: (credentials: { email: string; password: string }) =>
      api.post<{ user: User }>('/auth/login', credentials),
    onSuccess: (result) => {
      login(result.user)
      queryClient.invalidateQueries({ queryKey: ['auth'] })
    },
  })

  const registerMutation = useMutation({
    mutationFn: (input: { name: string; email: string; password: string }) =>
      api.post<{ user: User }>('/auth/register', input),
    onSuccess: (result) => {
      login(result.user)
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
