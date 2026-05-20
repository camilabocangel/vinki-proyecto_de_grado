import type { Config } from 'jest';

// Configuración de Jest para la SUITE DE INTEGRACIÓN (Fase 3 — QA).
// Aislada de la config unitaria (`backend/package.json` `jest` block):
//   - rootDir distinto (apunta al directorio de integración)
//   - testRegex restringido a `*.integration.spec.ts` y `*.spec.ts` bajo
//     `test/integration/`
//   - timeout extendido a 30 s (queries reales, networking, NestJS bootstrap)
//   - maxWorkers: 1 — evita race conditions en la DB compartida
//   - setupFiles: carga `.env.test` y prepara el cliente Prisma antes de
//     cualquier suite

const config: Config = {
  rootDir: '../..',
  testEnvironment: 'node',
  preset: undefined,
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  moduleFileExtensions: ['js', 'json', 'ts'],
  moduleNameMapper: {
    // Mismo mapper que la suite unitaria — permite importar con `.js`
    // las rutas relativas del código de producción (NestJS strict ESM-ish).
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  // `uuid` v13 publica únicamente ESM (`export { default as ... }`). Jest
  // ignora `node_modules` por defecto; debemos pedirle que SÍ lo transforme.
  // Patrón Windows-friendly (acepta `\\` o `/`). En unitarias usamos
  // `jest.mock('uuid', ...)` por test (NT-003); en integración queremos
  // uuids reales para los JWT `jti`.
  transformIgnorePatterns: ['node_modules[\\\\/](?!uuid)'],
  testRegex: ['/test/integration/.*\\.(spec|integration\\.spec)\\.ts$'],
  testTimeout: 30_000,
  maxWorkers: 1,
  workerIdleMemoryLimit: '512MB',
  setupFiles: ['<rootDir>/test/integration/setup.ts'],
  // No coverage en integración por defecto: el objetivo es validar
  // comportamiento E2E, no porcentaje de líneas. Se puede activar con
  // `--coverage` si se quiere medir cobertura combinada en un job dedicado.
};

export default config;
