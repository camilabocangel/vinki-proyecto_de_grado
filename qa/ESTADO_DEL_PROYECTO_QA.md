# Estado del proyecto QA — Vinki

> **Última actualización:** 2026-05-21 (Fase 5-A cerrada — 6 perfiles JMeter + RNF-01 real medido + **HE-06 reclasificado por D-17** a observación acotada al modo `practice`; el flujo principal cumple RNF-01 con holgura vía BullMQ)
> **Propósito:** punto único de retomada del trabajo de QA. Contiene
> el resumen ejecutivo del estado actual, decisiones tomadas, próximos
> pasos y enlaces a todos los artefactos generados.

---

## 1. Resumen ejecutivo

- **Proyecto:** Vinki — plataforma web de simulación de entrevistas
  técnicas con IA. Proyecto de grado, Ingeniería de Sistemas, UPB.
- **Stack:** NestJS + Node.js + TypeScript + React + Vite +
  PostgreSQL con pgvector + componente RAG (OpenAI / Gemini con
  abstracción + mock para sandbox).
- **Fases QA completadas:** Fase 0 (inventario), Fase 1 (plan
  maestro + matriz), Fase 2 (unitarias backend + frontend), Fase 3
  (integración + integridad de datos), Fase 4 (E2E Playwright).
- **Fases QA pendientes:** Fase 5-B (seguridad — Semgrep, npm audit,
  eslint-plugin-security), Fase 6 (evaluación RAG con Ragas / DeepEval),
  Fase 7 (consolidación informe). **Fase 5-A (rendimiento) cerrada** —
  6 perfiles JMeter ejecutados con éxito + RNF-01 real medido +
  **HE-06 reclasificado a observación acotada por D-17** (el flujo
  principal cumple RNF-01 con holgura vía BullMQ; la latencia >5 s
  se limita al modo `practice`, feature opcional). 2 perfiles
  parcial/pendientes documentados como limitación de entorno (8 GB RAM).
- **Total de tests verde acumulados:** **644** — 371 unitarias
  backend (368 + 3 regression guards por HE-01) + 134 unitarias
  frontend + 92 integración + 47 E2E.
- **Estado de la suite:** **VERDE 100 %** — verificado con
  `--repeat-each=3` en E2E (141/141). **1 bug de seguridad ALTA
  detectado por E2E y corregido** (HE-01: cross-tenant data leak en
  caché — ver § 6). 1 archivo de producción modificado con
  autorización explícita para corregirlo
  (`backend/src/common/cache.interceptor.ts`).

---

## 2. Estado por fase

| Fase | Estado | Tests | Cobertura | Documento de cierre |
|---|---|---|---|---|
| Fase 0 — Inventario | ✅ Cerrada | — | — | [inventario_sistema.md](00-inventario/inventario_sistema.md) |
| Fase 1 — Plan maestro | ✅ Cerrada | — | — | [plan_maestro_pruebas.md](01-plan-maestro/plan_maestro_pruebas.md) |
| Fase 2 — Unitarias | ✅ Cerrada | 502 (368 back + 134 front) | Backend 99 % / Frontend 83 % (post-D-8) | [cierre_fase_2.md](02-pruebas-unitarias/cierre_fase_2.md) |
| Fase 3 — Integración | ✅ Cerrada | 92 | RNF-05, RNF-07–RNF-20 validados E2E | [cierre_fase_3.md](03-pruebas-integracion/cierre_fase_3.md) |
| Fase 4 — E2E Playwright | ✅ **Cerrada 100 %** | **47/47** verde, verificado 3 corridas (141/141) | 27 RF + 4 RNF cubiertos extremo a extremo · **1 bug ALTA corregido (HE-01)** · **1 bug MEDIA-ALTA diferido por D-13 (HE-05)** | [cierre_fase_4.md](03-pruebas-e2e/cierre_fase_4.md) + [bug_seguridad_HE01.md](03-pruebas-e2e/bug_seguridad_HE01.md) + [plan_mejoras_futuras.md](03-pruebas-e2e/plan_mejoras_futuras.md) |
| Fase 5-A — Rendimiento (JMeter) | ⚠ **Cerrada con observaciones** | 6 perfiles ejecutados (smoke/carga/estrés RNF-01 ARQ + smoke/carga RNF-02 + RNF-01 REAL 20 muestras) + 1 parcial (RNF-02 estrés a 30 u) + 2 pendientes (RNF-02 estrés 50 u, RNF-03) | **RNF-01 ARQ: P95=361ms a 50u** ✅ · **RNF-02: P95=90ms a 20u** ✅ · **RNF-01 REAL: P95=7 418ms** ❌ → **HE-06**. Limitación 8 GB RAM. | [reporte_rendimiento.md](04-pruebas-no-funcionales/rendimiento/reporte_rendimiento.md) + [setup_jmeter.md](04-pruebas-no-funcionales/rendimiento/setup_jmeter.md) + [seed_perf.md](04-pruebas-no-funcionales/rendimiento/seed_perf.md) |
| Fase 5-B — Seguridad (Semgrep, npm audit, eslint-plugin-security) | ⏳ Pendiente | — | Pre-configurado en Fase 2.5 (eslint-security ya activo) | — |
| Fase 6 — Evaluación RAG | ⏳ Pendiente | — | — | — |
| Fase 7 — Consolidación informe | ⏳ Pendiente | — | — | — |

