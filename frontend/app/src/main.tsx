import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { ThemeProvider } from './components/ThemeProvider'
import './i18n'
import './styles/global.css'
import './styles/app.css'

if (import.meta.env.DEV) {
  void import('./lib/axe').then(({ initAxe }) => initAxe(React))
}

// Prevent flash of wrong theme
const savedTheme = localStorage.getItem('vinki-theme')
if (
  savedTheme === 'dark' ||
  (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)
) {
  document.documentElement.setAttribute('data-theme', 'dark')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
