# Inventario de evidencia para el Capítulo 3.3.2 (Fase 7)

> **Propósito:** mapa exhaustivo de TODO lo que el Capítulo 3.3.2
> ("Pruebas y Validación") del informe del proyecto de grado puede
> citar como evidencia objetiva. Lectura previa obligatoria al
> redactar el borrador.
>
> **Fecha:** 2026-05-21.
> **HEAD del repo:** `b909c60` (Fase 6 completa, working tree limpio).
> **Datos numéricos consolidados:** [`datos_consolidados.md`](datos_consolidados.md).

---

## 1. Documentos de cierre por fase (todos verificados existentes)

| Fase | Documento | Bytes | Resumen 1 línea |
|---|---|---|---|
| 0 — Inventario | [`qa/00-inventario/inventario_sistema.md`](../00-inventario/inventario_sistema.md) | 35 634 | Catálogo del SUT: stack NestJS+React+pgvector, módulos, endpoints REST, modelo Prisma. |
| 1 — Plan maestro | [`qa/01-plan-maestro/plan_maestro_pruebas.md`](../01-plan-maestro/plan_maestro_pruebas.md) | 31 351 | Estrategia por capas, alcance, umbrales por RNF, criterios de aceptación, sección 5.5 RAG. |
| 1 — Trazabilidad | [`qa/01-plan-maestro/matriz_trazabilidad.md`](../01-plan-maestro/matriz_trazabilidad.md) | 29 519 | RF/RNF/IA → TC-U/TC-I/TC-E/TC-P/TC-S/TC-IA con estado. |
| 1 — Decisiones | [`qa/01-plan-maestro/decisiones_qa.md`](../01-plan-maestro/decisiones_qa.md) | 45 466 | Las 19 decisiones D-1..D-19 con justificación, acción, reversibilidad. |
| 1 — Diferidos | [`qa/01-plan-maestro/diferidos_qa.md`](../01-plan-maestro/diferidos_qa.md) | 8 893 | Catálogo de código fuera de alcance (D-5, D-7, D-8). |
| 2 — Unitarias | [`qa/02-pruebas-unitarias/cierre_fase_2.md`](../02-pruebas-unitarias/cierre_fase_2.md) | 9 465 | 502 tests, backend 99/93/98/99 %, frontend 83/82/62/89 % post-D-8. |
| 3 — Integración | [`qa/03-pruebas-integracion/cierre_fase_3.md`](../03-pruebas-integracion/cierre_fase_3.md) | 5 707 | 92 tests integración, RNF-05/07/09–20 cubiertos con DB + Redis + BullMQ reales. |
| 4 — E2E | [`qa/03-pruebas-e2e/cierre_fase_4.md`](../03-pruebas-e2e/cierre_fase_4.md) | 8 031 | 47/47 verde (×3 = 141/141), 27 RF + 4 RNF cubiertos, HE-01 ALTA corregido. |
| 5 — No funcionales | [`qa/04-pruebas-no-funcionales/cierre_fase_5.md`](../04-pruebas-no-funcionales/cierre_fase_5.md) | 12 749 | 5-A rendimiento (6 perfiles + RNF-01 real + HE-06 acotado D-17) + 5-B seguridad (HE-07 corregido D-18). |
| 6 — RAG | [`qa/05-evaluacion-rag/cierre_fase_6.md`](../05-evaluacion-rag/cierre_fase_6.md) | 6 025 | 5/7 métricas IA verde, 0 % alucinación OOD, costo $0.028 USD de $0.30 autorizado. |

---

## 2. Reportes técnicos centrales (las "joyas" del informe)

