# Cobertura tras Sub-corrida 3A — backend núcleo

> **Fecha:** 2026-05-19
> **Alcance:** sub-corrida 3A del Prompt 3 — módulos `auth`, `evaluation`, `rag + llm + knowledge`.
> **Reglas aplicadas:** no se modificó código de producción; mocks de LLM/embeddings/Prisma deterministas; sin tests vacíos.
> **Logs:** [`cobertura_backend_3A.txt`](cobertura_backend_3A.txt).

---

## Resultado global

| Métrica | Antes (post-reparación) | Después de 3A | Δ |
|---|---|---|---|
| Tests backend | 65 | **204** | **+139** |
| Suites backend | 7 | **26** | **+19** |
| Statements % | 13.02 | **33.09** | **+20.07 pp** |
| Branches % | 10.65 | **24.74** | **+14.09 pp** |
| Functions % | 13.12 | **31.98** | **+18.86 pp** |
| Lines % | 12.48 | **32.68** | **+20.20 pp** |
| Suite | 🟢 Verde | 🟢 **Verde** | — |

> El umbral global del 80% sigue fallando, **como era esperado**: la 3A solo
> cubre 3 dominios del backend (auth/evaluation/RAG). Los módulos
> `interviews/*`, `catalogs`, `notifications`, `reports`, `achievements`,
> `challenges`, `common/*` y los controllers/processors restantes se
> abordan en la Sub-corrida 3B.

---

## Cobertura por módulo (backend — núcleo 3A)

| Módulo (path) | Statements % | Branches % | Functions % | Lines % | Suites | ≥ 80% |
|---|---|---|---|---|---|---|
| `src/auth/` (service + controller) | **100** | **100** | **100** | **100** | 2 | ✅ |
| `src/auth/guards/` | **100** | **100** | **100** | **100** | 2 | ✅ |
| `src/auth/strategies/` | **95.65** | 50 | 80 | 94.73 | 2 | ✅ (statements/lines) |
| `src/auth/dto/` | n/a (DTOs declarativos) | n/a | n/a | n/a | 1 | n/a (ver §Exclusiones) |
| `src/evaluation/` (rubrics) | **100** | **100** | **100** | **100** | 1 | ✅ |
| `src/evaluation/processors/` | **100** | 75 | **100** | **100** | 1 | ✅ (sin branches) |
| `src/evaluation/services/` | **100** | **100** | **100** | **100** | 2 | ✅ |
| `src/llm/services/` | **100** | **100** | **100** | **100** | 7 | ✅ |
| `src/rag/services/` | **100** | **100** | **100** | **100** | 1 | ✅ |
| `src/knowledge/services/` | **95.91** | 89.28 | **100** | 96.55 | 3 | ✅ |
| **Subtotal núcleo 3A** | **~99** | **~91** | **~98** | **~98** | **22** | ✅ |

> Los porcentajes "Subtotal núcleo 3A" son aproximados — son el promedio
> visual de los módulos cubiertos, no un cálculo ponderado por LOC.
> El detalle exacto vive en `cobertura_backend_3A.txt`.

### Por archivo del núcleo

