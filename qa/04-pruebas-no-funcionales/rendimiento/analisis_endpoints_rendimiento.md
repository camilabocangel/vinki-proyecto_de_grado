# Análisis previo a pruebas de rendimiento — Fase 5

> **Propósito:** investigación previa de la configuración del LLM
> mockeado y de los endpoints reales que cubrirán los RNF-01, RNF-02
> y RNF-03 con Apache JMeter (Decisión D-9).
>
> **Estado:** investigación de código únicamente — **no se modificó
> ningún archivo del SUT ni se instaló JMeter**.
>
> **Fecha:** 2026-05-20.

---

## 1. Configuración del LLM mock

### 1.1 Variable de entorno principal: `LLM_SANDBOX`

Variable única que controla el modo sandbox/mock de TODOS los
servicios IA del backend. Default si no se setea: `'true'`
(comportamiento conservador: por defecto NO se llama al proveedor
real).

| Servicio inyectado | Mock activado con | Real activado con |
|---|---|---|
| `EVALUATOR_SERVICE` (`backend/src/evaluation/evaluation.module.ts:22-27`) | `LLM_SANDBOX=true` (o ausente) → `MockEvaluatorService` | `LLM_SANDBOX=false` → `OpenaiEvaluatorService` |
| `EMBEDDING_PROVIDER` (`backend/src/llm/llm.module.ts:22-37`) | `LLM_SANDBOX=true` → `MockEmbeddingService` | `LLM_SANDBOX=false` + `LLM_EMBEDDING_PROVIDER=openai|gemini` |
| `LLM_PROVIDER` (`backend/src/llm/llm.module.ts:38-53`) | `LLM_SANDBOX=true` → `MockLlmService` | `LLM_SANDBOX=false` + `LLM_TEXT_PROVIDER=openai|gemini` |

**Conclusión:** una sola variable `LLM_SANDBOX=true` desactiva
completamente las llamadas al LLM real (OpenAI/Gemini) en TODOS los
puntos donde el backend lo usaría.

### 1.2 Configuración por archivo de entorno

| Archivo | `LLM_SANDBOX` | Implicación |
|---|---|---|
| `backend/.env` (dev) | `false` ⛔ | Dev usa **OpenAI real** — NO usar para JMeter (costos + flake) |
| `backend/.env.test` (integración + E2E) | `true` ✅ | Modo mock — apto para JMeter |
| `backend/.env.example` | `"true"` | Plantilla documentada como sandbox por default |

### 1.3 Comportamiento de los mocks (latencia interna)

Verificado leyendo los 3 servicios mock:

| Servicio | Archivo | Comportamiento | Latencia introducida |
|---|---|---|---|
| `MockEvaluatorService.evaluate()` | `backend/src/evaluation/services/mock-evaluator.service.ts` | Itera el array de `answers` con `.map()` y devuelve scores random entre 3.0–5.0, feedback hardcoded y respuestas por nivel hardcoded. Sin I/O ni `setTimeout`. | **~0 ms** (síncrono efectivo) |
| `MockEmbeddingService.embed()` | `backend/src/llm/services/mock-embedding.service.ts` | Devuelve `new Array(1536).fill(0)`. | **~0 ms** |
| `MockLlmService.generateJson() / generateText()` | `backend/src/llm/services/mock-llm.service.ts` | Devuelve objeto/string hardcoded basado en heurística de palabra clave (`'preguntas'`/`'questions'`). | **~0 ms** |

**Limitación crítica para Fase 5** ⚠ — los mocks responden de forma
prácticamente instantánea. Esto significa que **la latencia medida en
JMeter con `LLM_SANDBOX=true` refleja únicamente el overhead del
pipeline del backend** (Nest pipeline + Guards + ValidationPipe +
serialización + DB + BullMQ + Redis + pgvector), **NO el costo real
del LLM**. Detalle en sección 4 (Riesgos / consideraciones).

### 1.4 Comando exacto para arrancar el backend en modo mock

Asumiendo que `docker-compose.test.yml` está levantado (postgres-test
puerto 5434, redis-test puerto 6381) y que las migraciones están
aplicadas contra la DB de test:

```pwsh
# PowerShell (Windows):
$envVars = @{}
Get-Content backend\.env.test | ForEach-Object {
  if ($_ -match '^\s*([A-Z_]+)=(.*)$') { $envVars[$matches[1]] = $matches[2] }
}
foreach ($k in $envVars.Keys) { Set-Item -Path "Env:$k" -Value $envVars[$k] }
npm --prefix backend run start
```