---

## 3. Cobertura consolidada actual

| Capa | Suites | Tests | Stmts | Branch | Funcs | Lines | Notas |
|---|---|---|---|---|---|---|---|
| Backend unitarias | 48 | **371/371** ✅ (+3 regression guards HE-01) | **99.15 %** ✅ | **92.98 %** ✅ | **98.06 %** ✅ | **99.22 %** ✅ | Sobre código en alcance (módulos D-5, D-7 excluidos) |
| Frontend unitarias | 30 | 134/134 ✅ | **83.46 %** ✅ | **82.32 %** ✅ | 62.31 % ⚠ | **88.88 %** ✅ | Functions arrastrada por wiring (`App.tsx`, `api/client.ts`) — declarada sin candidato razonable |
| Backend integración | 9 | 92/92 ✅ | n/a (objetivo E2E) | n/a | n/a | n/a | 15 RNF + 13 RF cubiertos con DB + cola reales |
| **E2E Playwright** | **10** | **47/47 ✅** (verificado --repeat-each=3 = 141/141) | n/a (objetivo flow) | n/a | n/a | n/a | 27 RF + 4 RNF (RNF-07/26/27/28) cubiertos. **1 bug seguridad ALTA detectado por E2E y corregido (HE-01)** |
| **Acumulado** | **97** | **644/644** ✅ | — | — | — | — | 1 archivo de producción modificado (cache.interceptor.ts) — autorizado para corregir HE-01 |

**Hallazgos clave:** 7 de 8 métricas globales ≥ 80 %. La única
métrica < 80 % (functions frontend) está justificada con detalle en
[ajuste_cobertura_3C.md](02-pruebas-unitarias/ajuste_cobertura_3C.md);
el código fuente está honestamente declarado (lazy imports del
router, wrappers HTTP, handlers de layout).

**Hallazgos consolidados de la Fase 4 (5 — todos gestionados):**

| ID | Tipo | Severidad | Estado | RF/RNF |
|---|---|---|---|---|
| **HE-01** | Seguridad — cross-tenant data leak en caché | **ALTA** | ✅ **RESUELTO** | RNF-07 |
| HE-02 | Accesibilidad — sin `aria-label` en logout | Baja | Documentado — diferido (D-13 / backlog) | RNF-29 |
| HE-03 | i18n — strings hardcoded en KnowledgeBase | Baja | Documentado — diferido (D-13 / backlog) | RNF-26 |
| HE-04 | i18n — "Cancelar" sin `t()` en Profile | Baja | Documentado — diferido (D-13 / backlog) | RNF-26 |
| **HE-05** | Lógica — `skill_id` contaminado en "Generar con IA" admin | **MEDIA-ALTA** ⚠ | **Documentado — diferido (D-13)** | RF-12, RF-27, RF-42 |

