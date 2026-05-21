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

## D-13 — Diferimiento de la corrección de HE-05 (`skill_id` en generación IA del admin)

**Fecha:** 2026-05-20

**Contexto:** Durante la consolidación de los hallazgos de la Fase 4
se identificó un bug de severidad MEDIA-ALTA en el feature "Generar
con IA" de `AdminQuestionsPage`. El flujo del frontend
(`frontend/app/src/pages/admin/AdminQuestionsPage.tsx:165-176`) NO
envía el campo `skillId` al backend cuando persiste las preguntas
generadas por IA, y el backend
(`backend/src/catalogs/admin-questions.controller.ts:127-129`) aplica
el fallback `body.skillId ?? (await prisma.skill.findFirst())?.id ?? 1`.
Resultado: todas las preguntas generadas por el admin quedan
etiquetadas con el primer skill alfabético/por-id de la tabla,
independientemente del tema real. Afecta RF-12 (selección
inteligente), RF-27 (cálculo de UserSkillScore) y RF-42 (calidad del
banco de preguntas). El diagnóstico completo está en
`qa/03-pruebas-e2e/hallazgos_e2e.md` § HE-05.

**Decisión:** **Diferir la corrección.** El hallazgo queda registrado
como **bug conocido del MVP** en el plan de mejoras futuras
(`qa/03-pruebas-e2e/plan_mejoras_futuras.md`) con el fix técnico ya
especificado. No se modifica código de producción en este turno.

**Justificación (gestión profesional de defectos por severidad e impacto en el alcance):**

1. **No compromete seguridad ni privacidad** — a diferencia de HE-01
   (cross-tenant data leak), HE-05 no expone datos entre usuarios. La
   contaminación de metadata es visible solo al dueño de la entrevista
   o al admin que generó las preguntas.
2. **Afecta una funcionalidad administrativa**, no el recorrido
   crítico del MVP del estudiante. RF-42 (gestión del banco) tiene
   prioridad **Baja** en el documento de requerimientos; los flujos
   centrales del estudiante (RF-09 a RF-28) funcionan correctamente
   con el banco actual de preguntas curadas.
3. **Su corrección implica modificar el diseño de la UI** (agregar un
   selector de "Habilidad" obligatorio en el modal "Generar con IA"),
   lo que excede el alcance de corrección de defectos y entra en
   desarrollo de features. Cambios de UX requieren validación con el
   tutor académico y eventuales pruebas de usabilidad — fuera del
   ciclo de cierre del proyecto de grado.

**Diferencia con HE-01:**

| Criterio | HE-01 | HE-05 |
|---|---|---|
| Tipo | Seguridad / privacidad | Calidad de datos / lógica de negocio |
| Compromete RNF-07 | Sí, directamente | No |
| Alcance de la corrección | 1 línea (cache key + userId) | UI nueva: selector de skill obligatorio |
| Implica cambio de UX | No (transparente al usuario) | Sí (el admin debe seleccionar habilidad) |
| Severidad | ALTA | MEDIA-ALTA |
| Decisión | **Corregir** (con autorización) | **Diferir** |

La asimetría de decisión refleja la práctica estándar de gestión de
defectos: severidad ALTA + fix sin cambio de UX → corregir
inmediatamente; severidad MEDIA-ALTA + fix con cambio de UX y en
feature de prioridad Baja → diferir al backlog priorizado.

**Plan de remediación futura — Opción A (recomendada):**

Agregar un `Form.Item` con Select de "Habilidad" obligatorio al modal
"Generar con IA" de `AdminQuestionsPage.tsx`. El backend ya acepta el
campo `skillId` opcional, por lo que el cambio es UI-only.

```tsx
<Form.Item name="skillId" label={t('feedback.skill')} rules={[{ required: true }]}>
  <Select options={skills.map((s) => ({ value: s.id, label: s.name }))} />
</Form.Item>
```

Y en `addQuestionsMutation` añadir el `skillId` seleccionado al payload.

**Esfuerzo estimado del fix:** Bajo (~30 líneas TSX + 1 línea en la
mutation + 1-2 tests unitarios opcionales del controller).

**Reversibilidad:** **Totalmente reversible.** El fix está
especificado y listo para implementar cuando se amplíe el alcance
post-MVP. Mientras tanto:

- El admin puede mitigar manualmente: editar cada pregunta generada
  vía el modal de edición y asignarle el skill correcto.
- Las preguntas generadas hoy con skill incorrecto no causarán fallos
  funcionales — sólo distorsionan los buckets de RF-12 y RF-27 según
  el grado de uso del feature.

**Visibilidad del hallazgo:**

- `qa/03-pruebas-e2e/hallazgos_e2e.md` § HE-05 — análisis técnico
  completo con verificación empírica.
- `qa/03-pruebas-e2e/plan_mejoras_futuras.md` — backlog priorizado
  para el anexo del informe.
- `qa/01-plan-maestro/matriz_trazabilidad.md` — RF-12, RF-27 y RF-42
  marcados "⚠ Verde con observación (D-13 / HE-05)".
- `qa/ESTADO_DEL_PROYECTO_QA.md` — registro en sección de hallazgos
  y de decisiones.

---

## D-14 — Externalización de límites del `ThrottlerModule` a variables de entorno

**Fecha:** 2026-05-20

**Contexto:** El `ThrottlerModule` configurado en
`backend/src/app.module.ts:42-53` define límites de rate limiting
**hardcodeados**:

```ts
ThrottlerModule.forRoot([
  { name: 'short', ttl: 60000, limit: 100 },
  { name: 'long',  ttl: 60000, limit: 300 },
]),
```

100 req/60 s por IP es razonable como protección anti-abuso en
producción, pero **mata las pruebas de carga**: JMeter desde
`127.0.0.1` con 50 usuarios concurrentes (RNF-03) dispararía
respuestas 429 en cuestión de segundos, impidiendo medir el
rendimiento real del sistema. La limitación se anticipó en
`qa/04-pruebas-no-funcionales/rendimiento/analisis_endpoints_rendimiento.md`
§ 4.5.

**Decisión:** Refactorizar `ThrottlerModule.forRoot(...)` a
`ThrottlerModule.forRootAsync(...)` inyectando `ConfigService`, con
fallback a los valores actuales (100/60 s short, 300/60 s long)
cuando las variables de entorno no estén presentes. Las nuevas
variables de entorno son:

- `THROTTLE_SHORT_LIMIT` (default 100)
- `THROTTLE_SHORT_TTL` (default 60000 ms)
- `THROTTLE_LONG_LIMIT` (default 300)
- `THROTTLE_LONG_TTL` (default 60000 ms)

En `backend/.env.test` se configuran límites altos
(`THROTTLE_SHORT_LIMIT=100000`, etc.) para permitir las corridas de
JMeter.

**Justificación:**

1. **Buena práctica de por sí.** Externalizar configuración de rate
   limiting a variables de entorno es estándar en cualquier
   aplicación productiva moderna; permite ajustar políticas por
   entorno (dev, staging, prod) sin recompilar.
2. **No altera el comportamiento de producción.** Los defaults son
   los valores actuales; si no se setean las nuevas variables, el
   sistema se comporta idénticamente.
3. **Habilita las pruebas de Fase 5** (D-9: JMeter). Sin este
   refactor, RNF-03 no se puede medir desde una IP única.
4. **Cambio localizado.** Solo se modifica un bloque de
   `app.module.ts`; no hay tests específicos del Throttler que
   necesiten actualización (verificado: 0 `ThrottlerModule` ni
   `@Throttle` en specs).

**Acción ejecutada:**

- `backend/src/app.module.ts` refactorizado de `forRoot()` a
  `forRootAsync()` con `ConfigService.get<number>(KEY, DEFAULT)`.
- `backend/.env.test` ampliado con los 4 valores altos para pruebas
  de carga.
- `backend/.env.example` documentado con las 4 variables y sus
  defaults.

**Reversibilidad:** Totalmente reversible — basta sustituir el
`forRootAsync` por el `forRoot` original con literales. Las
variables nuevas son opcionales en cualquier entorno productivo.

---

## D-15 — Estrategia dual de medición de rendimiento del componente IA (RNF-01)

**Fecha:** 2026-05-20

