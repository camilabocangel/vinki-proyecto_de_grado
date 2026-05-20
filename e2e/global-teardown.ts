// Global teardown de Playwright — Fase 4.
//
// Al finalizar TODA la suite E2E, limpia la DB de test (TRUNCATE CASCADE).
// El cleanup deja la DB en estado vacío para que la próxima run del seed
// arranque limpia. Por seguridad NO toca la DB de desarrollo (el guardrail
// de seed.ts lo verifica).

import type { FullConfig } from '@playwright/test'
import { clearSeed } from './fixtures/seed'

export default async function globalTeardown(_config: FullConfig): Promise<void> {
  if (process.env.E2E_SKIP_TEARDOWN === '1') {
    // eslint-disable-next-line no-console
    console.log('[e2e global-teardown] Omitido (E2E_SKIP_TEARDOWN=1).')
    return
  }
  await clearSeed()
  // eslint-disable-next-line no-console
  console.log('[e2e global-teardown] DB de test limpiada.')
}