```bash
# bash / WSL:
export $(grep -v '^#' backend/.env.test | xargs -d '\n')
npm --prefix backend run start
```

Verificación rápida de que el modo mock está activo:

```bash
curl http://127.0.0.1:3002/api/health
# → { status:"ok", database:"connected", redis:"connected", ... }
```

(Nota: `.env.test` define `PORT=3002`, no 3000. El frontend dev usa
3000 vía `.env`; el backend de pruebas usa 3002.)

---

## 2. Endpoints a medir

### 2.1 Tabla consolidada

| RNF | Endpoint | Método | Auth requerida | Síncrono/Asíncrono | Notas |
|---|---|---|---|---|---|
| Smoke previo | `/api/health` | `GET` | **No** | Síncrono | Devuelve `{status, database, redis, evaluationQueue, storage}`. Cero LLM. Útil para warm-up + sanity check de JMeter. |
| **RNF-01** vía finish + polling | `/api/interviews/:id/finish` + polling `/api/interviews/:id` | `POST` → `GET` | `student` (cookie JWT RS256) | **Asíncrono** | Encola job BullMQ, el worker procesa con `EVALUATOR_SERVICE`. Latencia E2E = finish-ack → `evaluationStatus='completed'`. Patrón ya probado en integración (NT-015). |
| **RNF-01** vía `evaluate-now` | `/api/interviews/:id/questions/:qid/evaluate-now` | `POST` | `student` (cookie JWT) | **Síncrono** | Camino para modo `practice`. Llama directamente a `EVALUATOR_SERVICE.evaluate()` y devuelve la evaluación inline. **Recomendado para medir P95 del componente evaluador sin la complejidad del polling**. Requiere que la entrevista esté creada en `mode: 'practice'` y que exista una respuesta previa. |
| **RNF-02** | `/api/knowledge/search` | `POST` | `recruiter` o `admin` (cookie JWT) | **Síncrono** | Body `{query, languageId?, frameworkId?, limit?}`. Pipeline: `embed(query)` → SELECT pgvector `<=> ::vector ORDER BY distance LIMIT N`. Filtra `knowledge_documents.status='ready'`. |
| **RNF-03 step 1** | `/api/auth/login` | `POST` | No (la consume) | Síncrono | Body `{email, password}`. Devuelve cookies httpOnly `access_token` y `refresh_token`. JMeter debe usar Cookie Manager. |
| **RNF-03 step 2** | `/api/interviews` | `POST` | `student` (cookie JWT) | Síncrono pero pesado | Body `{roleId, languageId?, frameworkId?, chosenLevelId, mode?}`. Dispara `QuestionSelectorService` (embed + pgvector) y opcionalmente `RagQuestionGeneratorService` (LLM). En mock: instantáneo; en real: ~1-3 s. |
| **RNF-03 step 3** | `/api/interviews/:id/questions/:qid/answer` | `POST` | `student` | Síncrono ligero | Body `{answerText, audioUrl?, answeredInSeconds?}`. Solo persiste; NO llama al LLM. |

### 2.2 Notas operativas por endpoint

#### Health

```
GET /api/health
HTTP 200
{
  "status": "ok" | "degraded",
  "timestamp": "...",
  "database": "connected" | "disconnected",
  "redis": "connected" | "disconnected",
  "evaluationQueue": { "waiting": N, "active": N, "failed": N },
  "storage": "connected" | "disconnected" | "not_configured"
}
```

Sin auth, sin rate limiting específico (sí general 100/60s del
ThrottlerModule). Apto para usar como **smoke previo** en JMeter
antes de cada test plan.

#### RNF-01 — evaluación (asíncrono vía finish)

Flujo en producción real (modo `evaluation`):

```
1. POST /api/interviews                        → 201 { id, questions: [...] }
2. (repetir N veces para cada pregunta:)
   POST /api/interviews/:id/questions/:qid/answer  → 201 { id, answerText, ... }
3. POST /api/interviews/:id/finish              → 201 { interviewId, evaluationStatus: 'processing' }
4. (polling)
   GET /api/interviews/:id                     → { evaluationStatus: 'pending' | 'processing' | 'completed' | 'failed' }
```

**La métrica para RNF-01** (P95 < 5 s) es el tiempo entre el ack del
paso 3 y el primer GET del paso 4 que reporte `'completed'`. En
JMeter esto se modela con un **bucle "While Controller"** que polea
el `GET /api/interviews/:id` con intervalo corto (200-500 ms) hasta
detectar `evaluationStatus=='completed'`, registrando el tiempo
acumulado como sample.

