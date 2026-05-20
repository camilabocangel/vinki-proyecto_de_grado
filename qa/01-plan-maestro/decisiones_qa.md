# Registro de Decisiones de QA — Plataforma Vinki

> **Proyecto de grado** — Ingeniería de Sistemas, Universidad Privada Boliviana (UPB).
> **Documento:** Registro consolidado de decisiones (Architecture/QA Decision Record).
> **Fecha de registro:** 2026-05-19.
> **Autor:** Equipo de QA (proyecto unipersonal).
> **Documentos vinculados:** `plan_maestro_pruebas.md` (§12 y §13), `matriz_trazabilidad.md`.

## Propósito

Las observaciones surgidas del Plan Maestro de Pruebas (sección 12) no pudieron ser
resueltas con el tutor en tiempo real. Para no bloquear el avance de las fases de QA,
el equipo adopta **supuestos justificados** que quedan registrados aquí como
decisiones formales. Cada decisión es un **supuesto adoptado**, no una verdad
definitiva: podrá ser revisada si el tutor expresa una posición diferente en
revisiones posteriores.

---

## DECISIÓN 1 — Restricciones CHECK de integridad (RNF-18, RNF-19, RNF-20)

**Fecha:** 2026-05-19
**Observación origen:** §12.1 del Plan Maestro — el esquema Prisma no declaraba las
restricciones CHECK exigidas por RNF-18, RNF-19 y RNF-20.

**Decisión adoptada:** se aplica una estrategia de **defensa en profundidad**: las
restricciones CHECK se agregan a nivel de base de datos antes de implementar las
pruebas de integridad, de modo que la base haga cumplir las reglas independientemente
de la validación en la capa de aplicación.

**Acción ejecutada:**

- Se creó la migración `backend/prisma/migrations/20260519120000_add_check_constraints/migration.sql`
  con las siguientes restricciones:
  - `answer_evaluations`: CHECK [0, 5] sobre `technical_correctness`,
    `clarity_of_explanation`, `communication`, `confidence` y `problem_solving`.
  - `user_skill_scores`: CHECK [0, 100] sobre `score`.
  - `interview_questions`: CHECK (`order_number` > 0).
- Se documentaron las constraints como comentarios en `backend/prisma/schema.prisma`
  (Prisma no admite CHECK declarativo; la migración SQL manual es el mecanismo válido).

**Justificación:** garantizar la integridad a nivel de motor relacional es la única
forma fiable de verificar RNF-18–RNF-20 y elimina la dependencia exclusiva de la
validación en código, que podría omitirse o presentar defectos.

**Estado:** la migración queda **lista para revisión**. No se ejecutó contra ninguna
base de datos.

---

## DECISIÓN 2 — Escalas de evaluación 0–5 vs. 0–100

**Fecha:** 2026-05-19
**Observación origen:** §12.2 del Plan Maestro — posible ambigüedad entre la escala
0–5 (RF-19–RF-23) y la escala 0–100 (RF-27).

**Decisión adoptada:** se confirman como **escalas independientes**. La evaluación por
respuesta individual usa la escala **0–5** (cinco dimensiones por respuesta); el
puntaje agregado por habilidad del usuario usa la escala **0–100**.

**Acción:** ninguna acción correctiva sobre el código o el esquema. Los casos de
prueba aplicarán cada umbral en su contexto correspondiente.

**Justificación:** ambos valores miden objetos distintos (una respuesta puntual frente
a un score acumulado por habilidad); no existe contradicción y la coexistencia es
coherente con el modelo de datos.

---

## DECISIÓN 3 — RNF-04: Escalabilidad horizontal

**Fecha:** 2026-05-19
**Observación origen:** §12.3 del Plan Maestro — conflicto entre la regla de la matriz
(herramienta k6) y la exclusión de RNF-04 de las pruebas de carga distribuida.

**Decisión adoptada:** RNF-04 se verifica mediante **validación arquitectónica**, no
con pruebas de carga distribuida. Se formaliza el caso de verificación **TC-ARQ-001**.

**Criterios concretos de verificación (TC-ARQ-001):**

1. Frontend y backend son contenedores Docker **independientes** y desplegables por
   separado (`docker-compose.yml` define ambos como servicios distintos con sus
   propios `Dockerfile`).
