import { useEffect } from 'react'

export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} | Vinki` : 'Vinki'
    return () => {
      document.title = 'Vinki'
    }
  }, [title])
}
