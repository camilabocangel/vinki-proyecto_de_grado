# Resumen de la suite de integración — Fase 3

> **Fecha:** 2026-05-20
> **Comando:** `cd backend && npm run test:int`
> **Output canónico:** `qa/03-pruebas-integracion/resultado_integracion.txt`
> **Config:** `backend/test/integration/jest-integration.config.ts`
> (rootDir relativo, `--runInBand`, `maxWorkers: 1`, testTimeout 30 s).

## Resultado global

| Métrica | Valor |
|---|---|
| Test Suites | **9 / 9** ✅ |
| Tests | **92 / 92** ✅ |
| Tests rojos | 0 |
| `.todo()` / `it.skip` | 0 |
| Snapshots | 0 |
| Tiempo total | ~ 44 s |
| Modificaciones a código de producción | 0 |

```
Test Suites: 9 passed, 9 total
Tests:       92 passed, 92 total
Snapshots:   0 total
Time:        44.872 s, estimated 48 s
```

(Ver `resultado_integracion.txt` para el output literal del comando.)

---

## Inventario por suite

### Grupo A — Integridad de datos (Postgres real, sin app NestJS)

| Suite | Archivo | Tests | RNF cubiertos |
|---|---|---|---|
| A.1 | `test/integration/integrity/check-constraints.spec.ts` | 16 | RNF-18, RNF-19, RNF-20 |
| A.2 | `test/integration/integrity/cascades.spec.ts` | 6 | RNF-12, RNF-13, RNF-14 |
| A.3 | `test/integration/integrity/unique-constraints.spec.ts` | 12 | RNF-15, RNF-16, RNF-17 |
| A.4 | `test/integration/integrity/foreign-keys.spec.ts` | 10 | RNF-09, RNF-10, RNF-11 |
| **Subtotal A** | | **44** | |

Patrón A: cliente Prisma directo contra la DB de test (puerto 5434),
`TRUNCATE CASCADE` en `beforeEach`, asserts `.rejects.toThrow(/regex/)`
contra los nombres exactos de los constraints (`chk_*`, `_key`,
`Unique constraint failed`, etc.).

### Grupo B — API end-to-end (NestJS bootstrap + Supertest)

| Suite | Archivo | Tests | RF / RNF cubiertos |
|---|---|---|---|
| B.1 | `test/integration/api/auth.integration.spec.ts` | 12 | RF-01, RF-02, RF-03, RNF-05 |
| B.2 | `test/integration/api/authorization.integration.spec.ts` | 9 | RNF-07 + RolesGuard |
| B.3 | `test/integration/api/interview-flow.integration.spec.ts` | 11 | RF-09, RF-10, RF-11, RF-15, RF-17, RF-18 |
| B.4 | `test/integration/api/evaluations.integration.spec.ts` | 5 | RF-19, RF-20, RF-22, RF-27, RF-28 |
| **Subtotal B** | | **37** | |

Patrón B: levanta `AppModule` completo vía
`createTestApp()` (cookie-parser + ValidationPipe global con
`whitelist/forbidNonWhitelisted/transform` + `GlobalExceptionFilter`),
hace requests reales con Supertest. `LLM_SANDBOX=true` fuerza
`MockEvaluatorService` y `MockEmbeddingService` — cero llamadas reales
a OpenAI / Gemini. La cola BullMQ procesa contra Redis-test (puerto
6381) y B.4 hace polling sobre `interview.evaluationStatus` hasta
`'completed'`.

### Grupo C — Validación de DTOs (NestJS bootstrap + Supertest)

| Suite | Archivo | Tests | RNF cubiertos |
|---|---|---|---|
| C.1 | `test/integration/dto/dto-validation.integration.spec.ts` | 11 | RNF-08 (validación borde HTTP) |
| **Subtotal C** | | **11** | |

Patrón C: payloads malformados intencionales → `ValidationPipe` global
los rechaza con 400 antes de tocar el servicio. Cubre extra
no-whitelisted (defensa anti-injection de campos como `role: 'admin'`),
tipos inválidos, longitudes, enums y campos faltantes.

---

## Cobertura RF / RNF añadida en Fase 3

### RNF (cubiertos extremo-a-extremo con la DB real)