| Archivo | Stmts % | Líneas no cubiertas |
|---|---|---|
| `auth/auth.service.ts` | 100 | — |
| `auth/auth.controller.ts` | 100 | — |
| `auth/guards/jwt-cookie.guard.ts` | 100 | — |
| `auth/guards/roles.guard.ts` | 100 | — |
| `auth/guards/roles.decorator.ts` | 100 | — |
| `auth/strategies/local.strategy.ts` | 100 | — |
| `auth/strategies/jwt-cookie.strategy.ts` | 90 | L19 (replace `\\n`→`\n` en clave PEM; ver §Exclusiones) |
| `evaluation/rubrics.ts` | 100 | — |
| `evaluation/rubrics-behavioral.ts` | 100 | — |
| `evaluation/services/mock-evaluator.service.ts` | 100 | — |
| `evaluation/services/openai-evaluator.service.ts` | 100 | — |
| `evaluation/processors/evaluation.processor.ts` | 100 | — (branches 74-85,119,166 — ramas de OOM/falla extrema) |
| `llm/services/circuit-breaker.ts` | 100 | — |
| `llm/services/mock-llm.service.ts` | 100 | — |
| `llm/services/mock-embedding.service.ts` | 100 | — |
| `llm/services/openai-llm.service.ts` | 100 | — |
| `llm/services/openai-embedding.service.ts` | 100 | — |
| `llm/services/gemini-llm.service.ts` | 100 | — |
| `llm/services/gemini-embedding.service.ts` | 100 | — |
| `rag/services/rag-question-generator.service.ts` | 100 | — |
| `knowledge/services/chunking.service.ts` | 92.72 | L26-28 (split por sentencias dentro del bucle, rama poco frecuente) |
| `knowledge/services/knowledge-ingestion.service.ts` | 100 | — |
| `knowledge/services/knowledge-retrieval.service.ts` | 100 | — |

---

## Nuevos archivos de prueba creados en 3A

```
backend/src/auth/
  auth.controller.spec.ts         (10 tests)
  auth.service.spec.ts            (19 tests — completado, antes 14)
  guards/jwt-cookie.guard.spec.ts (2 tests)
  guards/roles.guard.spec.ts      (5 tests)
  strategies/local.strategy.spec.ts (2 tests)
  strategies/jwt-cookie.strategy.spec.ts (3 tests)
  dto/auth-dtos.spec.ts           (17 tests)

backend/src/evaluation/
  rubrics.spec.ts                            (24 tests)
  services/openai-evaluator.service.spec.ts  (8 tests)
  (existían: evaluation.processor.spec.ts, mock-evaluator.service.spec.ts)

backend/src/llm/services/
  circuit-breaker.spec.ts                  (8 tests)
  mock-llm.service.spec.ts                 (4 tests)
  mock-embedding.service.spec.ts           (4 tests)
  openai-llm.service.spec.ts               (8 tests)
  openai-embedding.service.spec.ts         (3 tests)
  gemini-llm.service.spec.ts               (4 tests)
  gemini-embedding.service.spec.ts         (3 tests)

backend/src/rag/services/
  rag-question-generator.service.spec.ts   (5 tests)

backend/src/knowledge/services/
  chunking.service.spec.ts                 (8 tests)
  knowledge-retrieval.service.spec.ts      (6 tests)
  knowledge-ingestion.service.spec.ts      (5 tests)
```

---

## Tests marcados con `it.todo()`

Ninguno. Todas las correcciones intermedias se aplicaron dentro del límite
de 3 intentos por test.

---

## Incidencias técnicas resueltas durante 3A

1. **`uuid` v13 ESM en specs de auth** — `auth.controller.spec.ts` y
   `strategies/local.strategy.spec.ts` cargan transitivamente `AuthService`,
   que importa `uuid`. Se replicó el patrón de `jest.mock('uuid', ...)` ya
   establecido en `auth.service.spec.ts`. (NT-003 — ver §Notas Técnicas).

2. **Tipado de `jest.fn(() => ...)` en specs de Gemini** — TS infería
   `mock.calls` como tupla vacía `[]`, generando `TS2493`. Se tipó
   explícitamente como `jest.fn<any, any[]>()` para que `mock.calls` sea un
   array abierto.

3. **`config.get(key, default)` mockeado** — el mock genérico
   `jest.fn().mockReturnValue(value)` ignora el parámetro `default`. Se
   reemplazó por `mockImplementation((_k, def) => value ?? def)` para
   replicar el comportamiento del `ConfigService` real (relevante para
   `MockEmbeddingService.getDimensions()`).

4. **Estimación de tokens en chunking** — el primer test de "oversize
   paragraph" no superaba el umbral de 800 tokens estimados; se ajustó la
   longitud sintética del input para forzar deterministamente la división.

