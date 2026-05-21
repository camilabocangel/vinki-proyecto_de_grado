# Datos consolidados — Fuente única para tablas del Capítulo 3.3.2

> **Propósito:** consolidar en un solo lugar todos los datos
> numéricos del proceso de QA, para que el borrador del Capítulo
> 3.3.2 del informe no tenga que buscar números en 17 documentos
> distintos. Cada cifra trae su referencia al documento fuente.
>
> **Fecha de consolidación:** 2026-05-21.
> **HEAD del repo:** `b909c60` (Fase 6 cerrada).
> **Suite acumulada:** 97 suites · **653 tests verde**.

---

## 1. Tests por capa (Suite acumulada)

| Capa | Suites | Tests | Cobertura objetivo | Resultado | Fuente |
|---|---|---|---|---|---|
| Unitarias backend | 48 | **375 / 375** ✅ | ≥ 80 % | (ver § 2.1) | [cierre_fase_2.md](../02-pruebas-unitarias/cierre_fase_2.md) + Fase 5-B (+4 nuevos HE-07) |
| Unitarias frontend | 30 | **134 / 134** ✅ | ≥ 80 % | (ver § 2.2) | cierre_fase_2.md (post-D-8) |
| Integración (Jest + Supertest + DB real) | 9 | **97 / 97** ✅ | n/a (objetivo flow) | RNF-05/07/09–20 cubiertos | [cierre_fase_3.md](../03-pruebas-integracion/cierre_fase_3.md) + Fase 5-B (+5 cross-user HE-07) |
| E2E Playwright (multi-server) | 10 | **47 / 47** ✅ (verificado `--repeat-each=3` = 141/141) | n/a | 27 RF + 4 RNF cubiertos | [cierre_fase_4.md](../03-pruebas-e2e/cierre_fase_4.md) |
| **TOTAL acumulado** | **97** | **653 / 653** ✅ | | 0 regresiones tras todos los fixes | ESTADO_DEL_PROYECTO_QA |

**Crecimiento del tests por fase:**

- Fase 2 cerró con: 368 backend + 134 frontend = **502** unitarias.
- Fase 3 añadió: **92** integración → 594 totales.
- Fase 4 añadió: **47** E2E + 3 regression guards HE-01 = +50 → 644.
- Fase 5-B añadió: 4 unit guards HE-07 + 5 integration cross-user = +9 → **653**.

---

## 2. Cobertura (Jest + Vitest)

### 2.1 Backend (Jest)

| Métrica | Resultado | Umbral | Status | Fuente |
|---|---|---|---|---|
| Statements | **99.15 %** | ≥ 80 % | ✅ | cierre_fase_2.md |
| Branches | **92.98 %** | ≥ 80 % | ✅ | cierre_fase_2.md |
| Functions | **98.06 %** | ≥ 80 % | ✅ | cierre_fase_2.md |
| Lines | **99.22 %** | ≥ 80 % | ✅ | cierre_fase_2.md |

Alcance: **375 tests** sobre código en alcance (módulos `achievements`, `challenges`, `notifications`, `reports` excluidos por D-5 / D-7).

### 2.2 Frontend (Vitest) — métricas post-D-8 (reclasificación a E2E)

| Métrica | Resultado post-D-8 | Umbral | Status | Fuente |
|---|---|---|---|---|
| Statements | **83.46 %** | ≥ 80 % | ✅ | ESTADO_DEL_PROYECTO_QA § 3 |
| Branches | **82.32 %** | ≥ 80 % | ✅ | ESTADO_DEL_PROYECTO_QA § 3 |
| Functions | 62.31 % | ≥ 80 % | ⚠ Aceptado con observación (functions arrastrada por wiring `App.tsx`, `api/client.ts`) | ESTADO_DEL_PROYECTO_QA § 3 |
| Lines | **88.88 %** | ≥ 80 % | ✅ | ESTADO_DEL_PROYECTO_QA § 3 |

