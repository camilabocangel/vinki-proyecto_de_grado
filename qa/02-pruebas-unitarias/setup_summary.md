# Resumen de configuración de infraestructura de testing

> **Fecha:** 2026-05-19
> **Fase:** 1 (cierre de la configuración previa a la escritura de pruebas reales).
> **Documentos relacionados:** [`qa/README.md`](../README.md), [`qa/01-plan-maestro/plan_maestro_pruebas.md`](../01-plan-maestro/plan_maestro_pruebas.md).

---

## Estado por herramienta

| Herramienta | Configurada | Smoke test | Pendiente |
|---|---|---|---|
| Jest (backend) | ✅ | ✅ (3/3 tests del smoke pasan) | 13 tests preexistentes fallan en 2 suites — se atienden en Fase 2 |
| Vitest (frontend) | ✅ | ✅ (App.test.tsx pasa; 30/31 tests del proyecto pasan) | 1 test de `LoginPage.test.tsx` con aserción desactualizada — Fase 2 |
| Playwright (E2E) | ✅ | ✅ (1/1 test del smoke pasa en 4.9 s) | — |
| k6 (rendimiento) | ✅ (estructura + script) | Documentado | Instalación manual de `k6` en el sistema (ver [setup_k6.md](../04-pruebas-no-funcionales/rendimiento/setup_k6.md)) |
| ESLint security (backend) | ✅ | ✅ (0 errors, 36 warnings) | Triaje de warnings de `detect-object-injection` en Fase 6 |
| ESLint security (frontend) | ✅ | ✅ (0 errors, 38 warnings) | Triaje de warnings en Fase 6 |
| Semgrep | Documentado | — | Instalación manual (binario nativo, ver [setup_semgrep.md](../04-pruebas-no-funcionales/seguridad/setup_semgrep.md)) |
| CI `ci.yml` | ✅ (actualizado) | — | Validar la primera corrida en PR |
| CI `e2e.yml` | ✅ (nuevo) | — | Validar la primera corrida en PR a master |
| Migración CHECK constraints | ✅ aplicada y verificada en sesión previa | — | Re-verificación defensiva pendiente: Docker Desktop quedó detenido en el cierre y no se pudo re-correr el `SELECT pg_constraint`. Comando documentado abajo. |

---

## Cobertura inicial detectada

> Esperado bajo: aún no se escriben las pruebas reales (eso es la Fase 2 / Prompt 3).
> Los thresholds están fijados en **80%** en `statements`, `branches`, `functions`, `lines`.

### Backend (`backend/coverage/coverage-summary.json`)

| Métrica | Cobertura | Threshold | ¿Pasa? |
|---|---|---|---|
| Statements | **13.02 %** | 80 % | ❌ (esperado) |
| Branches | **10.65 %** | 80 % | ❌ (esperado) |
| Functions | **13.12 %** | 80 % | ❌ (esperado) |
| Lines | **12.48 %** | 80 % | ❌ (esperado) |

Resultado de la ejecución: **52 tests passed, 13 failed** en **5 de 7** suites.
Detalle en [smoke_backend.txt](smoke_backend.txt).

### Frontend (`frontend/app/coverage/unit/coverage-summary.json`)

| Métrica | Cobertura | Threshold | ¿Pasa? |
|---|---|---|---|
| Statements | bajo | 80 % | ❌ (esperado) |
| Branches | bajo | 80 % | ❌ (esperado) |
| Functions | bajo | 80 % | ❌ (esperado) |
| Lines | bajo | 80 % | ❌ (esperado) |

Resultado: **30 tests passed, 1 failed** en **9 de 10** archivos de prueba.
Detalle en [smoke_frontend.txt](smoke_frontend.txt).

---

## Comandos para ejecutar todo en local

