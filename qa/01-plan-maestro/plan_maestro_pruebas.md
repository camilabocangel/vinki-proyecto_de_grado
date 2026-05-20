# Plan Maestro de Pruebas — Plataforma Vinki

> **Proyecto de grado** — Ingeniería de Sistemas, Universidad Privada Boliviana (UPB).
> **Sistema bajo prueba (SUT):** Vinki — plataforma web de simulación de entrevistas técnicas con IA.
> **Stack:** React + TypeScript + Vite (frontend), NestJS + Node.js (backend), PostgreSQL + pgvector, componente RAG.
> **Fuentes autoritativas:** `qa/00-inventario/inventario_sistema.md` (Fase 0) y `docs/requerimientos.md` (42 RF + 34 RNF).
> **Versión del plan:** 1.0 — Fase 1 (Plan Maestro).

---

## 1. Objetivo del plan de pruebas

Definir una estrategia de verificación y validación sistemática, trazable y
reproducible que permita comprobar, con evidencia cuantitativa, que la plataforma
Vinki cumple los 42 requerimientos funcionales (RF) y los 34 requerimientos no
funcionales (RNF) declarados en `docs/requerimientos.md`.

Objetivos específicos:

1. Establecer los **tipos de prueba**, las **herramientas** y los **criterios de
   aceptación numéricos** aplicables a cada requerimiento.
2. Garantizar la **trazabilidad bidireccional** requerimiento ↔ caso de prueba
   mediante la matriz de la Fase 1 (`matriz_trazabilidad.md`).
3. Evaluar de forma diferenciada el **componente de IA/RAG**, por ser el núcleo
   diferenciador del sistema y la fuente principal de incertidumbre de calidad.
4. Producir evidencia de cobertura anexable al informe final del proyecto de grado.

---

## 2. Alcance

### 2.1 Incluido en el alcance

| Tipo de prueba | Aplicación en Vinki |
|---|---|
| Unitarias backend | Servicios NestJS, *processors* de cola, rúbricas, lógica de dominio (LLM mockeado) |
| Unitarias frontend | Componentes React, hooks, stores Zustand, utilidades |
| Integración de API | Endpoints REST contra base de datos de pruebas real (Supertest + Prisma) |
| Integración de integridad de datos | CHECK, UNIQUE, claves foráneas y `ON DELETE CASCADE` contra PostgreSQL de pruebas |
| End-to-End (E2E) | Flujos de usuario completos en navegador (Playwright), con LLM mockeado por defecto |
| Rendimiento | Latencia de evaluación IA, búsqueda semántica y concurrencia (Apache JMeter — ver Decisión D-9) |
| Seguridad | Análisis de dependencias, análisis estático y verificación de controles (npm audit, Semgrep, eslint-plugin-security, revisión manual) |
| Usabilidad y accesibilidad | Lighthouse CI y axe-core sobre las páginas principales |
| Evaluación específica del componente RAG/IA | Faithfulness, answer relevancy, context precision, hallucination rate y latencia (Ragas + DeepEval) |

### 2.2 Excluido del alcance (con justificación)

| Elemento excluido | Justificación | Tratamiento alternativo |
|---|---|---|
| **RNF-04 — Escalabilidad horizontal real** | Validar escalado horizontal real exige infraestructura distribuida (múltiples réplicas, balanceador) no disponible en un proyecto académico. | Se valida **arquitectónicamente**: se verifica que frontend y backend son artefactos desplegables de forma independiente (contenedores separados, estado de sesión en JWT/cookies, ausencia de estado en memoria del proceso). No se ejecutan pruebas de carga distribuida. |
| **RNF-21 — 99,5% de disponibilidad (uptime)** | La medición de uptime requiere observación continua en producción durante un período prolongado, inviable en un proyecto de 6 meses sin operación productiva real. | Se declara como **objetivo de diseño**. Se documentan los mecanismos que lo habilitan (healthchecks en Docker Compose, `restart: unless-stopped`, endpoint `/api/health`). |
| **Pruebas de penetración activas (pentesting ofensivo)** | Exceden el alcance académico y requieren autorización y experticia especializada; un proyecto unipersonal de grado prioriza seguridad defensiva verificable. | Sustituidas por análisis estático de seguridad (Semgrep), auditoría de dependencias (npm audit) y revisión manual de controles de autorización. |
| **Recuperación ante desastres (DRP) y restauración de backups** | RNF-22 (backups) es un procedimiento operativo de producción; su prueba completa exige un entorno productivo y ventana de operación. | Se verifica de forma **declarativa**: se documenta el procedimiento de backup; no se ejecuta un simulacro de recuperación. |
| **Soak tests / pruebas de resistencia prolongada (> 1 h)** | Las pruebas de degradación sostenida por horas no aportan valor proporcional al esfuerzo en un proyecto académico y encarecen el uso de recursos e IA. | Las pruebas de rendimiento se acotan a escenarios de pico y carga sostenida breve (≤ 15 min). |

