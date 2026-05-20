# QA — Plataforma Vinki

> Estructura, herramientas y procesos de aseguramiento de la calidad del proyecto de grado **Vinki** (UPB).
> Documento índice. La fuente autoritativa de requerimientos es `docs/requerimientos.md`.

---

## Estructura del directorio `qa/`

```
qa/
├── 00-inventario/                 # Fase 0 — inventario técnico
│   ├── inventario_sistema.md
│   └── estado_db_desarrollo.md
├── 01-plan-maestro/               # Fase 1 — plan y trazabilidad
│   ├── plan_maestro_pruebas.md
│   ├── matriz_trazabilidad.md
│   └── decisiones_qa.md
├── 02-pruebas-unitarias/          # Fase 2/3 — unitarias backend + frontend
│   ├── smoke_backend.txt
│   ├── smoke_frontend.txt
│   └── setup_summary.md
├── 03-pruebas-e2e/                # Fase 5 — E2E (Playwright)
│   ├── smoke_e2e.txt
│   └── como_ejecutar.md
└── 04-pruebas-no-funcionales/     # Fase 6 — rendimiento + seguridad
    ├── rendimiento/
    │   ├── scripts/smoke.js
    │   ├── data/
    │   ├── reportes/
    │   └── setup_k6.md
    └── seguridad/
        ├── eslint_security_inicial.txt
        └── setup_semgrep.md
```

---

## Documentos clave

| Documento | Propósito |
|---|---|
| [`docs/requerimientos.md`](../docs/requerimientos.md) | 42 RF + 34 RNF — fuente autoritativa |
| [`00-inventario/inventario_sistema.md`](00-inventario/inventario_sistema.md) | Inventario técnico exhaustivo (stack, endpoints, modelo de datos) |
| [`00-inventario/estado_db_desarrollo.md`](00-inventario/estado_db_desarrollo.md) | Estado de la DB de desarrollo y verificación previa a migración CHECK |
| [`01-plan-maestro/plan_maestro_pruebas.md`](01-plan-maestro/plan_maestro_pruebas.md) | Estrategia, alcance, herramientas, criterios, cronograma |
| [`01-plan-maestro/matriz_trazabilidad.md`](01-plan-maestro/matriz_trazabilidad.md) | 82 ítems trazados (42 RF + 34 RNF + 6 IA) |
| [`01-plan-maestro/decisiones_qa.md`](01-plan-maestro/decisiones_qa.md) | Registro de decisiones D-1 a D-6 |
| [`02-pruebas-unitarias/setup_summary.md`](02-pruebas-unitarias/setup_summary.md) | Resumen ejecutivo de la infraestructura de testing |

---

## Tabla de pruebas disponibles

| Tipo | Workspace | Comando | Reporte |
|---|---|---|---|
| Unitarias backend | `backend/` | `npm run test:cov` | `coverage/lcov-report/index.html` (raíz del repo) |
| Unitarias backend (sin cobertura) | `backend/` | `npm test` | Consola |
| Unitarias backend — watch | `backend/` | `npm run test:watch` | Consola |
| Integración API (Fase 4) | `backend/` | `npm run test:int` | Consola + cobertura |
| E2E backend (Supertest) | `backend/` | `npm run test:e2e` | Consola |
| Unitarias frontend | `frontend/app/` | `npm run test:cov` | `frontend/app/coverage/unit/index.html` |
| Unitarias frontend — UI | `frontend/app/` | `npm run test:ui` | Web UI local |
| E2E (Playwright) — smoke | raíz | `npm run e2e:smoke` | `playwright-report/index.html` |
| E2E (Playwright) — completo | raíz | `npm run e2e` | `playwright-report/index.html` |
| E2E (Playwright) — UI Mode | raíz | `npm run e2e:ui` | Web UI local |
| E2E (Playwright) — debug | raíz | `npm run e2e:debug` | Inspector |
| Reporte E2E | raíz | `npm run e2e:report` | Abre HTML |
| Rendimiento (k6) — smoke | raíz | `k6 run qa/04-pruebas-no-funcionales/rendimiento/scripts/smoke.js` | Consola + `reportes/` |
| Seguridad — ESLint backend | `backend/` | `npm run lint:security` | Consola |
| Seguridad — ESLint frontend | `frontend/app/` | `npm run lint:security` | Consola |
| Seguridad — Semgrep (opcional) | raíz | `semgrep --config auto .` | `qa/04-pruebas-no-funcionales/seguridad/` |

---

## Cómo ejecutar cada tipo paso a paso

### 1. Pruebas unitarias backend

Requisitos: Docker Desktop activo (postgres) y dependencias instaladas.

```bash
docker compose up -d postgres
cd backend
npm ci
node_modules/.bin/prisma generate
node_modules/.bin/prisma migrate deploy
NODE_OPTIONS=--max-old-space-size=4096 npm run test:cov
```

Salida:
- Consola: `Test Suites: X passed, Y failed`, tabla de cobertura.
- HTML: `coverage/lcov-report/index.html` (en la raíz del repo).
- JSON resumen: `coverage/coverage-summary.json`.

Threshold actual: **80%** en statements/branches/functions/lines (queda
configurado; las pruebas reales suben la cobertura en la Fase 2).

### 2. Pruebas unitarias frontend

```bash
cd frontend/app
npm ci
npm run test:cov
```

Salida HTML: `frontend/app/coverage/unit/index.html`. Threshold 80%.

### 3. E2E (Playwright)

