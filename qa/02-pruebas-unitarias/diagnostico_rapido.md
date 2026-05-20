# Diagnóstico de tests rojos preexistentes

**Fecha:** 2026-05-19
**Alcance:** únicamente diagnóstico. NO se modificó código de producción ni de pruebas.
**Logs crudos:**
- [`diagnostico_backend_raw.txt`](diagnostico_backend_raw.txt) — `node_modules/.bin/jest --verbose --no-coverage` desde `backend/`.
- [`diagnostico_frontend_raw.txt`](diagnostico_frontend_raw.txt) — `node_modules/.bin/vitest run --reporter=verbose` desde `frontend/app/`.

**Total de tests rojos:** **14** (13 backend + 1 frontend).
**Suites:** 2 backend (de 7) y 1 archivo de pruebas frontend (de 10) presentan fallos.
**Antigüedad común:** todos los archivos de prueba fallidos provienen de un único commit `e6b794a` con mensaje *"test: add comprehensive unit and E2E tests for all modules"* del **2026-03-20** (~2 meses). El frontend tuvo una pasada posterior `33548c3` de retoque, pero no tocó la aserción rota del login.

---

## Tabla por test

| # | Workspace | Archivo | Suite/Describe | Test | Error resumido (1 línea) | Categoría hipotética | Antigüedad estimada |
|---|---|---|---|---|---|---|---|
| 1 | backend | `src/evaluation/evaluation.processor.spec.ts` | `EvaluationProcessor` | `should load answers, call evaluator, and persist results` | `evaluator.evaluate` ahora recibe 2 args (`answers, isBehavioral`); el test espera 1 arg. | **A** | 2026-03-20 (commit `e6b794a`) |
| 2 | backend | `src/interviews/interviews.service.spec.ts` | `InterviewsService › create()` | `should throw ConflictException if an active interview exists` | DI falla: `RagQuestionGeneratorService` (idx 2) + `EMBEDDING_PROVIDER` no provistos al `TestingModule`. | **A** | 2026-03-20 |
| 3 | backend | `src/interviews/interviews.service.spec.ts` | `InterviewsService › create()` | `should throw NotFoundException if role not found` | Mismo DI faltante (test nunca arranca). | **A** | 2026-03-20 |
| 4 | backend | `src/interviews/interviews.service.spec.ts` | `InterviewsService › create()` | `should throw NotFoundException if no questions found` | Mismo DI faltante. | **A** | 2026-03-20 |
| 5 | backend | `src/interviews/interviews.service.spec.ts` | `InterviewsService › create()` | `should create an interview with questions and return it` | Mismo DI faltante. | **A** | 2026-03-20 |
| 6 | backend | `src/interviews/interviews.service.spec.ts` | `InterviewsService › create()` | `should handle optional languageId and frameworkId` | Mismo DI faltante. | **A** | 2026-03-20 |
| 7 | backend | `src/interviews/interviews.service.spec.ts` | `InterviewsService › findOne()` | `should return the interview with questions` | Mismo DI faltante. | **A** | 2026-03-20 |
| 8 | backend | `src/interviews/interviews.service.spec.ts` | `InterviewsService › findOne()` | `should throw NotFoundException if interview does not exist` | Mismo DI faltante. | **A** | 2026-03-20 |
| 9 | backend | `src/interviews/interviews.service.spec.ts` | `InterviewsService › findOne()` | `should throw ForbiddenException if user does not own the interview` | Mismo DI faltante. | **A** | 2026-03-20 |
| 10 | backend | `src/interviews/interviews.service.spec.ts` | `InterviewsService › finish()` | `should mark interview as finished and enqueue evaluation job` | Mismo DI faltante. | **A** | 2026-03-20 |
| 11 | backend | `src/interviews/interviews.service.spec.ts` | `InterviewsService › finish()` | `should throw NotFoundException if interview not found` | Mismo DI faltante. | **A** | 2026-03-20 |
| 12 | backend | `src/interviews/interviews.service.spec.ts` | `InterviewsService › finish()` | `should throw ForbiddenException if user does not own the interview` | Mismo DI faltante. | **A** | 2026-03-20 |
| 13 | backend | `src/interviews/interviews.service.spec.ts` | `InterviewsService › finish()` | `should throw ConflictException if interview is already finished` | Mismo DI faltante. | **A** | 2026-03-20 |
| 14 | frontend | `src/pages/auth/LoginPage.test.tsx` | `LoginPage` | `shows Vinki branding` | `screen.getByText('V')` no existe: el logo "V" fue reemplazado por una imagen `<img alt="Vinki">`. | **A** | 2026-03-20 |