---

## 3. Tipos de prueba a ejecutar

| # | Tipo de prueba | Justificación | Requerimientos cubiertos |
|---|---|---|---|
| 1 | **Unitarias (backend)** | Verifican la lógica de dominio aislada (cálculo de scores, EMA, selección de preguntas, rúbricas) de forma rápida y determinista, con el LLM sustituido por *mocks*. Detectan regresiones tempranas con bajo costo. | RF-01–RF-42 (lógica), RNF-05 |
| 2 | **Unitarias (frontend)** | Verifican componentes, hooks y stores de React de forma aislada (renderizado, estado, validaciones de formulario), sin depender del backend. | RF-05–RF-09, RF-32–RF-36 |
| 3 | **Integración de API** | Validan el contrato real de los endpoints REST contra una base de datos de pruebas, incluyendo guards de autenticación, autorización por rol y persistencia. | RF-01–RF-18, RF-37–RF-42, RNF-07 |
| 4 | **Integración de integridad de datos** | Comprueban que el esquema PostgreSQL hace cumplir las reglas de consistencia (UNIQUE, FK, `ON DELETE CASCADE`, CHECK). Es la única forma fiable de verificar RNF-09 a RNF-20. | RNF-09–RNF-20 |
| 5 | **End-to-End (E2E)** | Validan los flujos completos de usuario en navegador real (registro → configuración → entrevista → resultados), garantizando la integración de todas las capas. | RF-01–RF-18, RF-32–RF-36, RNF-26–RNF-29 |
| 6 | **Rendimiento** | Verifican el cumplimiento de los umbrales de latencia y concurrencia declarados en los RNF de rendimiento bajo carga controlada. | RNF-01, RNF-02, RNF-03, RNF-30 |
| 7 | **Seguridad** | Detectan vulnerabilidades en dependencias y código, y verifican controles defensivos (hash de contraseñas, autorización por propiedad, cabeceras de seguridad). | RNF-05–RNF-08 |
| 8 | **Usabilidad / accesibilidad** | Miden tiempo de carga, *responsive design* y accesibilidad de las páginas principales de forma objetiva. | RNF-26–RNF-30 |
| 9 | **Evaluación específica del componente RAG/IA** | El comportamiento del LLM es no determinista; las pruebas tradicionales no bastan. Se requieren métricas estadísticas específicas de IA (fidelidad, relevancia, alucinación) sobre un dataset representativo. | RF-19–RF-31, RNF-01 |
| 10 | **Validación arquitectónica** | Algunos RNF no son verificables con casos de prueba ejecutables, sino mediante inspección del stack y los patrones de diseño implementados. | RNF-04, RNF-31–RNF-34 |

---

## 4. Herramientas seleccionadas

> Conjunto de herramientas **fijo** para todo el proyecto. La justificación contrasta cada elección con alternativas evaluadas.

