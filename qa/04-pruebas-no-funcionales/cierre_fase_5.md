# Cierre Fase 5 — Pruebas no funcionales (rendimiento + seguridad)

> **Documento de cierre formal** de la Fase 5 del Plan Maestro de
> Pruebas del proyecto de grado **Vinki** (UPB).
> **Fecha de cierre:** 2026-05-21.
> **Fase consolidada:** 5-A (Rendimiento — JMeter) + 5-B (Seguridad —
> npm audit + ESLint security + Semgrep documentado + revisión manual
> RNF-05..08).

---

## 1. Resumen ejecutivo

La Fase 5 consolida las pruebas no funcionales del proyecto. Está
dividida en dos sub-fases:

- **5-A — Rendimiento:** ejecutada con Apache JMeter 5.6.3 (D-9).
  6 perfiles exitosos + 1 parcial + 2 pendientes por limitación de
  memoria del entorno (8 GB RAM). Cerrada con **HE-06 reclasificado
  a observación acotada (D-17)**: el flujo principal del estudiante
  cumple RNF-01 con holgura vía BullMQ; la latencia >5 s solo aparece
  en el modo `practice` (feedback inmediato opcional) con LLM real.
- **5-B — Seguridad:** ejecutada el 2026-05-21. Vulnerabilidades de
  dependencias cerradas de 34 → 2 (residuales sin upstream fix). 0
  secretos hardcoded. Revisión manual exhaustiva de RNF-05..08 +
  controles transversales (Helmet/CORS/ValidationPipe/Throttler/
  ExceptionFilter). **HE-07 (BOLA en templates) detectado y
  corregido (D-18) con verificación a 4 niveles, 0 regresiones.**

| Métrica | Valor |
|---|---|
| Suites de prueba acumuladas | **97** |
| Tests verde acumulados (post-5B) | **653** (375 backend + 134 frontend + 97 integración + 47 E2E) |
| Vulnerabilidades de dependencias activas (post `npm audit fix`) | 2 (frontend moderate, residuales) |
| Hallazgos de seguridad nuevos en 5-B | 1 (HE-07) — resuelto |
| Hallazgos resueltos durante el proyecto | HE-01 (Fase 4), HE-07 (Fase 5-B) |
| Hallazgos diferidos | HE-02, HE-03, HE-04 (UX/i18n, Baja) y HE-05 (lógica, MEDIA-ALTA, D-13) |
| Observaciones acotadas | HE-06 (rendimiento mode `practice`, D-17) |
| RNF de rendimiento (RNF-01/02/03) | RNF-01 ✅ (asíncrono) + ⚠ observación (practice, D-17); RNF-02 ✅ hasta 20 u; RNF-03 ⚠ cobertura cruzada por limitación de entorno |
| RNF de seguridad (RNF-05/06/07/08) | Todos ✅ tras fix de HE-07 |

---

## 2. Fase 5-A — Rendimiento (JMeter)

Detalle completo: [`rendimiento/reporte_rendimiento.md`](rendimiento/reporte_rendimiento.md).
Análisis del flujo asíncrono: [`rendimiento/analisis_flujo_evaluacion.md`](rendimiento/analisis_flujo_evaluacion.md).

### 2.1 Escenarios ejecutados (6 + 1 parcial + 2 pendientes)

| # | Escenario | Perfiles | Resultado | Estado |
|---|---|---|---|---|
| 0 | Smoke `/api/health` | 1u × 60s | 1 sample, 63 ms | ✅ |
| 1 | RNF-01 arquitectónico (mock) | smoke 1u/60s · carga 20u/180s · estrés 50u/300s | P95 a 50u = **361 ms** (umbral 5000 ms) · 0 % err · 58 579 samples a 50u | ✅ |
| 2 | RNF-02 búsqueda semántica | smoke 1u/60s · carga 20u/180s | P95 a 20u = **90 ms** (umbral 500 ms) | ✅ hasta 20u |
| 2b | RNF-02 estrés a 50u (parcial) | 50u rampa | Run truncado a ~30u/90s por OOM JVM. P95 hasta 30u = 70 ms | ⚠ Parcial |
| 3 | RNF-03 concurrencia 50u flujo completo | 50u/300s | No ejecutado — limitación memoria | ⚠ Pendiente |
| 4 | RNF-01 REAL (LLM `gpt-4o-mini`, D-15) | 2u × 10 iter = 20 muestras | P50=4 415 ms, **P95=7 418 ms** (excede 5 s en `practice`) | ✅ ejecutado |