---

## Patrones detectados

### Concentración

- **12 de los 13 errores del backend están en un único archivo**: `backend/src/interviews/interviews.service.spec.ts` (todos los `describe` `create()`, `findOne()`, `finish()`).
- **1 error del backend** está en `backend/src/evaluation/evaluation.processor.spec.ts`.
- **1 error del frontend** está en `frontend/app/src/pages/auth/LoginPage.test.tsx`.

### Causa raíz dominante: drift entre código de producción y tests

Los 12 fallos de `InterviewsService` comparten **una sola causa raíz**: el
constructor de `InterviewsService` ahora declara 5 dependencias y el
`Test.createTestingModule` del spec solo provee 3.

| Posición | Dependencia (código actual) | ¿Provista por el test? |
|---|---|---|
| 1 | `PrismaService` | ✅ |
| 2 | `QuestionSelectorService` | ✅ |
| 3 | `RagQuestionGeneratorService` | ❌ falta |
| 4 | `@Inject(EMBEDDING_PROVIDER) IEmbeddingProvider` | ❌ falta |
| 5 | `@InjectQueue('evaluation') Queue` | ✅ |

Como Nest falla al instanciar el módulo, **ninguna de las 12 aserciones llega a evaluarse**. Por eso 12 tests caen idénticamente con el mismo mensaje `Nest can't resolve dependencies ... RagQuestionGeneratorService at index [2]`. **Un solo arreglo (añadir dos providers mock) rehabilita las 12 pruebas**.

El fallo de `EvaluationProcessor` tiene la misma naturaleza pero en otro
punto: el método `evaluator.evaluate()` ganó un segundo argumento (`isBehavioral: boolean`) y la aserción del test sigue esperando un solo argumento.

El fallo del frontend es exactamente la misma clase: el marcado del componente cambió (el logo "V" se reemplazó por una imagen) y la aserción quedó fosilizada.

> **Conclusión del patrón:** los tests fueron escritos en una única tanda
> (commit `e6b794a` del 2026-03-20) cuando el código tenía menor superficie;
> el código de producción evolucionó después —se incorporó RAG, el provider
> de embeddings y rúbricas behaviorales, y se rediseñó el logo del login—
> y los tests no se mantuvieron al ritmo del cambio. Es un caso típico de
> **stale tests por falta de mantenimiento**, no un caso de bugs reales.

### Módulos críticos afectados

Los tres archivos rotos cubren áreas que el plan maestro marca como
prioridad alta:

| Archivo | Requerimientos cubiertos | Criticidad |
|---|---|---|
| `interviews.service.spec.ts` | RF-09 (persistencia de configuración), RF-10–RF-13 (inicio/finalización/asignación de preguntas), RNF-07 (autorización por propiedad) | **Alta** — módulo central |
| `evaluation.processor.spec.ts` | RF-19–RF-25 (cinco dimensiones de evaluación + retroalimentación), RNF-01 (latencia de IA) | **Crítica** — núcleo IA/RAG |
| `LoginPage.test.tsx` | RF-02 (autenticación) | Media (UI) |

Estos tests son **valiosos**: cubren flujos centrales y siguen siendo
pertinentes; basta con realinearlos con el código actual.

---

## Distribución por categoría

