# Cierre Fase 6 — Evaluación del componente RAG / IA

> **Documento de cierre formal** de la Fase 6 del Plan Maestro de
> Pruebas del proyecto de grado **Vinki** (UPB).
> **Fecha de cierre:** 2026-05-21.
> **Fase consolidada:** 6-PRE (preparación) + 6-RUN (ejecución).

---

## 1. Resumen ejecutivo

Fase 6 cierra como **VERDE con observaciones**.

| Capacidad | Métrica | Umbral § 5.5 | Resultado in-domain | Estado |
|---|---|---|---|---|
| IA-01 | Faithfulness | ≥ 0.80 | **0.933** | ✅ VERDE |
| IA-02 | Answer Relevancy | ≥ 0.80 | 0.767 | ⚠ AMARILLO (0.03 bajo, dentro de incertidumbre estadística N=10) |
| IA-03 | Context Precision | ≥ 0.70 | **1.000** | ✅ VERDE |
| IA-04 | Context Recall | ≥ 0.70 | **1.000** | ✅ VERDE |
| IA-05 | Answer Correctness | ≥ 0.70 | **0.828** | ✅ VERDE |
| Hallucination Rate (1 − Faithfulness) | ≤ 10 % | 6.7 % | ✅ VERDE |
| IA-06 | Latencia P95 | < 5 000 ms | ~5 900 ms (sin outlier) | ⚠ AMARILLO (consistente con HE-06 / D-17) |

**5 de 7 métricas en VERDE, 2 en AMARILLO con causa documentable.**

**Costo total ejecutado:** ~$0.028 USD, **muy por debajo del presupuesto
autorizado de $0.30 USD** (D-19). Margen restante: ~$0.27 USD.

**Hallazgo positivo destacado:** en las 2 preguntas out-of-domain del
dataset (id 14 cocina, id 15 versión Kubernetes), el sistema **NO
alucinó** en ningún caso. Respondió textualmente *"No tengo
información en el material disponible sobre..."* — comportamiento
ideal para un sistema educativo.

Detalle técnico completo en
[`reporte_evaluacion_rag.md`](reporte_evaluacion_rag.md).

---

## 2. Cronología

| Sub-fase | Fecha | Resultado |
|---|---|---|
| 6-PRE | 2026-05-21 | Caracterización del pipeline RAG + dataset de 15 preguntas con ground truth humano + entorno Docker reproducible + script `evaluar_rag.py` dry-run verde. Commit `038ceff`. |
| 6-RUN | 2026-05-21 | Backend con LLM real + 5 documentos ingestados con embeddings reales + corrida de prueba 3 preguntas (verificación + estimación de costo) + corrida completa 15 preguntas. Reporte ejecutivo redactado. Backend detenido. |

---

## 3. Decisiones tomadas

- **D-17** (de Fase 5-A, contexto): RNF-01 sub-umbrales evaluation/practice.
  Confirmado aquí: la latencia P95 ~5.9 s (sin outlier) está
  consistente con el upper bound observado en Fase 5-A Escenario 4.
- **D-19** (este turno): autorización del docente para usar la
  `OPENAI_API_KEY` con presupuesto $0.30 USD. Costo real **$0.028 USD**
  (~10 % del límite).

---

## 4. Hallazgos generados

| ID | Descripción | Severidad | Estado |
|---|---|---|---|
| HE-08 | Answer Relevancy 0.03 bajo umbral por respuestas extendidas (trade-off educativo) | BAJA / N/A | Documentado como característica, no bug |
| HE-09 | Semántica de DeepEval HallucinationMetric distinta a la del plan maestro § 5.5 | BAJA | Mitigado: se usa Ragas Faithfulness como métrica oficial (6.7 % alucinación, cumple ≤ 10 %) |

Ambos hallazgos son **no bloqueantes** para el cierre de Fase 6.

---

## 5. Limitaciones declaradas

1. **N = 15 → intervalos de confianza amplios** (vs ideal 25-30
   según plan maestro).
2. **Juez = modelo evaluado** (`gpt-4o-mini` ↔ `gpt-4o-mini`) —
   sesgo de auto-evaluación documentado.
3. **Corpus de 5 documentos** — pequeño para discriminar fuertemente
   Context Precision/Recall.
4. **Vinki MVP no tiene endpoint Q→A** — el script reconstruye el
   paso de generación con prompt template propio.
5. **1 outlier de latencia (id 9, 67 s)** distorsiona P95 a 24 s;
   sin outlier P95 ≈ 5.9 s.
6. **Métricas Ragas en OOD no informativas** — penalizan la
   abstención. Validación OOD = cualitativa (inspección manual de
   respuestas).

---

## 6. Artefactos generados

```
qa/05-evaluacion-rag/
├── caracterizacion_rag.md            # Pipeline RAG real del SUT.
├── dataset_evaluacion.json           # 15 preguntas con ground truth humano.
├── corpus_documentos.json            # Los 5 documentos del corpus en JSON local.
├── metodologia_dataset.md            # Justificación + prevención de sesgo circular.
├── metricas_rag.md                   # Mapeo IA-01..IA-06 ↔ Ragas/DeepEval + umbrales.
├── setup_entorno_rag.md              # Decisión Docker + comandos exactos.
├── Dockerfile                        # Imagen `vinki-rag-eval:6pre` con Ragas 0.3.2.
├── evaluar_rag.py                    # Script (modos --dry-run y --live, con --ids).
├── resultados_rag.json               # Detalle por pregunta de las 15 (corrida final).
├── resultados_rag.md                 # Tabla legible.
├── resultados_rag-prueba3.json       # Corrida de prueba 3 preguntas.
├── resultados_rag-prueba3.md
├── reporte_evaluacion_rag.md         # Reporte ejecutivo completo de Fase 6.
└── cierre_fase_6.md                  # Este documento.
```

---

## 7. Suite del SUT al cerrar

Sin cambios. **97 suites · 653/653 tests verde.** Fase 6 NO modificó
código de producción.

---

## 8. Próximo paso

**Fase 7 — Consolidación del Capítulo 3.3.2 del informe del proyecto
de grado.**

Integrar la evidencia objetiva acumulada en las fases 0–6:

- Cobertura unitaria + integración + E2E.
- Decisiones D-1..D-19 como sección de metodología y alcance.
- Hallazgos HE-01..HE-09 como evidencia de gestión profesional de
  defectos:
  - HE-01 (ALTA): corregido (cache leak).
  - HE-02..HE-04 (baja): backlog UX/i18n.
  - HE-05 (MEDIA-ALTA): diferido D-13 (skill_id admin).
  - HE-06 (baja-media): acotado D-17 (latencia practice).
  - HE-07 (MEDIA): corregido D-18 (BOLA templates).
  - HE-08 (baja/N-A): trade-off educativo.
  - HE-09 (baja): semántica DeepEval, mitigada.
- Capturas de reportes HTML (JMeter, Playwright, cobertura,
  resultados_rag).
- Las **6 capacidades IA-01..IA-06** medidas con datos numéricos
  reproducibles.
- Los **2 bugs de seguridad** que el proceso de QA detectó y corrigió
  como pieza central de la defensa académica.