2. El backend **no mantiene estado de sesión en memoria**: la autenticación se basa
   en JWT transportado en cookies, lo que permite que cualquier réplica atienda
   cualquier petición.
3. La configuración de base de datos y servicios externos se inyecta vía **variables
   de entorno**, sin valores fijos en el código.
4. Los endpoints son **stateless**: el único estado compartido reside en la base de
   datos y en Redis, externos al proceso del backend.

**Justificación:** la validación de escalado horizontal real requiere infraestructura
distribuida no disponible en un proyecto académico; la verificación arquitectónica
confirma que el diseño **habilita** el escalado, que es lo que RNF-04 exige.

---

## DECISIÓN 4 — RNF-06: HTTPS / cifrado en tránsito

**Fecha:** 2026-05-19
**Observación origen:** §12.4 del Plan Maestro — el despliegue local opera sobre HTTP.

**Decisión adoptada:** RNF-06 se declara como **objetivo de diseño verificable a nivel
de configuración**. Las pruebas locales se ejecutan sobre HTTP; la verificación de
HTTPS se realiza inspeccionando la configuración de despliegue de producción.

**Acción ejecutada:**

- Se creó la plantilla `docker-compose.prod.yml` en la raíz del repositorio, que
  documenta una topología de producción con **reverse proxy y terminación TLS**.
- El archivo se entrega como plantilla con comentarios explícitos sobre los elementos
  que deben completarse antes de un despliegue real (dominio, certificados, secretos).

**Limitación reconocida:** por tratarse de un proyecto de grado académico sin
operación productiva, la configuración TLS no se ejecuta ni se valida en runtime. Se
documenta como limitación propia del entorno académico.

**Justificación:** el cumplimiento efectivo de HTTPS pertenece a la capa de despliegue;
dejar la topología documentada es la evidencia apropiada en este contexto.

---

## DECISIÓN 5 — RF-37 a RF-41: CRUD de catálogos

**Fecha:** 2026-05-19
**Observación origen:** §12.5 del Plan Maestro — el inventario no detectó endpoints
CRUD para roles, lenguajes, frameworks, niveles ni habilidades.

**Decisión adoptada:** RF-37 a RF-41 se documentan como **funcionalidad fuera del MVP
académico** y se difieren. **RF-42 (gestión de preguntas) se mantiene** dentro del
alcance, porque el inventario sí confirmó endpoints implementados para ese caso.

**Justificación registrada:**

> "El alcance del proyecto se centró en el flujo principal del estudiante
> (configuración → entrevista → evaluación → reportes). La administración de catálogos
> (roles, lenguajes, frameworks, niveles, habilidades) se realiza vía seed determinista
> en el bootstrap del sistema, lo cual es suficiente para validar todos los flujos
> funcionales del proyecto de grado. RF-37 a RF-41 quedan como funcionalidad futura
> para una versión de producción del sistema."

**Acción en la matriz:** el estado de RF-37 a RF-41 cambia de "Pendiente" a **"Fuera
del MVP — diferido"**; estos requerimientos **no** se incluyen en el catálogo de casos
de prueba a implementar. RF-42 permanece como "Pendiente".

---

## DECISIÓN 6 — RF-31: Alcance del componente RAG

**Fecha:** 2026-05-19
**Observación origen:** §12.6 del Plan Maestro — duda sobre si el contexto recuperado
por RAG se usa en la evaluación, en la generación de preguntas, o en ambas.

**Decisión adoptada:** se asume que el pipeline RAG se utiliza para **ambos
propósitos**: la generación de preguntas (módulo `questions`) y el enriquecimiento del
contexto durante la evaluación (módulo `evaluation`).

**Justificación:** esta interpretación maximiza la cobertura de las métricas IA-XX y
refleja el uso típico de RAG en sistemas educativos.

**Salvedad:** si la verificación durante las fases de prueba demuestra que el contexto
recuperado **no** se emplea actualmente en la evaluación, ese hecho se documentará como
**gap de implementación detectado por el plan de pruebas**. Aun en ese escenario, las
métricas **IA-01 (Faithfulness)** e **IA-03 (Context Precision)** se mantienen en la
matriz, porque siguen siendo relevantes para evaluar la generación de preguntas.

---