**Contexto:** Con `LLM_SANDBOX=true` el `MockEvaluatorService`,
`MockEmbeddingService` y `MockLlmService` responden **en ~0 ms**
(verificado leyendo los 3 servicios en
`backend/src/evaluation/services/mock-evaluator.service.ts`,
`backend/src/llm/services/mock-embedding.service.ts` y
`backend/src/llm/services/mock-llm.service.ts`). Esto significa que
la latencia medida en JMeter con mock activo refleja únicamente el
overhead arquitectónico (NestJS + Prisma + pgvector + BullMQ +
Redis), no el costo real del LLM. Medir solo con mock subestimaría
la latencia end-to-end real del flujo productivo.

**Decisión:** Estrategia dual de medición del RNF-01:

1. **Pruebas de carga, concurrencia y throughput** (RNF-01
   arquitectónico, RNF-02, RNF-03) con `LLM_SANDBOX=true`. Esto
   aísla el rendimiento de la arquitectura de la latencia variable
   del proveedor externo. JMeter ejecuta volúmenes altos sin costo
   de tokens.
2. **Medición complementaria de latencia end-to-end real del
   RNF-01** con un subconjunto reducido (10-20 muestras, baja
   concurrencia) usando el proveedor LLM real (OpenAI o Gemini). Es
   suficiente para obtener un P95 representativo del flujo
   productivo completo sin saturar al proveedor ni encarecer las
   pruebas (~$0.05-0.10 USD por corrida).

**Justificación:**

- **Metodológicamente correcto:** la latencia del LLM externo es
  variable y ajena al control del sistema (depende del proveedor,
  del modelo elegido y de la carga global del proveedor). Medirla
  por separado de la arquitectura es la práctica estándar en la
  industria (separar "lo controlable" de "lo no controlable").
- **Alineado con D-3** (RNF-04 como validación arquitectónica): se
  reporta lo medible y se declara explícitamente lo que cae fuera
  del scope de carga.
- **Económicamente sostenible:** un subset de 10-20 muestras con
  OpenAI no excede $0.10 USD por corrida (modelo `gpt-4o-mini` o
  equivalente). Hacer 50 usuarios × 10 minutos contra LLM real
  costaría órdenes de magnitud más.

**Acción a ejecutar (en el Prompt 5-A):**

- Plan principal JMeter con `LLM_SANDBOX=true` → métrica
  arquitectónica.
- Plan complementario JMeter (1 thread, 10-20 iteraciones, ramp-up
  largo) con `LLM_SANDBOX=false` y `OPENAI_API_KEY` válida → métrica
  end-to-end real.
- Reportar las dos métricas por separado en el informe, con la
  limitación declarada explícitamente.

**Reversibilidad:** N/A (decisión metodológica).

**Limitación declarada:** Las mediciones de carga con mock
representan el rendimiento arquitectónico, no la latencia total con
LLM real. Esto se documentará explícitamente en el reporte final
del rendimiento y en el informe del proyecto de grado.

**Anexo Fase 6-RUN (2026-05-21):** el docente autorizó explícitamente
el uso de la `OPENAI_API_KEY` para la evaluación RAG con un
**presupuesto máximo de $0.30 USD**. Esta autorización se trata
como gobernanza del gasto análoga al subset de 10-20 muestras del
Escenario 4 de Fase 5-A. El costo real ejecutado se reporta en
[`reporte_evaluacion_rag.md`](../05-evaluacion-rag/reporte_evaluacion_rag.md).
Registro formal en D-19 (tabla resumen).

---

## D-16 — Seed dedicado para pruebas de rendimiento

**Fecha:** 2026-05-20

**Contexto:** El query de búsqueda semántica (RNF-02) en
`backend/src/knowledge/services/knowledge-retrieval.service.ts:36`
filtra por `kd.status = 'ready'`, mientras que el seed E2E sembraba
los documentos con `status='completed'` (literal distinto). Si se
reutiliza el seed E2E directamente, todas las búsquedas devolverán
vacío y la medición de RNF-02 sería inválida. Adicionalmente,
RNF-02 especifica medir con hasta **10 000 preguntas**, volumen
mucho mayor al de los 20 ítems del seed E2E.

**Decisión:** Crear un seed dedicado para pruebas de rendimiento
(`backend/test/perf/seed-perf.ts`) **independiente del seed E2E**,
que:

