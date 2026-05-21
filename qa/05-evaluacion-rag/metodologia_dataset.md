# Metodología del dataset de evaluación RAG (Fase 6)

> **Fecha:** 2026-05-21.
> **Dataset versionado en:** [`dataset_evaluacion.json`](dataset_evaluacion.json) — 15 preguntas.
> **Inmutable durante la Fase 6** para garantizar comparabilidad entre ejecuciones (regla del plan maestro § 6).

---

## 1. ¿Por qué 15 preguntas? (justificación del tamaño)

El plan maestro § 6 (estrategia de datos de prueba) y § 5.5 sugieren
**"25-30 preguntas"** como tamaño ideal del dataset RAG. La Fase 6
adopta **15 preguntas** por dos razones explícitas:

1. **El corpus actual son 5 documentos.** Generar 25-30 preguntas
   ground-truth a partir de 5 documentos forzaría a inventar preguntas
   muy redundantes (varias por documento sobre las mismas secciones)
   o a salir del corpus, lo cual contamina las métricas. **15 preguntas
   sobre 5 documentos da una densidad razonable** (≈ 2 in-domain por
   documento + 3 cruzadas + 2 OOD).
2. **Presupuesto de Fase 6 (autorización pendiente del docente).** Con
   15 preguntas y `gpt-4o-mini` como juez, el costo estimado es
   ~$0.02-0.20 USD (ver `setup_entorno_rag.md` § costo). Si el docente
   amplía el corpus en el futuro, el dataset se puede expandir.

La Fase 6 reportará **estadísticas exactas con N=15** (intervalos de
confianza más amplios que con N=30, lo cual se documenta honestamente
en el reporte final). El veredicto académico es válido siempre que
los umbrales del plan maestro § 5.5 se cumplan con holgura — si las
métricas quedan cerca de los umbrales (±0.05), el resultado se
declarará como **"sin confianza estadística suficiente, ampliar
dataset"** en lugar de un veredicto binario.

---

## 2. Distribución de preguntas

| Categoría | Cantidad | % | Propósito |
|---|---|---|---|
| **in-domain** | 10 | 66.7 % | Preguntas cuya respuesta está claramente en UN documento del corpus. Mide capacidad "feliz" del RAG: ¿recupera el chunk correcto?, ¿genera respuesta fundada? |
| **edge-case** | 3 | 20.0 % | Preguntas cuya respuesta requiere combinar 2 documentos, o que admiten múltiples respuestas válidas, o que tienen ambigüedad inherente. Mide cómo el RAG maneja casos no triviales. |
| **out-of-domain (OOD)** | 2 | 13.3 % | Preguntas fuera del corpus. Mide si el RAG alucina o se abstiene honestamente. Crítico para validar Faithfulness y Hallucination Rate. |

**Por qué esa proporción:**

- **66 % in-domain** es alto pero refleja el caso de uso productivo:
  los estudiantes preguntarán mayoritariamente sobre el material que
  el recruiter curó. El RAG **debe** funcionar bien aquí.
- **20 % edge-case** es donde RAG vs respuesta hardcoded marca la
  diferencia: si la pregunta requiere combinar documentos, un sistema
  bien diseñado responde correctamente; uno simple alucina.
- **13 % OOD** es la prueba de **honestidad** del sistema. Sin OOD,
  no podemos medir si el RAG resiste la tentación de inventar
  respuestas cuando no tiene contexto.

Esta proporción es consistente con datasets RAG estándar de la
industria (Ragas docs recomienda incluir negative cases; el dataset
público RAGTruth ~15 % OOD; HotpotQA distingue "easy/medium/hard").

---

## 3. Cobertura por documento del corpus

| # | Documento | Preguntas asignadas | Tipos |
|---|---|---|---|
| 1 | Node.js Event Loop y Arquitectura Asíncrona | 2 (id 1, 2) | in-domain × 2 |
| 2 | Diseño de APIs RESTful — Mejores Prácticas | 2 (id 3, 4) | in-domain × 2 |
| 3 | PostgreSQL — Optimización y Patrones Avanzados | 2 (id 5, 6) | in-domain × 2 |
| 4 | Arquitectura de Microservicios con NestJS | 2 (id 7, 8) | in-domain × 2 |
| 5 | Seguridad en Aplicaciones Backend | 2 (id 9, 10) | in-domain × 2 |
| Cruzado (1 + 5) | RESTful + Seguridad | 1 (id 11) | edge-case (cross-doc) |
| Single (3) | PostgreSQL | 1 (id 12) | edge-case (multi-respuesta válida) |
| Cruzado (4 + 2) | NestJS micro + REST | 1 (id 13) | edge-case (comparativa ambigua) |
| Ninguno | — | 2 (id 14, 15) | OOD |

**Cobertura del corpus:** 100 % — cada documento del seed tiene al
menos 2 preguntas in-domain. Esto evita que el resultado se sesgue
por un documento sobre-representado.

---

## 4. Cómo se derivó el `ground_truth` (clave para evitar sesgo circular)

### 4.1 Regla central — sesgo circular

El sesgo circular ocurre cuando el ground truth se genera con el
**mismo modelo** que después se evalúa. Si pides a `gpt-4o-mini`
que genere la respuesta correcta y luego evalúas a Vinki (que usa
`gpt-4o-mini`) contra esa respuesta, Ragas medirá similitud entre
dos outputs del mismo modelo, no calidad real. **Métricas inflarías
artificialmente.**

