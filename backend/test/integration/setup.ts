// Setup global de la suite de integración (cargado por Jest via
// `setupFiles` en jest-integration.config.ts).
//
// Responsabilidades:
//   1. Cargar variables de entorno desde `backend/.env.test`.
//   2. Garantizar que `DATABASE_URL` apunte a la DB de test (5434), NUNCA
//      a la de desarrollo (5433). Si detecta dev URL, aborta el proceso.
//
// Las migraciones de Prisma se aplican fuera de Jest, vía script:
//   docker compose -f docker-compose.test.yml up -d
//   DATABASE_URL=<test_url> node_modules/.bin/prisma migrate deploy
// (Ver `qa/03-pruebas-integracion/como_ejecutar.md`.)
//
// La limpieza entre suites se hace en `db-helpers.ts` (TRUNCATE CASCADE
// en orden inverso de FK). Cada suite invoca `await resetDatabase()` en
// `beforeEach` para mantener idempotencia.

import * as fs from 'fs';
import * as path from 'path';

const envTestPath = path.resolve(__dirname, '..', '..', '.env.test');

if (!fs.existsSync(envTestPath)) {
  throw new Error(
    `[integration setup] backend/.env.test no existe. Créalo o copia ` +
      `desde backend/.env.example. Ruta esperada: ${envTestPath}`,
  );
}

const content = fs.readFileSync(envTestPath, 'utf-8');
for (const rawLine of content.split(/\r?\n/)) {
  const line = rawLine.trim();
  if (!line || line.startsWith('#')) continue;
  const eq = line.indexOf('=');
  if (eq === -1) continue;
  const key = line.slice(0, eq).trim();
  const value = line
    .slice(eq + 1)
    .trim()
    .replace(/^["']|["']$/g, '');
  // Las variables ya presentes en `process.env` (p. ej. desde CI) tienen
  // prioridad sobre el archivo — permite override por flag.
  if (!process.env[key]) {
    process.env[key] = value;
  }
}

// Guardrail: nunca correr la integración contra la DB de desarrollo.
const dbUrl = process.env.DATABASE_URL ?? '';
if (dbUrl.includes(':5433/') || dbUrl.endsWith('/vinki?schema=public')) {
  throw new Error(
    `[integration setup] DATABASE_URL apunta a la base de DESARROLLO ` +
      `(${dbUrl}). Las pruebas de integración deben apuntar a la base de ` +
      `test (puerto 5434, DB "vinki_test"). Detenido por seguridad.`,
  );
}

// Silencia el logger HTTP (nestjs-pino + pino-pretty) en la suite de
// integración — el output de cada request infla los logs de Jest sin
// agregar valor para los asserts.
if (!process.env.LOG_LEVEL) {
  process.env.LOG_LEVEL = 'silent';
}

// Sentinel — se usa en algunos asserts para verificar que el setup corrió.
process.env.INTEGRATION_SETUP_LOADED = '1';