| Categoría | Cantidad | % del total | Comentario |
|---|---|---|---|
| **A — arreglable fácilmente** | 14 | **100 %** | 12 por DI faltante en el TestingModule; 1 por signature de método cambiada; 1 por aserción contra UI obsoleta. |
| **B — test obsoleto** | 0 | 0 % | Ningún test prueba código eliminado: todas las clases bajo prueba existen y son centrales al negocio. |
| **C — bug real** | 0 | 0 % | El código de producción cambió **a propósito** (RAG agregado, segundo arg de evaluación, rebranding del logo). No hay defectos genuinos del SUT en estos fallos. |
| **D — autogenerado sin completar** | 0 | 0 % | Los specs tienen lógica de aserción real (mocks de Prisma, expects sobre métodos), no son skeletons de nest-cli. |

---

## Recomendación

### Estrategia: **Reparación parcial dirigida** (~25 minutos)

Como las 14 fallas son de categoría A, no hace falta ni *skipear* tests
(B) ni auditar código de producción (C). Tres ajustes pequeños recuperan
los 14 tests:

1. **`interviews.service.spec.ts` (~15 min, arregla 12 tests)**
   En el `beforeEach`, añadir dos providers al `TestingModule`:
   - `{ provide: RagQuestionGeneratorService, useValue: { generate: jest.fn() } }`
   - `{ provide: EMBEDDING_PROVIDER, useValue: { embed: jest.fn() } }`
   Importar los símbolos correspondientes desde `../rag/services/rag-question-generator.service` y desde la constante `EMBEDDING_PROVIDER` declarada en `llm/llm.module.ts` (verificar el path real).

2. **`evaluation.processor.spec.ts` (~5 min, arregla 1 test)**
   Actualizar la aserción `toHaveBeenCalledWith` para incluir el segundo
   argumento `isBehavioral` (en este caso `false` para preguntas no
   conductuales). Es un cambio puntual en la línea 118.

3. **`LoginPage.test.tsx` (~5 min, arregla 1 test)**
   Reemplazar `screen.getByText('V')` por una aserción válida contra el
   marcado actual del logo. Tras una inspección rápida del componente, la
   alternativa más estable es buscar la imagen por su `alt`:
   `screen.getByAltText('Vinki')`, o el heading que contiene `t('auth.hello')`.

> Tiempo total estimado: **~25 minutos** para recuperar las 14 pruebas.
> No requiere instalar dependencias, ni modificar el código de producción.

### Por qué NO se elige *limpieza rápida* ni *auditoría profunda*

- **No es "limpieza rápida"**: ningún test es B ni D. Borrar o *skipear*
  estos 14 sería perder 14 tests útiles que cubren áreas críticas.
- **No es "auditoría profunda"**: no hay categoría C. Los cambios del
  código de producción son evolutivos y deseados (RAG, behavioral
  rubrics, rebranding); el bug está en el test, no en producción.

### Casos C (bug real)

**Ninguno detectado.** El análisis no encontró indicios de defectos en el
código de producción a partir de los 14 fallos. Si durante la *reparación
dirigida* de la Fase 2 emerge algún comportamiento inesperado del SUT
(p. ej. al revivir las aserciones), se reclasificará y se reportará por
separado.

---

## Tests previamente *skipped*

Búsqueda en todo el repositorio:

```bash
grep -rnE '\b(it|test|describe)\.skip\b|\b(xit|xtest|xdescribe)\b|\.todo\(' \
  --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx'
```

Resultado: **0 coincidencias**. No hay tests con `.skip`, `.todo`,
`xit`, `xtest` ni `xdescribe` en el código. No quedan bugs viejos
abandonados disfrazados como tests omitidos.

---

## Anexo — comandos exactos para reproducir

```bash
# Backend
cd backend
NODE_OPTIONS=--max-old-space-size=4096 node_modules/.bin/jest --verbose --no-coverage

# Frontend
cd frontend/app
node_modules/.bin/vitest run --reporter=verbose
```

Pre-requisitos: `npm ci` en cada workspace y `node_modules/.bin/prisma generate` en `backend/`.