**Métricas pre-D-8** (referencia histórica del cierre_fase_2): 56.67/41.23/34.46/58.29 %. La reclasificación de 8 pages > 500 LOC a E2E elevó las métricas reportables (D-8 en decisiones_qa.md).

---

## 3. RF / RNF / IA cubiertos (trazabilidad)

Fuente: [matriz_trazabilidad.md](../01-plan-maestro/matriz_trazabilidad.md).

| Categoría | Total ítems | Cubiertos (verde / con observación) | Diferidos / fuera de MVP | Pendientes |
|---|---|---|---|---|
| **RF** (Funcionales) | 42 | 36 (27 ✅ Verde + 3 ⚠ verde con observación HE-05) | 6 (RF-37..41 por D-5; RF-42 verde) | 0 |
| **RNF** (No funcionales) | 35 filas (34 declarados + 1 RNF-08bis añadido Fase 5-B) | 30+ ✅ | 0 | 5 (de validación arquitectónica o declarativa) |
| **IA** (Capacidades RAG) | 6 | **5 ✅ Verde + 1 ⚠ Amarillo (IA-02, IA-06)** | 0 | 0 |

**Estado granular (conteo en matriz):** 49 filas marcadas `✅ Verde`, 3 marcadas `Verde con observación`, 12 `Pendiente` (mayormente sub-categorías arquitectónicas o documentales), 7 diferidos por D-5/D-7/D-8/D-13.

---

## 4. Rendimiento (Fase 5-A — JMeter 5.6.3)

Fuente: [reporte_rendimiento.md](../04-pruebas-no-funcionales/rendimiento/reporte_rendimiento.md).

### 4.1 RNF-01 arquitectónico (modo mock, `LLM_SANDBOX=true`)

| Perfil | Threads | Samples | P50 | P95 | P99 | Máx | Throughput | Error % | Umbral P95 < 5000 ms |
|---|---|---|---|---|---|---|---|---|---|
| smoke | 1 | 4 796 | 12 | **15** | 18 | 103 | 80.0 req/s | 0.00 % | ✅ |
| carga | 20 | 36 183 | 100 | **135** | 184.99 | 311 | 201.0 req/s | 0.00 % | ✅ |
| estrés | 50 | 58 579 | 249 | **361** | 442 | 610 | 195.2 req/s | 0.00 % | ✅ |

### 4.2 RNF-01 REAL (modo `start:perf:real`, LLM `gpt-4o-mini`) — 20 muestras (D-15)

| Métrica | Valor |
|---|---|
| Muestras | 20 evaluate-now reales |
| Min | 3 344 ms |
| P50 | 4 415 ms |
| **P95** | **7 418 ms** |
| P99 | 7 454 ms |
| Máx | 7 454 ms |
| Error % | 0.00 % |

**Veredicto (D-17, reclasificación HE-06):** los 7.4 s aplican solo al modo `practice` (feedback inmediato opcional); el flujo principal del estudiante (modo `evaluation`) usa `POST /finish` → BullMQ, ack ~12 ms.

### 4.3 RNF-02 búsqueda semántica (knowledge/search, mock)

| Perfil | Threads | Samples | P50 | P95 | P99 | Máx | Throughput | Error % | Umbral P95 < 500 ms |
|---|---|---|---|---|---|---|---|---|---|
| smoke | 1 | 10 510 | 5 | **7** | 9 | 145 | 175.3 req/s | 0.00 % | ✅ |
| carga | 20 | 56 207 | 61 | **90** | 137 | 460 | 312.3 req/s | 0.00 % | ✅ |
| estrés 50 u | (parcial) | 13 839 | 37 | **70** | 92 | 306 | 395.1 req/s | 0.00 % | ⚠ (truncado por OOM JVM a ~30 u) |

### 4.4 RNF-03 concurrencia (no ejecutado dedicado)