| Ámbito | Herramienta | Justificación frente a alternativas |
|---|---|---|
| Unitarias backend | **Jest + ts-jest + Supertest** | Jest ya está configurado en `backend/package.json` y es el *runner* recomendado por NestJS, con soporte nativo de mocks y cobertura. Supertest permite probar los controladores HTTP sin levantar un servidor real. Alternativas como Mocha/Chai exigirían configuración adicional y romperían la coherencia con el ecosistema NestJS. |
| Unitarias frontend | **Vitest + React Testing Library** | Vitest comparte la configuración y el *pipeline* de Vite 6 (mismo `vite.config.ts`), lo que elimina duplicación de *tooling* y acelera la ejecución; ya está instalado. React Testing Library promueve pruebas centradas en el comportamiento observable del usuario. Jest sería más lento en un proyecto Vite y requeriría transformadores extra. |
| E2E | **Playwright** | Ya instalado; soporta múltiples navegadores, auto-espera robusta (reduce *flakiness*), trazas y capturas de pantalla. Frente a Cypress, ofrece mejor manejo de múltiples pestañas/contextos y ejecución paralela nativa, clave para los flujos de entrevista. |
| Rendimiento | **Apache JMeter** | Herramienta seleccionada por instrucción del tutor académico (**Decisión D-9**, ver `decisiones_qa.md`). Estándar maduro de la industria para pruebas de carga, con soporte nativo de percentiles P95/P99, throughput y concurrencia, alineado con la metodología de otros proyectos de grado supervisados por el mismo tutor. La propuesta original (k6) queda archivada en `qa/04-pruebas-no-funcionales/rendimiento/ARCHIVADO_setup_k6.md`. |
| Seguridad — dependencias | **npm audit** | Nativo del gestor de paquetes; detecta CVE conocidos en el árbol de dependencias sin instalación adicional. Cubre el riesgo de cadena de suministro de forma inmediata. |
| Seguridad — código | **Semgrep + eslint-plugin-security** | Semgrep aplica reglas de análisis estático orientadas a seguridad (inyección, secretos, autorización) sobre TypeScript; eslint-plugin-security se integra en el *linting* ya existente. Frente a SonarQube, no requiere servidor dedicado; frente a CodeQL, es más ligero para un proyecto académico. |
| Evaluación RAG/IA | **Ragas + DeepEval** | Ragas aporta métricas estándar de la industria para *pipelines* RAG (faithfulness, answer relevancy, context precision) con dataset de referencia. DeepEval complementa con detección de alucinaciones y aserciones tipo *unit test* sobre salidas de LLM, integrables en *pipelines* de prueba. No existe un sustituto consolidado equivalente; medir IA "a mano" sería subjetivo y no reproducible. |
| Integridad / schema | **Prisma + tests de integración contra DB de pruebas** | Prisma es el ORM del proyecto; ejecutar las migraciones reales contra una base PostgreSQL de pruebas es la única forma fiel de verificar CHECK, UNIQUE, FK y cascadas. Simular el motor relacional con *mocks* invalidaría la prueba de integridad. |
| Usabilidad / accesibilidad | **Lighthouse CI + axe-core** | Lighthouse CI mide tiempo de carga y *performance* del frontend de forma objetiva y reproducible en CI (RNF-30); axe-core (ya presente vía `@axe-core/react`) automatiza la verificación de accesibilidad. |

---

## 5. Criterios de aceptación cuantitativos

### 5.1 Cobertura de pruebas unitarias

| Métrica | Umbral mínimo | Ámbito |
|---|---|---|
| Statements | ≥ 80 % | Backend y frontend |
| Branches | ≥ 80 % | Backend y frontend |
| Functions | ≥ 80 % | Backend y frontend |
| Lines | ≥ 80 % | Backend y frontend |

Medición: `jest --coverage` (backend) y `vitest run --coverage` (frontend). El
*build* de CI falla si la cobertura cae por debajo del umbral.

### 5.2 Pruebas E2E

| Métrica | Umbral |
|---|---|
| Tasa de casos E2E exitosos | 100 % (0 fallos) |
| *Flakiness* admitida | 0 % tras estabilización (LLM mockeado) |

### 5.3 Rendimiento (umbrales derivados de los RNF)

| Escenario | Umbral | RNF origen |
|---|---|---|
| Latencia de evaluación IA (envío de respuesta → recepción de evaluación) | P95 < 5 s | RNF-01 |
| Búsqueda semántica / similitud vectorial | P95 < 500 ms (hasta 10.000 preguntas) | RNF-02 |
| Concurrencia | 50 entrevistas simultáneas sin degradación (sin errores, P95 dentro de umbral) | RNF-03 |
| Tiempo de carga de páginas principales del frontend | < 2 s | RNF-30 |

### 5.4 Seguridad

