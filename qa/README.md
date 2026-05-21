# QA — Plataforma Vinki

> Carpeta de aseguramiento de la calidad del proyecto de grado **Vinki**
> (Ingeniería de Sistemas, UPB). Este README es el **índice navegable**
> de todos los documentos QA. Para el estado vivo del proyecto (qué
> fase está abierta, cuál es el próximo paso, último commit) leer
> [`ESTADO_DEL_PROYECTO_QA.md`](ESTADO_DEL_PROYECTO_QA.md).
>
> **Fuente autoritativa de requerimientos:** `docs/requerimientos.md`
> (42 RF + 34 RNF + 6 IA).
>
> **Última actualización del índice:** 2026-05-21 (post-Fase 5-A).

---

## 1. Punto único de entrada

| Documento | Para qué sirve |
|---|---|
| **[`ESTADO_DEL_PROYECTO_QA.md`](ESTADO_DEL_PROYECTO_QA.md)** | **Lectura obligatoria al retomar el trabajo.** Estado actual, tests acumulados, decisiones D-1..D-17, hallazgos HE-01..HE-06, próximo paso explícito, comandos de retomada. |

---

## 2. Por fase

### Fase 0 — Inventario técnico

| Documento | Para qué sirve |
|---|---|
| [`00-inventario/inventario_sistema.md`](00-inventario/inventario_sistema.md) | Catálogo del SUT: stack, módulos NestJS, endpoints REST, modelo Prisma, dependencias. Referencia técnica de partida. |
| [`00-inventario/estado_db_desarrollo.md`](00-inventario/estado_db_desarrollo.md) | Snapshot de la DB de desarrollo al iniciar QA + verificación previa a la migración de CHECK constraints. |
| [`00-inventario/notas_tecnicas.md`](00-inventario/notas_tecnicas.md) | Bitácora **NT-001..NT-026** — decisiones técnicas operativas que aparecieron durante la implementación de las pruebas (mocks, ESM, jsdom, IPv6, heap JMeter, etc.). |

### Fase 1 — Plan maestro

| Documento | Para qué sirve |
|---|---|
| [`01-plan-maestro/plan_maestro_pruebas.md`](01-plan-maestro/plan_maestro_pruebas.md) | Plan maestro completo: estrategia por capas, alcance, herramientas, criterios, umbrales cuantitativos por RNF. Base metodológica. |
| [`01-plan-maestro/matriz_trazabilidad.md`](01-plan-maestro/matriz_trazabilidad.md) | Trazabilidad RF/RNF/IA → TC-U-XXX / TC-I-XXX / TC-E-XX / TC-P-XXX. 82 ítems totales. |
| [`01-plan-maestro/decisiones_qa.md`](01-plan-maestro/decisiones_qa.md) | **17 decisiones formales (D-1..D-17)** con justificación y reversibilidad. Lectura obligatoria para entender supuestos del plan. |
| [`01-plan-maestro/diferidos_qa.md`](01-plan-maestro/diferidos_qa.md) | Catálogo de código fuera de alcance (D-5, D-7, D-8) — qué se difiere, por qué, cómo reversar. |

### Fase 2 — Pruebas unitarias

| Documento | Para qué sirve |
|---|---|
| [`02-pruebas-unitarias/cierre_fase_2.md`](02-pruebas-unitarias/cierre_fase_2.md) | Cierre formal de la fase. **502 tests verde** (368 backend + 134 frontend). |
| [`02-pruebas-unitarias/resumen_cobertura_3A.md`](02-pruebas-unitarias/resumen_cobertura_3A.md) | Sub-corrida 3A (backend núcleo). |
| [`02-pruebas-unitarias/resumen_cobertura_3B.md`](02-pruebas-unitarias/resumen_cobertura_3B.md) | Sub-corrida 3B (backend resto). |
| [`02-pruebas-unitarias/resumen_cobertura_3C.md`](02-pruebas-unitarias/resumen_cobertura_3C.md) | Sub-corrida 3C (frontend) — disparó D-8 (reclasificación a E2E). |
| [`02-pruebas-unitarias/ajuste_cobertura_3C.md`](02-pruebas-unitarias/ajuste_cobertura_3C.md) | Aplicación de D-8 + métrica de cobertura final tras la reclasificación. |
| [`02-pruebas-unitarias/ajuste_cobertura_final_3B.md`](02-pruebas-unitarias/ajuste_cobertura_final_3B.md) | Enmienda de coherencia sobre el ignore del módulo `reports/`. |
| [`02-pruebas-unitarias/diagnostico_rapido.md`](02-pruebas-unitarias/diagnostico_rapido.md) | Diagnóstico inicial de tests rojos al heredar el repo. |
| [`02-pruebas-unitarias/reparacion_tests_rojos.md`](02-pruebas-unitarias/reparacion_tests_rojos.md) | Resumen de la reparación dirigida. |
| [`02-pruebas-unitarias/setup_summary.md`](02-pruebas-unitarias/setup_summary.md) | Setup de la suite unitaria. |
| `*.txt` en la misma carpeta | Outputs literales de cobertura, smoke, diagnóstico (evidencia objetiva). |