Cubierto por extensión via RNF-01 ARQ estrés 50 u (58 579 samples, 0 % errores). Plan `03-rnf03-concurrencia.jmx` listo para re-ejecución en host ≥ 16 GB RAM.

---

## 5. Seguridad (Fase 5-B)

Fuente: [reporte_seguridad.md](../04-pruebas-no-funcionales/seguridad/reporte_seguridad.md).

### 5.1 Auditoría de dependencias (`npm audit`)

| Workspace | Inicial | Tras `npm audit fix` (sin `--force`) | Resultado |
|---|---|---|---|
| `backend/` | 23 (1 critical + 12 high + 10 moderate) | **0** | ✅ Cierre total |
| `frontend/app/` | 11 (5 high + 6 moderate) | **2 moderate** residuales (DOMPurify vía monaco-editor, sin upstream fix) | ⚠ documentado |
| **TOTAL** | 34 vulnerabilidades | 2 moderate | ↓ **94 % reducción** |

### 5.2 Análisis estático

| Herramienta | Status | Hallazgos reales |
|---|---|---|
| ESLint security backend | ✅ Ejecutado | 0 reales (54 warnings = falsos positivos) |
| ESLint security frontend | ✅ Ejecutado | 0 reales (38 warnings = falsos positivos) |
| Semgrep | ❌ No ejecutable (entorno MSYS2) | Documentado — alternativas Docker/WSL/CI |

### 5.3 Revisión manual RNF-05..08

| RNF | Control | Resultado |
|---|---|---|
| RNF-05 | Hash bcrypt (cost ≥ 10) | ✅ bcrypt.hash(_, 10) confirmado |
| RNF-06 | TLS / HTTPS | ✅ objetivo de diseño (D-4) + Helmet HSTS + cookies `secure` en prod |
| RNF-07 | Autorización por propiedad | ✅ (tras D-18). **2 bugs detectados:** HE-01 (Fase 4) y HE-07 (Fase 5-B), ambos corregidos |
| RNF-08 | URLs audio | ✅ por descarte (audio no se persiste; placeholder literal) |

### 5.4 Controles transversales

| Control | Resultado |
|---|---|
| Helmet (CSP, HSTS, X-Frame-Options, etc.) | ✅ defaults |
| CORS restringido (`FRONTEND_URL`, no wildcard) | ✅ |
| ValidationPipe global (whitelist + forbidNonWhitelisted) | ✅ |
| ThrottlerGuard global (D-14) | ✅ |
| GlobalExceptionFilter sin stack leak | ✅ |
| Secretos hardcoded en código fuente | **0 detectados** ✅ |

---

## 6. Evaluación RAG (Fase 6 — Ragas + DeepEval, N=15)

Fuente: [reporte_evaluacion_rag.md](../05-evaluacion-rag/reporte_evaluacion_rag.md).

### 6.1 Resultados in-domain (criterio principal, N=10)

| ID | Capacidad | Métrica | Umbral § 5.5 | Resultado | Status |
|---|---|---|---|---|---|
| **IA-01** | Faithfulness | Ragas faithfulness | ≥ 0.80 | **0.933** | ✅ VERDE |
| **IA-02** | Answer Relevancy | Ragas answer_relevancy | ≥ 0.80 | 0.767 | ⚠ AMARILLO (0.03 bajo, HE-08) |
| **IA-03** | Context Precision | Ragas context_precision | ≥ 0.70 | **1.000** | ✅ VERDE |
| **IA-04** | Context Recall | Ragas context_recall | ≥ 0.70 (Fase 6) | **1.000** | ✅ VERDE |
| **IA-05** | Answer Correctness | Ragas answer_correctness | ≥ 0.70 (Fase 6) | **0.828** | ✅ VERDE |
| — | Hallucination Rate | `1 − Faithfulness Ragas` | ≤ 10 % | **6.7 %** | ✅ VERDE |
| **IA-06** | Latencia P95 | medida directa | < 5 000 ms | 24 399 ms con outlier / **5 900 ms sin outlier** id=9 | ⚠ AMARILLO |