| RNF | Tema | Suite | Estado |
|---|---|---|---|
| RNF-05 | bcrypt + salt rounds 10 | B.1 | ✅ |
| RNF-07 | Aislamiento por propietario (cross-user) | B.2 | ✅ |
| RNF-08 | Validación estricta DTO | C.1 | ✅ |
| RNF-09 | FK `frameworks.language_id` | A.4 | ✅ |
| RNF-10 | FKs `questions.{language,level,skill}_id` | A.4 | ✅ |
| RNF-11 | FKs `interviews.{user,role,chosen_level}_id` | A.4 | ✅ |
| RNF-12 | Cascade `interview → interview_questions` | A.2 | ✅ |
| RNF-13 | Cascade `interview_question → answers` | A.2 | ✅ |
| RNF-14 | Cascade `answer → answer_evaluation` | A.2 | ✅ |
| RNF-15 | UNIQUE `users.email` | A.3 | ✅ |
| RNF-16 | UNIQUE catálogos (roles/languages/levels/skills) | A.3 | ✅ |
| RNF-17 | UNIQUE `user_skill_scores (user_id, skill_id)` | A.3 | ✅ |
| RNF-18 | CHECK `answer_evaluations.* ∈ [0,5]` | A.1 | ✅ |
| RNF-19 | CHECK `user_skill_scores.score ∈ [0,100]` | A.1 | ✅ |
| RNF-20 | CHECK `interview_questions.order_number > 0` | A.1 | ✅ |

### RF tocados E2E

| RF | Tema | Suite | Notas |
|---|---|---|---|
| RF-01 | Registro de cuenta student | B.1 | Hash bcrypt verificado |
| RF-02 | Login con cookies httpOnly | B.1 | RS256 + RSA real en `.env.test` |
| RF-03 | Logout limpia cookies | B.1 | |
| RF-09 | Crear entrevista (curated + RAG-fallback) | B.3 | RAG retorna [] (no chunks), usa 5 curadas |
| RF-10 | Selección de preguntas con embedding | B.3 | Mock embedding `[0,0,...]` × 1536 |
| RF-11 | Leer entrevista propia | B.3 | Ordenadas por `order_number` |
| RF-15 | Enviar respuesta (upsert idempotente) | B.3 | |
| RF-17 | Finalizar entrevista + enqueue eval | B.3 + B.4 | BullMQ real |
| RF-18 | No permitir 2 entrevistas activas | B.3 | 409 Conflict |
| RF-19 | Evaluación → `AnswerEvaluation` persistida | B.4 | Sandbox mock |
| RF-20 | Dimensiones en [0,5] | B.4 | + cruzado con RNF-18 |
| RF-22 | `GET /interviews/:id/report` | B.4 | Forma `{interview, evaluations[]}` |
| RF-27 | EMA `UserSkillScore` ∈ [0,100] | B.4 | + cruzado con RNF-19 |
| RF-28 | Dashboard agregado | B.4 | 200 OK + objeto poblado |

(Trazabilidad detallada y mapeo a `TC-I-XXX` en
[`qa/01-plan-maestro/matriz_trazabilidad.md`](../01-plan-maestro/matriz_trazabilidad.md).)

---

## Infraestructura y guardrails

- **Test DB:** `docker compose -f docker-compose.test.yml up -d`
  - postgres-test → puerto **5434** (nunca el 5433 de desarrollo)
  - redis-test → puerto **6381**
- **`.env.test`:** lo carga `test/integration/setup.ts`; contiene un par
  RSA-2048 *de prueba* para JWT RS256, `LLM_SANDBOX=true`,
  `DATABASE_URL` apuntando a 5434.
- **Guardrail:** `setup.ts` aborta el proceso si `DATABASE_URL` apunta
  a `:5433` o a `/vinki?schema=public`. Imposible correr la suite
  contra la DB de dev por error.
- **Idempotencia:** `db-helpers.resetDatabase()` hace
  `TRUNCATE TABLE ... RESTART IDENTITY CASCADE` en orden inverso de FK
  antes de cada test.

---

## Conclusión

Fase 3 cumple los criterios del plan maestro:

- ✅ Cobertura RNF de integridad de datos: **12/12** RNFs declarados
  (RNF-09 a RNF-20) validados con asserts a nivel PostgreSQL.
- ✅ Aislamiento por propietario (RNF-07) verificado E2E.
- ✅ Validación de DTOs (RNF-08) verificada E2E.
- ✅ Flujo de entrevista (RF-09 → RF-28) verificado E2E con la DB
  real + cola BullMQ real + worker procesando.
- ✅ Cero modificaciones al código de producción.
- ✅ Suite verde, sin red, sin `.todo()`.

Lista para avanzar a la Fase 4 — Pruebas E2E con Playwright (ver
[`qa/02-pruebas-unitarias/cierre_fase_2.md`](../02-pruebas-unitarias/cierre_fase_2.md)
§ "Ajuste post-cierre — Decisión D-8" para el alcance E2E acordado).
