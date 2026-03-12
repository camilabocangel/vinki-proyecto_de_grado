import { render, screen } from '@testing-library/react'
import App from './App'

describe('App shell', () => {
  it('renders hero copy and metrics', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', {
        name: /simulador de entrevistas técnicas/i,
      }),
    ).toBeInTheDocument()

    expect(screen.getByRole('button', { name: /iniciar simulación/i })).toBeEnabled()
    expect(screen.getAllByText(/Roadmap inmediato|Próximo paso/i).length).toBeGreaterThan(
      0,
    )
  })
})