### Fase 3 — Integración

| Documento | Para qué sirve |
|---|---|
| [`03-pruebas-integracion/cierre_fase_3.md`](03-pruebas-integracion/cierre_fase_3.md) | Cierre formal. **92/92 verde**. 15 RNF + 13 RF cubiertos con DB + Redis + BullMQ reales. |
| [`03-pruebas-integracion/resumen_integracion.md`](03-pruebas-integracion/resumen_integracion.md) | Inventario por suite + mapeo RF/RNF de cada test de integración. |
| [`03-pruebas-integracion/setup_summary.md`](03-pruebas-integracion/setup_summary.md) | Cómo levantar la infra (docker-compose.test.yml) + correr la suite. |
| `03-pruebas-integracion/resultado_integracion.txt` | Output literal del último run. |

### Fase 4 — E2E (Playwright)

| Documento | Para qué sirve |
|---|---|
| [`03-pruebas-e2e/cierre_fase_4.md`](03-pruebas-e2e/cierre_fase_4.md) | Cierre formal. **47/47 verde estable** (verificado con `--repeat-each=3` → 141/141). 27 RF + 4 RNF cubiertos extremo a extremo. |
| [`03-pruebas-e2e/resumen_e2e.md`](03-pruebas-e2e/resumen_e2e.md) | Inventario de las 10 suites E2E + mapeo RF/RNF. |
| [`03-pruebas-e2e/hallazgos_e2e.md`](03-pruebas-e2e/hallazgos_e2e.md) | **6 hallazgos consolidados (HE-01..HE-06).** Tabla resumen + sección detallada por hallazgo con evidencia y recomendación. |
| [`03-pruebas-e2e/bug_seguridad_HE01.md`](03-pruebas-e2e/bug_seguridad_HE01.md) | **Reporte ejecutivo del bug HE-01** (cross-tenant cache leak, RNF-07). Diagnóstico empírico, fix aplicado, verificación a 4 niveles. **Pieza central del informe del proyecto de grado.** |
| [`03-pruebas-e2e/plan_mejoras_futuras.md`](03-pruebas-e2e/plan_mejoras_futuras.md) | Backlog priorizado de los hallazgos diferidos (HE-02..HE-05) con fix técnico especificado. Apto como anexo del informe. |
| [`03-pruebas-e2e/como_ejecutar.md`](03-pruebas-e2e/como_ejecutar.md) | Instrucciones de ejecución E2E. |
| `03-pruebas-e2e/smoke_e2e.txt` | Smoke E2E inicial del Prompt 2.5. |

### Fase 5-A — Rendimiento (JMeter)

