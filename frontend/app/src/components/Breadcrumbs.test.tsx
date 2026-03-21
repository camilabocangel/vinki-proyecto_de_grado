import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Breadcrumbs } from './Breadcrumbs'
import '../i18n'

function renderWithRoute(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Breadcrumbs />
    </MemoryRouter>,
  )
}

describe('Breadcrumbs', () => {
  it('returns null for single-segment paths', () => {
    const { container } = renderWithRoute('/dashboard')
    expect(container.innerHTML).toBe('')
  })

  it('renders breadcrumbs for nested paths', () => {
    renderWithRoute('/feedback/123')
    expect(screen.getByText('#123')).toBeInTheDocument()
  })

  it('renders home icon as first item', () => {
    renderWithRoute('/interview/new')
    const links = screen.getAllByRole('link')
    expect(links[0]).toHaveAttribute('href', '/dashboard')
  })

  it('shows ID segments with # prefix', () => {
    renderWithRoute('/interview/42')
    expect(screen.getByText('#42')).toBeInTheDocument()
  })
})
