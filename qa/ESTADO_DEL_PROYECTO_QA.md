# Estado del proyecto QA — Vinki

> **Última actualización:** 2026-05-20 (Fase 4 cerrada + Bug HE-01 de seguridad corregido)
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
- **Fases QA pendientes:** Fase 5 (rendimiento **JMeter** D-9 +
  seguridad), Fase 6 (evaluación RAG con Ragas / DeepEval), Fase 7
  (consolidación informe).
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
| Fase 4 — E2E Playwright | ✅ Cerrada | **47/47** (100 %, verificado 3 corridas) | 27 RF + 4 RNF cubiertos extremo a extremo + **1 bug seguridad ALTA detectado y corregido** | [cierre_fase_4.md](03-pruebas-e2e/cierre_fase_4.md) + [bug_seguridad_HE01.md](03-pruebas-e2e/bug_seguridad_HE01.md) |
| Fase 5 — Rendimiento + Seguridad | ⏳ Pendiente | — | — | — |
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

**🚨 Hallazgo de seguridad destacado — HE-01 (CORREGIDO):**

Durante la Fase 4 (E2E Playwright) la suite detectó un bug de
seguridad de severidad **ALTA** en
`backend/src/common/cache.interceptor.ts`: la clave de caché omitía
el `userId` del usuario autenticado, causando *cache poisoning
cross-user* en 5 endpoints `@Cacheable` que retornan datos
personalizados (dashboard, percentiles, predicción de carrera,
job-fit, transfer learning). Esto violaba directamente RNF-07
(autorización por propiedad de los datos).

El bug **NO** fue detectado por las capas inferiores (unitarias ni
integración) — emergió solo en E2E porque requería dos usuarios
distintos consultando el mismo endpoint en sucesión dentro del TTL
del cache. Es la justificación empírica de mantener la pirámide
completa de pruebas (Decisión D-8) y del valor de la suite Playwright.

**Acción tomada (con autorización explícita del tutor):** se modificó
`buildCacheKey()` para incluir `userId` en la clave; se agregaron 3
*regression guards* unitarios. Verificado a 4 niveles: 11/11
interceptor + 371/371 backend + 92/92 integración + 141/141 E2E (3
corridas seguidas). **0 regresiones.**

Reporte ejecutivo completo:
[`bug_seguridad_HE01.md`](03-pruebas-e2e/bug_seguridad_HE01.md)
(pieza central recomendada para el informe final).

---

## 4. Decisiones QA tomadas (D-1 a D-8)

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

> "El próximo paso es ejecutar el **Prompt 5 — Pruebas de Rendimiento
> con Apache JMeter + Seguridad**. Por **Decisión D-9** (instrucción
> del tutor, no reversible), la herramienta de rendimiento es Apache
> JMeter (NO k6). La fase debe:
>
> 1. Instalar Apache JMeter 5.x localmente (no instalado aún).
> 2. Crear planes `.jmx` para validar:
>    - **RNF-01:** P95 < 5 s en evaluación de respuesta (endpoint
>      `POST /api/interviews/:id/questions/:qid/answer` o
>      `/evaluate-now`).
>    - **RNF-02:** P95 < 500 ms en búsqueda vectorial (endpoint
>      `POST /api/knowledge/search`).
>    - **RNF-03:** ≥ 50 usuarios concurrentes ejecutando entrevistas
>      sin degradación significativa.
> 3. Ejecutar contra una DB poblada — puede reutilizar el seed E2E
>    o crear uno dedicado en
>    `qa/04-pruebas-no-funcionales/rendimiento/data/`.
> 4. Capturar percentiles (P50/P95/P99) + throughput + tasa de
>    error en reportes HTML/CSV.
> 5. Ejecutar análisis de seguridad ya pre-configurado en Fase 2.5:
>    - `npm audit` en backend y frontend.
>    - Semgrep con reglas OWASP Top 10.
>    - `eslint-plugin-security` integrado en lint.
> 6. Generar `qa/04-pruebas-no-funcionales/cierre_fase_5.md` con
>    el formato de cierre estándar.
>
> El criterio de éxito es:
> - Los 3 RNF de rendimiento (01/02/03) cumplen sus umbrales.
> - `npm audit` reporta 0 vulnerabilidades **critical** o **high**.
> - Semgrep reporta 0 hallazgos de severidad alta sin justificación.
>
> Recursos disponibles para la fase:
> - DB de test ya levantable: `docker-compose.test.yml`
> - Seed E2E reutilizable: `e2e/fixtures/seed.ts`
> - Backend con `LLM_SANDBOX=true` para evitar costos de LLM real
>   durante pruebas de carga."