#### RNF-01 — evaluación (síncrono vía evaluate-now)

```
POST /api/interviews/:id/questions/:qid/evaluate-now
HTTP 201
{
  id, answerId, technicalCorrectness, clarityOfExplanation,
  communication, confidence, problemSolving, detectedLevelId,
  feedbackText, juniorAnswer, midAnswer, seniorAnswer
}
```

**Precondiciones:**
- Interview debe existir con `mode: 'practice'`.
- Debe existir una respuesta previa para esa `interviewQuestion`
  (`/answer` ya enviado).
- El interview NO debe haber sido finalizado.

**Ventaja para JMeter:** una sola request, sin polling. Mide el
costo del evaluador end-to-end (con o sin mock).

#### RNF-02 — búsqueda semántica

```
POST /api/knowledge/search
Cookie: access_token=...
Content-Type: application/json
{ "query": "node event loop", "limit": 5 }

HTTP 200
{ "results": [ { "content": "...", "distance": 0.123, "documentTitle": "..." } ] }
```

**Importante:** el filtro `kd.status = 'ready'` en
`knowledge-retrieval.service.ts:36` exige que los documentos del seed
para JMeter tengan `status='ready'`. **El seed E2E actual sembraba
con `status='completed'`** — esto es relevante para reutilizar el
seed E2E directamente en JMeter:

- Opción A (recomendada): crear un seed dedicado para JMeter en
  `qa/04-pruebas-no-funcionales/rendimiento/data/seed-perf.ts` que
  inserte documentos con `status='ready'`.
- Opción B: ajustar el seed E2E (un cambio en `seed.ts:357` cambiando
  `'completed'` por `'ready'`). Verificar antes que no rompa los E2E.

#### RNF-03 — concurrencia 50 usuarios

Flujo recomendado por JMeter Thread Group con 50 hilos:

1. (Setup) Pre-generar 50 usuarios student dedicados a perf via SQL
   directo o un script seed.
2. Cada hilo:
   a. `POST /api/auth/login` con sus credenciales → captura cookies.
   b. `POST /api/interviews` con catálogos seedeados → captura `id`.
   c. Para cada pregunta retornada: `POST .../answer` con texto fijo.
   d. `POST /api/interviews/:id/finish`.
3. Métricas: throughput, error rate, P95 de cada paso individual.

**Importante:** el backend tiene `ThrottlerModule` con límite
**100 req/60s short + 300 req/60s long por IP**. En JMeter local los
50 hilos comparten la misma IP `127.0.0.1` y triggerán **429 Too
Many Requests**. Hay que:

- Aumentar/desactivar los límites del Throttler **solo para el
  entorno de pruebas de carga** (vía env si está configurado, o
  documentar este conocido — habrá que ajustar la config o hacer
  excepción).
- Actualmente los límites están **hardcoded en `app.module.ts:42-52`** —
  para Fase 5 puede ser necesario una propuesta adicional (similar a
  HE-01 y HE-05) sobre cómo manejar el rate limiting durante pruebas
  de carga. Reportar al usuario antes de aplicar.

---

## 3. Estrategia recomendada de medición

### 3.1 Configuración base del entorno

- **DB:** `vinki-postgres-test` puerto 5434 (mismo que integración +
  E2E). O un docker-compose dedicado `docker-compose.perf.yml` si se
  prefiere aislar.
- **Redis:** `vinki-redis-test` puerto 6381.
- **Backend:** levantado con `.env.test` (`LLM_SANDBOX=true`,
  `PORT=3002`, claves RSA reales). Esto evita llamadas al LLM real
  durante las corridas de JMeter.
- **JMeter:** invocado desde la misma máquina o desde una máquina
  cliente — documentar topology.

### 3.2 Mediciones específicas por RNF

#### RNF-01 (P95 < 5 s) — recomendación: medir con `evaluate-now`

| Razón | Detalle |
|---|---|
| Simplicidad | 1 request, sin polling. JMeter sample = latency directo. |
| Reproducibilidad | Mismo evaluador (`MockEvaluatorService`) que el flujo asíncrono — la lógica del evaluador es idéntica. |
| Aislamiento | Mide el costo del evaluador + persistencia. Sin overhead de BullMQ/queue (que se mide aparte en RNF-03). |

**Limitación a documentar:** con mock, el `evaluate-now` responde
en ~10-50 ms (overhead de framework + insertar AnswerEvaluation +
update UserSkillScore vía EMA). Esto es muy por debajo del umbral
P95 < 5 s, pero refleja **arquitectura, no LLM real**.

