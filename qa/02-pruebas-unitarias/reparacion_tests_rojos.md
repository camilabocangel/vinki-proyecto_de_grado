# Reparación de tests rojos preexistentes

**Fecha:** 2026-05-19
**Estrategia aplicada:** Reparación parcial dirigida (3 correcciones puntuales, sin tocar código de producción).
**Documento origen:** [`diagnostico_rapido.md`](diagnostico_rapido.md).
**Logs:** [`post_reparacion_backend.txt`](post_reparacion_backend.txt), [`post_reparacion_frontend.txt`](post_reparacion_frontend.txt).

---

## Resultado

| Métrica | Antes | Después |
|---|---|---|
| Tests backend pasando | 52 / 65 | **65 / 65** |
| Tests backend fallando | 13 | **0** |
| Suites backend pasando | 5 / 7 | **7 / 7** |
| Tests frontend pasando | 30 / 31 | **31 / 31** |
| Tests frontend fallando | 1 | **0** |
| Archivos de prueba frontend pasando | 9 / 10 | **10 / 10** |
| **Estado global** | 🔴 ROJA | 🟢 **VERDE** |

Tiempo invertido: ~25 minutos (alineado con la estimación del diagnóstico).

---

## Correcciones aplicadas

### Corrección 1 — `backend/src/interviews/interviews.service.spec.ts`

**Causa:** el `TestingModule` del spec proveía 3 de las 5 dependencias del constructor; los 12 tests caían en la fase de instanciación del módulo de Nest sin llegar a ninguna aserción.

**Cambio aplicado (solo en el spec, no en el servicio):**

1. Se importaron los símbolos faltantes:
   - `RagQuestionGeneratorService` desde `../rag/services/rag-question-generator.service`.
   - `EMBEDDING_PROVIDER` desde `../llm/interfaces/embedding-provider.interface`.
2. Se añadieron dos mocks deterministas en `beforeEach`:
   - `ragGenerator.generateQuestions` devuelve `[]` por defecto, de modo que el flujo cae al camino *"curated only"* y las aserciones existentes mantienen sentido sin modificarlas.
   - `embeddingProvider.embed` devuelve un vector fijo de 1536 dimensiones (`new Array(1536).fill(0)`) — compatible con el tipo `vector(1536)` del esquema Prisma. También se mockearon `embedBatch` y `getDimensions` para cubrir la interfaz `IEmbeddingProvider` completa.
3. Ambos providers se registraron en `Test.createTestingModule`.

**Tests recuperados:** 12 (todos los `create()`, `findOne()`, `finish()` de `InterviewsService`).

### Corrección 2 — `backend/src/evaluation/evaluation.processor.spec.ts`

**Causa:** el método `evaluator.evaluate()` ganó un segundo argumento `isBehavioral: boolean` (línea 68 de `evaluation.processor.ts`). El test seguía esperando una llamada con un único argumento.

**Cambio aplicado (solo en el spec):** se actualizó la aserción `toHaveBeenCalledWith` (línea ~118) para pasar dos argumentos: el array de `answerInputs` y `false` como `isBehavioral` (el interview mockeado no tiene `mode: 'behavioral'`, por lo que `interviewData?.mode === 'behavioral'` es `false`).

**Tests recuperados:** 1 (`should load answers, call evaluator, and persist results`).

### Corrección 3 — `frontend/app/src/pages/auth/LoginPage.test.tsx`

**Causa:** el logo "V" del `LoginPage` se eliminó al rediseñar el shell de autenticación. La aserción `screen.getByText('V')` ya no encuentra ningún nodo.

**Cambio aplicado (solo en el test):** se reemplazó por `screen.getByText(/Vinki/i)`, que matchea el texto producido por `t('auth.welcomeTo')` — *"Bienvenido a Vinki"* en español o *"Welcome to Vinki"* en inglés (verificado en `i18n/locales/{es,en}.json`). Mantiene el espíritu del test: validar que la marca Vinki está visible en la página de login.