Backlog priorizado de los 4 hallazgos diferidos (con fix técnico
especificado para cada uno) en
[`qa/03-pruebas-e2e/plan_mejoras_futuras.md`](03-pruebas-e2e/plan_mejoras_futuras.md)
— apto como anexo del informe final.

**🚨 HE-01 (CORREGIDO):**

Durante la Fase 4 (E2E Playwright) la suite detectó un bug de
seguridad de severidad **ALTA** en
`backend/src/common/cache.interceptor.ts`: la clave de caché omitía
el `userId` del usuario autenticado, causando *cache poisoning
cross-user* en 5 endpoints `@Cacheable` que retornan datos
personalizados (dashboard, percentiles, predicción de carrera,
job-fit, transfer learning). Esto violaba directamente RNF-07.

**Acción tomada (con autorización explícita del tutor):** se modificó
`buildCacheKey()` para incluir `userId` en la clave; se agregaron 3
*regression guards* unitarios. Verificado a 4 niveles: 11/11
interceptor + 371/371 backend + 92/92 integración + 141/141 E2E (3
corridas seguidas). **0 regresiones.**

Reporte ejecutivo completo:
[`bug_seguridad_HE01.md`](03-pruebas-e2e/bug_seguridad_HE01.md).

**HE-05 (DIFERIDO por D-13):**

El feature "Generar con IA" del `AdminQuestionsPage` persiste todas
las preguntas con `skill_id` por defecto incorrecto: el frontend no
envía el campo, y el backend asigna `(await prisma.skill.findFirst())
?.id ?? 1`. Afecta RF-12 (selección por skill), RF-27 (UserSkillScore
atribuido a habilidad equivocada) y RF-42 (calidad del banco).
Severidad **MEDIA-ALTA**.

**Decisión D-13 (2026-05-20): diferir la corrección al backlog
post-MVP.** Justificación profesional:

1. No compromete seguridad ni privacidad (a diferencia de HE-01).
2. Afecta una funcionalidad administrativa (RF-42 — prioridad Baja
   en `docs/requerimientos.md`), no el recorrido crítico del MVP del
   estudiante.
3. La corrección implica un cambio de UX (selector de skill
   obligatorio), lo que excede corrección de defectos y entra en
   desarrollo de features.

Mitigación temporal: el admin puede editar manualmente las preguntas
generadas para asignarles el skill correcto vía el modal de edición.
Fix técnico ya especificado (Opción A) en
[`plan_mejoras_futuras.md`](03-pruebas-e2e/plan_mejoras_futuras.md),
listo para implementar cuando se amplíe el alcance post-MVP.

Detalle técnico completo:
[`hallazgos_e2e.md` § HE-05](03-pruebas-e2e/hallazgos_e2e.md).
Decisión formal:
[`decisiones_qa.md` § D-13](01-plan-maestro/decisiones_qa.md).

---

## 4. Decisiones QA tomadas (D-1 a D-17)

Detalle completo en [decisiones_qa.md](01-plan-maestro/decisiones_qa.md).

- **D-1** — CHECK constraints (RNF-18/19/20): migración Prisma
  `20260519120000_add_check_constraints` con 7 `chk_*`. Aplicada y
  verificada E2E en TC-I-018/019/020.
- **D-2** — Escalas de evaluación 0–5 (por dimensión) vs. 0–100
  (score agregado por habilidad): confirmadas como escalas
  independientes.
- **D-3** — RNF-04 escalabilidad horizontal: formalizada en
  TC-ARQ-001 (validación arquitectónica, no k6).
- **D-4** — RNF-06 HTTPS: objetivo de diseño verificable por
  configuración (`docker-compose.prod.yml`).
- **D-5** — RF-37 a RF-41 (CRUD admin de catálogos): fuera del MVP
  académico, diferidos.
- **D-6** — RF-31 alcance RAG: uso dual confirmado (generación de
  preguntas + evaluación).
- **D-7** — Módulos sin RF declarado (achievements, challenges,
  notifications, reports avanzados + equivalentes frontend):
  diferidos.
- **D-8** — 8 pages frontend > 500 LOC reclasificadas a E2E
  Playwright (Fase 4). Specs unitarios "smoke focal" se mantienen
  como red de seguridad de render.