**Estrategia complementaria:** documentar como "validación
arquitectónica" (similar a D-3 para RNF-04). Si el tutor exige
medir con LLM real, ejecutar un subset reducido (10-20 muestras) con
`LLM_SANDBOX=false` y `OPENAI_API_KEY` válida, asumiendo el costo
(~$0.05-0.10 USD por corrida).

#### RNF-02 (P95 < 500 ms) — `POST /api/knowledge/search`

JMeter Test Plan con:
- 1 thread, ramp-up = 0, 1000 iteraciones para medir baseline.
- Query fija (ej. `"node event loop"`) para reproducibilidad.
- Seed con N documentos: 10, 100, 1000, 10000 (escalado del umbral).
- Métrica: P95, P99, throughput.

**Limitación:** con `MockEmbeddingService` el embed es instantáneo;
la latencia real medida es solo el query pgvector + serialización.
Para reflejar OpenAI embeddings reales (~50-150 ms), opción de
correr subset con `LLM_SANDBOX=false`.

#### RNF-03 (≥ 50 usuarios sin degradación) — flujo completo

JMeter Thread Group:
- 50 threads, ramp-up = 30 s (1.67 users/s).
- Loop 1 iteración por user (cada user hace el flujo completo una vez).
- Test plan = login → create-interview → 3× answer → finish → polling
  hasta completed.
- Throttler debe estar desactivado o muy elevado (ver § 4.5).

**Métrica:** percentiles end-to-end del flujo + throughput + error
rate. Aceptable si error rate < 1 % y P95 del flujo completo
mantiene umbral razonable (a definir — el plan maestro no fija un
umbral específico para "sin degradación").

### 3.3 Smoke previo recomendado

Antes de cada corrida de carga, ejecutar 30 s contra
`GET /api/health` para:
1. Verificar que backend + DB + Redis están up.
2. Warmup del JIT de Node.js y del connection pool de Prisma.
3. Validar conectividad de JMeter.

---

## 4. Riesgos / consideraciones

### 4.1 Mock vs. proveedor real — limitación de medición

⚠ **El mock responde en ~0 ms.** Las mediciones de RNF-01 y RNF-02
con `LLM_SANDBOX=true` reflejan únicamente:

- Overhead del pipeline Nest (Guards, Pipes, Filters, serialización).
- Latencia de DB (Prisma + pgvector).
- Latencia de BullMQ/Redis (solo en RNF-01 asíncrono).
- Latencia de Express/Node event loop bajo carga.

**NO reflejan:**
- Latencia real del LLM (típicamente 1-3 s para evaluación, 100-300
  ms para embedding, según el modelo).
- Rate limits del proveedor.
- Network jitter al data center del proveedor.

**Recomendación profesional:** documentar la limitación explícitamente
en el informe y reportar dos métricas:

1. **Latencia arquitectónica** (mock activo) — P95 del overhead del
   backend, debe estar muy por debajo del umbral del RNF.
2. **Latencia con LLM real** (mock desactivado, subset reducido) —
   un puñado de muestras para confirmar que el LLM real se ajusta al
   presupuesto del RNF.

Esto es alineado con D-3 (RNF-04 como validación arquitectónica).
El tutor puede aceptar la combinación como evidencia suficiente, o
exigir corridas más largas con LLM real (a costo).

### 4.2 Endpoint asíncrono RNF-01 — el polling

`POST /api/interviews/:id/finish` solo encola el job; la evaluación
ocurre en `EvaluationProcessor` (worker BullMQ) en background. La
latencia "P95 < 5 s" del RNF-01 se refiere implícitamente al
**tiempo total user-perceived hasta ver `evaluationStatus='completed'`**.

JMeter modela esto con un **While Controller**:

```
Thread Group
├── POST /finish   (timer.start)
├── While Controller (until status=='completed' or timeout)
│     ├── GET /interviews/:id
│     └── Assert: status field
└── Timer.stop → sample latency
```

Plugin recomendado: `Inter-Thread Communication Plugin` o
`JSR223 Sampler` con Groovy para acumular el tiempo en una sola
muestra agregada.

### 4.3 Seed con `status='ready'` para RNF-02

El seed E2E sembrado por Fase 4 usa `status='completed'` para los
documentos de KnowledgeBase. **El query de búsqueda exige
`status='ready'`** (`knowledge-retrieval.service.ts:36`). Sin ajustar
esto, todas las búsquedas devuelven `[]`, lo que invalidaría la
medición de pgvector.

