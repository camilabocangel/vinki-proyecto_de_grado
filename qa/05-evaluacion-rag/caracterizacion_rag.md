# Caracterización del pipeline RAG de Vinki (Fase 6-PRE)

> **Propósito:** describir, mediante lectura del código real del SUT,
> el pipeline RAG que la Fase 6 evaluará con Ragas. Sin esta
> caracterización, la evaluación quedaría desconectada del sistema y
> mediría una caja negra. La fuente autoritativa es el código en
> `backend/src/knowledge/` y `backend/src/rag/`.
>
> **Fecha:** 2026-05-21.
> **Vinculado a:** RF-29, RF-30, RF-31, D-6 (alcance dual del RAG),
> plan maestro § 5.5 (métricas IA con umbrales).

---

## 1. Visión general del pipeline

```
   ┌─────────────────────┐
   │  Knowledge document │  (markdown plano subido vía POST /knowledge)
   └──────────┬──────────┘
              │
              ▼
   ┌──────────────────────────┐
   │  ChunkingService          │  chunks de ~800 tokens, overlap ~100,
   │  (split por párrafo +     │  fallback a split por sentencia si un
   │   sentence-aware fallback)│  párrafo excede 800
   └──────────┬───────────────┘
              │
              ▼
   ┌──────────────────────────────┐
   │  OpenaiEmbeddingService       │  text-embedding-3-small, dim 1536
   │  (batch embedding por chunk)  │  (mock = vector ceros en sandbox)
   └──────────┬───────────────────┘
              │
              ▼
   ┌──────────────────────────────────────────┐
   │  PostgreSQL + pgvector                    │
   │  knowledge_chunks(content, embedding,     │  status del documento padre
   │                    document_id, ...)      │  debe ser 'ready'
   │  knowledge_documents(status, language_id, │
   │                       framework_id, ...)  │
   └──────────┬───────────────────────────────┘
              │
              ▼ (RETRIEVAL — RF-30)
   ┌──────────────────────────────────────────────────┐
   │  KnowledgeRetrievalService.searchRelevantChunks   │
   │  1. embed(query) → vector                          │
   │  2. SELECT … FROM knowledge_chunks                │
   │     WHERE kd.status='ready'                       │
   │       AND ($lang IS NULL OR kd.language_id=$lang)│
   │       AND ($fw IS NULL OR kd.framework_id=$fw)   │
   │     ORDER BY embedding <=> $query::vector ASC     │
   │     LIMIT 5  (configurable, default 5)            │
   └──────────┬───────────────────────────────────────┘
              │
              ▼ (GENERACIÓN — RF-31)
   ┌──────────────────────────────────────────────────┐
   │  Consumidores del retrieval (D-6 — dual):         │
   │                                                    │
   │  (a) RagQuestionGeneratorService                   │
   │      systemPrompt + userPrompt incluye context     │
   │      del top-k → gpt-4o-mini → JSON con preguntas │
   │      (RF-31 / RAG en generación de preguntas)     │
   │                                                    │
   │  (b) KnowledgeController.searchKnowledge (endpoint │
   │      público para recruiter/admin que devuelve    │
   │      directamente los chunks)                      │
   └──────────────────────────────────────────────────┘
```

---

## 2. Detalle por etapa

### 2.1 Fuentes de conocimiento (ingesta)

- **Formato:** texto plano (campo `rawContent: string`); típicamente
  Markdown sin syntax especial. No hay parseo de PDF, HTML ni binarios
  en el MVP — la ingesta espera contenido textual ya extraído.
- **Endpoint:**
  [`POST /api/knowledge`](../../backend/src/knowledge/knowledge.controller.ts)
  con DTO `IngestDocumentDto` (title, content, sourceUrl?,
  languageId?, frameworkId?).
- **Estado del documento:** `'processing' | 'ready' | 'failed'`.
  Solo `status='ready'` es consultable por el retrieval (filtro hard
  en la query SQL).
- **Auth:** `@Roles('recruiter','admin')` — el corpus se cura desde
  el lado de los recruiters/admin, no del estudiante.
- **Corpus actual del proyecto:** 5 documentos del seed de dev
  ([`backend/prisma/seed.ts:944-1127`](../../backend/prisma/seed.ts)),
  todos backend / Backend Engineer:
  1. *Node.js Event Loop y Arquitectura Asíncrona* (Node.js)
  2. *Diseño de APIs RESTful — Mejores Prácticas* (Express)
  3. *PostgreSQL — Optimización y Patrones Avanzados* (PostgreSQL)
  4. *Arquitectura de Microservicios con NestJS* (NestJS)
  5. *Seguridad en Aplicaciones Backend*

### 2.2 Chunking — [`ChunkingService`](../../backend/src/knowledge/services/chunking.service.ts)