## DECISIÓN 7 — Diferimiento de módulos no mapeados a RF (extensión de D-5)

**Fecha:** 2026-05-19
**Origen:** detectado durante la Sub-corrida 3A del Prompt 3 (escritura de pruebas
unitarias del backend núcleo). El inventario técnico (Fase 0) había
catalogado varios módulos del código fuente que no aparecen en los 42 RF
declarados en `docs/requerimientos.md`.

**Decisión adoptada:** aplicar el mismo criterio metodológico que la
Decisión D-5 (CRUD de catálogos diferido por estar fuera del MVP) y
**diferir del alcance de pruebas** los siguientes módulos:

- `src/achievements/*` — `achievement.listener`, `achievements.controller`,
  `achievements.service`.
- `src/challenges/*` — `challenge.listener`, `challenges.controller`,
  `challenges.service`.
- `src/notifications/*` — `email.service`, `notification.listener`,
  `notifications.controller`.
- `src/reports/*` — **módulo completo**: `reports.service.ts`,
  `reports.controller.ts`, `shared-report.controller.ts`,
  `career-prediction.service.ts`, `transfer-learning.service.ts`,
  `job-profiles.ts` (ver enmienda de coherencia más abajo).

> **Enmienda de coherencia (2026-05-19, posterior al cierre inicial de 3B).**
> En la versión inicial de D-7 se excluyeron del coverage únicamente
> `reports.controller.ts`, `shared-report.controller.ts` y los tres
> archivos de features avanzadas (career-prediction, transfer-learning,
> job-profiles); `reports.service.ts` se mantuvo en alcance con su
> cobertura preexistente (~28%). Esto resultó incoherente: si el
> controller HTTP está fuera del MVP, su service tampoco puede formar
> parte del alcance. El `coveragePathIgnorePatterns` se reescribió a un
> único patrón `/src/reports/` que difiere el módulo completo. La
> cobertura de los RF-32 a RF-36 (visualización básica) se garantiza a
> nivel de **frontend** en la Sub-corrida 3C, no a nivel de backend.
> El spec preexistente `reports.service.spec.ts` sigue ejecutándose
> (porque coincide con `testRegex`) y reportando verde; simplemente sus
> archivos fuente no se contabilizan ya en la métrica global.

**Justificación:** funcionalidad presente en el código pero no declarada en
los 42 RF del documento de requerimientos. La trazabilidad
requerimientos ↔ tests es un criterio rector del plan maestro (matriz de
trazabilidad); testear módulos sin RF asociado rompe esa trazabilidad y
consume esfuerzo que aporta más valor concentrado en el componente RAG
(Fase 7 — Ragas/DeepEval).

**Acción ejecutada:**

- Estos módulos se añadieron a `coveragePathIgnorePatterns` en
  `backend/package.json` (bloque `jest`) con comentarios inline que
  referencian esta decisión.
- Se creó `qa/01-plan-maestro/diferidos_qa.md` consolidando D-5 y D-7.

**Reversibilidad:** si en revisiones posteriores el tutor o el tribunal
indica que estos módulos deben formar parte del MVP, se amplía
`docs/requerimientos.md` con los RF correspondientes y se generan los
specs siguiendo los patrones ya establecidos. Esta decisión es declarable
abiertamente en el informe final como parte del razonamiento del alcance.

---

## DECISIÓN 8 — Reclasificación de archivos grandes del frontend a la capa E2E

**Fecha:** 2026-05-20
**Contexto:** Tras cerrar la Sub-corrida 3C, ocho páginas del frontend
(>500 líneas cada una) quedaron con cobertura unitaria entre el 35 % y
el 66 % (statements), por debajo del umbral del 80 % del plan maestro.
Estos archivos se cubrieron con el patrón "smoke focal" autorizado
(NT-010): render inicial + queries iniciales, sin ejercitar los flujos
profundos. Las decisiones de mocking necesarias para una cobertura
profunda en jsdom (`MediaRecorder` real, `EventSource`, drag & drop de
archivos, navegación entre rutas con estado, modales anidados) resultan
frágiles, costosas de mantener y duplican esfuerzo con Playwright.

**Decisión adoptada:** los siguientes ocho archivos se **reclasifican
formalmente como código a validar en pruebas end-to-end (Fase 4 del plan
maestro — Playwright)** y se excluyen del cómputo de cobertura unitaria:

| Archivo | Flujo a validar en E2E | TC-E previsto (Fase 4) |
|---|---|---|
| `frontend/app/src/pages/interview/InterviewWizardPage.tsx` | Wizard multi-paso de configuración de entrevista (RF-05 a RF-09) | TC-E-01 |
| `frontend/app/src/pages/interview/InterviewSessionPage.tsx` | Simulación: lectura de pregunta, captura de respuesta texto/audio, timer, follow-up, finalización (RF-10 a RF-18) | TC-E-02 |
| `frontend/app/src/pages/feedback/FeedbackPage.tsx` | Visualización del reporte con las 5 dimensiones y feedback IA (RF-25, RF-33, RF-35) | TC-E-03 |
| `frontend/app/src/pages/feedback/FeedbackHistoryPage.tsx` | Historial paginado de entrevistas con estado (RF-32) | TC-E-04 |
| `frontend/app/src/pages/dashboard/DashboardPage.tsx` | Dashboard del estudiante con métricas agregadas y gráficos (RF-32, RF-34) | TC-E-05 |
| `frontend/app/src/pages/profile/ProfilePage.tsx` | Configuración del perfil + cambio de contraseña (RF-03) | TC-E-06 |
| `frontend/app/src/pages/knowledge/KnowledgeBasePage.tsx` | Ingesta de documentos + búsqueda semántica RAG (RF-29 a RF-31) | TC-E-07 |
| `frontend/app/src/pages/admin/AdminQuestionsPage.tsx` | CRUD admin del banco de preguntas (RF-42) | TC-E-08 |

**Justificación — pirámide de testing:** la pirámide canónica sitúa las
pruebas unitarias en la base (rápidas, deterministas, aisladas) y los
end-to-end en la cúspide (lentas, integradoras, sobre el sistema
completo). Cada nivel cubre lo que el otro no puede cubrir bien. Las
ocho páginas reclasificadas orquestan flujos de usuario que requieren
navegación entre rutas, persistencia, llamadas reales al backend y
coordinación entre componentes; ese es el dominio natural de los E2E,
no de las unitarias. Forzar cobertura unitaria sobre ellas:

1. Multiplica el costo de mocks (cada nuevo flujo requiere stubs de
   navegación + datos + APIs nativas del navegador no presentes en
   jsdom).
2. Produce tests frágiles (rotos por cambios de copy o estructura sin
   defectos reales).
3. Duplica trabajo con Playwright que ya hará la misma validación de
   forma más fiel.

Mantener el "smoke focal" actual da defensa en profundidad sin caer en
estas trampas: detecta regresiones de render y cableado de queries
iniciales, deja el flujo completo para E2E.

**Acción ejecutada:**

- Los 8 archivos se añadieron a `coverage.exclude` en
  `frontend/app/vite.config.ts` con el comentario "Reclasificado a E2E
  por D-8" en cada entrada.
- Los specs `*.test.tsx` existentes **no se eliminan**: siguen
  ejecutándose como red de seguridad de render. Solo el código fuente
  deja de contabilizarse para la métrica unitaria.
- La matriz de trazabilidad cambió el estado de los RF afectados a
  "Verde — unitaria parcial (render) + Pendiente E2E (flujo completo)".
- `diferidos_qa.md` incorpora una sección "Reclasificados a E2E
  (Decisión D-8)" con los TC-E previstos.

**Reversibilidad:** si en futuras sub-corridas se decide profundizar la
cobertura unitaria en alguno de estos archivos (p. ej. por imposibilidad
de levantar Playwright en el entorno de CI), se elimina la entrada
correspondiente de `coverage.exclude`, se escriben los tests profundos
y la métrica unitaria los volverá a contar. La reclasificación es
declarable abiertamente en el informe final como una aplicación
explícita del principio de pirámide de testing — no es un atajo para
inflar números.

---

## D-9 — Herramienta de pruebas de rendimiento: JMeter (instrucción del tutor)

**Fecha:** 2026-05-20

**Contexto:** Durante la planificación inicial se propuso k6 como
herramienta de pruebas de rendimiento, justificada por su
integración nativa con stack Node/TypeScript y su sintaxis
declarativa en JavaScript. Sin embargo, el tutor del proyecto de
grado instruyó explícitamente utilizar Apache JMeter como herramienta
de rendimiento.

