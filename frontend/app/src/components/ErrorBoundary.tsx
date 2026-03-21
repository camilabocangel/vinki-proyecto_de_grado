import { Component, type ReactNode } from 'react'
import { Button, Result } from 'antd'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            background: 'var(--color-bg)',
          }}
        >
          <Result
            status="500"
            title="Oops!"
            subTitle="Algo salió mal. Intenta recargar la página."
            extra={
              <Button type="primary" onClick={() => window.location.reload()}>
                Recargar
              </Button>
            }
          />
        </div>
      )
    }
    return this.props.children
  }
}