```bash
# Una sola vez:
cd <raíz>
npm install
node_modules/.bin/playwright install chromium

# Smoke (no requiere backend):
npm run e2e:smoke

# Suite completa (requiere backend + DB):
docker compose up -d postgres redis
cd backend && npm ci && node_modules/.bin/prisma migrate deploy && node_modules/.bin/prisma db seed && cd ..
npm --prefix backend run start:dev &   # en otra terminal
npm run e2e
```

Reporte: `playwright-report/index.html`. Detalle: [03-pruebas-e2e/como_ejecutar.md](03-pruebas-e2e/como_ejecutar.md).

### 4. Rendimiento (k6)

Requisitos: backend corriendo + k6 instalado en el sistema (ver
[04-pruebas-no-funcionales/rendimiento/setup_k6.md](04-pruebas-no-funcionales/rendimiento/setup_k6.md)).

```bash
k6 run qa/04-pruebas-no-funcionales/rendimiento/scripts/smoke.js
```

### 5. Seguridad

```bash
# Por workspace:
cd backend && npm run lint:security
cd frontend/app && npm run lint:security

# Semgrep (instalación manual, ver setup_semgrep.md):
semgrep --config auto --output qa/04-pruebas-no-funcionales/seguridad/semgrep_smoke.txt .
```

---

## Cómo interpretar los reportes

### Cobertura HTML (Jest / Vitest)

- Abrir `index.html` en navegador. Cada archivo se colorea por % cubierto.
- Filas rojas en el código = sin tests. Las amarillas = ramas no cubiertas.
- Pasar el cursor sobre las flechas verde/amarilla/roja en el margen
  izquierdo para ver el conteo de hits.

### Reporte de Playwright

- Cada test muestra estado, tiempo, capturas, video (si falló) y trace.
- El trace se inspecciona con `npx playwright show-trace <path>` (acción
  por acción, con snapshots del DOM).
- Los videos quedan en `test-results/<carpeta-del-test>/video.webm`.

### Output de k6

- **`checks`**: porcentaje de aserciones que pasaron. < 100% indica fallo.
- **`http_req_duration`**: p(50), p(95), p(99). Validar contra el threshold
  declarado en el script.
- **`http_req_failed`**: tasa de error (target < 0.01).
- **`thresholds`**: si alguno se rompe, k6 retorna exit ≠ 0 y se aborta.

---

## CI/CD

Dos workflows en `.github/workflows/`:

### `ci.yml` — se dispara en cada push y PR
- Backend: `npm ci` → `prisma generate` → `prisma migrate deploy` →
  `tsc --noEmit` → `lint` → `lint:security` → `test:cov` → `npm audit`.
- Frontend: `npm ci` → `tsc --noEmit` → `lint` → `lint:security` →
  `test:cov` → `npm audit`.
- Servicios: PostgreSQL+pgvector y Redis levantados como `services:`.
- Artefactos: reportes de cobertura subidos por 14 días.
- Falla si la cobertura cae bajo 80% (vía `coverageThreshold` de Jest/Vitest).

### `e2e.yml` — se dispara solo en PRs a master + manual
- Levanta backend + frontend en el runner.
- Aplica migraciones y seed.
- Ejecuta `npm run e2e:smoke` primero, luego `npm run e2e`.
- Artefactos: HTML de Playwright (14 días) + videos/trazas si falla.

---

## Cómo agregar nuevas pruebas

### Convenciones

| Nivel | Ubicación | Patrón | Notas |
|---|---|---|---|
| Unitario backend | `backend/src/**/*.spec.ts` | mismo dir que el código bajo prueba | LLM y Prisma mockeados |
| Integración backend | `backend/src/**/integration.spec.ts` | sufijo `integration` | DB real de pruebas |
| E2E backend (API) | `backend/test/**.e2e-spec.ts` | sufijo `e2e-spec` | Supertest contra la app real |
| Unitario frontend | `frontend/app/src/**/*.test.tsx` | colocado junto al componente | RTL + jsdom |
| E2E (Playwright) | `e2e/suites/<NN>-<dominio>/<nombre>.spec.ts` | suites numeradas | Fixtures en `e2e/fixtures/` |
| Rendimiento (k6) | `qa/04-pruebas-no-funcionales/rendimiento/scripts/` | un `.js` por escenario | Thresholds explícitos |

### Reglas transversales

1. **Mockear el LLM por defecto** en E2E (`llm-mock.fixture.ts`). Solo la
   evaluación específica de RAG (Fase 7) usa el proveedor real.
2. **Seed determinista** en `backend/prisma/seed.ts` para datos compartidos
   entre suites.
3. **Verificar constraints CHECK con prefijo `chk_`** (no `check_`) cuando
   se prueben restricciones de integridad — convención adoptada por la
   Decisión D-1.
4. **Cumplir NT-001**: cualquier comando `npx` en scripts o CI debe pinear
   versión (`npx -y prisma@6.19.2 ...`) o invocar el binario local
   (`node_modules/.bin/prisma ...`).

---

## Trazabilidad y reporting

| Pregunta | Documento |
|---|---|
| ¿Qué requerimiento prueba este test? | [matriz_trazabilidad.md](01-plan-maestro/matriz_trazabilidad.md) |
| ¿Por qué se tomó esta decisión metodológica? | [decisiones_qa.md](01-plan-maestro/decisiones_qa.md) |
| ¿Cuál es el umbral cuantitativo de un RNF? | [plan_maestro_pruebas.md §5](01-plan-maestro/plan_maestro_pruebas.md) |
| ¿Por qué la cobertura está baja al cierre de Fase 1? | [setup_summary.md](02-pruebas-unitarias/setup_summary.md) |
| ¿Cómo está el sistema arquitectónicamente? | [inventario_sistema.md](00-inventario/inventario_sistema.md) |