| Criterio | Umbral | RNF origen |
|---|---|---|
| Vulnerabilidades de dependencias | 0 con severidad **Critical/High** sin justificación documentada | RNF general |
| Hallazgos de análisis estático (Semgrep) | 0 de severidad alta sin justificación | RNF general |
| Hash de contraseñas | Verificado: `bcrypt` (nunca texto plano ni hash débil) | RNF-05 |
| Cifrado en tránsito | HTTPS/TLS verificado en el entorno de despliegue (objetivo de diseño en local) | RNF-06 |
| Autorización por propiedad | 0 accesos exitosos a datos de otro usuario | RNF-07 |

### 5.5 Componente RAG / IA

| Métrica | Umbral | RF/RNF relacionado |
|---|---|---|
| Faithfulness (fidelidad al contexto recuperado) | ≥ 0,80 | RF-25, RF-31 |
| Answer Relevancy (relevancia de la respuesta) | ≥ 0,80 | RF-25 |
| Context Precision (precisión del contexto recuperado) | ≥ 0,70 | RF-30, RF-31 |
| Hallucination Rate (tasa de alucinaciones) | ≤ 10 % | RF-19–RF-23 |
| Latencia del pipeline RAG completo | P95 < 5 s | RNF-01 |

---

## 6. Estrategia de datos de prueba

| Nivel de prueba | Estrategia de datos | Aislamiento |
|---|---|---|
| **Unitarias** | *Factories* y *fixtures* en memoria construidas con los tipos de Prisma; LLM y repositorios sustituidos por *mocks*/*stubs*. **Sin base de datos real.** | Total: cada prueba crea y descarta sus propios datos. |
| **Integración de API e integridad** | Base de datos **PostgreSQL + pgvector de pruebas** dedicada, poblada con un **seed determinista** (catálogos: roles, lenguajes, frameworks, niveles, habilidades y un conjunto fijo de preguntas y usuarios de cada rol). | Cada *suite* ejecuta migraciones y *seed* al inicio; *truncate*/rollback transaccional entre pruebas. |
| **E2E** | *Seed scripts* ejecutados antes de cada *suite* (usuarios de prueba estudiante/reclutador/admin, catálogos y preguntas mínimas); *teardown* que limpia los datos generados al finalizar. LLM mockeado por defecto. | La base E2E es independiente de la de integración. |
| **Evaluación RAG/IA** | **Dataset estático curado de 25–30 preguntas** representativas de entrevistas técnicas, cubriendo Backend en niveles Junior/Mid/Senior y distintos lenguajes y frameworks del catálogo, cada una con su contexto esperado y respuesta de referencia (*ground truth*). | Dataset versionado en el repositorio; inmutable entre ejecuciones para garantizar comparabilidad. |

Reglas transversales:

- Los datos de prueba **nunca** se ejecutan contra la base de datos de desarrollo o producción.
- El *seed* determinista garantiza que los identificadores de catálogo sean estables entre ejecuciones.
- Las credenciales de los usuarios de prueba son ficticias y no reutilizan secretos reales.

---

## 7. Entornos de prueba

| Entorno | Descripción | Pruebas que aloja |
|---|---|---|
| **Local** | Docker Compose con PostgreSQL + pgvector, Redis y MinIO; LLM en modo `LLM_SANDBOX` (mock) por defecto. | Unitarias, integración, integridad de datos, E2E con mocks, desarrollo de pruebas RAG. |
| **CI (GitHub Actions)** | *Workflow* existente (`.github/workflows/ci.yml`) con servicios `pgvector/pgvector:pg15` y `redis:7-alpine`. Node 20. | Unitarias backend y frontend, verificación de tipos, integración e integridad de datos; análisis de seguridad (npm audit, Semgrep). |
| **Staging** | Despliegue equivalente a producción (contenedores backend + frontend), con base de datos poblada y, cuando aplique, proveedor LLM real. | E2E completos, pruebas de rendimiento (Apache JMeter — D-9), Lighthouse CI, y la fase de evaluación RAG con llamadas reales al LLM. |

> El CI debe verificar explícitamente la disponibilidad de la extensión **pgvector**
> antes de ejecutar las pruebas de integración e integridad (ver riesgo R-3).

---

## 8. Roles y responsabilidades

El proyecto es de carácter **unipersonal**. El único integrante asume de forma
secuencial todos los roles del proceso de QA:

| Rol | Responsabilidad |
|---|---|
| QA Lead | Definición de la estrategia, este plan maestro y la matriz de trazabilidad. |
| Diseñador de casos de prueba | Especificación de casos a partir de la matriz. |
| Automatizador / Ingeniero de pruebas | Implementación de las suites (Jest, Vitest, Playwright, Apache JMeter — D-9, Ragas/DeepEval). |
| Ejecutor y analista de resultados | Ejecución, recolección de evidencia y análisis de defectos. |

Supervisión académica a cargo del **tutor del proyecto de grado**, quien valida los
criterios de aceptación y resuelve las observaciones de la sección final.

---

## 9. Cronograma estimado por fase

> Estimación para un proyecto académico de ~6 meses; las fases pueden solaparse parcialmente.

| Fase | Descripción | Duración estimada | Entregable principal |
|---|---|---|---|
| Fase 0 | Inventario técnico del sistema | 1 semana | `inventario_sistema.md` (completado) |
| Fase 1 | Plan maestro y matriz de trazabilidad | 1 semana | Este documento + `matriz_trazabilidad.md` |
| Fase 2 | Diseño de casos de prueba (RF y RNF) | 2 semanas | Catálogo de casos de prueba |
| Fase 3 | Implementación de pruebas unitarias (backend + frontend) | 3 semanas | Suites unitarias + reporte de cobertura |
| Fase 4 | Implementación de pruebas de integración e integridad | 2 semanas | Suites de integración + DB de pruebas con seed |
| Fase 5 | Implementación de pruebas E2E | 2 semanas | Suites Playwright |
| Fase 6 | Pruebas de rendimiento y seguridad | 2 semanas | Reportes Apache JMeter (D-9), npm audit, Semgrep |
| Fase 7 | Evaluación específica del componente RAG/IA | 2 semanas | Dataset RAG + reporte Ragas/DeepEval |
| Fase 8 | Consolidación, análisis de defectos e informe final de QA | 1 semana | Informe final con evidencia de cobertura |

**Duración total estimada:** ~16 semanas de trabajo de QA.

---

## 10. Riesgos de QA y mitigaciones

| ID | Riesgo | Impacto | Mitigación |
|---|---|---|---|
| R-1 | **Costo de las llamadas al LLM** en la evaluación RAG (consumo de API de pago). | Económico / presupuestario. | Dataset acotado a 25–30 preguntas; uso de *mocks* en pruebas unitarias y E2E; las llamadas reales al LLM se concentran **únicamente** en la Fase 7 (evaluación de IA). |
| R-2 | **Flakiness de las pruebas E2E** por el no determinismo del componente IA. | Falsos negativos, pérdida de confianza en la *suite*. | El LLM se **mockea por defecto** en E2E (respuestas deterministas); las salidas reales del LLM se validan solo en la fase de evaluación RAG con métricas estadísticas, no con aserciones exactas. |
| R-3 | **Dependencia de pgvector** en los entornos de prueba; ausencia de la extensión rompe integración e integridad. | Suites de integración no ejecutables. | Uso de la imagen `pgvector/pgvector:pg15` en local y CI; paso explícito de verificación de la extensión antes de las suites de integración. |
| R-4 | No determinismo de las **evaluaciones numéricas** del LLM (varianza entre ejecuciones). | Resultados de prueba no reproducibles. | Métrica de consistencia IA-05 (varianza intra-pregunta) con umbral definido; uso de `temperature` baja y *seed* fijo cuando el proveedor lo permita. |
| R-5 | **Cobertura inicial muy baja**: el inventario detectó 6 módulos backend sin pruebas y la mayoría de páginas frontend sin test. | Riesgo de no alcanzar el 80 % de cobertura en el plazo. | Priorización por criticidad (módulos de evaluación, RAG y autenticación primero); cronograma con 3 semanas dedicadas a unitarias. |
| R-6 | **Posible ausencia de CHECK constraints** (RNF-18, RNF-19, RNF-20) en el esquema Prisma, detectada en el inventario. | Las pruebas de integridad podrían fallar por no implementación, no por defecto de prueba. | Se anota como observación para el tutor (sección 12); las pruebas se diseñan igualmente y, de fallar, evidencian un *gap* de implementación legítimo. |
| R-7 | **Proyecto unipersonal**: cuello de botella de recursos; un único responsable de diseño, automatización y ejecución. | Retrasos en el cronograma. | Cronograma holgado con fases secuenciales; automatización máxima en CI para reducir trabajo manual repetitivo. |
| R-8 | **Entorno de staging** no disponible o no equivalente a producción. | Pruebas de rendimiento y RAG no representativas. | Definir staging tempranamente (Fase 1–2); si no hay staging, ejecutar rendimiento en local documentando las limitaciones de hardware. |

