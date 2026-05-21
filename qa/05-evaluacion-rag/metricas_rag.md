# Métricas RAG — mapeo IA-01..IA-06 ↔ Ragas/DeepEval

> **Propósito:** definir formalmente las 6 capacidades IA del proyecto
> de grado (IA-01..IA-06) y mapearlas a métricas concretas y
> reproducibles de Ragas / DeepEval, con sus umbrales objetivo.
>
> **Fecha:** 2026-05-21.
> **Fuente normativa:** plan maestro § 5.5 (umbrales declarados) +
> caracterización del pipeline (`caracterizacion_rag.md`).

---

## 1. Tabla de mapeo IA ↔ métrica ↔ umbral

| ID | Capacidad | Métrica concreta | Umbral plan maestro | Notas |
|---|---|---|---|---|
| **IA-01** | Faithfulness — la respuesta se apoya en el contexto recuperado, no alucina | `ragas.metrics.faithfulness` | **≥ 0.80** | El plan maestro § 5.5 lo declara explícitamente. Refuerzo cruzado con DeepEval `HallucinationMetric` (mide la inversa). |
| **IA-02** | Answer Relevancy — la respuesta es relevante a la pregunta | `ragas.metrics.answer_relevancy` | **≥ 0.80** | Plan maestro § 5.5. Mide si la respuesta no se va por la tangente. |
| **IA-03** | Context Precision — los chunks recuperados son relevantes | `ragas.metrics.context_precision` | **≥ 0.70** | Plan maestro § 5.5. Penaliza al top-k que devuelve mucho ruido. |
| **IA-04** | Context Recall — se recuperaron los chunks relevantes (no se quedaron afuera) | `ragas.metrics.context_recall` | **≥ 0.70** (propuesto Fase 6) | NO declarado en § 5.5 pero es el complemento natural de Context Precision. Sin esta métrica, no se distinguiría un top-k vacío de uno relevante incompleto. Se adopta umbral simétrico (0.70). |
| **IA-05** | Answer Correctness — la respuesta coincide con el ground truth | `ragas.metrics.answer_correctness` | **≥ 0.70** (propuesto Fase 6) | El plan maestro § 5.5 menciona "Hallucination Rate ≤ 10 %" — éste es el complemento positivo. Se reporta ambos. |
| **IA-06** | Latencia del pipeline RAG completo | medida directa (Python `time.perf_counter()`) | **P95 < 5 s** | Plan maestro § 5.5 + D-17 (sobre el flujo asíncrono). Se mide por pregunta. |

Adicional (no IA-XX pero requerido por § 5.5):

| Métrica | Métrica concreta | Umbral plan maestro |
|---|---|---|
| Hallucination Rate (complemento de IA-01) | `deepeval.metrics.HallucinationMetric` (umbral inverso) | **≤ 10 %** |

---

## 2. Definición de cada métrica (lo que Ragas mide)

### IA-01 — Faithfulness

> "¿Cada claim en la respuesta del LLM está respaldado por al menos
> un chunk en el contexto recuperado?"

**Cálculo (Ragas):**

1. El juez LLM descompone la respuesta del sistema en N "claims"
   atómicos.
2. Para cada claim, el juez evalúa si puede inferirse del contexto
   recuperado (boolean).
3. `faithfulness = claims_soportados / total_claims`.

**Interpretación:**
- 1.00 → ningún claim alucinado.
- 0.50 → la mitad de los claims no están en el contexto (preocupante).
- 0.00 → todo alucinado.

**Vinki — caso esperado:**
- In-domain (id 1-10): debería ser muy alto (> 0.85) si el pipeline
  recupera bien.
- Edge-case (id 11-13): puede bajar si el sistema mezcla
  conocimiento general con el contexto. Lo medimos.
- OOD (id 14-15): **debería ser bajo o N/A**. Si el sistema responde
  algo "razonable" para una pregunta OOD pero sin contexto, Ragas
  reporta faithfulness baja (toda la respuesta es claim no
  soportado). Si el sistema responde "no tengo información",
  faithfulness ≈ alta porque hay 0 claims.

### IA-02 — Answer Relevancy

> "¿La respuesta efectivamente responde a la pregunta planteada?"

**Cálculo (Ragas):**

1. El juez LLM genera N preguntas alternativas que el `answer`
   podría estar respondiendo (típicamente N=3).
2. Calcula similitud de embedding entre cada pregunta generada y
   la `question` original.
3. `answer_relevancy = media(similitud)`.

**Interpretación:**
- 1.00 → todas las re-preguntas son idénticas a la original = la
  respuesta apunta exactamente a la pregunta.
- < 0.50 → la respuesta probablemente se va por las ramas.

### IA-03 — Context Precision

> "Del top-k recuperado, ¿qué fracción es relevante para responder
> a la pregunta?"

**Cálculo (Ragas):**

1. Para cada chunk en el contexto recuperado, el juez evalúa si es
   relevante al ground truth (binary, weighted by rank).
2. `context_precision = MAP@K` (Mean Average Precision con
   ponderación por posición — chunks relevantes arriba pesan más).

**Interpretación:**
- 1.00 → todos los chunks recuperados son relevantes, y los más
  relevantes están al inicio.
- 0.50 → mezcla 50/50 relevante/no relevante.

### IA-04 — Context Recall

> "¿El contexto recuperado contiene toda la información necesaria
> para responder según el ground truth?"

**Cálculo (Ragas):**

1. El juez descompone el ground_truth en claims atómicos.
2. Para cada claim, evalúa si está representado en el contexto
   recuperado.
3. `context_recall = claims_en_contexto / total_claims_groundtruth`.

**Interpretación:**
- 1.00 → todo el contenido necesario está en el top-k.
- 0.50 → faltan chunks importantes (el retrieval no es exhaustivo).