| Documento | Para qué sirve |
|---|---|
| [`04-pruebas-no-funcionales/rendimiento/reporte_rendimiento.md`](04-pruebas-no-funcionales/rendimiento/reporte_rendimiento.md) | **Reporte completo de Fase 5-A.** 6 perfiles ejecutados + tablas de cumplimiento RNF-01/02/03 (diferenciadas por flujo evaluation vs practice) + hallazgo HE-06 reclasificado por D-17 + limitaciones de entorno. |
| [`04-pruebas-no-funcionales/rendimiento/analisis_flujo_evaluacion.md`](04-pruebas-no-funcionales/rendimiento/analisis_flujo_evaluacion.md) | Análisis del código del SUT que sustenta la reclasificación de HE-06: el RNF-01 atraviesa 2 rutas (BullMQ async vs evaluate-now sync). Base de la decisión D-17. |
| [`04-pruebas-no-funcionales/rendimiento/analisis_endpoints_rendimiento.md`](04-pruebas-no-funcionales/rendimiento/analisis_endpoints_rendimiento.md) | Investigación previa (Fase 5-PRE) — identificación de endpoints a medir, configuración del LLM mock, riesgos (throttler, cookies RS256, seed status='ready'). |
| [`04-pruebas-no-funcionales/rendimiento/seed_perf.md`](04-pruebas-no-funcionales/rendimiento/seed_perf.md) | Operativa del seed dedicado de perf (D-16) — 10 000 preguntas + 50 chunks + 3 usuarios fijos + 50 bulk students para RNF-03. |
| [`04-pruebas-no-funcionales/rendimiento/setup_jmeter.md`](04-pruebas-no-funcionales/rendimiento/setup_jmeter.md) | Instalación de JMeter 5.6.3, workaround de heap para host de 8 GB, topología, comandos exactos. |
| [`04-pruebas-no-funcionales/rendimiento/ARCHIVADO_setup_k6.md`](04-pruebas-no-funcionales/rendimiento/ARCHIVADO_setup_k6.md) | Propuesta inicial de k6 archivada (revertida por D-9 — instrucción del tutor). |
| `04-pruebas-no-funcionales/rendimiento/planes/` | 5 planes `.jmx` (smoke, RNF-01 ARQ, RNF-02 search, RNF-03 concurrencia, RNF-01 real) + `perf-students.csv` para RNF-03. |
| `04-pruebas-no-funcionales/rendimiento/resultados/` | 7 archivos `.jtl` + 7 carpetas HTML con reportes JMeter completos. Evidencia objetiva. |
| `04-pruebas-no-funcionales/rendimiento/capturas/` | (Vacío — pendiente para el informe; ver § 8 del reporte de rendimiento.) |

### Fase 5-B — Seguridad (PENDIENTE)

| Documento | Para qué sirve |
|---|---|
| [`04-pruebas-no-funcionales/seguridad/setup_semgrep.md`](04-pruebas-no-funcionales/seguridad/setup_semgrep.md) | Setup de Semgrep + comandos. Pre-Fase 5-B. |
| `04-pruebas-no-funcionales/seguridad/eslint_security_inicial.txt` | Baseline del lint:security inicial (Fase 2.5). Punto de comparación para la corrida formal de Fase 5-B. |

**Próximos artefactos a generar (Fase 5-B):**
`audit_backend_{inicial,posterior}.json`, `audit_frontend_{inicial,posterior}.json`,
`semgrep.json`, `reporte_seguridad.md`, `cierre_fase_5.md`.

### Fase 6 — Evaluación RAG (PENDIENTE)

| Documento | Para qué sirve |
|---|---|
| _(No iniciada)_ | Ragas + DeepEval sobre dataset estático de 25-30 preguntas para validar IA-01..IA-06. Detalle de la metodología en [`plan_maestro_pruebas.md § 5.5`](01-plan-maestro/plan_maestro_pruebas.md). |

### Fase 7 — Consolidación del informe (PENDIENTE)

| Documento | Para qué sirve |
|---|---|
| _(No iniciada)_ | Redacción del capítulo "Pruebas y Validación" del informe del proyecto de grado, integrando toda la evidencia objetiva de las fases 0–6. |

---

## 3. Tabla rápida — comandos por tipo de prueba

| Tipo | Workspace | Comando | Reporte |
|---|---|---|---|
| Unitarias backend | `backend/` | `npm run test:cov` | `coverage/lcov-report/index.html` |
| Unitarias frontend | `frontend/app/` | `npm run test:cov` | `frontend/app/coverage/unit/index.html` |
| Integración API | `backend/` | `npm run test:int` (requiere `docker-compose.test.yml up -d`) | Consola |
| E2E (Playwright) — smoke | raíz | `npm run e2e:smoke` | `playwright-report/index.html` |
| E2E (Playwright) — completo | raíz | `npm run e2e` | `playwright-report/index.html` |
| Rendimiento — seed | `backend/` | `npm run seed:perf` | Consola |
| Rendimiento — backend mock | `backend/` | `npm run start:perf` | `http://127.0.0.1:3002/api/health` |
| Rendimiento — backend LLM real | `backend/` | `npm run start:perf:real` (Escenario 4 only) | Consola + tokens reales |
| Rendimiento — JMeter | raíz | Ver [`setup_jmeter.md § 3.4`](04-pruebas-no-funcionales/rendimiento/setup_jmeter.md) | HTML en `resultados/*-html/` |
| Seguridad — ESLint backend | `backend/` | `npm run lint:security` | Consola |
| Seguridad — `npm audit` | `backend/` / `frontend/app/` | `npm audit --json` | JSON |
| Seguridad — Semgrep | raíz | Ver [`setup_semgrep.md`](04-pruebas-no-funcionales/seguridad/setup_semgrep.md) | JSON |

