import { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { App as AntdApp } from 'antd'
import '../i18n'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
})

export function TestWrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AntdApp>{children}</AntdApp>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