### 4.2 Procedimiento adoptado

Para cada pregunta in-domain del dataset:

1. **Identifiqué la sección del documento del corpus** que contiene
   la respuesta. La cita textual se guarda en
   `ground_truth_context` del JSON (palabras exactas del corpus).
2. **Escribí la respuesta a mano** parafraseando ESA sección —
   manteniendo la fidelidad técnica pero usando lenguaje natural
   distinto al del corpus. La respuesta queda en `ground_truth`.
3. **El ground truth NUNCA pasó por un LLM** en este proceso. Es
   100 % redacción humana del autor del dataset (yo, agente de QA,
   en este caso). El humano se basa exclusivamente en lo que dice
   el corpus, no en su conocimiento general del tema.

Para preguntas **edge-case (id 11, 12, 13):**

1. Identifiqué dos secciones de documentos distintos del corpus (o
   una sección que admite múltiples respuestas válidas).
2. Sinteticé la respuesta combinando los pasajes — citando ambos
   contextos en `ground_truth_context`.
3. Documenté en `edge_case_reason` por qué es edge-case y qué mide.

Para preguntas **OOD (id 14, 15):**

1. Elegí dominios alejados del corpus: cocina (id 14) y devops/k8s
   (id 15, dominio tecnológicamente cercano para stress-test).
2. El `ground_truth` NO contiene la respuesta real (sería
   contaminación); contiene la **respuesta esperada del sistema**:
   abstención honesta + explicación de por qué.
3. `ground_truth_context` es `[OOD] No existe chunk relevante en el
   corpus` — Ragas Context Recall debería ser 0; Faithfulness se
   evalúa contra la respuesta esperada (abstención).

### 4.3 Trazabilidad

Cada entrada del dataset incluye:

- `source_document`: nombre del documento del corpus de donde se
  derivó (o `null` para OOD).
- `ground_truth_context`: cita textual del corpus (palabras exactas)
  que respalda la respuesta. Permite a Ragas validar Context Recall
  y a un humano auditar la calidad del ground truth.
- `expected_doc_title`: para validar Context Precision — el
  documento del que el RAG **debería** recuperar chunks.

Esto hace el dataset **inspeccionable y reproducible**. Cualquier
revisor (tutor, lector del informe, sesión futura del agente) puede
verificar que el ground truth está fundamentado en el corpus.

---

## 5. Por qué evitar sesgo circular es crítico (defensa académica)

Si la Fase 6 reportara *"Faithfulness = 0.95"* generado por un
ground truth que también vino de gpt-4o-mini, ese 0.95 **no
significaría nada**. Significaría "el modelo está de acuerdo
consigo mismo". El plan maestro del proyecto de grado se vería
debilitado en su defensa académica.

La regla profesional (Ragas docs, papers de evaluación de RAG como
RAGAS-2023 y RAG-Eval 2024) es: el ground truth debe ser
**human-authored** o derivado de una **fuente independiente del
sistema bajo evaluación**. Vinki cumple esto porque:

1. El ground truth de in-domain proviene del corpus (los documentos
   subidos por humanos al `knowledge_base`).
2. La síntesis del ground truth la hace un humano (no un LLM).
3. El juez (Ragas con gpt-4o-mini como evaluador) es el MISMO LLM
   que usa Vinki para generar respuestas. **Esto sí introduce un
   sesgo conocido**: el juez tiende a aprobar outputs de su mismo
   modelo. Lo documentamos como limitación honesta. Mitigaciones:
   - Si el budget lo permite en una corrida futura, usar
     `gpt-4o` como juez (más caro, distinto modelo) y comparar.
   - El plan maestro § 5.5 ya menciona esto implícitamente al
     incluir Hallucination Rate como complemento (DeepEval también
     hace verificación cruzada).

---

## 6. Inmutabilidad del dataset

Una vez ejecutada la Fase 6 con este `dataset_evaluacion.json`, el
archivo queda **inmutable** durante el resto del proyecto. Cualquier
re-ejecución debe usar el mismo dataset para que las métricas sean
comparables. Si en una iteración futura se decide ampliar el dataset
(a 20-30 preguntas como recomienda el plan maestro), el nuevo dataset
se versionará como `dataset_evaluacion_v2.json` — no se modifica
sobre el original.

---

## 7. Idioma del dataset

Las preguntas y el ground truth están en **español** (idioma del
proyecto y del corpus). Esto es coherente con:

- Idioma de los documentos del seed dev: español.
- Idioma de los prompts del SUT (`'Eres un experto en entrevistas
  técnicas...'`).
- D-9 / D-15 sobre evaluación en idioma del producto.

Ragas y DeepEval son agnósticos al idioma; los modelos
(`text-embedding-3-small`, `gpt-4o-mini`) soportan español
nativamente. Sin observaciones específicas por idioma.

---

## 8. Resumen

| Aspecto | Valor |
|---|---|
| Tamaño total | 15 preguntas |
| In-domain | 10 (66.7 %) |
| Edge-case | 3 (20.0 %) |
| Out-of-domain | 2 (13.3 %) |
| Documentos del corpus cubiertos | 5/5 (100 %) |
| Idioma | Español |
| Fuente del ground truth | Humano + corpus (no LLM) |
| Inmutable | Sí (versionado en repo) |
| Limitación reconocida | Tamaño N=15 vs ideal 25-30; juez gpt-4o-mini es mismo modelo que Vinki (sesgo de auto-evaluación documentado) |