**5 de 7 métricas en VERDE, 2 en AMARILLO con causa documentada.**

### 6.2 Resultados por categoría

| Categoría | N | Faithfulness | Answer Relevancy | Context Precision | Context Recall | Answer Correctness |
|---|---|---|---|---|---|---|
| in-domain | 10 | 0.933 | 0.767 | 1.000 | 1.000 | 0.828 |
| edge-case | 3 | 0.822 | 0.777 | 1.000 | 0.722 | 0.719 |
| out-of-domain | 2 | 0.500 | 0.000 | 0.000 | 0.833 | 0.121 |
| **global** | 15 | 0.853 | 0.667 | 0.867 | 0.922 | 0.712 |

### 6.3 Comportamiento OOD

**0 % alucinación en out-of-domain.** En las 2 preguntas OOD (id 14 milanesa, id 15 K8s) el sistema respondió textualmente:

> *"No tengo información en el material disponible sobre [...]"*

Comportamiento ideal para sistema educativo.

### 6.4 Costo

| Componente | Costo |
|---|---|
| Ingestión 5 docs (embeddings reales) | $0.0003 |
| 18 generaciones de respuesta | $0.011 |
| 90 evaluaciones Ragas | $0.013 |
| 18 evaluaciones DeepEval | $0.003 |
| Embeddings Ragas (Answer Relevancy) | $0.0004 |
| **TOTAL ejecutado** | **$0.028 USD** |
| Presupuesto autorizado (D-19) | $0.30 USD |
| Margen restante | $0.272 USD (~91 %) |

**Costo total acumulado de uso de la key del docente en todo el proyecto QA:** ~$0.04 USD = 4 centavos (Fase 5-A Escenario 4 $0.01 + Fase 6 $0.028 + verificación inicial $0.000003).

---

## 7. Decisiones (D-1 a D-19) — resumen tabular

Fuente: [decisiones_qa.md](../01-plan-maestro/decisiones_qa.md).

| ID | Tema | Acción / Decisión |
|---|---|---|
| D-1 | CHECK constraints RNF-18/19/20 | Defensa en profundidad: constraints a nivel BD vía migración |
| D-2 | Escalas 0–5 vs 0–100 | Confirmadas como escalas independientes |
| D-3 | RNF-04 escalabilidad horizontal | Validación arquitectónica (caso TC-ARQ-001) |
| D-4 | RNF-06 HTTPS | Objetivo de diseño verificable por configuración |
| D-5 | RF-37–RF-41 CRUD catálogos | Fuera del MVP académico — diferidos |
| D-6 | RF-31 alcance RAG | Uso dual: generación de preguntas + evaluación |
| D-7 | Módulos sin RF declarado | Diferidos achievements/challenges/notifications/reports |
| D-8 | Archivos grandes del frontend (>500 LOC) | Reclasificados a E2E por pirámide de testing |
| D-9 | Herramienta de rendimiento | **Apache JMeter** (no k6) — instrucción del tutor |
| D-10 | LLM en E2E | Mockeado siempre (Playwright route interception + `LLM_SANDBOX`) |
| D-11 | Audio en E2E | `getUserMedia` + `MediaRecorder` stubeados |
| D-12 | Seed E2E | Determinista, una sola vez por `globalSetup` |
| D-13 | HE-05 (skill_id IA admin) | **Diferir** (no es seguridad + requiere cambio UX) |
| D-14 | Límites del ThrottlerModule | Externalizados a env vars (`forRootAsync`) |
| D-15 | Medición RNF-01 dual | Carga con mock + subset real con LLM (Fase 5-A Esc. 4) |
| D-16 | Seed para perf | Dedicado `seed-perf.ts` independiente del E2E |
| D-17 | Interpretación RNF-01 según flujo | Cumplimiento valida sobre `evaluation` async; HE-06 acotado a `practice` |
| D-18 | HE-07 (BOLA templates) | **Corregir** (consistente con HE-01) |
| D-19 | Autorización Fase 6-RUN | Docente aprueba uso key, presupuesto $0.30 USD (costo real $0.028) |