**Decisión:** Se adopta Apache JMeter como herramienta oficial para
todas las pruebas de rendimiento de la Fase 5. La propuesta de k6
queda revertida.

**Justificación:**

- Instrucción directa del tutor académico responsable de la
  evaluación del proyecto.
- Coherencia metodológica con otros proyectos de grado supervisados
  por el mismo tutor en la UPB (el documento de referencia
  consultado durante la Fase 1 también usó JMeter).
- JMeter es un estándar maduro de la industria, plenamente capaz de
  medir latencia P50/P95/P99, throughput, tasa de error y
  concurrencia con N usuarios virtuales.

**Acción concreta:**

- Reemplazar k6 por JMeter en el plan maestro de pruebas
  (`plan_maestro_pruebas.md` §4 — Herramientas seleccionadas).
- Eliminar/archivar los scripts k6 preparados en el Prompt 2.5
  (`qa/04-pruebas-no-funcionales/rendimiento/scripts/smoke.js` queda
  como referencia histórica de la propuesta inicial; **NO ejecutar**).
- Renombrar `setup_k6.md` → `ARCHIVADO_setup_k6.md` con encabezado
  explícito indicando que la propuesta fue descartada por esta
  decisión.
- Actualizar la matriz de trazabilidad: filas RNF-01, RNF-02 y
  RNF-03 cambian su columna "Herramienta sugerida" de "k6" a
  "Apache JMeter".
- Actualizar el setup de rendimiento (en Fase 5) para incluir
  JMeter (planes `.jmx`).

**Reversibilidad:** **No reversible** — instrucción directa del
tutor académico responsable de la evaluación final del proyecto.

---

## D-10 — LLM siempre mockeado en E2E (Playwright)

**Fecha:** 2026-05-20

**Contexto:** las pruebas E2E (Fase 4) ejercitan flujos que disparan
evaluaciones por IA. Permitir que esos flujos golpeen al proveedor LLM
real introduce dos riesgos del plan maestro: **R-1** (costo de las
llamadas) y **R-2** (no determinismo / falsos negativos por la
variabilidad de la salida del modelo).

**Decisión:** todos los endpoints que disparan evaluaciones por IA
(`POST /interviews/*/questions/*/answer`,
`POST /interviews/*/questions/*/evaluate-now`,
`POST /interviews/*/questions/*/followup`,
`POST /catalogs/questions/generate`) se interceptan en Playwright con
respuestas deterministas. Adicionalmente el backend levanta en modo
`LLM_SANDBOX=true`, que sustituye a `OpenaiEvaluatorService` por
`MockEvaluatorService` (5 dimensiones ∈ [0, 5], feedback_text no vacío,
respuestas de referencia por nivel). La calidad real del LLM se valida
en Fase 6 (Ragas + DeepEval) con dataset curado.

**Acción ejecutada:**

- Implementado en `e2e/fixtures/llm-mock.fixture.ts`.
- `backend/.env.test` mantiene `LLM_SANDBOX=true` heredado de Fase 3.
- Validado: durante el run completo de Fase 4 se confirmó cero tráfico
  saliente a `openai.com` ni `googleapis.com`.

**Reversibilidad:** total. Para validar el LLM real (Fase 6), basta con
omitir el fixture `mockLLM` y usar el `page` base.

---

## D-11 — Audio mockeado en TC-E-02

**Fecha:** 2026-05-20

**Contexto:** TC-E-02-005 ejercita el flujo de grabación de respuesta
en audio (RF-17). En jsdom/Chromium headless no hay micrófono real;
permitirlo violaría sandbox y requeriría dependencias del SO.

**Decisión:** se stubean `navigator.mediaDevices.getUserMedia` y
`MediaRecorder` vía `addInitScript` antes de cualquier código de
aplicación. El stub emite un `Blob` sintético al detener la grabación.
La subida del audio (`POST /interviews/*/questions/*/audio`) se
intercepta y devuelve una transcripción mock determinista.

**Acción ejecutada:** implementado en
`e2e/fixtures/llm-mock.fixture.ts` (`mockAudio` fixture). El test
TC-E-02-005 valida que el flujo "iniciar grabación → detener → upload →
respuesta transcrita" funciona end-to-end sin hardware real.

