# Resumen Sub-corrida 3B — backend completo (sin diferidos D-5/D-7)

> **Fecha:** 2026-05-19
> **Alcance:** Sub-corrida 3B del Prompt 3 — interviews + controllers + catalogs READ + RF-42 + common + health + knowledge controllers/processors.
> **Política aplicada:** Decisiones D-5 y D-7 — diferidos achievements, challenges, notifications y reports avanzados.
> **Logs:** [`cobertura_backend_3B.txt`](cobertura_backend_3B.txt).

---

## Resultado global

| Métrica | Línea base (pre-3A) | Post-3A | Post-3B | Δ acumulado |
|---|---|---|---|---|
| Tests backend | 65 | 204 | **368** | **+303** |
| Suites backend | 7 | 26 | **48** | **+41** |
| Statements % | 13.02 | 33.09 | **84.17** | **+71.15 pp** |
| Branches % | 10.65 | 24.74 | **65.17** | **+54.52 pp** |
| Functions % | 13.12 | 31.98 | **78.03** | **+64.91 pp** |
| Lines % | 12.48 | 32.68 | **84.23** | **+71.75 pp** |
| Estado | 🟢 | 🟢 | 🟢 **Verde** | — |

### Comparativa Sub-corrida 3B (delta intra-sub-corrida)

| Métrica | Antes (post-3A) | Después (post-3B) | Δ |
|---|---|---|---|
| Tests | 204 | **368** | **+164** |
| Suites | 26 | **48** | **+22** |
| Statements | 33.09 % | **84.17 %** | +51.08 pp |
| Branches | 24.74 % | **65.17 %** | +40.43 pp |
| Functions | 31.98 % | **78.03 %** | +46.05 pp |
| Lines | 32.68 % | **84.23 %** | +51.55 pp |

### Cobertura sobre código en alcance (excluyendo diferidos)

`coveragePathIgnorePatterns` excluye los módulos de D-5 y D-7 (ver
[`diferidos_qa.md`](../01-plan-maestro/diferidos_qa.md)). Los porcentajes
arriba ya son **efectivos sobre código en alcance**: 84.17 % statements,
84.23 % lines.

- **Cumple el umbral global del 80%** en statements y lines.
- **Functions a 78.03 %** — a 2 puntos del umbral, atribuible al
  `reports.service.ts` no diferido (28 % cobertura preexistente; ver
  más abajo).
- **Branches a 65.17 %** — por debajo del umbral; ramas no cubiertas
  concentradas en `reports.service.ts` (16 %) y casos defensivos del
  `evaluation.processor.ts`. Documentado en `exclusiones.md`.

---

## Cobertura por módulo

| Módulo | Stmts % | Branches % | Funcs % | Lines % | ≥ 80% (stmts/lines) |
|---|---|---|---|---|---|
| `src/auth/*` | 100 | 100 | 100 | 100 | ✅ |
| `src/auth/guards/*` | 100 | 100 | 100 | 100 | ✅ |
| `src/auth/strategies/*` | 95.65 | 50 | 80 | 94.73 | ✅ |
| `src/catalogs/*` (incl. admin-questions + admin-audit) | 100 | 100 | 100 | 100 | ✅ |
| `src/common/*` | 100 | 100 | 100 | 100 | ✅ |
| `src/common/filters/*` | 94.73 | 70 | 100 | 94.11 | ✅ |
| `src/evaluation/*` (rubrics) | 100 | 100 | 100 | 100 | ✅ |
| `src/evaluation/processors/*` | 100 | 75 | 100 | 100 | ✅ |
| `src/evaluation/services/*` | 100 | 100 | 100 | 100 | ✅ |
| `src/health/*` | 97.36 | 95 | 85.71 | 100 | ✅ |
| `src/interviews/*` (controller + service + templates) | 100 | 95.77 | 100 | 100 | ✅ |
| `src/interviews/answers/*` | 100 | 97.82 | 100 | 100 | ✅ |
| `src/interviews/services/*` | 100 | 100 | 100 | 100 | ✅ |
| `src/knowledge/*` (controller) | 100 | 100 | 100 | 100 | ✅ |
| `src/knowledge/processors/*` | 100 | 100 | 100 | 100 | ✅ |
| `src/knowledge/services/*` | 95.91 | 89.28 | 100 | 96.55 | ✅ |
| `src/llm/services/*` (7 archivos) | 100 | 100 | 100 | 100 | ✅ |
| `src/rag/services/*` | 100 | 100 | 100 | 100 | ✅ |
| `src/reports/reports.service.ts` (preexistente; sin specs nuevos) | 28.02 | 16.05 | 35.71 | 27.20 | ❌ |

> Todos los módulos en alcance excepto `reports.service.ts` superan el 80%
> de statements/lines. La gran mayoría está al 100%.

### Detalle de archivos al 100 %

