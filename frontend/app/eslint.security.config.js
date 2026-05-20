// Configuración ESLint dedicada al plugin de seguridad (eslint-plugin-security).
// Se invoca vía `npm run lint:security`.

import security from 'eslint-plugin-security'
import tseslint from 'typescript-eslint'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import reactHooks from 'eslint-plugin-react-hooks'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores([
    'dist',
    'storybook-static',
    'coverage',
    'node_modules',
    'playwright-report',
    'test-results',
  ]),
  {
    // Esta config NO carga las reglas de estilo/React/A11y del lint
    // principal; los `eslint-disable` que referencian esas reglas
    // (react-hooks/exhaustive-deps, etc.) se reportarían como rule
    // not found. Se desactiva ese reporte.
    linterOptions: {
      reportUnusedDisableDirectives: false,
    },
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 2023,
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      security,
      // Plugins registrados (sin reglas activas) para evitar errores
      // "rule not found" provenientes de directivas eslint-disable del
      // código que referencian reglas de estos plugins.
      '@typescript-eslint': tsPlugin,
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
    },
    rules: {
      ...security.configs.recommended.rules,
    },
  },
  {
    files: ['**/*.{js,jsx,mjs,cjs}'],
    plugins: { security },
    rules: {
      ...security.configs.recommended.rules,
    },
  },
])