```bash
# 0. Levantar la base de datos de desarrollo (PostgreSQL + pgvector)
docker compose up -d postgres

# 1. Backend — dependencias, Prisma y tests
cd backend
npm ci
node_modules/.bin/prisma generate
node_modules/.bin/prisma migrate deploy
NODE_OPTIONS=--max-old-space-size=4096 npm run test:cov
npm run lint:security
cd ..

# 2. Frontend — dependencias y tests
cd frontend/app
npm ci
npm run test:cov
npm run lint:security
cd ../..

# 3. E2E (Playwright) — instalación + smoke
npm install                            # raíz: @playwright/test pineado 1.58.2
node_modules/.bin/playwright install chromium
npm run e2e:smoke                      # ~12 s

# 4. (opcional) k6 — smoke de rendimiento
#    Requiere k6 instalado en el sistema. Backend debe estar corriendo:
#    npm --prefix backend run start:dev
k6 run qa/04-pruebas-no-funcionales/rendimiento/scripts/smoke.js

# 5. (opcional) Semgrep
#    Requiere semgrep instalado (Linux/macOS/WSL):
semgrep --config auto --output qa/04-pruebas-no-funcionales/seguridad/semgrep_smoke.txt .

# 6. (defensivo) Verificar que las 7 CHECK constraints siguen activas:
docker exec proyectodegrado-postgres-1 \
  psql -U vinki -d vinki \
  -c "SELECT conname, contype, pg_get_constraintdef(oid) FROM pg_constraint WHERE conname LIKE 'chk_%' ORDER BY conname;"
# Resultado esperado: 7 filas con contype='c'.
```

---

## Incidencias documentadas

| # | Incidencia | Causa raíz | Solución aplicada |
|---|---|---|---|
| 1 | Backend tests con OOM en Jest workers | Prisma Client no generado → cascada de errores TS → workers OOM | `prisma generate` antes de los tests; `maxWorkers: 2` + `workerIdleMemoryLimit: 512MB` en config |
| 2 | Vitest "Timeout waiting for worker" en Windows | Pool `forks` por defecto + setup pesado (jsdom + RTL) | `pool: 'threads'`, `testTimeout: 10000`, `hookTimeout: 15000` |
| 3 | Vite `EACCES` en puertos 5173/5174 | Rango TCP `5079–5178` reservado por el kernel (Hyper-V/WSL) | Playwright apunta a `localhost:5400`; configurable vía `PLAYWRIGHT_BASE_URL` |
| 4 | `page.goto` timeout en E2E | Primer compile de Vite ~30 s en Windows | `navigationTimeout: 60000` + `waitUntil: 'domcontentloaded'` |
| 5 | ESLint security: "rule not found" | Plugins de TS/React-Hooks/A11y no cargados en la config dedicada | Plugins registrados sin reglas activas + `reportUnusedDisableDirectives: false` |
| 6 | Verificación defensiva de CHECK constraints no ejecutada | Docker Desktop se detuvo y no respondió al inicio automático al final de la fase | Comando documentado para ejecución manual cuando Docker vuelva a estar disponible. Las constraints fueron aplicadas y verificadas exitosamente en sesión previa (`qa/00-inventario/estado_db_desarrollo.md` + log de aplicación con 7 constraints `chk_*` confirmadas). |

---

## Decisiones de QA aplicadas durante este setup

- **D-1 (CHECK constraints)** — migración `20260519120000_add_check_constraints` ya aplicada en sesión previa. Convención de prefijo `chk_` (no `check_`) documentada en `qa/README.md` y observada en el setup.
- **D-5 (RF-37 a RF-41 diferidos)** — no se generó infraestructura ni casos para estos requerimientos. Solo RF-42 (gestión de preguntas) permanece en alcance.
- **NT-001 (pin de versiones en npx)** — observada en:
  - `playwright.config.ts` y `package.json` raíz (Playwright 1.58.2 pineado).
  - `ci.yml` y `e2e.yml`: uso de `node_modules/.bin/<tool>` o `npx -y <tool>@<version>` siempre.
  - Migración Prisma: `node_modules/.bin/prisma` en CI; `npx -y prisma@6.19.2` documentado para uso local.

---

## Triaje y reparación de tests preexistentes (cierre)

Tras cerrar la infraestructura se diagnosticaron 14 tests rojos heredados
(13 backend + 1 frontend) y se aplicó la estrategia de **reparación parcial
dirigida** sin tocar código de producción. Las 3 correcciones puntuales
—providers de DI faltantes en `interviews.service.spec.ts`, segundo
argumento `isBehavioral` en `evaluation.processor.spec.ts` y aserción de
branding en `LoginPage.test.tsx`— rehabilitaron las 14 pruebas y dejaron
la suite **VERDE** (65/65 backend, 31/31 frontend). La re-verificación
defensiva pendiente confirmó las **7 constraints `chk_*`** vigentes en
PostgreSQL (RNF-18/19/20). Detalles en
[`diagnostico_rapido.md`](diagnostico_rapido.md) y
[`reparacion_tests_rojos.md`](reparacion_tests_rojos.md).