---

## 4. Trazabilidad

| Pregunta | Documento |
|---|---|
| ¿Qué requerimiento prueba este test? | [`matriz_trazabilidad.md`](01-plan-maestro/matriz_trazabilidad.md) |
| ¿Por qué se tomó esta decisión metodológica? | [`decisiones_qa.md`](01-plan-maestro/decisiones_qa.md) |
| ¿Cuál es el umbral cuantitativo de un RNF? | [`plan_maestro_pruebas.md § 5`](01-plan-maestro/plan_maestro_pruebas.md) |
| ¿Cómo está el sistema arquitectónicamente? | [`inventario_sistema.md`](00-inventario/inventario_sistema.md) |
| ¿Qué bugs detectó la suite y cómo se gestionaron? | [`hallazgos_e2e.md`](03-pruebas-e2e/hallazgos_e2e.md) + [`bug_seguridad_HE01.md`](03-pruebas-e2e/bug_seguridad_HE01.md) + [`reporte_rendimiento.md § 6 (HE-06)`](04-pruebas-no-funcionales/rendimiento/reporte_rendimiento.md) |
| ¿Qué quedó fuera del alcance y por qué? | [`diferidos_qa.md`](01-plan-maestro/diferidos_qa.md) + [`plan_mejoras_futuras.md`](03-pruebas-e2e/plan_mejoras_futuras.md) |
| ¿Cuál es el estado vivo del proyecto? | [`ESTADO_DEL_PROYECTO_QA.md`](ESTADO_DEL_PROYECTO_QA.md) |

---

## 5. CI/CD

Dos workflows en `.github/workflows/` (configurados en Fase 2.5):

- **`ci.yml`** — en cada push y PR. Backend: `prisma generate` →
  `migrate deploy` → `tsc --noEmit` → `lint` → `lint:security` →
  `test:cov` → `npm audit`. Frontend: equivalente sin Prisma.
  Servicios: PostgreSQL + Redis levantados como `services:`. Falla
  si la cobertura cae bajo el `coverageThreshold` (80 %).
- **`e2e.yml`** — en PRs a master + manual. Levanta backend +
  frontend en el runner, aplica seed, corre `npm run e2e:smoke`
  primero y luego `npm run e2e`. Artefactos: HTML Playwright (14
  días) + videos/trazas si hay fallos.

---

## 6. Convenciones para nuevos tests

| Nivel | Ubicación | Patrón | Notas |
|---|---|---|---|
| Unitario backend | `backend/src/**/*.spec.ts` | Mismo directorio que el código bajo prueba | LLM y Prisma mockeados |
| Integración backend | `backend/test/integration/**/*.integration.spec.ts` | Sufijo `integration` | DB de test real, BullMQ real |
| E2E API (Supertest) | `backend/test/**.e2e-spec.ts` | Sufijo `e2e-spec` | Supertest sobre la app real |
| Unitario frontend | `frontend/app/src/**/*.test.tsx` | Junto al componente | RTL + jsdom |
| E2E (Playwright) | `e2e/suites/<NN>-<dominio>/<nombre>.spec.ts` | Suites numeradas | Fixtures en `e2e/fixtures/` |
| Rendimiento (JMeter) | `qa/04-pruebas-no-funcionales/rendimiento/planes/*.jmx` | Parametrizable con `-J` | Cookie Manager + HeaderManager |

**Reglas transversales:**

1. **Mockear el LLM por defecto** en E2E (D-10) y en perf principal (D-15).
   La medición end-to-end real del LLM solo va en el Escenario 4 dedicado.
2. **Seed determinista** (`backend/prisma/seed.ts` para dev, `e2e/fixtures/seed.ts`
   para E2E — D-12, `backend/test/perf/seed-perf.ts` para perf — D-16).
3. **Verificar constraints `chk_`** (no `check_`) por convención adoptada en D-1.
4. **Pin de versiones en `npx`** (NT-001): `npx -y prisma@6.19.2 …` o invocar
   el binario local (`node_modules/.bin/prisma …`).
5. **`127.0.0.1`** en TODA la stack de tests en Windows (NT-018) — Playwright
   resuelve `localhost` a IPv6 y rompe el bind del backend.