| Documento | Bytes | Por qué es central |
|---|---|---|
| [`bug_seguridad_HE01.md`](../03-pruebas-e2e/bug_seguridad_HE01.md) | 15 718 | **Pieza central:** bug ALTA detectado por la suite E2E (TC-E-05-003) en `CacheInterceptor`. Cross-tenant data leak en 5 endpoints `@Cacheable` que retornan PII. Diagnóstico empírico + fix 1 línea + verificación 4 niveles + 3 regression guards. Evidencia objetiva de que QA hace su trabajo. |
| [`bug_seguridad_HE07.md`](../04-pruebas-no-funcionales/seguridad/bug_seguridad_HE07.md) | 15 169 | **Segunda joya:** BOLA / IDOR en `GET /templates/:id` + `POST /templates/:id/start`. Detectado por revisión manual sistemática de RNF-07 motivada por HE-01. Corrección + tests cross-user de integración. OWASP API1:2023 + A01:2021. |
| [`reporte_rendimiento.md`](../04-pruebas-no-funcionales/rendimiento/reporte_rendimiento.md) | 24 670 | Detalle Fase 5-A: 6 perfiles JMeter + RNF-01 real + reclasificación HE-06 (D-17, flujo `evaluation` async vs `practice` sync). |
| [`reporte_seguridad.md`](../04-pruebas-no-funcionales/seguridad/reporte_seguridad.md) | 22 858 | Detalle Fase 5-B: npm audit (34→2) + ESLint security + revisión manual RNF-05..08 + auditoría exhaustiva 27 endpoints + HE-07. |
| [`reporte_evaluacion_rag.md`](../05-evaluacion-rag/reporte_evaluacion_rag.md) | 21 752 | Detalle Fase 6: 5/7 métricas IA verde, comportamiento OOD ideal, HE-08 + HE-09. |
| [`analisis_flujo_evaluacion.md`](../04-pruebas-no-funcionales/rendimiento/analisis_flujo_evaluacion.md) | (existe) | Análisis de código que sustenta D-17 (modo `evaluation` BullMQ ack ~12 ms vs `practice` sync 7.4 s). |
| [`hallazgos_e2e.md`](../03-pruebas-e2e/hallazgos_e2e.md) | 33 626 | Tabla maestra de los 6 hallazgos detectados en Fase 4 (HE-01..HE-06) + sección detallada por hallazgo. Ahora incluye HE-07. |
| [`plan_mejoras_futuras.md`](../03-pruebas-e2e/plan_mejoras_futuras.md) | 9 087 | Backlog priorizado de los 4 hallazgos diferidos (HE-02..HE-05) con fix técnico ya especificado. Apto como anexo. |

---

## 3. Tablas listas para el informe (resumidas en `datos_consolidados.md`)

| Tabla | Sección sugerida | Fuente |
|---|---|---|
| Tests por capa (375 + 134 + 97 + 47 = 653) | "Suite acumulada" | datos § 1 |
| Cobertura backend (99/93/98/99 %) + frontend post-D-8 (83/82/62/89 %) | "Cobertura unitaria" | datos § 2 |
| RF/RNF/IA cubiertos vs total | "Trazabilidad" | datos § 3 |
| RNF-01 ARQ smoke/carga/estrés (P95: 15 / 135 / 361 ms) | "Rendimiento arquitectónico" | datos § 4.1 |
| RNF-01 REAL gpt-4o-mini (P95 7 418 ms) | "Rendimiento end-to-end LLM real" | datos § 4.2 |
| RNF-02 smoke/carga (P95: 7 / 90 ms; estrés parcial 70 ms) | "Búsqueda semántica" | datos § 4.3 |
| npm audit (34 → 2; backend cierre total) | "Auditoría de dependencias" | datos § 5.1 |
| Revisión manual RNF-05..08 | "Controles RNF de seguridad" | datos § 5.3 |
| 6 métricas IA-01..IA-06 + Hallucination (5 verde + 2 amarillo) | "Evaluación RAG" | datos § 6.1 |
| Resultados RAG por categoría (in-domain / edge / OOD) | "Comportamiento RAG por dominio" | datos § 6.2 |
| Decisiones D-1..D-19 | "Decisiones metodológicas" | datos § 7 |
| Hallazgos HE-01..HE-09 | "Defectos detectados y gestionados" | datos § 8 |
| Costo OpenAI total ~$0.04 USD | "Trazabilidad de gasto" | datos § 10 |

---

## 4. Evidencias visuales — FIGURAS

### 4.1 Disponibles ahora (listas para captura)

| Figura propuesta | Origen | Comando para abrir | Estado |
|---|---|---|---|
| **F-1** Cobertura frontend (HTML lcov) | `frontend/app/coverage/unit/index.html` | `start frontend/app/coverage/unit/index.html` | ✅ existe |
| **F-2** Playwright report (47/47 verde) | `playwright-report/index.html` | `start playwright-report/index.html` | ✅ existe |
| **F-3** JMeter — RNF-01 ARQ estrés (50u, P95=361ms) | `qa/04-pruebas-no-funcionales/rendimiento/resultados/01-rnf01-arq-estres-html/index.html` | abrir en navegador | ✅ existe |
| **F-4** JMeter — RNF-01 ARQ carga (20u) | `…/01-rnf01-arq-carga-html/index.html` | | ✅ |
| **F-5** JMeter — RNF-01 ARQ smoke (1u baseline) | `…/01-rnf01-arq-smoke-html/index.html` | | ✅ |
| **F-6** JMeter — RNF-02 carga (20u, P95=90ms) | `…/02-rnf02-search-carga-html/index.html` | | ✅ |
| **F-7** JMeter — RNF-02 smoke (1u baseline) | `…/02-rnf02-search-smoke-html/index.html` | | ✅ |
| **F-8** JMeter — RNF-02 estrés parcial (~30u, P95=70ms) | `…/02-rnf02-search-estres-parcial-html/index.html` | | ✅ |
| **F-9** JMeter — RNF-01 REAL (20 muestras gpt-4o-mini) | `…/04-rnf01-real-html/index.html` | | ✅ |
| **F-10** Tabla resultados RAG (Markdown) | `qa/05-evaluacion-rag/resultados_rag.md` | | ✅ existe |
| **F-11** JSON crudo resultados RAG (anexo) | `qa/05-evaluacion-rag/resultados_rag.json` | | ✅ existe |

