import { useState, useCallback } from 'react'

export function useRateLimit() {
  const [rateLimited, setRateLimited] = useState(false)
  const [retryIn, setRetryIn] = useState(0)

  const handleError = useCallback((error: Error) => {
    if (error.message.startsWith('RATE_LIMITED:')) {
      const seconds = parseInt(error.message.split(':')[1], 10)
      setRateLimited(true)
      setRetryIn(seconds)
      setTimeout(() => {
        setRateLimited(false)
        setRetryIn(0)
      }, seconds * 1000)
      return true
    }
    return false
  }, [])

  return { rateLimited, retryIn, handleError }
}