- Use el `status='ready'` correcto para knowledge documents.
- Pueble un volumen alto de preguntas con embeddings deterministas
  (vectores de la dimensión correcta — 1536 según
  `EMBEDDING_DIMENSIONS` por defecto), insertados vía raw SQL
  pgvector (patrón NT-016).
- Cree los 3 usuarios de pruebas (`perf-student@test.local`,
  `perf-recruiter@test.local`, `perf-admin@test.local`) con
  credenciales conocidas.
- Sea parametrizable por cantidad de preguntas (default 10 000
  para la corrida oficial de RNF-02; ejecutable con 1 000 o menos
  para iteración rápida durante desarrollo).
- Use **batch inserts** para evitar tiempos de seed excesivos.
- Cree al menos 1 entrevista activa para el `perf-student` (para
  RNF-01 vía `evaluate-now`).

**Justificación:**

- **No tocar el seed E2E** evita el riesgo de romper la suite de 47
  tests E2E (estable a 141/141 verificado con `--repeat-each=3`).
- Un seed dedicado permite volúmenes representativos para RNF-02
  sin afectar otras suites.
- Mantener el seed de perf en `backend/test/perf/` lo agrupa con
  las pruebas (no con el código de aplicación) y deja claro que es
  un artefacto de testing.

**Acción ejecutada:**

- Creado `backend/test/perf/seed-perf.ts` (script ejecutable vía
  `ts-node`).
- Agregado script `seed:perf` a `backend/package.json`.
- Documentado en `qa/04-pruebas-no-funcionales/rendimiento/seed_perf.md`.

**Reversibilidad:** Totalmente reversible — es un archivo nuevo
aislado en `backend/test/perf/`. Eliminarlo no afecta el SUT ni
otras suites.

---

## D-17 — Interpretación del RNF-01 según el flujo (`evaluation` vs `practice`)

**Fecha:** 2026-05-21

**Contexto:** El análisis de flujo
([`qa/04-pruebas-no-funcionales/rendimiento/analisis_flujo_evaluacion.md`](../04-pruebas-no-funcionales/rendimiento/analisis_flujo_evaluacion.md)),
realizado tras las corridas de Fase 5-A, reveló que el sistema tiene
**dos caminos de evaluación**:

- **Modo `evaluation` (flujo principal del estudiante, formal):** la
  evaluación se procesa de forma asíncrona vía cola BullMQ. El
  endpoint `POST /interviews/:id/finish` solo encola el job y
  responde inmediatamente con `evaluationStatus: 'processing'`
  (ack medido ~12 ms). El usuario aterriza en
  `InterviewConfirmationPage` con un tag *"processing"* y el copy
  explícito *"Your evaluation is being processed by our AI. You'll
  receive a notification when it's ready"*. **Sin bloqueo.** El
  `EvaluationProcessor` (BullMQ worker) consume el mismo
  `EVALUATOR_SERVICE` que el camino síncrono y emite el evento
  `evaluation.completed` al terminar.
- **Modo `practice` (funcionalidad opcional de feedback inmediato):**
  el frontend, tras `submitAnswer.mutate()`, auto-encadena
  `evaluateNow.mutate(question.id)`, que llama al endpoint síncrono
  `POST /interviews/:id/questions/:qid/evaluate-now`. La UI muestra
  un `<Spin />` con la etiqueta `interview.evaluatingAnswer` mientras
  espera la respuesta del LLM. **Aquí el usuario sí se bloquea** —
  P95 medido = 7 418 ms con `gpt-4o-mini` (Escenario 4 de JMeter,
  Fase 5-A).

El RNF-01 original (P95 < 5 s) fue redactado sin diferenciar estos
dos caminos, lo que generó una aparente contradicción: el sistema lo
incumple medido sobre `evaluate-now`, pero lo cumple con holgura
masiva medido sobre `/finish`.

**Decisión:** El cumplimiento del RNF-01 se valida sobre el **flujo
principal (modo `evaluation`, asíncrono)**, que cumple con amplia
holgura (ack ~12 ms). La latencia superior al umbral (**HE-06**) se
**acota al modo `practice`**, funcionalidad opcional cuya latencia
está dominada por el proveedor LLM externo (~95 % del tiempo del
request lo aporta `gpt-4o-mini` según comparación arquitectónico vs
real en
[`reporte_rendimiento.md` § 5.3](../04-pruebas-no-funcionales/rendimiento/reporte_rendimiento.md)).
Esta latencia es un factor ajeno al control de diseño del sistema.

