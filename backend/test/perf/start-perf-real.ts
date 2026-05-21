// Wrapper para arrancar el backend en modo "performance + LLM REAL"
// (Fase 5-A — Escenario 4, RNF-01 medición end-to-end real con OpenAI).
//
// Diferencia vs `start-perf.ts`:
//   · Carga `backend/.env.test` igual que el wrapper mock (DB de test
//     puerto 5434, throttle elevado, PORT=3002, NODE_ENV=test).
//   · SOBRESCRIBE `LLM_SANDBOX=false` y los providers reales para que
//     el `EvaluationModule` instancie `OpenaiEvaluatorService` en lugar
//     de `MockEvaluatorService`.
//   · Toma `OPENAI_API_KEY` desde `backend/.env` (la única fuente que
//     tiene una key real con saldo). Si la key del archivo de dev es la
//     mock-key (`mock-key`, `sk-test`, ...), aborta con mensaje claro.
//
// Uso:  npm run start:perf:real
//
// Guardrails:
//   - DATABASE_URL debe seguir apuntando a la DB de test (puerto 5434).
//   - OPENAI_API_KEY debe ser una clave real (heurística: empieza por
//     `sk-` y tiene al menos 30 caracteres).
//
// IMPORTANTE: este wrapper consume tokens reales. Úsalo ÚNICAMENTE para
// el Escenario 4 (D-15) — 20 muestras con baja concurrencia. Para todo
// lo demás, usa `npm run start:perf` (mock).

import { spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

function parseEnvFile(absPath: string): Record<string, string> {
  const env: Record<string, string> = {};
  if (!fs.existsSync(absPath)) return env;
  const content = fs.readFileSync(absPath, 'utf-8');
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

const backendRoot = path.resolve(__dirname, '..', '..');
const testEnvPath = path.join(backendRoot, '.env.test');
const devEnvPath = path.join(backendRoot, '.env');

const testEnv = parseEnvFile(testEnvPath);
if (!testEnv.DATABASE_URL) {
  // eslint-disable-next-line no-console
  console.error(
    `[start-perf-real] No existe backend/.env.test o está vacío en ${testEnvPath}. ` +
      `Asegúrate de tener configurada la DB de test (Fase 3).`,
  );
  process.exit(1);
}

const devEnv = parseEnvFile(devEnvPath);
const realKey = devEnv.OPENAI_API_KEY ?? '';
if (!realKey || !realKey.startsWith('sk-') || realKey.length < 30) {
  // eslint-disable-next-line no-console
  console.error(
    `[start-perf-real] backend/.env no contiene una OPENAI_API_KEY real ` +
      `(empezando por "sk-" y de longitud >= 30). Sin clave real este ` +
      `wrapper no tiene sentido — usa npm run start:perf (mock) para todo ` +
      `lo demás. Aborto.`,
  );
  process.exit(1);
}

// Construir el environment para el proceso hijo: base = .env.test,
// override = providers reales + key real. NO se imprime la key.
const childEnv: Record<string, string> = {
  ...process.env,
  ...testEnv,
  LLM_SANDBOX: 'false',
  LLM_TEXT_PROVIDER: 'openai',
  LLM_EMBEDDING_PROVIDER: 'openai',
  OPENAI_API_KEY: realKey,
} as Record<string, string>;

// Guardrail: NUNCA arrancar contra la DB de dev incluso si alguien
// modificara .env.test.
const dbUrl = childEnv.DATABASE_URL ?? '';
if (dbUrl.includes(':5433/') || dbUrl.endsWith('/vinki?schema=public')) {
  // eslint-disable-next-line no-console
  console.error(
    `[start-perf-real] DATABASE_URL apunta a DESARROLLO (${dbUrl}). ` +
      `El backend de perf debe usar la DB de test (puerto 5434). Aborto.`,
  );
  process.exit(1);
}

// Banner sin exponer la key (solo el prefijo).
const keyPrefix = realKey.slice(0, 8) + '...';
// eslint-disable-next-line no-console
console.log('[start-perf-real] arrancando backend con LLM REAL:');
// eslint-disable-next-line no-console
console.log(`  · PORT=${childEnv.PORT}`);
// eslint-disable-next-line no-console
console.log(`  · LLM_SANDBOX=${childEnv.LLM_SANDBOX}`);
// eslint-disable-next-line no-console
console.log(`  · LLM_TEXT_PROVIDER=${childEnv.LLM_TEXT_PROVIDER}`);
// eslint-disable-next-line no-console
console.log(`  · LLM_EMBEDDING_PROVIDER=${childEnv.LLM_EMBEDDING_PROVIDER}`);
// eslint-disable-next-line no-console
console.log(`  · OPENAI_API_KEY=${keyPrefix} (real, redacted)`);
// eslint-disable-next-line no-console
console.log(`  · THROTTLE_SHORT_LIMIT=${childEnv.THROTTLE_SHORT_LIMIT}`);
// eslint-disable-next-line no-console
console.log(
  '[start-perf-real] ⚠ ESTE PROCESO CONSUME TOKENS REALES. ' +
    'Usa solo para el Escenario 4 de Fase 5-A (RNF-01 real, 20 muestras).',
);

const child = spawn('nest start', {
  cwd: backendRoot,
  env: childEnv,
  stdio: 'inherit',
  shell: true,
});

child.on('exit', (code) => process.exit(code ?? 0));
process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
