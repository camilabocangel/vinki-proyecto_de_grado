# Setup de la suite de integración — Fase 3

> **Fecha:** 2026-05-20
> Procedimiento reproducible para levantar la infraestructura de
> integración y correr la suite.

## 1. Pre-requisitos

- Docker Desktop (con docker-compose v2 disponible como `docker compose`).
- Node 22.x (mismo que dev).
- `cd backend && npm ci` (deps unitarias + integración usan el mismo lock).
- pgvector ya está incluido en la imagen `pgvector/pgvector:pg17` usada
  por la DB de test (no requiere instalación adicional).

## 2. Levantar la infraestructura de test

```pwsh
# Desde la raíz del repo
docker compose -f docker-compose.test.yml up -d
```

Esto crea / arranca dos contenedores aislados de los de desarrollo:

| Servicio | Container | Puerto host | Volumen |
|---|---|---|---|
| postgres-test (pgvector/pg17) | `vinki-postgres-test` | **5434** | `pgdata_test` |
| redis-test (redis:7-alpine) | `vinki-redis-test` | **6381** | `redisdata_test` |

Credenciales DB (definidas en `docker-compose.test.yml`):

```
POSTGRES_USER=vinki
POSTGRES_PASSWORD=vinki_test
POSTGRES_DB=vinki_test
```

Healthcheck: `pg_isready` y `redis-cli ping`. Esperar hasta
`docker ps` muestre ambos `(healthy)` (típicamente <15 s).

## 3. Aplicar migraciones a la DB de test

```pwsh
cd backend
$env:DATABASE_URL = "postgresql://vinki:vinki_test@localhost:5434/vinki_test?schema=public"
npx -y prisma@6.19.2 migrate deploy
```

Nota NT-001: usar `prisma@6.19.2` pineado (no `npx prisma ...` sin
versión — descarga la última y rompe contra el schema 6.x).

Verificar las 7 CHECK constraints `chk_*`:

```pwsh
docker exec vinki-postgres-test psql -U vinki -d vinki_test -c `
  "SELECT conname FROM pg_constraint WHERE contype='c' AND conname LIKE 'chk_%' ORDER BY conname;"
```

Esperado:

```
 chk_answer_evaluations_clarity_of_explanation_range
 chk_answer_evaluations_communication_range
 chk_answer_evaluations_confidence_range
 chk_answer_evaluations_problem_solving_range
 chk_answer_evaluations_technical_correctness_range
 chk_interview_questions_order_number_positive
 chk_user_skill_scores_score_range
(7 rows)
```

## 4. Verificar `.env.test`

`backend/.env.test` debe existir y contener:

- `DATABASE_URL` apuntando a **puerto 5434** (no 5433).
- `REDIS_URL=redis://localhost:6381`.
- Un par RSA-2048 real en `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY` (con
  `\n` escapado entre líneas — el código en `auth.module.ts` y
  `jwt-cookie.strategy.ts` hace `.replace(/\\n/g, '\n')` al cargar).
- `LLM_SANDBOX=true` para forzar `MockEvaluatorService` /
  `MockEmbeddingService`.

El archivo ya está versionado (claves de PRUEBA, no son secretos
reales). El guardrail en `test/integration/setup.ts` aborta si
`DATABASE_URL` apunta al puerto 5433 o a la DB `vinki?schema=public`
de desarrollo.

## 5. Correr la suite

```pwsh
cd backend
npm run test:int
```

Equivalente directo:

```pwsh
npx jest --config ./test/integration/jest-integration.config.ts --runInBand
```

Salida esperada:

```
Test Suites: 9 passed, 9 total
Tests:       92 passed, 92 total
Snapshots:   0 total
Time:        ~44 s
```

## 6. Cerrar la infraestructura

```pwsh
docker compose -f docker-compose.test.yml down
```

Para borrar también los volúmenes (reseteo completo):

```pwsh
docker compose -f docker-compose.test.yml down -v
```

---

## Layout del directorio `test/integration`

```
backend/test/integration/
├── api/
│   ├── auth.integration.spec.ts            (B.1 — 12 tests)
│   ├── authorization.integration.spec.ts   (B.2 —  9 tests)
│   ├── evaluations.integration.spec.ts     (B.4 —  5 tests)
│   └── interview-flow.integration.spec.ts  (B.3 — 11 tests)
├── dto/
│   └── dto-validation.integration.spec.ts  (C.1 — 11 tests)
├── integrity/
│   ├── cascades.spec.ts                    (A.2 —  6 tests)
│   ├── check-constraints.spec.ts           (A.1 — 16 tests)
│   ├── foreign-keys.spec.ts                (A.4 — 10 tests)
│   └── unique-constraints.spec.ts          (A.3 — 12 tests)
├── app-helpers.ts                          (createTestApp + extractCookies)
├── db-helpers.ts                           (prisma, resetDatabase, seed, helpers)
├── jest-integration.config.ts              (rootDir, maxWorkers:1, 30 s timeout)
└── setup.ts                                (carga .env.test + guardrail)
```

## Cierre

Setup verificado, suite verde a 92/92, ningún paso manual fuera de
los listados aquí. La fase queda lista para tarball / CI integration
job: añadir un step que levante docker-compose.test.yml, aplique
migrate deploy y corra `npm run test:int`.