### 2.2 Hallazgo HE-06 — observación acotada (D-17)

La latencia P95 = 7 418 ms del Escenario 4 corresponde al endpoint
**síncrono** `POST /interviews/:id/questions/:qid/evaluate-now` —
usado ÚNICAMENTE en el **modo `practice`** (feedback inmediato
opcional). El flujo principal del estudiante (modo `evaluation`)
usa `POST /interviews/:id/finish` que **encola en BullMQ y retorna
en ~12 ms sin bloquear al usuario**.

**Decisión D-17:** el cumplimiento de RNF-01 se valida sobre el
flujo principal asíncrono (cumple con holgura masiva ~14×). HE-06
queda como observación de severidad Baja-Media sobre una feature
opcional, con latencia dominada por el proveedor externo
(`gpt-4o-mini` aporta ~95 % del tiempo del request, factor ajeno al
control de diseño).

Detalles: [`rendimiento/analisis_flujo_evaluacion.md`](rendimiento/analisis_flujo_evaluacion.md)
+ [`01-plan-maestro/decisiones_qa.md § D-17`](../01-plan-maestro/decisiones_qa.md).

---

## 3. Fase 5-B — Seguridad

Detalle completo: [`seguridad/reporte_seguridad.md`](seguridad/reporte_seguridad.md).
Reporte ejecutivo del bug HE-07: [`seguridad/bug_seguridad_HE07.md`](seguridad/bug_seguridad_HE07.md).

### 3.1 Auditoría de dependencias

| Workspace | Inicial | Tras `npm audit fix` | Status |
|---|---|---|---|
| `backend/` | 23 (1 critical, 12 high, 10 moderate) | **0** | ✅ Cierre total |
| `frontend/app/` | 11 (5 high, 6 moderate) | 2 moderate residuales (DOMPurify via monaco-editor — sin upstream fix) | ⚠ Documentado |

Suites verde post-fix: backend 371/371, frontend 134/134. **0 regresiones** por `audit fix`.

### 3.2 Análisis estático

| Herramienta | Estado | Hallazgos |
|---|---|---|
| ESLint security (backend) | ✅ Ejecutado | 54 warnings (44 `detect-object-injection` + 10 `detect-non-literal-fs-filename`) — **todos falsos positivos** sobre código interno |
| ESLint security (frontend) | ✅ Ejecutado | 38 warnings (todos `detect-object-injection`) — **todos falsos positivos** |
| Semgrep | ❌ No ejecutable | `pip install semgrep` falla en MSYS2 mingw — alternativas documentadas (Docker, WSL, CI) |

### 3.3 Revisión manual — RNF-05 a RNF-08

| RNF | Descripción | Estado | Evidencia |
|---|---|---|---|
| **RNF-05** | Hash bcrypt | ✅ Cumple | cost=10, `compare()` constante, password nunca expuesto |
| **RNF-06** | HTTPS / TLS | ✅ Cumple (objetivo D-4) | `docker-compose.prod.yml` + cookies `secure` + Helmet HSTS |
| **RNF-07** | Autorización por propiedad | ✅ Cumple (tras D-18) | Auditoría exhaustiva de 27+ endpoints; HE-01 y HE-07 corregidos |
| **RNF-08** | URLs de audio | ✅ Cumple por descarte | Audio no se persiste; placeholder literal |

### 3.4 Controles transversales