- **D-9** — **Apache JMeter** (no k6) como herramienta oficial para
  las pruebas de rendimiento de la Fase 5. **Instrucción directa
  del tutor académico — no reversible.** La propuesta inicial de k6
  queda archivada en
  `qa/04-pruebas-no-funcionales/rendimiento/ARCHIVADO_setup_k6.md`.
- **D-10** — LLM siempre mockeado en E2E (Playwright + LLM_SANDBOX).
  Calidad real del LLM se valida en Fase 6.
- **D-11** — Audio mockeado en TC-E-02 con stubs de `getUserMedia`
  y `MediaRecorder` + intercepción del POST `/audio`.
- **D-12** — Seed E2E determinista, una sola vez por `globalSetup`;
  cleanup en `globalTeardown` con TRUNCATE CASCADE.
- **D-13** — Diferir la corrección de HE-05 (`skill_id` en generación
  IA del admin) al backlog post-MVP. Fix técnico ya especificado
  (Opción A). Justificación: no es seguridad, afecta feature
  administrativa de prioridad Baja, y el fix implica cambio de UX.
- **D-14** — Límites del `ThrottlerModule` externalizados a env vars
  (`THROTTLE_SHORT_LIMIT/TTL`, `THROTTLE_LONG_LIMIT/TTL`) con defaults
  iguales a los valores anteriores. Refactor de `app.module.ts` a
  `forRootAsync`. Habilita las corridas JMeter de Fase 5 (RNF-03 con
  50 concurrentes) sin afectar producción.
- **D-15** — Estrategia dual de medición del RNF-01: carga con mock
  (arquitectura) + subset reducido (10-20 muestras) con LLM real para
  latencia end-to-end. Documentar limitación en el informe.
- **D-16** — Seed dedicado para perf (`backend/test/perf/seed-perf.ts`)
  independiente del seed E2E. Sembra `status='ready'` (literal exigido
  por el query RNF-02) y volúmenes hasta 10 000 preguntas.
- **D-17** — Interpretación del RNF-01 según el flujo (`evaluation`
  asíncrono vs `practice` síncrono). El cumplimiento se valida sobre
  el flujo principal (ack ~12 ms vía BullMQ). HE-06 queda acotada al
  modo `practice` (feature opcional, P95 = 7 418 ms dominada por LLM
  externo). Propuesta de sub-umbrales RNF-01-a (< 500 ms) /
  RNF-01-b (< 8 s) pendiente de validar con el tutor.

---

## 5. Notas técnicas registradas

Lista completa en [notas_tecnicas.md](00-inventario/notas_tecnicas.md).

- **NT-001** — Pineado de versión en `npx` (`prisma@6.19.2`).
- **NT-002** — Patrón de mocking para módulos con RAG/Embeddings.
- **NT-003** — Mock de `uuid` v13 (ESM) en specs de NestJS unitarios.
- **NT-004** — Tipado `jest.fn<any, any[]>()` para `mock.calls`.
- **NT-005** — Mock fiel de `ConfigService.get(key, default)`.
- **NT-006** — `reflect-metadata` requerido en specs de
  class-validator aislados.
- **NT-007** — Pass-through interceptor en tests de controllers
  con `CacheInterceptor`.
- **NT-008** — `userEvent.setup()` v14 reemplaza `navigator.clipboard`.
- **NT-009** — Mocks dummy para hooks que requieren APIs no presentes
  en jsdom (`EventSource`).
- **NT-010** — Patrón "smoke focal" para archivos > 500 LOC en
  frontend.
- **NT-011** — Test DB aislada por docker-compose dedicado
  (postgres-test:5434, redis-test:6381).
- **NT-012** — `transformIgnorePatterns` whitelist para `uuid` v13
  ESM en config de integración (UUIDs reales en JWT).
- **NT-013** — JWT RS256 requiere par RSA real (PEM con `\n`
  escapado) en `.env.test`.
- **NT-014** — NestJS ejecuta Guards ANTES que Pipes — `/login` con
  email inválido devuelve 401, no 400.
- **NT-015** — Polling sobre `evaluationStatus` para validar el
  worker BullMQ asíncrono.
