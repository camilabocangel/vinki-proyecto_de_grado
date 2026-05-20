// Global setup de Playwright — Fase 4.
//
// Antes de ejecutar la suite E2E:
//   1. Carga `backend/.env.test` para conocer la DATABASE_URL del test.
//   2. Verifica que estamos apuntando a la DB de test (puerto 5434), nunca
//      a la de desarrollo.
//   3. Limpia el cache Redis del contenedor `vinki-redis-test` (FLUSHDB)
//      por higiene entre corridas — el fix de HE-01 hizo que el cache
//      sea per-user, pero garantizar arrancar con Redis vacío evita
//      depender de TTLs que se solapen entre runs.
//   4. Ejecuta el seed determinista (`e2e/fixtures/seed.ts`).
//
// Si el seed falla, Playwright aborta sin correr ningún test.

import { execSync } from 'node:child_process'
import * as fs from 'node:fs'
import * as path from 'node:path'
import type { FullConfig } from '@playwright/test'
import { runSeed } from './fixtures/seed'

function loadEnvTest(): void {
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes(':5434/')) {
    return // Ya está cargado y apunta a test.
  }
  const envPath = path.resolve(process.cwd(), 'backend', '.env.test')
  if (!fs.existsSync(envPath)) {
    throw new Error(
      `[e2e global-setup] backend/.env.test no encontrado en ${envPath}. ` +
        `Verifica que la Fase 3 esté inicializada o copia .env.example.`,
    )
  }
  const content = fs.readFileSync(envPath, 'utf-8')
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq === -1) continue
    const key = line.slice(0, eq).trim()
    const value = line.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
    if (!process.env[key]) process.env[key] = value
  }
}

export default async function globalSetup(_config: FullConfig): Promise<void> {
  loadEnvTest()

  const dbUrl = process.env.DATABASE_URL ?? ''
  if (dbUrl.includes(':5433/') || dbUrl.endsWith('/vinki?schema=public')) {
    throw new Error(
      `[e2e global-setup] DATABASE_URL apunta a la base de DESARROLLO ` +
        `(${dbUrl}). E2E SOLO debe correr contra la DB de test (5434, ` +
        `"vinki_test"). Aborto por seguridad.`,
    )
  }

  // Higiene entre corridas: FLUSHDB del Redis de test. No es estrictamente
  // necesario tras el fix de HE-01 (cache key per-user), pero garantiza
  // que cada `npm run e2e` arranque con un cache vacío. Si el contenedor
  // no está corriendo, se ignora silenciosamente (los tests fallarán
  // después con un mensaje más claro).
  try {
    execSync('docker exec vinki-redis-test redis-cli FLUSHDB', { stdio: 'pipe' })
    // eslint-disable-next-line no-console
    console.log('[e2e global-setup] Redis test FLUSHDB OK.')
  } catch {
    // eslint-disable-next-line no-console
    console.log('[e2e global-setup] FLUSHDB omitido (contenedor no accesible).')
  }

  // `runSeed()` construye PrismaClient internamente — lo hace DESPUÉS de
  // que loadEnvTest() haya seteado DATABASE_URL, así que la import estática
  // es segura.
  await runSeed()
  // eslint-disable-next-line no-console
  console.log('[e2e global-setup] Seed aplicado contra DB de test.')
}