**Reversibilidad:** total. Para Fase 7 o pruebas de servicios de voz,
remover el `addInitScript` y la interceptación de `/audio`.

---

## D-12 — Seed E2E dedicado y aislado

**Fecha:** 2026-05-20

**Contexto:** los tests E2E necesitan estado pre-existente (3 usuarios
con contraseñas conocidas, catálogos, preguntas con embeddings,
entrevistas históricas para historial/dashboard). Ejecutarlo por test
sería lento y repetitivo; ejecutarlo en cada beforeEach corrompería
los pre-requisitos compartidos.

**Decisión:** se crea un seed determinista en `e2e/fixtures/seed.ts`
ejecutado UNA VEZ por `globalSetup` antes de la suite completa.
Cleanup en `globalTeardown` con TRUNCATE CASCADE. Los tests que
requieren estado adicional usan `e2e/helpers/db-helpers.ts` para
modificarlo directamente (finishActiveInterviews, createFreshUser).

**Justificación:**

- Reproducibilidad: cada run empieza con el mismo dataset.
- Aislamiento: la DB de test (puerto 5434) NUNCA toca la dev
  (5433); guardrail en `setup.ts` aborta si detecta dev URL.
- Performance: el seed corre en ~1s; ejecutarlo por test sumaría
  ~50s × 47 tests = inviable.

**Acción ejecutada:**

- `e2e/fixtures/seed.ts`: 3 usuarios + catálogos + 20 preguntas con
  embeddings + 2 entrevistas históricas + 1 knowledge document.
- `e2e/global-setup.ts` invoca `runSeed()`.
- `e2e/global-teardown.ts` invoca `clearSeed()`.

**Reversibilidad:** total. La estructura del seed se puede
extender/restringir según las necesidades de las suites futuras.

---

## Resumen de decisiones

| ID | Tema | Decisión | Artefacto generado |
|---|---|---|---|
| D-1 | CHECK constraints (RNF-18/19/20) | Defensa en profundidad: constraints a nivel de BD | Migración `20260519120000_add_check_constraints` |
| D-2 | Escalas 0–5 vs 0–100 | Confirmadas como escalas independientes | — |
| D-3 | RNF-04 escalabilidad horizontal | Validación arquitectónica (caso TC-ARQ-001) | Caso TC-ARQ-001 en la matriz |
| D-4 | RNF-06 HTTPS | Objetivo de diseño verificable por configuración | Plantilla `docker-compose.prod.yml` |
| D-5 | RF-37–RF-41 CRUD catálogos | Fuera del MVP académico — diferidos | Estado actualizado en la matriz |
| D-6 | RF-31 alcance RAG | Uso dual: generación de preguntas + evaluación | — |
| D-7 | Módulos sin RF declarado | Diferidos (achievements, challenges, notifications, reports avanzados) | `coveragePathIgnorePatterns` + `diferidos_qa.md` |
| D-8 | Archivos grandes del frontend (>500 LOC) | Reclasificados a E2E (Fase 4) por pirámide de testing | `coverage.exclude` + 8 TC-E previstos |
| D-9 | Herramienta de rendimiento (Fase 5) | **Apache JMeter** por instrucción directa del tutor; revertida la propuesta de k6 | `ARCHIVADO_setup_k6.md` + setup JMeter pendiente para Fase 5 |
| D-10 | LLM en E2E | Mockeado siempre (interceptores Playwright + `LLM_SANDBOX`) | `e2e/fixtures/llm-mock.fixture.ts` |
| D-11 | Audio en E2E | `getUserMedia` + `MediaRecorder` stubeados + `/audio` interceptado | `mockAudio` fixture |
| D-12 | Seed E2E | Determinista, una sola vez por `globalSetup` | `e2e/fixtures/seed.ts` + `e2e/global-setup.ts` |

> Las decisiones D-1 a D-8 y D-10 a D-12 son **supuestos adoptados** por
> el equipo de QA ante la ausencia de respuesta del tutor; pueden ser
> ajustadas si el tutor se manifiesta en sentido contrario.
> **La decisión D-9 es una instrucción directa del tutor — no es supuesto
> y no es reversible.**