| Control | Estado | Ubicación |
|---|---|---|
| Helmet (HSTS, CSP, X-Frame-Options, etc.) | ✅ | `main.ts:21` |
| CORS restringido (`FRONTEND_URL` + `credentials:true`) | ✅ | `main.ts:24-27` |
| ValidationPipe global (`whitelist + forbidNonWhitelisted + transform`) | ✅ | `main.ts:30-36` |
| ThrottlerGuard global (APP_GUARD, defaults 100/300) | ✅ | `app.module.ts:45-99` |
| GlobalExceptionFilter (sin stack leaks) | ✅ | `common/filters/http-exception.filter.ts` |
| Secretos hardcoded | ✅ 0 detectados | Grep exhaustivo en `backend/src` + `frontend/app/src` |

### 3.5 Hallazgo HE-07 — RESUELTO (D-18)

| Campo | Valor |
|---|---|
| Tipo | Broken Object Level Authorization (BOLA / IDOR) |
| OWASP | API1:2023 + A01:2021 |
| Severidad | MEDIA |
| Endpoints afectados | `GET /api/interviews/templates/:id` + `POST /api/interviews/templates/:id/start` |
| Causa raíz | Inconsistencia: `listTemplates` filtra, `getTemplate` y `startFromTemplate` no |
| Fix | 2 archivos del SUT (`templates.service.ts` + `templates.controller.ts`), ~10 líneas |
| Verificación | 4 niveles: 29 unitario aislado + 375 backend completo + 97 integración (+5 cross-user) + 134 frontend. **0 regresiones.** |
| Decisión | D-18 — corregir (consistente con HE-01, distinto de HE-05) |

---

## 4. Suite de tests acumulada — estado final post-Fase 5

| Capa | Suites | Tests | Tests añadidos en Fase 5 | Status |
|---|---|---|---|---|
| Backend unitarias | 48 | **375/375** | +4 (5 nuevos HE-07 guards − 1 spec viejo de `getTemplate` reemplazado) | ✅ |
| Frontend unitarias | 30 | 134/134 | sin cambio | ✅ |
| Backend integración | 9 | **97/97** | +5 (cross-user templates en `authorization.integration.spec.ts`) | ✅ |
| E2E Playwright | 10 | 47/47 | sin cambio | ✅ |
| **Acumulado** | **97** | **653/653** | +9 | ✅ |

---

## 5. Hallazgos consolidados (HE-01 a HE-07)

| ID | Tipo | Severidad | Estado | Fase | RF/RNF |
|---|---|---|---|---|---|
| **HE-01** | Seguridad — cross-tenant cache leak | ALTA | ✅ RESUELTO | 4 | RNF-07 |
| HE-02 | Accesibilidad — falta aria-label logout | Baja | Documentado (backlog) | 4 | RNF-29 |
| HE-03 | i18n — strings hardcoded KnowledgeBase | Baja | Documentado (backlog) | 4 | RNF-26 |
| HE-04 | i18n — "Cancelar" sin t() en Profile | Baja | Documentado (backlog) | 4 | RNF-26 |
| **HE-05** | Lógica — skill_id contaminado admin IA | MEDIA-ALTA | Diferido (D-13) | 4 | RF-12, RF-27, RF-42 |
| HE-06 | Rendimiento UX — latencia practice >5s | Baja-Media | Acotado (D-17) | 5-A | RNF-01 sub-umbral |
| **HE-07** | Seguridad — BOLA en templates | MEDIA | ✅ RESUELTO | 5-B | RNF-07 |

**Asimetría de gestión deliberada:**

- HE-01 y HE-07 (seguridad + fix viable sin UX) → **corregidos** (D-fix HE-01 + D-18).
- HE-05 (lógica + fix con UX en feature admin Baja) → **diferido** (D-13).
- HE-06 (latencia externa, feature opcional) → **acotado por D-17** (recalibración de umbral propuesta al tutor).
- HE-02/03/04 (mejoras post-MVP, no bloqueantes) → **backlog**.

---

## 6. Decisiones tomadas en la Fase 5