**Recomendación (a discutir con el tutor):** diferenciar el RNF-01
en sub-umbrales:

- **RNF-01-a (acuse del envío):** P95 < 500 ms. Cumplido con holgura
  masiva en ambos caminos (`/finish` ack ~12 ms; `/answer` smoke ~5 ms).
- **RNF-01-b (feedback inmediato en modo `practice`):** P95 < 8 s,
  compatible con LLMs económicos modernos (mediana medida 4.4 s,
  umbral propuesto deja margen al P95 de 7.4 s).

Alternativa técnica si se prefiere mantener el umbral original:
implementar **streaming** de la respuesta del LLM (`stream: true` en
OpenAI) para reducir el TTFB percibido a < 1 s aunque el TTLR
completo siga siendo similar. Es la palanca de UX de mayor impacto
sin cambiar el modelo.

**Severidad de HE-06:** **Baja-Media** — no afecta el flujo crítico
del estudiante (modo `evaluation`); el usuario en modo `practice`
acepta explícitamente esperar con un spinner visible, no es una
latencia oculta. Se documenta como **observación acotada** y queda
pendiente de la decisión del tutor sobre la recalibración formal
del RNF-01.

**Reversibilidad:** N/A — decisión interpretativa, documentada para
revisión del tutor. Si el tutor valida los sub-umbrales, se
actualizará formalmente `RNF-01` en `docs/requerimientos.md` y la
matriz reflejará dos filas (RNF-01-a y RNF-01-b) en lugar de una.

---

## D-18 — Corrección de HE-07 (BOLA en endpoints de templates)

**Fecha:** 2026-05-21

**Contexto:** Durante la revisión manual sistemática de RNF-07 en
Fase 5-B (motivada por el antecedente HE-01) se detectó que dos
endpoints del controlador `interviews/templates` no verificaban la
propiedad del recurso ni el flag `isPublic`:

- `GET /api/interviews/templates/:id` (`findOne` → `getTemplate`).
- `POST /api/interviews/templates/:id/start` (`start` → `startFromTemplate`).

Cualquier usuario autenticado podía leer e iniciar entrevistas a
partir de templates **privados** (`isPublic: false`) de otros
recruiters, enumerando IDs autoincrementales. Es una vulnerabilidad
de tipo **Broken Object Level Authorization (BOLA / IDOR)** — OWASP
API1:2023 + OWASP A01:2021. El detalle técnico completo está en
[`bug_seguridad_HE07.md`](../04-pruebas-no-funcionales/seguridad/bug_seguridad_HE07.md).

**Decisión:** **CORREGIR ahora.** El criterio es: los bugs de
autorización con fix viable y sin cambio de UX se corrigen,
consistente con HE-01 y distinto de HE-05 (que requería cambio de
UX y por eso se difirió).

**Severidad de HE-07:** **MEDIA** — no expone datos personales de
estudiantes (PII como en HE-01), sino propiedad intelectual de
recruiters (preguntas curadas y estructura de templates).

**Fix aplicado:**

- `templates.service.ts` (3 funciones modificadas):
  - `getTemplate(id, userId, role)` — verifica
    `role === 'admin' || template.isPublic || template.createdById === userId`;
    de lo contrario lanza `ForbiddenException`.
  - `startFromTemplate(templateId, userId, role)` — misma verificación.
  - `createTemplate(userId, userRole, dto)` — firma ampliada porque
    internamente llama a `getTemplate(id, userId, userRole)` para
    devolver el detalle del template recién creado.
- `templates.controller.ts` — los handlers `findOne`, `create` y
  `start` reenvían `user.userId` y `user.role` al service.

**Decisión secundaria — código de respuesta:** se mantiene el
patrón del SUT (`404` si no existe, `403` si no es dueño), en lugar
de adoptar la práctica moderna de "404 universal para enumeración".
Justificación: consistencia con el resto del SUT (interviews,
knowledge documents, templates.deleteTemplate ya usan este patrón).
Cambiar solo templates a "404 universal" rompería la consistencia.
Un refactor SUT-wide hacia "404 universal" se documenta como mejora
futura.