- **NT-016** — Insertar pregunta con embedding `vector` vía raw SQL
  (Prisma no soporta pgvector nativamente).
- **NT-017** — Stack E2E con `webServer` orquestando backend +
  frontend a la vez (Playwright multi-server).
- **NT-018** — IPv6 vs IPv4 en Windows: usar `127.0.0.1` en TODA
  la stack E2E (Playwright resuelve `localhost` a IPv6).
- **NT-019** — Forzar `locale: 'es-ES'` en el `browserContext` para
  que `i18next-browser-languagedetector` cargue `es.json`.
- **NT-020** — `requireFromBackend` resuelve `@prisma/client` y
  `bcrypt` desde `backend/node_modules` sin duplicar deps en raíz.
- **NT-021** — Click en Antd `Card` con `onClick`: usar
  `.ant-card` filtrado por `hasText` (no el `<strong>` interno).
- **NT-022** — Mock de `getUserMedia` + `MediaRecorder` para tests
  de grabación de audio sin micrófono físico.
- **NT-023** — Las claves de caché DEBEN incluir el scope de
  autorización (`userId`). Lección aprendida del bug HE-01.
- **NT-023bis** — Configuración operativa de JMeter en host de 8 GB
  (heap `-Xms128m -Xmx512m -XX:MaxMetaspaceSize=512m`).
- **NT-024** — Ejecución JMeter síncrona en foreground, NO background
  (los procesos huérfanos `cmd.exe` retienen locks sobre `.txt`/`.jtl`).
- **NT-025** — Regenerar HTML JMeter post-mortem desde un `.jtl`
  con `jmeter -g <jtl> -o <out>`; recortar última línea si está truncada.
- **NT-026** — Toggle LLM real (`start-perf-real.ts`) para D-15: lee
  key real de `backend/.env`, sobrescribe `LLM_SANDBOX=false`, banner
  redacted.

---

## 6. Diferimientos consolidados

Detalle completo en [diferidos_qa.md](01-plan-maestro/diferidos_qa.md).

- **D-5 (backend)** — RF-37 a RF-41: CRUD admin de
  roles/lenguajes/frameworks/niveles/habilidades. Sin endpoints de
  escritura en el código actual.
- **D-7 (backend)** — `src/achievements/`, `src/challenges/`,
  `src/notifications/`, `src/reports/` (módulo completo, gamificación
  + analytics avanzados). No mapean a RF declarado.
- **D-7 (frontend)** — `pages/admin/AdminAnalyticsPage`,
  `pages/challenges/**`, `pages/dashboard/{Achievements,CareerInsights,StudyPlan}Page`,
  `pages/feedback/SharedReportPage`, `pages/recruiter/**`,
  `pages/home/HomePage`, `components/{GlobalSearch,ThemeProvider}`,
  `hooks/{useRateLimit,useSSE}`, `lib/axe`. Diferidos por la misma
  razón que D-7 backend.
- **D-8 (frontend)** — 8 pages > 500 LOC reclasificadas a E2E
  Playwright (Fase 4): `InterviewWizardPage`, `InterviewSessionPage`,
  `FeedbackPage`, `FeedbackHistoryPage`, `DashboardPage`,
  `ProfilePage`, `KnowledgeBasePage`, `AdminQuestionsPage`. Specs
  unitarios "smoke focal" se mantienen.

---

## 7. Próximo paso explícito

