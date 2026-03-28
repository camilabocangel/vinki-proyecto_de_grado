import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'
import { defineConfig, globalIgnores } from 'eslint/config'

const a11yRules = jsxA11y.configs.recommended.rules

export default defineConfig([
  globalIgnores(['dist', 'storybook-static']),
  ...tseslint.config({
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      prettier,
    ],
    languageOptions: {
      ecmaVersion: 2023,
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      'jsx-a11y': jsxA11y,
    },
    rules: {
      ...a11yRules,
      'jsx-a11y/no-autofocus': 'warn',
      'jsx-a11y/anchor-is-valid': 'warn',
      'react-refresh/only-export-components': ['error', { allowConstantExport: true }],
    },
  }),
  {
    files: ['src/**/*.stories.@(ts|tsx|mdx)'],
    rules: {
      'jsx-a11y/heading-has-content': 'off',
    },
  },
])