**Verificación a 4 niveles (patrón HE-01):**

1. Unitario aislado (`jest templates`): 25 → **29 verde** (+4 guards).
2. Unitario backend completo: 371 → **375 verde** (sin regresiones).
3. Integración: 92 → **97 verde** (+5 tests cross-user en
   `authorization.integration.spec.ts`).
4. Frontend unitario: **134/134 verde** (fix no toca frontend).

**Reversibilidad:** Totalmente reversible — revertir el commit del
fix restauraría el comportamiento anterior. Pero al tratarse de
una vulnerabilidad de seguridad de severidad MEDIA, no hay razón
para revertirlo. El fix queda como parte permanente del SUT.

**Lección sistematizada (NT-027):** "La autorización por propiedad
debe ser CONSISTENTE en TODOS los métodos que exponen un recurso, no
solo en los listados". Checklist de 5 puntos en
[`notas_tecnicas.md`](../00-inventario/notas_tecnicas.md).

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
| D-13 | HE-05 (`skill_id` en generación IA del admin) | **Diferir** la corrección — bug conocido en backlog post-MVP | `plan_mejoras_futuras.md` + nota en matriz para RF-12/27/42 |
| D-14 | Límites del `ThrottlerModule` | Externalizados a variables de entorno (`THROTTLE_*_LIMIT`, `THROTTLE_*_TTL`) con defaults iguales a los valores anteriores | Refactor de `app.module.ts` a `forRootAsync` + `.env.test` con límites altos para perf |
| D-15 | Medición de rendimiento del RNF-01 | Estrategia dual: carga con mock (arquitectura) + subset reducido con LLM real (latencia end-to-end) | Plan JMeter principal con `LLM_SANDBOX=true` + plan complementario con LLM real |
| D-16 | Seed para pruebas de rendimiento | Seed dedicado `seed-perf.ts` independiente del seed E2E | `backend/test/perf/seed-perf.ts` + script `seed:perf` + `seed_perf.md` |
| D-17 | Interpretación del RNF-01 según flujo (`evaluation` vs `practice`) | Cumplimiento se valida sobre el flujo principal asíncrono (BullMQ, ack ~12 ms). HE-06 acotada al modo `practice` (feature opcional, P95 = 7 418 ms con LLM real, latencia externa). Propuesta de sub-umbrales RNF-01-a (< 500 ms) / RNF-01-b (< 8 s) pendiente de validar con tutor. | `analisis_flujo_evaluacion.md` + reclasificación HE-06 en `reporte_rendimiento.md` + matriz RNF-01 actualizada |
| D-18 | Corrección de HE-07 (BOLA en `getTemplate` + `startFromTemplate`) | **Corregir** ahora — bug de autorización con fix viable sin cambio de UX, consistente con HE-01 y distinto de HE-05. Severidad MEDIA: expone propiedad intelectual de recruiters, no PII. Verificación a 4 niveles, 0 regresiones. | `bug_seguridad_HE07.md` + 6 tests unitarios + 5 tests integración + NT-027 + 2 archivos SUT modificados |
| D-19 | Autorización del docente para Fase 6-RUN (uso de OPENAI_API_KEY real) | **Aprobado** el 2026-05-21 con presupuesto máximo **$0.30 USD**. Trazabilidad de gobernanza del gasto (igual que D-15 para Escenario 4 de Fase 5-A). El costo real ejecutado se reporta en `reporte_evaluacion_rag.md`. | Anexo a D-15 + `reporte_evaluacion_rag.md` |

> Las decisiones D-1 a D-8 y D-10 a D-12 son **supuestos adoptados** por
> el equipo de QA ante la ausencia de respuesta del tutor; pueden ser
> ajustadas si el tutor se manifiesta en sentido contrario.
> **La decisión D-9 es una instrucción directa del tutor — no es supuesto
> y no es reversible.**
> **Las decisiones D-13 (y previamente la autorización para corregir
> HE-01) son decisiones explícitas del tutor sobre gestión de defectos
> detectados en Fase 4 — totalmente reversibles si se amplía el alcance
> post-MVP.**
> **La decisión D-17 es interpretativa** (no modifica código ni
> umbrales) y queda pendiente de la decisión del tutor sobre la
> recalibración formal del RNF-01 en `docs/requerimientos.md`.
