import { render } from '@testing-library/react'
import { TestWrapper } from '../test/test-utils'
import ProgressChart, { type ProgressDataPoint } from './ProgressChart'

// Recharts uses ResizeObserver internally; stub it for jsdom
beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

const sampleData: ProgressDataPoint[] = [
  {
    date: '2026-01-10',
    interviewId: 1,
    technicalCorrectness: 3.5,
    clarityOfExplanation: 4.0,
    communication: 3.8,
    confidence: 3.2,
    problemSolving: 4.1,
    overall: 3.7,
  },
  {
    date: '2026-01-17',
    interviewId: 2,
    technicalCorrectness: 4.0,
    clarityOfExplanation: 4.2,
    communication: 4.0,
    confidence: 3.8,
    problemSolving: 4.3,
    overall: 4.1,
  },
]

describe('ProgressChart', () => {
  it('renders without crashing with valid data', () => {
    const { container } = render(
      <TestWrapper>
        <ProgressChart data={sampleData} />
      </TestWrapper>,
    )

    // Recharts renders an SVG-based chart inside a responsive container
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument()
  })

  it('renders gracefully with empty data', () => {
    const { container } = render(
      <TestWrapper>
        <ProgressChart data={[]} />
      </TestWrapper>,
    )

    // Should still render the container without errors
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument()
  })
})