**Acción para Fase 5:** crear `seed-perf.ts` dedicado o reutilizar
seed E2E con `status='ready'` (un cambio de un literal).

### 4.4 Auth y Cookie Manager en JMeter

El backend usa cookies httpOnly RS256 para auth. JMeter necesita:

- **HTTP Cookie Manager** habilitado a nivel de Thread Group.
- Después de `POST /api/auth/login` las cookies `access_token` y
  `refresh_token` quedan persistidas en el cookie jar del thread.
- Cada request subsiguiente lleva automáticamente las cookies.
- Cuidado con threads paralelos: cada uno debe loguearse con sus
  propias credenciales para no compartir cookies entre usuarios.

Las cookies tienen `httpOnly`, `secure: false` (NODE_ENV=test) y
`sameSite: lax`. En JMeter local sobre HTTP esto funciona; en
staging con HTTPS necesitaría TLS configurado.

### 4.5 ThrottlerModule — rate limiting bloqueará las pruebas

`backend/src/app.module.ts:42-52` configura:

```ts
ThrottlerModule.forRoot([
  { name: 'short', ttl: 60000, limit: 100 },
  { name: 'long',  ttl: 60000, limit: 300 },
]),
```

**100 req/60s por IP** mata cualquier prueba de carga desde
`127.0.0.1`. Opciones para Fase 5:

| Opción | Pros | Contras |
|---|---|---|
| **A. Desactivar Throttler en `.env.test` vía variable** | Limpio si la app lo soporta | Actualmente los límites están **hardcoded** — requiere modificar `app.module.ts` para leer límites de env. Cambio de código de producción. |
| **B. Saltarse el Throttler con un decorator `@SkipThrottle()` en los endpoints medidos** | Cambios localizados | Cambio de código de producción + cambia comportamiento del endpoint. |
| **C. JMeter distribuido desde múltiples IPs** | No requiere cambios de producción | Complejo en local; necesita varios hosts/contenedores. |
| **D. Aumentar los límites solo en perfil "perf" del backend (env vars)** | Limpio si la app lo soporta | Requiere refactor del `app.module.ts`. |

**Recomendación a discutir con el tutor antes de iniciar Fase 5:**
opción A o D — refactor pequeño del `ThrottlerModule.forRoot` para
leer límites del env. Es un cambio de producción que sería mejor
hacer formalmente vía decisión D-14 (analogía a D-9, D-13). De lo
contrario, la suite no podrá ejercer 50 usuarios concurrentes.

### 4.6 BullMQ workers y consumo de recursos

En el flujo asíncrono RNF-01, cada `POST /finish` encola un job.
Bajo 50 usuarios concurrentes, BullMQ procesará 50 jobs en paralelo
(o secuencialmente según concurrency configurado). Verificar en
`EvaluationProcessor` si hay límite de concurrency y documentar.

Para Fase 5: medir también la **profundidad de la cola** (la métrica
`evaluationQueue.waiting` del `/api/health`) durante la corrida.
Si crece desbordada, es señal de cuello de botella en el worker.

### 4.7 PORT del backend en pruebas

`.env.test` define `PORT=3002`. JMeter debe apuntar a
`http://127.0.0.1:3002/api` (no 3000 que es la dev) para no chocar
con el backend de desarrollo si está corriendo. Si se prefiere
mantener separación total, levantar JMeter contra un backend
levantado expresamente para perf (puede compartir el mismo binario
y la misma DB de test).

---

## 5. Próximos pasos (no ejecutados aquí)

1. Pre-Fase 5: registrar **D-14** sobre cómo manejar el
   ThrottlerModule en pruebas de carga (opciones A-D de § 4.5).
   Esperar autorización del tutor.
2. Pre-Fase 5: decidir estrategia mock-vs-real (§ 4.1) — recomendado
   "validación arquitectónica con mock + subset reducido con LLM
   real". Confirmar con el tutor.
3. Fase 5 inicio: instalar JMeter 5.x localmente.
4. Fase 5: crear `qa/04-pruebas-no-funcionales/rendimiento/data/seed-perf.ts`
   con 50 usuarios student y documentos con `status='ready'`.
5. Fase 5: diseñar los 3 planes `.jmx` (RNF-01, RNF-02, RNF-03) +
   smoke.
6. Fase 5: ejecutar y capturar reportes HTML/CSV con percentiles.
7. Fase 5: análisis de seguridad (`npm audit`, Semgrep,
   `eslint-plugin-security`) — ya pre-configurado en Fase 2.5.