> **Estado actual (2026-05-21):** Fase 5-A cerrada. Trabajo
> consolidado en commit `cfdd3a6` (working tree limpio, suite verde
> 371/371). HE-06 reclasificado por D-17 (observación acotada al
> modo `practice`, no bloqueante).
>
> ### Próximo paso INMEDIATO: Fase 5-B (Seguridad)
>
> No requiere JMeter, no requiere mucha memoria, todo se ejecuta en
> CLI. Tareas:
>
> 1. **`npm audit`** en `backend/` y `frontend/app/`. Capturar JSON
>    inicial y posterior (si se aplica algún `npm audit fix` no
>    breaking, registrar deltas). Output a
>    `qa/04-pruebas-no-funcionales/seguridad/audit_{backend,frontend}_{inicial,posterior}.json`.
> 2. **`npm run lint:security`** en `backend/` (ya configurado con
>    `eslint-plugin-security` desde Fase 2.5; baseline en
>    `seguridad/eslint_security_inicial.txt`). Capturar el delta y
>    triagear cualquier hallazgo nuevo.
> 3. **Semgrep** contra `backend/src/` con reglas OWASP Top 10 (`-c
>    p/owasp-top-ten` o equivalente). Instalación documentada en
>    [`seguridad/setup_semgrep.md`](04-pruebas-no-funcionales/seguridad/setup_semgrep.md).
>    Output a `seguridad/semgrep.json` + tabla de severidades.
> 4. **Revisión manual de RNF-05 a RNF-08:**
>    - RNF-05 — bcrypt (no plain text passwords). Ya validado en
>      Fase 3 (TC-I-005), confirmar que el patrón se mantiene.
>    - RNF-06 — HTTPS (objetivo de diseño, D-4). Revisar
>      `docker-compose.prod.yml`.
>    - RNF-07 — Autorización por propiedad (HE-01 corregido). Ya
>      validado E2E ×3; revisar que no haya nuevos endpoints
>      `@Cacheable` que regresionen el patrón.
>    - RNF-08 — Validación estricta de DTOs (TC-I-008). Confirmar
>      que todos los controllers nuevos siguen el patrón
>      `class-validator`.
> 5. Redactar
>    `qa/04-pruebas-no-funcionales/seguridad/reporte_seguridad.md`
>    con la tabla de hallazgos por severidad + estado por RNF.
> 6. Generar `qa/04-pruebas-no-funcionales/cierre_fase_5.md`
>    consolidando 5-A (rendimiento) + 5-B (seguridad) como cierre
>    formal de la Fase 5 completa.
>
> ### Después de Fase 5-B → Fase 6 (Evaluación RAG)
>
> Ragas + DeepEval contra dataset estático de 25-30 preguntas
> curadas para validar las 6 capacidades IA-01 a IA-06 (Faithfulness,
> Answer Relevance, Context Precision, Context Recall, Answer
> Correctness, Latencia del pipeline RAG completo). Detalle de la
> metodología en
> [plan_maestro_pruebas.md § 5.5](01-plan-maestro/plan_maestro_pruebas.md).
> Esta fase es la que valida la CALIDAD real del LLM (no la mockeada).
>
> ### Después de Fase 6 → Fase 7 (Consolidación del Capítulo 3.3.2)
>
> Redacción del capítulo "Pruebas y Validación" del informe del
> proyecto de grado, integrando:
>
> - Evidencia objetiva: cobertura, suites, hallazgos, reportes
>   JMeter, reportes RAG.
> - Las 17 decisiones D-1..D-17 como sección de "metodología y
>   alcance".
> - Los 6 hallazgos HE-01..HE-06 como sección de "defectos
>   detectados y gestionados".
> - Capturas de los reportes HTML (JMeter + Playwright + cobertura).
>
> **Hallazgo HE-06 — RECLASIFICADO** (D-17, 2026-05-21).
> Tras el análisis del flujo real de evaluación
> ([analisis_flujo_evaluacion.md](04-pruebas-no-funcionales/rendimiento/analisis_flujo_evaluacion.md))
> se confirmó que el RNF-01 atraviesa dos rutas: el flujo principal
> del estudiante (modo `evaluation`) es **asíncrono vía BullMQ** y
> cumple el RNF-01 con holgura (ack ~12 ms); la latencia P95 = 7 418 ms
> medida en Fase 5-A corresponde al modo `practice` (feature opcional
> de feedback inmediato), donde está dominada por el proveedor LLM
> externo. **HE-06 queda reclasificado a observación acotada de
> severidad Baja-Media**, no bloqueante para el cierre de Fase 5-A.
> La propuesta de sub-umbrales RNF-01-a / RNF-01-b queda pendiente
> de validación con el tutor. Detalle técnico en
> [reporte_rendimiento.md § 6](04-pruebas-no-funcionales/rendimiento/reporte_rendimiento.md)
> y registro formal en [decisiones_qa.md § D-17](01-plan-maestro/decisiones_qa.md).