---

## 11. Entregables por fase

| Fase | Entregables |
|---|---|
| Fase 0 | `qa/00-inventario/inventario_sistema.md`. |
| Fase 1 | `qa/01-plan-maestro/plan_maestro_pruebas.md` (este documento); `qa/01-plan-maestro/matriz_trazabilidad.md`. |
| Fase 2 | Catálogo de casos de prueba por RF y RNF, con identificadores asignados (sustituye los "Pendiente" de la matriz). |
| Fase 3 | Suites unitarias backend (Jest) y frontend (Vitest); reportes de cobertura ≥ 80 %. |
| Fase 4 | Suites de integración de API e integridad de datos; *script* de base de datos de pruebas con *seed* determinista. |
| Fase 5 | Suites E2E (Playwright) con LLM mockeado; trazas y capturas como evidencia. |
| Fase 6 | Reportes de rendimiento (Apache JMeter — D-9) con percentiles P95/P99 y throughput; reportes de seguridad (npm audit, Semgrep, eslint-plugin-security). |
| Fase 7 | Dataset RAG curado (25–30 preguntas); reporte de evaluación de IA (Ragas + DeepEval) con las métricas de la sección 5.5. |
| Fase 8 | Informe final de QA: matriz de trazabilidad actualizada, resumen de defectos, evidencia de cobertura sistemática de los 42 RF y 34 RNF. |

---

## 12. Observaciones para confirmar con el tutor