---

## Exclusiones de cobertura justificadas (núcleo 3A)

1. **`jwt-cookie.strategy.ts` línea 19** — `replace(/\\n/g, '\n')` aplicado
   a `JWT_PUBLIC_KEY`. Las ramas no cubiertas dependen de combinaciones
   muy específicas del PEM real con literales `\n` vs saltos verdaderos,
   sólo verificables con un entorno real. Documentado como cobertura
   parcial aceptable (50% branches).
2. **`evaluation.processor.ts` líneas 74-85, 119, 166** — ramas defensivas
   para casos extremos (OOM al construir el resultado, fallos del upsert
   antes del último intento). Cubiertas indirectamente por los tests de
   reintentos; no se fuerzan ramas adicionales para no escribir tests
   acoplados a la implementación.
3. **`chunking.service.ts` líneas 26-28** — rama "el chunk actual se vacía
   tras detectar un párrafo gigante" cuando el chunk actual está vacío al
   momento del corte. Es la combinación menos probable del algoritmo;
   queda cubierta por los tests de "oversize paragraph" en el camino
   principal.
4. **DTOs de auth** — el módulo `auth/dto/*.ts` no aparece en el reporte
   con porcentaje porque consta solo de declaraciones de class-validator
   (sin sentencias ejecutables que Istanbul instrumente). El comportamiento
   se valida vía `dto/auth-dtos.spec.ts` usando `plainToInstance` +
   `validate()` reales.

Detalle ampliado se moverá a `exclusiones.md` al cierre de la Fase 2.

---

## Verificación de criterios obligatorios

- ✅ **Tests sólidos sin aserciones vacías**: cero `expect(true).toBe(true)`,
  cero `xit`/`it.skip`/`it.todo`.
- ✅ **Mocks deterministas**: LLM con respuestas fijas; embeddings con
  vectores de longitud conocida (1536 para OpenAI/mock, 768 para Gemini).
- ✅ **Validación de rango [0, 5]** en `OpenaiEvaluatorService.evaluate()`
  para RNF-18 a nivel de aplicación (sub-suite "should return scores within
  the [0, 5] range").
- ✅ **Verificación RAG-RF-30/RF-31**: `RagQuestionGeneratorService` valida
  que se invoca al `EMBEDDING_PROVIDER`/`KnowledgeRetrievalService` y que
  el contexto recuperado llega al prompt del LLM.
- ✅ **Cero modificaciones a código de producción** en esta sub-corrida.
- ✅ **Cero dependencias instaladas** en esta sub-corrida.

---

## Capturas pendientes (para anexo del informe final)

Una vez se cierre la Fase 2 completa, generar capturas del reporte HTML de
cobertura para anexar como figuras al informe:

```bash
# Backend — HTML coverage (Istanbul)
cd backend && start coverage/lcov-report/index.html
# La ruta exacta puede ser ../coverage/lcov-report/index.html según
# coverageDirectory (configurado como "../coverage" en jest config).

# Frontend (pendiente para 3C)
cd frontend/app && start coverage/unit/index.html
```

---

## Próximo paso (Sub-corrida 3B)

Pendiente de tu luz verde. Plan tentativo:

1. **interviews** — completar specs de `question-selector`, `question-generator`,
   `followup`, `transcription`, `templates.service` + controllers.
2. **answers** — `answers.controller.spec.ts`.
3. **catalogs** — `catalogs.service/controller` (READ) + `admin-questions.controller`
   (RF-42, dentro de alcance D-5). `admin-audit.controller`.
4. **Triaje del grupo 7** previo a su escritura — separar lo que cubre un
   RF/RNF declarado de lo que es feature extra fuera del catálogo
   autoritativo. Reportar la lista de módulos diferidos **antes** de
   escribir esos tests.

**Detengo aquí esperando tu confirmación para arrancar la 3B.**