> **Nota sobre Fase 6 (RAG / DeepEval):** se mantendrá la propuesta
> de Ragas + DeepEval para evaluar las 6 capacidades IA-01 a IA-06
> contra el dataset estático de 25-30 preguntas (sección 5.5 del
> plan maestro).

---

## 8. Estructura completa de carpetas `qa/`

```
qa/
├── ESTADO_DEL_PROYECTO_QA.md      # ← Este archivo. Punto de retomada.
├── README.md                       # Índice general.
│
├── 00-inventario/                  # Fase 0 — inventario técnico del SUT.
│   ├── inventario_sistema.md       # Catálogo de módulos, endpoints, dependencias.
│   ├── estado_db_desarrollo.md     # Snapshot de la DB de dev al iniciar QA.
│   ├── notas_tecnicas.md           # Bitácora NT-001..NT-016 (decisiones técnicas).
│   └── reverificacion_constraints.txt
│
├── 01-plan-maestro/                # Fase 1 — plan, trazabilidad, decisiones.
│   ├── plan_maestro_pruebas.md     # Plan maestro completo (estrategia por capas).
│   ├── matriz_trazabilidad.md      # RF/RNF/IA ↔ TC-U-XXX / TC-I-XXX / TC-E-XX.
│   ├── decisiones_qa.md            # Decisiones D-1 a D-8 con justificación.
│   └── diferidos_qa.md             # Catálogo de código fuera de alcance.
│
├── 02-pruebas-unitarias/           # Fase 2 — unitarias backend + frontend.
│   ├── cierre_fase_2.md            # Documento de cierre de la fase.
│   ├── ajuste_cobertura_3C.md      # Aplicación de D-8 y resultado final.
│   ├── ajuste_cobertura_final_3B.md
│   ├── resumen_cobertura_3A.md     # Sub-corrida 3A (backend núcleo).
│   ├── resumen_cobertura_3B.md     # Sub-corrida 3B (backend resto).
│   ├── resumen_cobertura_3C.md     # Sub-corrida 3C (frontend).
│   ├── diagnostico_rapido.md       # Diagnóstico inicial de tests rojos.
│   ├── reparacion_tests_rojos.md   # Resumen de la reparación dirigida.
│   ├── setup_summary.md            # Setup de la suite unitaria.
│   ├── cobertura_backend_3*.txt    # Outputs literales de cobertura.
│   ├── cobertura_frontend_3*.txt
│   ├── diagnostico_*_raw.txt       # Outputs literales del diagnóstico inicial.
│   ├── post_reparacion_*.txt       # Output literal post-reparación.
│   └── smoke_*.txt                 # Smoke tests iniciales.
│
├── 03-pruebas-integracion/         # Fase 3 — integración + integridad.
│   ├── cierre_fase_3.md            # Documento de cierre de la fase.
│   ├── resumen_integracion.md      # Inventario por suite + mapeo RF/RNF.
│   ├── setup_summary.md            # Cómo levantar la infra y correr la suite.
│   └── resultado_integracion.txt   # Output literal del último run.
│
├── 03-pruebas-e2e/                 # Fase 4 — infra Playwright (pre-cargada).
│   ├── como_ejecutar.md            # Instrucciones de ejecución.
│   └── smoke_e2e.txt               # Smoke E2E inicial del Prompt 2.5.
│
└── 04-pruebas-no-funcionales/      # Fase 5 — rendimiento + seguridad (preparada).
    ├── rendimiento/                # Setup k6.
    │   ├── setup_k6.md
    │   ├── scripts/
    │   ├── data/
    │   └── reportes/
    └── seguridad/                  # Setup Semgrep + ESLint security.
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

   > "Quiero continuar con la **Fase 4 — Pruebas E2E con Playwright**.
   > El contexto completo está en el archivo adjunto
   > (`qa/ESTADO_DEL_PROYECTO_QA.md`). Procede con el **Prompt 4**."

4. (Opcional, recomendado) Adjunta también
   `qa/01-plan-maestro/plan_maestro_pruebas.md` para que el asistente
   tenga la sección 7 (Fase 4 — E2E) con el detalle de los 8 flujos a
   automatizar.

---

> **Nota para el próximo turno (humano o IA):** este documento debe
> actualizarse al cerrar cada fase futura — sección 1 (resumen),
> sección 2 (estado por fase), sección 3 (cobertura), sección 5
> (notas técnicas nuevas) y sección 7 (próximo paso). Mantenerlo
> conciso: referencias, no copias.