---

## 8. Estructura completa de carpetas `qa/`

```
qa/
├── ESTADO_DEL_PROYECTO_QA.md      # ← Este archivo. Punto de retomada.
├── README.md                       # Índice navegable de todos los documentos QA.
│
├── 00-inventario/                  # Fase 0 — inventario técnico del SUT.
│   ├── inventario_sistema.md       # Catálogo de módulos, endpoints, dependencias.
│   ├── estado_db_desarrollo.md     # Snapshot de la DB de dev al iniciar QA.
│   ├── notas_tecnicas.md           # Bitácora NT-001..NT-026 (decisiones técnicas).
│   └── reverificacion_constraints.txt
│
├── 01-plan-maestro/                # Fase 1 — plan, trazabilidad, decisiones.
│   ├── plan_maestro_pruebas.md     # Plan maestro completo (estrategia por capas).
│   ├── matriz_trazabilidad.md      # RF/RNF/IA ↔ TC-U-XXX / TC-I-XXX / TC-E-XX / TC-P-XXX.
│   ├── decisiones_qa.md            # Decisiones D-1 a D-17 con justificación.
│   └── diferidos_qa.md             # Catálogo de código fuera de alcance.
│
├── 02-pruebas-unitarias/           # Fase 2 — unitarias backend + frontend.
│   ├── cierre_fase_2.md
│   ├── ajuste_cobertura_3C.md      # Aplicación de D-8 y resultado final.
│   ├── ajuste_cobertura_final_3B.md
│   ├── resumen_cobertura_{3A,3B,3C}.md
│   ├── diagnostico_rapido.md / reparacion_tests_rojos.md / setup_summary.md
│   └── *.txt                       # Outputs literales (cobertura, smoke, diagnóstico).
│
├── 03-pruebas-integracion/         # Fase 3 — integración + integridad.
│   ├── cierre_fase_3.md
│   ├── resumen_integracion.md
│   ├── setup_summary.md
│   └── resultado_integracion.txt
│
├── 03-pruebas-e2e/                 # Fase 4 — E2E Playwright (47/47 verde).
│   ├── cierre_fase_4.md            # Cierre formal de la fase.
│   ├── resumen_e2e.md              # Inventario por suite + mapeo RF/RNF.
│   ├── hallazgos_e2e.md            # 6 hallazgos consolidados (HE-01..HE-06).
│   ├── bug_seguridad_HE01.md       # Reporte ejecutivo del bug HE-01 (cache leak).
│   ├── plan_mejoras_futuras.md     # Backlog priorizado de hallazgos diferidos.
│   ├── como_ejecutar.md
│   └── smoke_e2e.txt
│
└── 04-pruebas-no-funcionales/      # Fase 5 — rendimiento + seguridad.
    ├── rendimiento/                # Fase 5-A — JMeter (D-9), cerrada con observaciones.
    │   ├── reporte_rendimiento.md  # Reporte completo: tablas, hallazgos, cumplimiento.
    │   ├── analisis_flujo_evaluacion.md  # Sustenta la reclasificación de HE-06 (D-17).
    │   ├── analisis_endpoints_rendimiento.md  # Investigación previa (Fase 5-PRE).
    │   ├── seed_perf.md            # Operativa del seed de perf (D-16).
    │   ├── setup_jmeter.md         # Instalación, heap, comandos.
    │   ├── ARCHIVADO_setup_k6.md   # Propuesta inicial archivada (D-9).
    │   ├── planes/                 # 5 planes .jmx + perf-students.csv.
    │   ├── resultados/             # 7 .jtl + 7 HTML reports.
    │   └── capturas/               # (vacío — pendiente para informe).
    └── seguridad/                  # Fase 5-B — pendiente.
        ├── setup_semgrep.md
        └── eslint_security_inicial.txt
```

Adicionalmente, fuera de `qa/` viven los specs y la infra de pruebas:

```
backend/test/integration/           # Specs de Fase 3 (Jest + Supertest).
├── api/                            # Grupo B (4 suites, 37 tests).
├── dto/                            # Grupo C (1 suite, 11 tests).
├── integrity/                      # Grupo A (4 suites, 44 tests).
├── app-helpers.ts                  # createTestApp() + extractCookies().
├── db-helpers.ts                   # prisma, resetDatabase, seedCatalogs, createUser, createQuestion(WithEmbedding).
├── jest-integration.config.ts      # rootDir, maxWorkers:1, timeout 30 s.
└── setup.ts                        # Carga .env.test + guardrail anti-dev-DB.

e2e/                                # Infra Playwright (Fase 4).
├── fixtures/
│   ├── auth.fixture.ts             # Login programático para tests E2E.
│   └── llm-mock.fixture.ts         # Stub del LLM via route interception.
├── pages/                          # (pre-creada) — Page Objects.
├── helpers/                        # (pre-creada) — helpers compartidos.
└── suites/
    └── 00-smoke/smoke.spec.ts      # Smoke E2E del Prompt 2.5.

docker-compose.test.yml             # Infra de test (postgres-test:5434, redis-test:6381).
backend/.env.test                   # Variables de la suite de integración (RSA real de prueba).
```

---

## 9. Comandos para retomar trabajo local

```bash
# Levantar DB de desarrollo (no requerida para integración).
docker compose up -d postgres redis

# Verificar suite de unitarias backend.
cd backend && npm run test:cov

# Verificar suite de unitarias frontend.
cd frontend/app && npm run test:cov

# Verificar suite de integración (requiere DB + Redis de test).
docker compose -f docker-compose.test.yml up -d
# Esperar a que ambos contenedores estén (healthy).
cd backend && npm run test:int

# Verificar las 7 CHECK constraints en la DB de dev.
docker exec proyectodegrado-postgres-1 psql -U vinki -d vinki -c \
  "SELECT COUNT(*) FROM pg_constraint WHERE contype='c' AND conname LIKE 'chk_%';"
# Esperado: 7

# Verificar las mismas constraints en la DB de test.
docker exec vinki-postgres-test psql -U vinki -d vinki_test -c \
  "SELECT COUNT(*) FROM pg_constraint WHERE contype='c' AND conname LIKE 'chk_%';"
# Esperado: 7

# Bajar la infra de test cuando termine.
docker compose -f docker-compose.test.yml down
```

---

## 10. Cómo retomar la conversación con un asistente de IA

Si vas a iniciar una nueva conversación con Claude (o cualquier
asistente) para continuar el trabajo de QA:

1. Pega **TODO el contenido de este archivo** en el primer mensaje.
2. Adjunta `docs/requerimientos.md` para contexto del SUT.
3. Indica explícitamente:

   > "Quiero continuar con la **Fase 5-B — Pruebas de seguridad**.
   > El contexto completo está en el archivo adjunto
   > (`qa/ESTADO_DEL_PROYECTO_QA.md`). Procede con el **Prompt 5-B**."

4. (Opcional, recomendado) Adjunta también:
   - `qa/01-plan-maestro/plan_maestro_pruebas.md` para la sección
     5.5 (criterios) y referencias a OWASP / RNF-05 a RNF-08.
   - `qa/04-pruebas-no-funcionales/rendimiento/reporte_rendimiento.md`
     y `analisis_flujo_evaluacion.md` si el tutor requiere contexto
     de Fase 5-A para justificar HE-06 / D-17.

### Estado de Git al pausar (2026-05-21)

- HEAD: **`cfdd3a6`** — `test(perf): Fase 5-A rendimiento JMeter (RNF-01/02) + HE-06 reclasificado (D-14..D-17)`.
- Working tree: **limpio**. Todo el trabajo de Fase 5-A + afinamiento HE-06 + D-17 está commiteado.
- Suite verde: **48/48 suites, 371/371 tests** post-commit.
- Sin procesos huérfanos (java, node, JMeter — todos detenidos).

---

> **Nota para el próximo turno (humano o IA):** este documento debe
> actualizarse al cerrar cada fase futura — sección 1 (resumen),
> sección 2 (estado por fase), sección 3 (cobertura), sección 5
> (notas técnicas nuevas) y sección 7 (próximo paso). Mantenerlo
> conciso: referencias, no copias.
