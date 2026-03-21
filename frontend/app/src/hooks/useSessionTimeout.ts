import { useEffect, useRef, useState } from 'react'
import { api } from '../api/client'

const SESSION_DURATION = 15 * 60 * 1000 // 15 min
const WARNING_BEFORE = 2 * 60 * 1000 // 2 min before expiry

export function useSessionTimeout(isAuthenticated: boolean) {
  const lastActivityRef = useRef(0)
  const [showWarning, setShowWarning] = useState(false)

  useEffect(() => {
    lastActivityRef.current = Date.now()
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return

    const updateActivity = () => {
      lastActivityRef.current = Date.now()
    }

    window.addEventListener('click', updateActivity)
    window.addEventListener('keydown', updateActivity)

    const interval = setInterval(async () => {
      const elapsed = Date.now() - lastActivityRef.current
      if (elapsed > SESSION_DURATION - WARNING_BEFORE && !showWarning) {
        setShowWarning(true)
        try {
          await api.post('/auth/refresh')
          lastActivityRef.current = Date.now()
          setShowWarning(false)
        } catch {
          // Refresh failed, will redirect on next API call
        }
      }
    }, 30000) // Check every 30s

    return () => {
      window.removeEventListener('click', updateActivity)
      window.removeEventListener('keydown', updateActivity)
      clearInterval(interval)
    }
  }, [isAuthenticated, showWarning])

  return { showWarning, dismissWarning: () => setShowWarning(false) }
}