### IA-05 — Answer Correctness

> "¿La respuesta del sistema coincide con el ground truth?"

**Cálculo (Ragas):**

- Combina dos sub-métricas: F1 sobre claims (TP/FP/FN entre claims
  de answer y claims de ground_truth) y similitud semántica
  (embedding cosine).
- `answer_correctness = weighted(F1_claims, semantic_similarity)`
  con pesos por default 0.75 / 0.25.

**Interpretación:** valor único en [0, 1]. > 0.70 indica buena
correspondencia tanto léxica como semántica.

### IA-06 — Latencia

> "Tiempo total entre recibir la pregunta y devolver la respuesta
> con el contexto."

**Cálculo (medida directa, sin juez LLM):**

```python
t0 = time.perf_counter()
context = retrieval.search(query)
answer = llm.generate(prompt=template.format(context=context, query=query))
t1 = time.perf_counter()
latency_ms = (t1 - t0) * 1000
```

Se reportan P50, P95, P99 sobre las 15 muestras. El umbral del plan
maestro es **P95 < 5 s** (consistente con RNF-01).

### Hallucination Rate (DeepEval)

> "Fracción de preguntas donde el modelo introdujo información que
> NO está en el contexto."

`HallucinationMetric` de DeepEval funciona similar a Faithfulness
de Ragas pero con un juez distinto (también `gpt-4o-mini` por
costo). Permite **verificación cruzada** entre dos implementaciones
independientes de la misma idea (Ragas vs DeepEval), lo cual
fortalece la defensa académica.

`hallucination_rate = (1 - mean(deepeval_faithfulness_scores))`.

Umbral del plan maestro § 5.5: **≤ 10 %** (es decir, mean ≥ 0.90).
Nota: este es **más estricto** que el umbral de IA-01 (≥ 0.80).
El reporte final debe explicar la coherencia: IA-01 mide
faithfulness por respuesta; Hallucination Rate es promedio. Pueden
divergir si una sola respuesta tiene faithfulness baja pero el
resto está perfecto.

---

## 3. Estrategia de reporte

Para cada una de las 15 preguntas se reportará:

```json
{
  "id": 1,
  "category": "in-domain",
  "question": "...",
  "answer": "...",                       // respuesta generada por Vinki
  "retrieved_contexts": ["chunk1", ...], // top-5 recuperados
  "ground_truth": "...",
  "metrics": {
    "faithfulness": 0.95,
    "answer_relevancy": 0.88,
    "context_precision": 0.80,
    "context_recall": 0.75,
    "answer_correctness": 0.82,
    "deepeval_hallucination": 0.05
  },
  "latency_ms": 3240
}
```

**Agregados:**

| Métrica | Valor por pregunta | Agregado | Umbral § 5.5 |
|---|---|---|---|
| Faithfulness | float [0,1] | media | ≥ 0.80 |
| Answer Relevancy | float [0,1] | media | ≥ 0.80 |
| Context Precision | float [0,1] | media | ≥ 0.70 |
| Context Recall | float [0,1] | media | ≥ 0.70 |
| Answer Correctness | float [0,1] | media | ≥ 0.70 |
| Hallucination Rate (DeepEval) | float [0,1] | media | ≤ 0.10 |
| Latencia | ms | P50, P95, P99 | P95 < 5000 ms |

**Por categoría:** se reportarán los agregados también separados
en in-domain / edge-case / OOD para distinguir el comportamiento
del sistema en cada caso (el plan maestro no lo exige pero es
información valiosa para el informe).

---

## 4. Criterio de éxito de la Fase 6

La Fase 6 se considera **VERDE** si:

1. **IA-01..IA-06 sobre in-domain (N=10) cumplen los umbrales del
   plan maestro § 5.5.** Es el criterio principal — refleja el
   comportamiento productivo del sistema.
2. Para edge-case y OOD, el reporte caracteriza el comportamiento
   sin exigir umbrales (es información cualitativa).
3. El Hallucination Rate global (sobre las 15) está ≤ 10 %.
4. La latencia P95 está bajo 5 s (sobre las 15 muestras).

La Fase 6 se considera **AMARILLA** si:

- Una sola métrica IA-XX queda entre el umbral y umbral − 0.05 (zona
  de incertidumbre estadística con N=15).
- Recomendación: ampliar dataset a 25-30 preguntas y re-evaluar.

La Fase 6 se considera **ROJA** si:

- Una métrica IA-XX queda más de 0.05 por debajo del umbral.
- Recomendación: investigar causa raíz (¿chunking malo? ¿prompt
  débil? ¿top-k insuficiente?) y proponer fix en el reporte.

---

## 5. Limitaciones declaradas

1. **N=15 → CI amplios**. Con 15 muestras, la varianza de cada
   métrica es alta. Un Faithfulness de 0.85 ± 0.08 NO es
   estadísticamente distinto de 0.80. Se reportará el intervalo
   de confianza al 95 % junto con la media.
2. **Juez = mismo modelo que generador** (`gpt-4o-mini` ↔
   `gpt-4o-mini`). Sesgo conocido. Documentado en
   `metodologia_dataset.md` § 5.
3. **Reproducibilidad limitada por temperatura del SUT** (0.8 en
   `RagQuestionGeneratorService`). Cada corrida puede dar respuestas
   distintas. Para la corrida oficial se fijará `seed=42` si OpenAI
   lo permite, y se reportará la varianza inter-corridas si el
   presupuesto lo permite (mínimo 2 corridas independientes).
4. **Costo del juez** es proporcional al número de claims y al
   número de métricas. Para 15 preguntas × 5 métricas Ragas + 1
   DeepEval = ~$0.02-0.20 USD. Aceptable.