| Parámetro | Valor | Decisión |
|---|---|---|
| `maxTokens` | 800 | Hard-coded en `chunking.service.ts:11` |
| `overlapTokens` | 100 | Hard-coded `chunking.service.ts:12` |
| `estimateTokens(text)` | `ceil(text.split(/\s+/).length * 1.3)` | Aproximación basada en palabras; no usa tokenizer real (tiktoken) |
| Estrategia primaria | Split por `\n{2,}` (párrafos) | Respeta la estructura semántica del texto |
| Fallback | Split por sentencias (`/[^.!?]+[.!?]+/`) si un párrafo excede `maxTokens` | Evita chunks gigantes |
| Overlap | Últimas N palabras del chunk anterior (N ≈ 100/1.3 ≈ 77) | Continuidad semántica entre chunks |

**Observaciones para la evaluación:**
- 800 tokens es un valor razonable (típico 256–1024).
- La estimación por palabra × 1.3 sobreestima vs `tiktoken` (que es
  el tokenizador real de OpenAI). En la práctica los chunks
  resultantes son **más pequeños** que los 800 tokens nominales.
- El overlap evita la pérdida de información en bordes pero NO
  garantiza recuperación perfecta para queries cuya respuesta cruza
  un borde de chunk (relevante para Context Recall).

### 2.3 Embeddings — [`OpenaiEmbeddingService`](../../backend/src/llm/services/openai-embedding.service.ts)

| Parámetro | Valor |
|---|---|
| Modelo | `text-embedding-3-small` |
| Dimensión | **1536** (hard-coded `getDimensions()` + `EMBEDDING_DIMENSIONS=1536` en `.env.test`) |
| Batch | `embedBatch(texts)` — un solo llamado a OpenAI con todos los chunks del documento |
| Circuit breaker | `OpenAI-Embedding` (mismo wrapper `CircuitBreaker` que el LLM) |
| Modo sandbox (D-10) | `MockEmbeddingService` devuelve `new Array(1536).fill(0)` — vector cero |

### 2.4 Almacenamiento — `knowledge_chunks` (pgvector)

```sql
CREATE TABLE knowledge_chunks (
  id          SERIAL PRIMARY KEY,
  document_id INT REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  chunk_index INT,
  content     TEXT,
  token_count INT,
  embedding   vector(1536),    -- pgvector
  created_at  TIMESTAMP
);
```

Inserción vía raw SQL (Prisma no soporta `vector` nativo, NT-016):

```sql
INSERT INTO knowledge_chunks (...)
VALUES ($1, $2, $3, $4, $5::vector, NOW())
```

### 2.5 Retrieval — [`KnowledgeRetrievalService.searchRelevantChunks`](../../backend/src/knowledge/services/knowledge-retrieval.service.ts)

```sql
SELECT kc.content,
       kc.embedding <=> $1::vector AS distance,
       kd.title AS document_title
FROM knowledge_chunks kc
JOIN knowledge_documents kd ON kd.id = kc.document_id
WHERE kd.status = 'ready'
  AND kc.embedding IS NOT NULL
  AND ($2::int IS NULL OR kd.language_id = $2)
  AND ($3::int IS NULL OR kd.framework_id = $3)
ORDER BY distance ASC
LIMIT $4
```

| Aspecto | Valor |
|---|---|
| Métrica de distancia | **Coseno** (`<=>` operator de pgvector) — menor distancia = más similar |
| Top-k | **5 por default** (parámetro `limit` configurable hasta 20 vía DTO) |
| Filtros opcionales | `languageId`, `frameworkId` (intersección con el documento padre) |
| Umbral de distancia | **NO se aplica umbral** — el sistema devuelve siempre los top-k, incluso si la similitud es baja. *(Implicación importante para evaluación de OOD: el retrieval siempre devuelve algo.)* |
| Sin índice vectorial | El campo `embedding` no tiene índice IVFFlat/HNSW en el schema actual — la query es scan secuencial. Con corpus pequeño (50 chunks del seed) es eficiente; a gran escala (10 000 chunks del seed-perf) requeriría índice (no medido en Fase 5-A porque cumplió P95 < 500ms hasta 20 u). |

### 2.6 Generación de respuesta

Vinki tiene **dos consumidores** del retrieval (D-6 — alcance dual):

**(a) Generación de preguntas RAG** —
[`RagQuestionGeneratorService`](../../backend/src/rag/services/rag-question-generator.service.ts).
Llamado desde `InterviewsService.create` para enriquecer una
entrevista con 2 preguntas generadas a partir del corpus. Es el
flujo más relevante para evaluar fidelidad y relevancia.

Prompt template (líneas 36-39):

```ts
{
  systemPrompt:
    'Eres un experto en entrevistas técnicas. Genera preguntas de ' +
    'entrevista basadas EXCLUSIVAMENTE en el contenido técnico ' +
    'proporcionado. Las preguntas deben evaluar comprensión profunda ' +
    'de los conceptos del material.',
  userPrompt:
    `Basándote en el siguiente contenido técnico:\n\n${context}\n\n` +
    `Genera ${params.count} preguntas de entrevista técnica para un ` +
    `candidato nivel ${params.level} de ${params.roleText} trabajando ` +
    `con ${params.language}. Las preguntas deben evaluar comprensión ` +
    `profunda del contenido proporcionado. Responde en JSON: ` +
    `{ "questions": ["pregunta1", "pregunta2", ...] }`,
  temperature: 0.8,
}
```

