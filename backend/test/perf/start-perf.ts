// Wrapper para arrancar el backend en modo "performance" — Fase 5.
//
// Carga `backend/.env.test` y SOBRESCRIBE las variables relevantes en
// `process.env` ANTES de spawnear `nest start`. Necesario porque
// `ConfigModule.forRoot()` del SUT carga por default `backend/.env`
// (dev URL), y queremos forzar la DB de test + LLM_SANDBOX + límites
// elevados del throttler (D-14).
//
// Uso:  npm run start:perf
// Equivalente a:  npm run start  pero con backend/.env.test activo.
//
// Guardrail: aborta si DATABASE_URL apunta a la DB de DESARROLLO.

import { spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

function loadEnvTest(): Record<string, string> {
  const envPath = path.resolve(__dirname, '..', '..', '.env.test');
  if (!fs.existsSync(envPath)) {
    throw new Error(
      `[start-perf] No existe backend/.env.test en ${envPath}. ` +
        `Asegúrate de tener configurada la DB de test (Fase 3).`,
    );
  }
  const content = fs.readFileSync(envPath, 'utf-8');
  const env: Record<string, string> = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    env[key] = value;
  }
  return env;
}

const testEnv = loadEnvTest();

// Guardrail: nunca arrancar el backend de perf contra la DB de dev.
const dbUrl = testEnv.DATABASE_URL ?? '';
if (dbUrl.includes(':5433/') || dbUrl.endsWith('/vinki?schema=public')) {
  // eslint-disable-next-line no-console
  console.error(
    `[start-perf] DATABASE_URL en .env.test apunta a DESARROLLO ` +
      `(${dbUrl}). El backend de perf debe usar la DB de test ` +
      `(puerto 5434). Aborto por seguridad.`,
  );
  process.exit(1);
}

// eslint-disable-next-line no-console
console.log('[start-perf] arrancando backend con .env.test:');
// eslint-disable-next-line no-console
console.log(`  · PORT=${testEnv.PORT}`);
// eslint-disable-next-line no-console
console.log(`  · LLM_SANDBOX=${testEnv.LLM_SANDBOX}`);
// eslint-disable-next-line no-console
console.log(`  · THROTTLE_SHORT_LIMIT=${testEnv.THROTTLE_SHORT_LIMIT}`);
// eslint-disable-next-line no-console
console.log(`  · THROTTLE_LONG_LIMIT=${testEnv.THROTTLE_LONG_LIMIT}`);

// Spawnea `nest start` con el environment combinado. En Windows el
// binario de nest está en .cmd; usamos `shell: true` para portabilidad.
const child = spawn('nest start', {
  cwd: path.resolve(__dirname, '..', '..'),
  env: { ...process.env, ...testEnv },
  stdio: 'inherit',
  shell: true,
});

child.on('exit', (code) => process.exit(code ?? 0));
process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