`auth.controller.ts`, `auth.service.ts`, `roles.guard.ts`, `roles.decorator.ts`, `jwt-cookie.guard.ts`, `local.strategy.ts`, `audit.service.ts`, `cache.interceptor.ts`, `env.validation.ts`, `prisma.service.ts`, `rubrics.ts`, `rubrics-behavioral.ts`, `mock-evaluator.service.ts`, `openai-evaluator.service.ts`, `interviews.controller.ts`, `interviews.service.ts`, `templates.controller.ts`, `templates.service.ts`, `answers.controller.ts`, `embedding.service.ts`, `followup.service.ts`, `question-generator.service.ts`, `question-selector.service.ts`, `transcription.service.ts`, `knowledge.controller.ts`, `ingestion.processor.ts`, `knowledge-ingestion.service.ts`, `knowledge-retrieval.service.ts`, `circuit-breaker.ts`, todos los providers LLM (OpenAI/Gemini/Mock + embedding), `rag-question-generator.service.ts`, `catalogs.service.ts`, `catalogs.controller.ts`, `admin-questions.controller.ts`, `admin-audit.controller.ts`.

### Detalle de archivos con líneas no cubiertas

| Archivo | Stmts % | Líneas no cubiertas | Comentario |
|---|---|---|---|
| `auth/strategies/jwt-cookie.strategy.ts` | 90 | L19 | replace `\\n→\n` en PEM (cobertura de branch ya documentada en 3A). |
| `common/redis.service.ts` | 92.3 | 15, 19 | Listeners de error de ioredis (no instrumentables sin emit real). |
| `common/filters/http-exception.filter.ts` | 94.73 | 24 | Rama "string response" (cubierta en spec; coverage no captura el cast). |
| `evaluation/processors/evaluation.processor.ts` | 100 | branches 74-85, 119, 166 | Ramas defensivas de OOM/falla extrema (documentadas en 3A). |
| `health/health.controller.ts` | 97.36 | 29 | Branch `evaluationQueue.status === 'fulfilled' ? ... : ...` (camino fail cubierto, pero coverage no captura la sub-rama exacta). |
| `interviews/interviews.service.ts` | 100 stmts / 92.68 branches | branches 106, 170, 173 | Ramas de chequeos opcionales (languageId/frameworkId con valores extremos). |
| `interviews/answers/answers.service.ts` | 100 stmts / 97.61 branches | branch 199 | Rama "el siguiente question no tiene answers asociadas". |
| `knowledge/services/chunking.service.ts` | 92.72 | 26-28 | Rama "current chunk vacío al cortar" (documentada en 3A). |
| `reports/reports.service.ts` | 28.02 | 102, 236-332, 385-848 | Cobertura preexistente; no se añadieron specs nuevos (módulo no en INCLUIDO de 3B). |

---

## Módulos diferidos confirmados

Los siguientes paths están excluidos vía `coveragePathIgnorePatterns` en
`backend/package.json` (ver `diferidos_qa.md` para la justificación
detallada):

- `src/achievements/` — D-7 (gamificación, no declarada en RF)
- `src/challenges/` — D-7 (gamificación, no declarada en RF)
- `src/notifications/` — D-7 (comunicación, no declarada en RF)
- `src/reports/reports.controller.ts` — D-7 (controlador wrapper)
- `src/reports/shared-report.controller.ts` — D-7 (compartir reportes)
- `src/reports/career-prediction.service.ts` — D-7 (feature avanzada)
- `src/reports/transfer-learning.service.ts` — D-7 (feature avanzada)
- `src/reports/job-profiles.ts` — D-7 (catálogo estático sin RF)

> `reports.service.ts` **NO** está diferido — su cobertura preexistente
> (28 %) figura en el agregado global; los métodos que mapean a
> RF-32–RF-36 (dashboard, history, report detail) están parcialmente
> cubiertos por `reports.service.spec.ts`.

---

## Archivos de prueba creados en 3B

```
backend/src/interviews/
  templates.service.spec.ts                          (16 tests)
  templates.controller.spec.ts                       (9 tests)
  interviews.controller.spec.ts                      (3 tests)
  interviews.service.spec.ts                         (+4 tests; total 16)
  services/question-selector.service.spec.ts         (5 tests)
  services/question-generator.service.spec.ts        (3 tests)
  services/followup.service.spec.ts                  (3 tests)
  services/transcription.service.spec.ts             (5 tests)
  services/embedding.service.spec.ts                 (2 tests)
  answers/answers.service.spec.ts                    (+14 tests; total 23)
  answers/answers.controller.spec.ts                 (8 tests)

backend/src/catalogs/
  catalogs.service.spec.ts                           (6 tests)
  catalogs.controller.spec.ts                        (7 tests)
  admin-questions.controller.spec.ts                 (13 tests — RF-42)
  admin-audit.controller.spec.ts                     (2 tests)

backend/src/common/
  audit.service.spec.ts                              (6 tests)
  cache.interceptor.spec.ts                          (8 tests)
  env.validation.spec.ts                             (10 tests)
  prisma.service.spec.ts                             (2 tests)
  redis.service.spec.ts                              (11 tests)
  filters/http-exception.filter.spec.ts              (5 tests)

backend/src/health/
  health.controller.spec.ts                          (8 tests)

backend/src/knowledge/
  knowledge.controller.spec.ts                       (13 tests)
  processors/ingestion.processor.spec.ts             (2 tests)
```