- Modelo: `gpt-4o-mini` (real) o `MockLlmService` (sandbox).
- Temperature: 0.8 (alta variabilidad, deliberada para diversidad
  de preguntas).
- `response_format: json_object` — el modelo está obligado a
  devolver JSON parseable.
- Contexto: top-5 chunks concatenados con `\n\n---\n\n` como
  separador.

**(b) Búsqueda directa** — [`POST /api/knowledge/search`](../../backend/src/knowledge/knowledge.controller.ts).
Devuelve los chunks directamente, sin pasar por LLM. Lo usa la UI
del recruiter/admin para explorar el corpus. **NO entra en la
evaluación RAG** (no hay generación que medir).

### 2.7 Diferencias mock vs real (D-10 / D-15)

| Componente | Modo mock (`LLM_SANDBOX=true`) | Modo real |
|---|---|---|
| `OpenaiEmbeddingService` | `MockEmbeddingService` — vector `[0,...,0]` | text-embedding-3-small, dim 1536 |
| `OpenaiLlmService.generateJson` | `MockLlmService` — JSON hardcoded con heurística sobre la palabra clave `'preguntas'`/`'questions'` | gpt-4o-mini, temp 0.7-0.8 |

**Implicación para Fase 6:** la evaluación con Ragas debe correr
contra **el sistema real con LLM_SANDBOX=false** y `OPENAI_API_KEY`
configurada. Con mock activo, todas las preguntas generadas son
literales constantes y la evaluación Ragas mediría texto fijo, no
calidad RAG real. Esto está alineado con el plan maestro § 7
(entornos): la evaluación RAG corre en **Staging con LLM real**.

---

## 3. Mapeo al plan de pruebas (RF-29/30/31 + § 5.5)

| RF | Descripción | Implementación | Medible por |
|---|---|---|---|
| RF-29 | Almacenamiento de embeddings | `OpenaiEmbeddingService.embedBatch` + insert `vector` | Caracterización (no necesita Ragas) |
| RF-30 | Búsqueda por similitud | `KnowledgeRetrievalService.searchRelevantChunks` (coseno + top-5) | Context Precision + Context Recall en Ragas |
| RF-31 | Recuperación de contexto para IA | Composición de RF-29 + RF-30 + inyección en prompt | Faithfulness + Answer Relevancy en Ragas |

| Métrica del § 5.5 | Umbral | Cómo se mide |
|---|---|---|
| Faithfulness | ≥ 0.80 | Ragas — descomposición de respuesta en claims y verificación contra contexto recuperado |
| Answer Relevancy | ≥ 0.80 | Ragas — similitud de embedding entre pregunta original y preguntas re-generadas a partir de la respuesta |
| Context Precision | ≥ 0.70 | Ragas — ¿los chunks recuperados son relevantes para la respuesta esperada? |
| Hallucination Rate | ≤ 10 % | Complemento de Faithfulness + DeepEval (HallucinationMetric) |
| Latencia pipeline RAG | P95 < 5 s | Medida directa: `t_end - t_start` por pregunta (sin juez LLM) |

Mapeo a las 6 capacidades IA del proyecto:

| ID | Capacidad | Métrica Ragas/DeepEval | Umbral |
|---|---|---|---|
| **IA-01** | Faithfulness | `ragas.metrics.faithfulness` | ≥ 0.80 |
| **IA-02** | Answer Relevancy | `ragas.metrics.answer_relevancy` | ≥ 0.80 |
| **IA-03** | Context Precision | `ragas.metrics.context_precision` | ≥ 0.70 |
| **IA-04** | Context Recall | `ragas.metrics.context_recall` | ≥ 0.70 (añadido en Fase 6 — no estaba en § 5.5 pero es el complemento natural de Precision) |
| **IA-05** | Answer Correctness | `ragas.metrics.answer_correctness` | ≥ 0.70 |
| **IA-06** | Latencia | medida directa | P95 < 5 s |

---

## 4. Limitaciones documentadas

1. **El corpus actual son 5 documentos del seed de dev.** Esto es
   suficiente para una evaluación significativa pero no exhaustiva.
   Un corpus de producción tendría decenas o cientos de documentos
   curados por recruiters.
2. **No hay índice vectorial** en `knowledge_chunks.embedding`. Para
   el tamaño de corpus actual no es problema; para evaluación de
   RAG en producción sí sería.
3. **El `MockLlmService` heurístico** (no Vinki real) no representa
   el comportamiento generativo del sistema. Por eso Fase 6 debe
   correrse con `LLM_SANDBOX=false` (autorización pendiente del
   docente).
4. **El retrieval no aplica umbral de distancia** — devuelve siempre
   top-5 incluso si la similitud es baja. Para queries OOD esto
   significa que el sistema *siempre* tiene "contexto" (aunque
   irrelevante) que el LLM puede usar para alucinar. La evaluación
   Faithfulness es especialmente crítica para detectar esto.
5. **Temperature alta (0.8)** en generación de preguntas favorece
   variabilidad pero introduce no-determinismo entre corridas (R-4
   del plan maestro). Para Fase 6 se documentará el seed/temperature
   exacto usado.
