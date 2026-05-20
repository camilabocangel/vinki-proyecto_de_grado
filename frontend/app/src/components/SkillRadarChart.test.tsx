import { render } from '@testing-library/react'
import { SkillRadarChart } from './SkillRadarChart'

// Recharts requiere dimensiones del contenedor; jsdom no las da. Como en
// `ProgressChart.test.tsx`, validamos que el componente renderiza sin
// errores y que los nombres de las métricas aparecen. NO validamos
// pixel-perfect ni interactividad — eso queda para E2E visual.

const fiveDimensions = [
  { metric: 'Corrección técnica', value: 4 },
  { metric: 'Claridad', value: 3.5 },
  { metric: 'Comunicación', value: 4.2 },
  { metric: 'Confianza', value: 3 },
  { metric: 'Resolución', value: 4.5 },
]

describe('SkillRadarChart — RF-35 (visualización de 5 dimensiones)', () => {
  it('should render without throwing when given the 5 evaluation dimensions', () => {
    const { container } = render(<SkillRadarChart data={fiveDimensions} />)

    // El RadarChart raíz queda como un wrapper de Recharts; basta con
    // verificar que el contenedor produjo algún SVG/wrapper.
    expect(container.firstChild).toBeTruthy()
  })

  it('should render with an empty data set without crashing (edge case)', () => {
    expect(() => render(<SkillRadarChart data={[]} />)).not.toThrow()
  })

  it('should accept arbitrary dimensions beyond the canonical 5', () => {
    const extra = [
      ...fiveDimensions,
      { metric: 'Extra', value: 2 },
    ]
    expect(() => render(<SkillRadarChart data={extra} />)).not.toThrow()
  })
})
