import type React from 'react'

export async function initAxe(ReactLib: typeof React) {
  if (!import.meta.env.DEV) return

  const [{ default: axe }, ReactDOM] = await Promise.all([
    import('@axe-core/react'),
    import('react-dom'),
  ])

  // 1000ms debounce avoids flooding logs while typing.
  axe(ReactLib, ReactDOM, 1000)
}