### 4.2 Pendientes de generación

| Figura | Por qué falta | Cómo regenerarla | Tiempo estimado |
|---|---|---|---|
| **F-0** Cobertura backend (HTML lcov) | El directorio `coverage/lcov-report/` no existe en el repo (no se regeneró tras el último `audit fix`). | `cd backend && npm run test:cov` (genera `coverage/` en raíz repo) | ~3 min |

### 4.3 Capturas pendientes (acción del autor del informe)

Las **8 capturas de JMeter** + **1 Playwright** + **1 cobertura frontend** + **1 cobertura backend** (post-regen) requieren:

1. Abrir el `index.html` correspondiente en navegador.
2. Capturar screenshot de las gráficas relevantes (no toda la página). Recomendados:
   - **JMeter:** sección "Statistics", "Response Time Over Time", "Active Threads Over Time".
   - **Playwright:** vista principal con 47 tests verde + filtro por suite.
   - **Cobertura:** tabla resumen con los % por archivo/módulo.
3. Guardar en `qa/06-informe/figuras/` con nombre `figura-X-Y.png` siguiendo numeración del informe.

**Lista compacta para el autor del informe:**

```
figuras/figura-3-1.png   # Cobertura backend (post-regen)
figuras/figura-3-2.png   # Cobertura frontend
figuras/figura-3-3.png   # Playwright 47/47
figuras/figura-3-4.png   # JMeter RNF-01 ARQ estrés 50u
figuras/figura-3-5.png   # JMeter RNF-01 ARQ carga 20u
figuras/figura-3-6.png   # JMeter RNF-02 carga 20u
figuras/figura-3-7.png   # JMeter RNF-01 REAL (20 muestras)
figuras/figura-3-8.png   # Resultados RAG tabla (resultados_rag.md)
figuras/figura-3-9.png   # (opcional) JMeter RNF-02 estrés parcial 30u
```

La carpeta `qa/06-informe/figuras/` se crea en el momento de la
captura (no se crea ahora porque está vacía).

---

## 5. Estructura sugerida del Capítulo 3.3.2 (referencia para el borrador)

Sugerencia (no es el borrador todavía — solo guía):

1. **Introducción** (1 página)
   - Objetivos del proceso de QA.
   - Resumen ejecutivo: 6 fases, 653 tests, 19 decisiones, 9 hallazgos
     (2 bugs de seguridad corregidos por QA).

2. **Metodología** (2-3 páginas)
   - Pirámide de testing aplicada al proyecto.
   - Herramientas seleccionadas (Jest, Vitest, Playwright, JMeter,
     Ragas + DeepEval).
   - 19 decisiones D-1..D-19 que adaptaron el plan a Vinki.

3. **Resultados cuantitativos** (4-6 páginas)
   - Cobertura unitaria (datos § 2).
   - Pruebas de integración + E2E (datos § 1 + § 3).
   - Rendimiento (datos § 4 + figuras F-3..F-9).
   - Seguridad (datos § 5).
   - RAG / IA (datos § 6 + figura F-10).

4. **Defectos detectados y gestionados** (2-3 páginas) — **pieza central**
   - HE-01: cache leak ALTA corregido (referencia `bug_seguridad_HE01.md`).
   - HE-07: BOLA templates MEDIA corregido (referencia `bug_seguridad_HE07.md`).
   - Tabla HE-01..HE-09 con estado.
   - Asimetría profesional: corregir vs diferir (HE-05 D-13 vs HE-07 D-18).

5. **Limitaciones declaradas** (1 página)
   - 8 GB RAM límite (RNF-02 estrés + RNF-03 dedicado).
   - N=15 para RAG (vs ideal 25-30).
   - Juez = modelo evaluado (sesgo documentado).
   - Semgrep no ejecutable (alternativas Docker/WSL).
   - 2 vulnerabilidades moderate residuales DOMPurify (sin upstream fix).

6. **Conclusiones** (1 página)
   - Sistema cumple criterios funcionales y no funcionales del plan
     maestro (con excepciones documentadas: HE-06, IA-02, IA-06).
   - **2 bugs de seguridad detectados por QA y corregidos** —
     evidencia objetiva del valor del proceso.
   - Trabajo futuro: ampliar dataset RAG, ejecutar Semgrep, validar
     escenarios pendientes en host ≥ 16 GB.