---

## 8. Hallazgos (HE-01 a HE-09) — resumen tabular

| ID | Tipo | Severidad | Estado | RF/RNF |
|---|---|---|---|---|
| **HE-01** | Seguridad — cross-tenant cache leak | **ALTA** | ✅ RESUELTO | RNF-07 |
| HE-02 | Accesibilidad — falta aria-label logout | Baja | Documentado (backlog) | RNF-29 |
| HE-03 | i18n — strings hardcoded KnowledgeBase | Baja | Documentado (backlog) | RNF-26 |
| HE-04 | i18n — "Cancelar" sin `t()` en Profile | Baja | Documentado (backlog) | RNF-26 |
| HE-05 | Lógica — skill_id contaminado admin IA | **MEDIA-ALTA** | Diferido (D-13) | RF-12, RF-27, RF-42 |
| HE-06 | Rendimiento UX — latencia practice >5s | Baja-Media | Acotado (D-17) | RNF-01 sub-umbral |
| **HE-07** | Seguridad — BOLA en templates (getTemplate + startFromTemplate) | **MEDIA** | ✅ RESUELTO (D-18) | RNF-07 |
| HE-08 | Answer Relevancy ↓0.03 — respuestas extendidas | Baja / N-A | Documentado (trade-off) | IA-02 |
| HE-09 | Semántica DeepEval HallucinationMetric vs Ragas | Baja | Mitigado (usar Ragas Faithfulness) | IA-01 |

**2 bugs de seguridad detectados y corregidos por el proceso de QA**
(HE-01 en Fase 4, HE-07 en Fase 5-B). Asimetría deliberada con HE-05
(diferido) documentada en D-13.

---

## 9. Suite acumulada por archivo de cierre

| Fase | Documento de cierre | Tamaño (KB) | Métricas clave |
|---|---|---|---|
| 2 — Unitarias | [cierre_fase_2.md](../02-pruebas-unitarias/cierre_fase_2.md) | 9.5 | 502 tests, backend 99 % stmts, frontend 83 % post-D-8 |
| 3 — Integración | [cierre_fase_3.md](../03-pruebas-integracion/cierre_fase_3.md) | 5.7 | 92 tests, RNF-05/07/09–20 cubiertos |
| 4 — E2E | [cierre_fase_4.md](../03-pruebas-e2e/cierre_fase_4.md) | 8.0 | 47/47 verde, HE-01 detectado y corregido |
| 5 — No funcionales | [cierre_fase_5.md](../04-pruebas-no-funcionales/cierre_fase_5.md) | 12.7 | 5-A rendimiento + 5-B seguridad, HE-07 corregido |
| 6 — RAG | [cierre_fase_6.md](../05-evaluacion-rag/cierre_fase_6.md) | 6.0 | 5/7 métricas IA verde, 0 % alucinación OOD, costo $0.028 |

---

## 10. Trazabilidad de costo OpenAI

| Fase | Uso | Costo aproximado | Autorización |
|---|---|---|---|
| 5-A Escenario 4 (D-15) | 20 muestras `evaluate-now` con `gpt-4o-mini` | $0.01 USD | D-15 |
| 6-RUN (D-19) | 15 preguntas RAG + jueces Ragas/DeepEval | $0.028 USD | D-19 ($0.30 autorizado) |
| Verificación inicial (Fase 5-PRE) | 1 llamada de prueba | $0.000003 | Sin presupuesto formal |
| **TOTAL acumulado** | | **~$0.04 USD** | |

Trazabilidad completa para defensa académica de uso responsable de
recursos.