---

## Cierre Sub-corrida 3A — backend núcleo (auth + evaluation + RAG)

La Sub-corrida 3A del Prompt 3 escribió **139 tests nuevos** sobre el
núcleo crítico (auth, evaluation, llm, rag, knowledge services), llevando
la suite a **204 tests** y la cobertura global de **13.02 % → 33.09 %**
statements. Todos los módulos del núcleo cubiertos alcanzaron ≥ 95 %
statements; la mayoría al 100 %. Decisiones de mocking estandarizadas
(NT-003 `uuid` ESM, NT-004 tipado `jest.fn`, NT-005 `ConfigService.get`
con defaults). Detalle en
[`resumen_cobertura_3A.md`](resumen_cobertura_3A.md).

---

## Cierre Sub-corrida 3C — Frontend (Fase 2 cerrada)

La Sub-corrida 3C añadió **103 tests nuevos** sobre el frontend (auth
pages completadas, hooks `useAuth`/`useSessionTimeout`, `auth.store`,
`lib/roleHome`, `ProtectedRoute`, `NotFoundPage`, componentes
`AudioRecorder`/`CodeEditor`/`SkillRadarChart`/`AppLayout`, flujo de
entrevista focal en `Wizard`/`Session`/`Confirmation`/`FeedbackPage`,
visualización en `FeedbackHistoryPage`/`DashboardPage`/`ProfilePage`,
admin/RF-42 en `AdminQuestionsPage`/`AdminAuditPage` y RAG en
`KnowledgeBasePage`). Suite final: **134/134 tests verde** (100 %) en
30 archivos. Cobertura efectiva: **56.67 %** statements / **58.29 %**
lines sobre código en alcance; bajo el umbral 80 % por la estrategia
**"smoke focal"** declarada (NT-010) en los 8 archivos > 500 LOC, cuyos
flujos profundos se completarán en **Playwright E2E (Fase 5)**.
Decisión D-7 aplicada vía `coverage.exclude` en `vite.config.ts`.
Documentos: [`resumen_cobertura_3C.md`](resumen_cobertura_3C.md),
[`diferidos_qa.md`](../01-plan-maestro/diferidos_qa.md).

---

## Cierre Sub-corrida 3B — backend completo (sin diferidos D-5/D-7)

La Sub-corrida 3B añadió **164 tests nuevos** sobre `interviews/*`
(controller + service + 5 servicios auxiliares + answers + templates),
`catalogs/*` (READ + RF-42 + audit), `common/*` (audit, cache interceptor,
env validation, prisma, redis, exception filter), `health` y los
controllers/processors de `knowledge`. Se registró la **Decisión D-7**
(diferidos achievements/challenges/notifications/reports avanzados) y se
configuró `coveragePathIgnorePatterns` en `backend/package.json`. Tests
totales: **368** en 48 suites. Cobertura efectiva sobre código en
alcance: **84.17 %** statements / **84.23 %** lines (supera el umbral
80 %); branches 65.17 % por debajo del umbral, concentrado en
`reports.service.ts` no diferido. Cero modificaciones al código de
producción; cero `it.todo()`. Documentos:
[`resumen_cobertura_3B.md`](resumen_cobertura_3B.md),
[`diferidos_qa.md`](../01-plan-maestro/diferidos_qa.md).

---

## Próximo paso

**Fase 2 — escritura de pruebas unitarias reales** (Prompt 3), priorizando los módulos críticos según el plan maestro:

1. **Autenticación** (`backend/src/auth/`) — completar cobertura del flujo de
   login/registro/refresh/cambio de contraseña.
2. **Evaluación e IA** (`backend/src/evaluation/`) — pipeline asíncrono con
   BullMQ, rúbricas y mock-evaluator.
3. **Módulo RAG** (`backend/src/knowledge/`, `backend/src/llm/`,
   `backend/src/rag/`) — *chunking*, embeddings y recuperación semántica.
4. **Frontend** — componentes críticos del flujo de entrevista
   (`InterviewWizard`, `InterviewSession`, `FeedbackPage`).

Con la infraestructura cerrada en esta Fase 1, la Fase 2 podrá enfocarse
100% en lógica de pruebas y subir la cobertura hacia el 80% objetivo.
