// Configuración ESLint dedicada al plugin de seguridad (eslint-plugin-security).
// Se invoca vía `npm run lint:security`.
//
// Se mantiene separada de `eslint.config.mjs` para que las reglas de
// seguridad puedan correrse de forma aislada en CI (job propio) y
// reportar hallazgos sin mezclarse con las reglas de estilo/Prettier.

import security from 'eslint-plugin-security';
import tseslint from 'typescript-eslint';
import tsPlugin from '@typescript-eslint/eslint-plugin';

export default tseslint.config(
  {
    ignores: [
      'node_modules',
      'dist',
      'coverage',
      'prisma/migrations',
      'eslint.config.mjs',
      'eslint.security.config.mjs',
    ],
  },
  {
    // Esta config NO carga las reglas de estilo/TS del lint principal; los
    // comentarios `eslint-disable next-line @typescript-eslint/...` del
    // código se reportarían como "rule not found". Se desactiva el reporte
    // de directivas no usadas para este config.
    linterOptions: {
      reportUnusedDisableDirectives: false,
    },
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 2023,
        sourceType: 'module',
      },
    },
    plugins: {
      security,
      // Plugin registrado (sin reglas activas aquí) para que las directivas
      // `eslint-disable @typescript-eslint/...` del código no se reporten
      // como "rule not found" en este config.
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      ...security.configs.recommended.rules,
    },
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    plugins: { security },
    rules: {
      ...security.configs.recommended.rules,
    },
  },
);