---

## 6. Archivos misceláneos útiles para el informe

| Archivo | Uso en el informe |
|---|---|
| [`qa/05-evaluacion-rag/caracterizacion_rag.md`](../05-evaluacion-rag/caracterizacion_rag.md) | Diagrama y descripción del pipeline RAG real — para sección de RAG. |
| [`qa/05-evaluacion-rag/metodologia_dataset.md`](../05-evaluacion-rag/metodologia_dataset.md) | Justificación del N=15, distribución, prevención de sesgo circular — para defensa académica. |
| [`qa/05-evaluacion-rag/dataset_evaluacion.json`](../05-evaluacion-rag/dataset_evaluacion.json) | Dataset completo de 15 preguntas — anexo del informe. |
| [`qa/04-pruebas-no-funcionales/rendimiento/setup_jmeter.md`](../04-pruebas-no-funcionales/rendimiento/setup_jmeter.md) | Setup técnico de JMeter — anexo metodológico. |
| [`qa/04-pruebas-no-funcionales/rendimiento/seed_perf.md`](../04-pruebas-no-funcionales/rendimiento/seed_perf.md) | Operativa del seed de rendimiento (10 K preguntas + 50 bulk users) — anexo. |
| [`qa/00-inventario/notas_tecnicas.md`](../00-inventario/notas_tecnicas.md) | Bitácora NT-001..NT-031 — apropiado como apéndice técnico ("decisiones de implementación que aparecieron durante la ejecución"). |

---

## 7. Comandos de re-generación (para reproducibilidad del informe)

| Artefacto | Comando | Tiempo |
|---|---|---|
| Cobertura backend HTML (regenerar) | `cd backend && npm run test:cov` | ~3 min |
| Cobertura frontend HTML (refresh opcional) | `cd frontend/app && npm run test:cov` | ~3 min |
| Suite E2E HTML (refresh opcional) | `npm run e2e` desde raíz (requiere backend up) | ~2 min |
| JMeter reportes (ya generados, opcional refresh) | comandos en `setup_jmeter.md` § 3.4 | depende perfil |
| Evaluación RAG (ya ejecutada — solo re-correr si se amplía dataset) | `docker run … vinki-rag-eval:6pre … --live` | ~5 min, $0.028 |

---

## 8. Estado de Git

- **HEAD:** `b909c60 test(rag): Fase 6-RUN`
- **Working tree:** limpio (verificado en commit anterior).
- **Branch:** `feat/vinki-009/pruebasFuncNoFunc`.
- **Commits relevantes de QA en esta rama** (`git log --oneline feat/vinki-009/pruebasFuncNoFunc`):
  - `b909c60` Fase 6-RUN
  - `038ceff` Fase 6-PRE
  - `64bbc1b` Fase 5-B + cierre Fase 5
  - `b2fa831` ESTADO + README post-5A
  - `cfdd3a6` Fase 5-A
  - `fc4e202` HE-01 fix + cierre Fase 4 47/47
  - + commits previos de Fases 0-3.

---

## 9. Resumen del inventario

| Categoría | Cuántos | Estado |
|---|---|---|
| Documentos de cierre por fase | 10 (fases 0-6 + 4 reportes complementarios + 2 bug reports + 1 backlog) | ✅ todos existen |
| Reportes técnicos centrales | 8 | ✅ todos existen |
| Tablas listas (en `datos_consolidados.md`) | ~13 secciones | ✅ consolidadas |
| Figuras HTML disponibles | 10 (1 cobertura FE + 1 Playwright + 8 JMeter + 1 RAG MD) | ✅ |
| Figuras pendientes de generar | 1 (cobertura backend HTML) | ⚠ `npm run test:cov` antes del informe |
| Capturas pendientes del autor | 8-10 PNGs en `qa/06-informe/figuras/` | ⏳ acción manual |
| Datos numéricos | Tests, cobertura, rendimiento, RAG, seguridad, costo | ✅ todos en `datos_consolidados.md` |
| Decisiones D-1..D-19 | 19 | ✅ documentadas en `decisiones_qa.md` |
| Hallazgos HE-01..HE-09 | 9 | ✅ tabla consolidada en datos § 8 |

**Conclusión:** **toda la evidencia objetiva está disponible**. Falta
únicamente:

1. **Regenerar HTML de cobertura backend** (3 min, `cd backend && npm run test:cov`) — para tener la figura F-1.
2. **Capturar 8-10 screenshots** desde los HTML existentes (acción manual del autor).
3. **Redactar el borrador del Capítulo 3.3.2** consumiendo los datos de `datos_consolidados.md` y la estructura sugerida en § 5.