> Nota: el test homólogo de `RegisterPage` sigue usando `getByText('V')` y pasa porque `RegisterPage.tsx` aún conserva `<div className="vinki-auth-logo-icon">V</div>`. Esa inconsistencia entre los dos shells es un hallazgo de UX/branding (no de QA) y queda anotado para revisión en otra fase.

---

## Archivos modificados (solo tests, NO código de producción)

| Archivo | Tipo |
|---|---|
| [backend/src/interviews/interviews.service.spec.ts](../../backend/src/interviews/interviews.service.spec.ts) | Spec backend |
| [backend/src/evaluation/evaluation.processor.spec.ts](../../backend/src/evaluation/evaluation.processor.spec.ts) | Spec backend |
| [frontend/app/src/pages/auth/LoginPage.test.tsx](../../frontend/app/src/pages/auth/LoginPage.test.tsx) | Spec frontend |

Ningún archivo de producción (`*.ts`/`*.tsx` fuera de los specs) fue tocado.
Ninguna dependencia nueva se instaló.

---

## Re-verificación de CHECK constraints

Ejecutada tras levantar Docker Desktop y `docker compose up -d postgres`:

```sql
SELECT COUNT(*) FROM pg_constraint WHERE conname LIKE 'chk_%';
-- count: 7
```

| # | Constraint | Tipo | Definición |
|---|---|---|---|
| 1 | `chk_answer_evaluations_clarity_of_explanation_range` | CHECK | `clarity_of_explanation ∈ [0, 5]` |
| 2 | `chk_answer_evaluations_communication_range` | CHECK | `communication ∈ [0, 5]` |
| 3 | `chk_answer_evaluations_confidence_range` | CHECK | `confidence ∈ [0, 5]` |
| 4 | `chk_answer_evaluations_problem_solving_range` | CHECK | `problem_solving ∈ [0, 5]` |
| 5 | `chk_answer_evaluations_technical_correctness_range` | CHECK | `technical_correctness ∈ [0, 5]` |
| 6 | `chk_interview_questions_order_number_positive` | CHECK | `order_number > 0` |
| 7 | `chk_user_skill_scores_score_range` | CHECK | `score ∈ [0, 100]` |

**Resultado:** 7 / 7 constraints activas (RNF-18, RNF-19, RNF-20 cubiertos en BD).
Evidencia bruta: [`qa/00-inventario/reverificacion_constraints.txt`](../00-inventario/reverificacion_constraints.txt).

---

## Incidencias durante la reparación

Ninguna. Las 3 correcciones se aplicaron como estaban planeadas en el diagnóstico y la suite pasó en la primera ejecución posterior a los cambios.

---

## Resultado de las suites tras la reparación

### Backend

```
Test Suites: 7 passed, 7 total
Tests:       65 passed, 65 total
Snapshots:   0 total
Time:        29.435 s
```

### Frontend

```
Test Files  10 passed (10)
     Tests  31 passed (31)
  Duration  20.99 s
```

---

## Lección aprendida (para el informe final)

> Durante la auditoría inicial de QA se detectó que la suite de tests
> preexistente había sufrido *drift* respecto al código de producción: el
> sistema evolucionó incorporando el módulo RAG, un proveedor de
> embeddings y reglas de evaluación behavioral, pero los tests no fueron
> actualizados. La reparación dirigida restableció 14 tests en
> aproximadamente 25 minutos, sin requerir modificaciones al código de
> producción. Esto evidencia la importancia de mantener la suite de
> pruebas como parte integral del ciclo de desarrollo y no como
> artefacto puntual.

---

## Siguiente paso

Con la suite preexistente en verde y el threshold de cobertura aún en
13% (backend) / bajo (frontend), la **Fase 2 (Prompt 3)** puede comenzar
a escribir las pruebas reales de alta cobertura sobre los módulos
priorizados: autenticación, evaluación con IA, módulo RAG y el flujo de
entrevista del frontend.
