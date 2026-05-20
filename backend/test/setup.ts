// Setup global ejecutado por Jest antes de cada archivo de pruebas.
//   - Carga variables de entorno desde `.env.test` (si existe), respetando las
//     ya definidas en `process.env`.
//   - Documenta cómo mockear `PrismaClient` desde los tests unitarios mediante
//     el helper `test/prisma.mock.ts` (no se aplica un mock global automático
//     para no romper futuras pruebas de integración que requieren la BD real).
//
// El timeout por defecto se controla con `testTimeout` en la configuración de
// Jest (`package.json`).

import * as fs from 'fs';
import * as path from 'path';

const envTestPath = path.resolve(__dirname, '..', '.env.test');

if (fs.existsSync(envTestPath)) {
  const content = fs.readFileSync(envTestPath, 'utf-8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eqIndex = line.indexOf('=');
    if (eqIndex === -1) continue;
    const key = line.slice(0, eqIndex).trim();
    const value = line
      .slice(eqIndex + 1)
      .trim()
      .replace(/^["']|["']$/g, '');
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
} else if (process.env.NODE_ENV !== 'production') {
  // No es un error: el archivo es opcional. Se documenta en qa/README.md cómo crearlo.
}

// Sentinel para los tests que quieran detectar que el setup corrió.
process.env.JEST_SETUP_LOADED = '1';