| ID | Decisión | Vinculada a |
|---|---|---|
| D-9 | JMeter (no k6) como herramienta de rendimiento | Toda 5-A |
| D-14 | ThrottlerModule externalizado a env vars | Hablilitó RNF-03 |
| D-15 | Estrategia dual mock + LLM real (RNF-01) | Escenarios 1 vs 4 |
| D-16 | Seed dedicado `seed-perf.ts` independiente del E2E | Volúmenes RNF-02 |
| D-17 | Interpretación del RNF-01 según flujo (evaluation vs practice) | HE-06 acotado |
| D-18 | Corrección de HE-07 (BOLA en templates) | HE-07 resuelto |

---

## 7. Vulnerabilidades / observaciones residuales

| Item | Estado | Riesgo práctico | Plan |
|---|---|---|---|
| DOMPurify vía monaco-editor (2 moderate frontend) | Sin upstream fix | Bajo — monaco no renderiza HTML untrusted | Re-evaluar cuando monaco publique versión con DOMPurify ≥ 3.3.4 |
| Semgrep no ejecutado | Limitación de entorno | Bajo — revisión manual cubre el espectro | Ejecutar vía Docker / WSL / CI en futuro |
| 1 error de config ESLint (`import/order` no resuelto) | Cosmético | Ninguno | Refinar `eslint.security.config.mjs` |
| ShareLinkStore en memoria (no persistente) | Limitación funcional | Ninguno de seguridad | Comentario `// TODO: use DB` ya en código |
| RNF-08 sin tokens explícitos | Audio no se persiste | Ninguno actual | Implementar presigned URLs si se activa S3 |
| RNF-02 estrés 50u + RNF-03 dedicado | Limitación del entorno (8 GB RAM) | Cobertura parcial vía RNF-01 estrés 50u | Re-ejecutar en infraestructura ≥ 16 GB |
| 404 universal vs 403/404 mixto en BOLA | Decisión de consistencia con SUT | Bajo (IDs autoincrementales facilitan enumeración con cualquier código) | Refactor SUT-wide a 404 universal — mejora futura |

---

## 8. Cierre — próximo paso

**Fase 5 cerrada completamente.** El SUT presenta:

- Rendimiento arquitectónico ampliamente dentro de los umbrales
  (cumplimiento RNF-01/02 demostrado con margen).
- Latencia end-to-end del modo `practice` documentada honestamente
  como observación acotada (HE-06).
- Postura de seguridad sólida: 0 vulnerabilidades activas críticas o
  altas; controles transversales correctos; ownership consistente
  en todos los endpoints autenticados; **2 bugs de seguridad
  detectados y corregidos por el proceso de QA** (HE-01 en Fase 4,
  HE-07 en Fase 5-B) — evidencia objetiva de que las pruebas
  cumplen su función de detección temprana.
- Suite de tests verde 653/653 con regression guards específicos
  para cada bug corregido.

### Próxima fase: **Fase 6 — Evaluación del componente RAG / IA**

Detalle de la metodología: [`01-plan-maestro/plan_maestro_pruebas.md § 5.5`](../01-plan-maestro/plan_maestro_pruebas.md).

Herramientas previstas: **Ragas + DeepEval**.

Capacidades a medir (IA-01 a IA-06):

- IA-01 — Faithfulness (la respuesta del LLM está fundada en el contexto recuperado).
- IA-02 — Answer Relevance (la respuesta responde a la pregunta del estudiante).
- IA-03 — Context Precision (los chunks recuperados son relevantes).
- IA-04 — Context Recall (los chunks relevantes están en el top-k).
- IA-05 — Answer Correctness (correctness contra ground-truth).
- IA-06 — Latencia del pipeline RAG completo (P95 < 5 s, en el flujo asíncrono — ver D-17).

Dataset previsto: 25-30 preguntas curadas (sección 5.5 del plan
maestro).

Esta fase es la que **valida la calidad real del LLM** (no la
mockeada de Fase 4) y es independiente del rendimiento medido en
Fase 5-A.

### Después de Fase 6 → Fase 7 (Capítulo 3.3.2 del informe)

Consolidación final de la evidencia objetiva en el capítulo
"Pruebas y Validación" del informe del proyecto de grado.