**Total de tests nuevos en 3B: 164.**

---

## Tests marcados con `it.todo()`

Ninguno. Todas las correcciones intermedias se resolvieron en ≤ 3 intentos.

---

## Hallazgos para el informe

1. **Drift cero entre código y tests del núcleo** — al cierre de 3B no se
   detectaron específicaciones desactualizadas (todos los specs nuevos se
   escribieron con la firma actual del código de producción).
2. **`reports.service.ts` arrastra cobertura** — al 28 % y NO diferido,
   reduce ~3 pp el promedio global. Posible candidato a revisión en una
   fase posterior si el tutor confirma su alcance.
3. **Audit trail vivo (RNF-24)** — `AuditService` se invoca desde
   `AuthController` en register/login con `userId`, `action`, `entity`,
   `entityId`. Los specs nuevos verifican que los campos correctos se
   persisten.
4. **`adaptNextQuestion` (dificultad adaptativa)** — Los tests cubren los
   4 caminos lógicos (upgrade exitoso, detected ≤ chosen, no hay siguiente
   pregunta, no hay harder en el banco). Es lógica de negocio relevante
   no declarada explícitamente en los RF; podría merecer un RF futuro.
5. **Catalogs sin escritura** — el módulo `catalogs` no tiene endpoints
   de escritura para roles/languages/frameworks/levels/skills, lo que
   confirma la justificación de D-5 (RF-37–RF-41 diferidos).

---

## Notas técnicas nuevas (incrementales)

### NT-006 — `reflect-metadata` en specs de class-validator

Detectado al escribir `env.validation.spec.ts`: `class-validator` y
`class-transformer` requieren `import 'reflect-metadata'` para que las
decoraciones de la clase queden registradas. Otros specs lo cargan
transitivamente vía NestJS; los specs que usan `validate()` directamente
deben importarlo en el preámbulo.

### NT-007 — Pasa-through interceptor para `CacheInterceptor` en tests de controladores

`CatalogsController` usa `@UseInterceptors(CacheInterceptor)` a nivel de
clase. Sin Redis disponible en el test, el interceptor real fallaría al
intentar leer/escribir caché. Solución: `Test.createTestingModule(...)
.overrideInterceptor(CacheInterceptor).useValue(passThroughInterceptor)`
con un interceptor que solo invoca `next.handle()`. Patrón reusable para
cualquier controller con interceptors externos.

(Se añaden al final de `qa/00-inventario/notas_tecnicas.md`.)

---

## Verificación de criterios obligatorios

- ✅ **Tests sólidos, AAA explícito, sin aserciones vacías.**
- ✅ **Cero modificaciones al código de producción** en 3B.
- ✅ **Cero dependencias instaladas nuevas** en 3B.
- ✅ **Mocks deterministas** de LLM, embeddings, Prisma, ioredis, BullMQ y fetch.
- ✅ **Decisión D-7 documentada** con `diferidos_qa.md` y `coveragePathIgnorePatterns`.
- ✅ **RF-42 (admin de preguntas)** cubierto con 13 tests (find, export JSON/CSV, import, create, update, delete).
- ✅ **Casos borde por método** (autorización por propiedad, conflicto, not found, paginación, formatos).

---

## Capturas pendientes (para informe final)

```bash
# Backend — abrir el reporte HTML de Istanbul:
cd backend && start ../coverage/lcov-report/index.html
# Para árbol por carpeta: click en cada subdirectorio del módulo.
```

El reporte HTML está en `coverage/lcov-report/index.html` (raíz del proyecto, no dentro de backend).

---

## Próximo paso (Sub-corrida 3C)

**Detengo aquí. Espero tu luz verde para 3C (frontend).**

Plan tentativo para 3C:
1. **Auth pages** — completar validación de formularios y redirects por rol.
2. **Interview flow** — InterviewWizardPage, InterviewSessionPage, InterviewConfirmationPage, FeedbackPage.
3. **Visualización** — DashboardPage, FeedbackHistoryPage, gráficos de evaluación.
4. **Hooks y stores** — useAuth, useSessionTimeout, auth.store, lib/roleHome.
5. **Componentes auxiliares** — ProtectedRoute, AppLayout, GlobalSearch.
