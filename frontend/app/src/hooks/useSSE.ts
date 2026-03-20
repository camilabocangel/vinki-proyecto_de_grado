import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { App } from 'antd'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

export function useSSE() {
  const queryClient = useQueryClient()
  const { notification } = App.useApp()
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    const es = new EventSource(`${API_URL}/notifications/stream`, {
      withCredentials: true,
    })

    es.addEventListener('evaluation.completed', (event) => {
      const data = JSON.parse(event.data)
      notification.success({
        message: '¡Evaluación completada!',
        description: data.message,
        placement: 'topRight',
      })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['interview'] })
    })

    es.addEventListener('evaluation.failed', (event) => {
      const data = JSON.parse(event.data)
      notification.error({
        message: 'Error en evaluación',
        description: data.message,
        placement: 'topRight',
      })
    })

    eventSourceRef.current = es

    return () => {
      es.close()
    }
  }, [queryClient, notification])

  return {
    close: () => eventSourceRef.current?.close(),
  }
}