> Estos puntos **no** son requerimientos y **no** modifican `docs/requerimientos.md`.
> Se registran como ambigüedades o *gaps* detectados al cruzar el catálogo de
> requerimientos con el inventario técnico (Fase 0).
>
> **Estado:** dado que estas observaciones no pudieron resolverse con el tutor en
> tiempo real, cada una cuenta ahora con una **decisión adoptada** por el equipo de
> QA (supuesto justificado, abierto a revisión). El detalle se encuentra en la
> [sección 13](#13-supuestos-adoptados-ante-ausencia-de-respuesta-del-tutor) y en el
> registro consolidado `qa/01-plan-maestro/decisiones_qa.md`.

1. **CHECK constraints posiblemente no implementados (RNF-18, RNF-19, RNF-20).**
   `docs/requerimientos.md` exige restricciones CHECK para el rango de evaluaciones
   (0–5), de scores (0–100) y para `order_number > 0`. El esquema Prisma revisado en
   la Fase 0 (`backend/prisma/schema.prisma`) **no declara** dichas restricciones a
   nivel de base de datos. Debe confirmarse si la validación se delega a la capa de
   aplicación o si constituye un *gap* de implementación.
   **→ Decisión adoptada: D-1** (ver [§13](#13-supuestos-adoptados-ante-ausencia-de-respuesta-del-tutor)) — se agregan las restricciones CHECK a nivel de base de datos mediante migración Prisma.

2. **Escala de la evaluación: ¿0–5 o 0–100?** RF-19 a RF-23 definen las cinco
   dimensiones de evaluación en escala **0–5**, mientras que RF-27 define el score
   agregado por habilidad en escala **0–100**. Se asume que son escalas distintas
   (evaluación por respuesta vs. score acumulado). Confirmar para evitar errores en
   los umbrales de los casos de prueba.
   **→ Decisión adoptada: D-2** (ver [§13](#13-supuestos-adoptados-ante-ausencia-de-respuesta-del-tutor)) — confirmadas como escalas independientes.

3. **Conflicto metodológico en RNF-04.** La regla de asignación de la matriz indica
   **herramienta de carga** para RNF-01 a RNF-04, pero la sección 2.2 de este plan excluye
   RNF-04 de las pruebas de carga distribuida. Se resuelve asignando a RNF-04
   **validación arquitectónica** en la matriz. Confirmar que esta interpretación es
   aceptable.
   **→ Decisión adoptada: D-3** (ver [§13](#13-supuestos-adoptados-ante-ausencia-de-respuesta-del-tutor)) — validación arquitectónica formalizada en el caso TC-ARQ-001. La herramienta de carga para RNF-01 a RNF-03 es **Apache JMeter** por instrucción del tutor (**Decisión D-9**).

4. **RNF-06 (HTTPS) en entorno académico.** El despliegue local vía Docker Compose
   opera sobre HTTP. La verificación de HTTPS/TLS depende de la existencia de un
   entorno de *staging* con certificado. Confirmar si el proyecto contará con dicho
   entorno o si RNF-06 se declarará como objetivo de diseño verificable solo a nivel
   de configuración.
   **→ Decisión adoptada: D-4** (ver [§13](#13-supuestos-adoptados-ante-ausencia-de-respuesta-del-tutor)) — objetivo de diseño verificable por configuración; se entrega plantilla `docker-compose.prod.yml`.

5. **RF-37 a RF-41 (CRUD de catálogos) vs. inventario de endpoints.** El inventario
   de la Fase 0 detectó endpoints administrativos para la gestión de **preguntas**
   (RF-42) y para la **generación** de preguntas, pero **no** endpoints CRUD
   explícitos para roles, lenguajes, frameworks, niveles y habilidades (RF-37–RF-41);
   estos catálogos se exponen como solo lectura y se poblan vía *seed*. Confirmar si
   RF-37–RF-41 deben verificarse contra una interfaz CRUD existente o si se trata de
   funcionalidad aún no implementada (lo que las pruebas evidenciarían como *gap*).
   **→ Decisión adoptada: D-5** (ver [§13](#13-supuestos-adoptados-ante-ausencia-de-respuesta-del-tutor)) — RF-37 a RF-41 quedan fuera del MVP académico y se difieren; RF-42 se mantiene en alcance.

6. **Alcance del componente RAG en la evaluación (RF-31).** RF-31 indica recuperación
   de "documentos técnicos relevantes". El inventario muestra una base de conocimiento
   (`KnowledgeDocument`/`KnowledgeChunk`) y un módulo RAG. Confirmar si la evaluación
   de respuestas usa efectivamente ese contexto recuperado en producción o si el
   pipeline RAG se emplea principalmente en la generación de preguntas, para enfocar
   correctamente las métricas IA-01 e IA-03.
   **→ Decisión adoptada: D-6** (ver [§13](#13-supuestos-adoptados-ante-ausencia-de-respuesta-del-tutor)) — se asume uso dual del RAG (generación de preguntas + evaluación).

---

## 13. Supuestos adoptados ante ausencia de respuesta del tutor

Las observaciones de la sección 12 no pudieron resolverse con el tutor en tiempo
real. Para no bloquear el avance de las fases de QA, el equipo adopta los siguientes
**supuestos justificados**, registrados como decisiones formales. Cada uno es un
**supuesto adoptado**, no una verdad definitiva: podrá revisarse si el tutor expresa
una posición diferente en revisiones posteriores. El registro consolidado, con fecha,
se encuentra en `qa/01-plan-maestro/decisiones_qa.md`.

### D-1 — Restricciones CHECK de integridad (RNF-18, RNF-19, RNF-20)

Se adopta una estrategia de **defensa en profundidad**: las restricciones CHECK se
agregan a nivel de base de datos antes de implementar las pruebas de integridad.

- **Acción ejecutada:** se creó la migración
  `backend/prisma/migrations/20260519120000_add_check_constraints/migration.sql` con
  CHECK [0, 5] sobre las cinco dimensiones de `answer_evaluations`, CHECK [0, 100]
  sobre `user_skill_scores.score` y CHECK (`order_number` > 0) sobre
  `interview_questions`. Las constraints se documentaron además como comentarios en
  `backend/prisma/schema.prisma`.
- **Estado:** migración lista para revisión; **no** se ejecutó contra ninguna base de datos.
- **Justificación:** verificar RNF-18–RNF-20 de forma fiable exige que el motor
  relacional haga cumplir las reglas, sin depender solo de la validación en código.

### D-2 — Escalas de evaluación 0–5 vs. 0–100

Se confirman como **escalas independientes**: la evaluación por respuesta usa 0–5
(cinco dimensiones) y el puntaje agregado por habilidad usa 0–100. No requiere acción
correctiva sobre el código ni el esquema; los casos de prueba aplican cada umbral en
su contexto. Miden objetos distintos (una respuesta puntual frente a un score
acumulado), por lo que no existe contradicción.

### D-3 — RNF-04: Escalabilidad horizontal

Se mantiene la **validación arquitectónica**, formalizada en el caso **TC-ARQ-001**,
cuyos criterios concretos de verificación son:

1. Frontend y backend son contenedores Docker independientes y desplegables por separado.
2. El backend no mantiene estado de sesión en memoria (autenticación vía JWT en cookies).
3. La configuración de base de datos y servicios externos se inyecta vía variables de entorno.
4. Los endpoints son *stateless* (el estado compartido reside solo en la base de datos y Redis).

La validación de escalado horizontal real requiere infraestructura distribuida no
disponible en un proyecto académico; la verificación arquitectónica confirma que el
diseño **habilita** el escalado, que es lo que RNF-04 exige.

### D-4 — RNF-06: HTTPS / cifrado en tránsito

RNF-06 se declara como **objetivo de diseño verificable a nivel de configuración**.
Las pruebas locales se ejecutan sobre HTTP. Se creó la plantilla
`docker-compose.prod.yml` en la raíz del repositorio, que documenta una topología de
producción con reverse proxy y terminación TLS, con comentarios explícitos sobre los
elementos a completar antes de un despliegue real (dominio, certificados, secretos).
**Limitación reconocida:** al ser un proyecto académico sin operación productiva, la
configuración TLS no se ejecuta ni se valida en runtime.

### D-5 — RF-37 a RF-41: CRUD de catálogos

RF-37 a RF-41 se documentan como **funcionalidad fuera del MVP académico** y se
difieren. **RF-42 (gestión de preguntas) se mantiene** en alcance, porque el inventario
confirmó endpoints implementados. Justificación registrada:

> "El alcance del proyecto se centró en el flujo principal del estudiante
> (configuración → entrevista → evaluación → reportes). La administración de catálogos
> (roles, lenguajes, frameworks, niveles, habilidades) se realiza vía seed determinista
> en el bootstrap del sistema, lo cual es suficiente para validar todos los flujos
> funcionales del proyecto de grado. RF-37 a RF-41 quedan como funcionalidad futura
> para una versión de producción del sistema."

En la matriz de trazabilidad, el estado de RF-37 a RF-41 pasa a **"Fuera del MVP —
diferido"** y no se incluyen en el catálogo de casos de prueba a implementar.

### D-6 — RF-31: Alcance del componente RAG

Se asume que el pipeline RAG se utiliza para **ambos propósitos**: la generación de
preguntas (módulo `questions`) y el enriquecimiento del contexto durante la evaluación
(módulo `evaluation`). Esta interpretación maximiza la cobertura de las métricas IA-XX
y refleja el uso típico de RAG en sistemas educativos. Si durante las fases de prueba
se demuestra que el contexto recuperado **no** se emplea en la evaluación, se
documentará como *gap* de implementación detectado por el plan de pruebas; aun así,
las métricas **IA-01 (Faithfulness)** e **IA-03 (Context Precision)** se mantienen en
la matriz por su relevancia para la generación de preguntas.

### Síntesis

| ID | Tema | Decisión | Revisable |
|---|---|---|---|
| D-1 | CHECK constraints (RNF-18/19/20) | Constraints a nivel de BD vía migración | Sí |
| D-2 | Escalas 0–5 vs 0–100 | Escalas independientes confirmadas | Sí |
| D-3 | RNF-04 escalabilidad horizontal | Validación arquitectónica (TC-ARQ-001) | Sí |
| D-4 | RNF-06 HTTPS | Objetivo de diseño verificable por configuración | Sí |
| D-5 | RF-37–RF-41 CRUD catálogos | Fuera del MVP — diferidos | Sí |
| D-6 | RF-31 alcance RAG | Uso dual: generación + evaluación | Sí |

Todas las decisiones de esta sección son **supuestos adoptados** ante la ausencia de
respuesta del tutor y permanecen abiertas a revisión.
