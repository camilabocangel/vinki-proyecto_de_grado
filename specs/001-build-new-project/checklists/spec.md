# Spec Review Checklist: Vinki — Plataforma de Simulación de Entrevistas Técnicas

**Purpose**: Validar la calidad de los requisitos escritos antes de iniciar `/speckit.plan` — autor (auto-revisión)
**Created**: 2026-03-19
**Feature**: [spec.md](../spec.md)
**Depth**: Standard | **Audience**: Author (pre-plan self-review) | **Focus**: Pipeline IA · Seguridad & Auth · Async / Tiempo Real

---

## 🔴 GATE — Pipeline IA (FR-012–016)

- [ ] CHK001 - ¿Está especificado cuándo exactamente se dispara el pipeline de evaluación — al enviar cada respuesta o al cerrar la entrevista? [Completeness, Spec §FR-012]
- [ ] CHK002 - ¿El término "búsqueda semántica" en FR-006 y FR-012 se define con criterios medibles (ej. umbral de similitud, número de resultados recuperados)? [Clarity, Spec §FR-006, FR-012, Ambiguity]
- [ ] CHK003 - ¿Las cinco métricas (FR-013) tienen definidas sus rúbricas de puntuación, o solo están nombradas? ¿Puede un implementador saber qué hace que una respuesta obtenga 3 vs 5 en "technical_correctness"? [Clarity, Spec §FR-013, Ambiguity]
- [ ] CHK004 - ¿El tiempo máximo aceptable del pipeline completo está cuantificado más allá de SC-002 ("< 60 s")? ¿Aplica ese SLO incluyendo los reintentos? [Measurability, Spec §SC-002, FR-015]
- [ ] CHK005 - ¿La política de reintentos de FR-015 especifica intervalo, estrategia (backoff lineal/exponencial) y comportamiento del DLQ? [Completeness, Spec §FR-015, Gap]
- [ ] CHK006 - ¿El estado "no procesada" de una evaluación está definido? ¿Qué ve el estudiante, qué puede hacer, existe un mecanismo de reintento manual? [Clarity, Spec §FR-015, Ambiguity]
- [ ] CHK007 - ¿Está especificado el pipeline de transcripción audio→texto antes de la evaluación LLM para respuestas grabadas? La spec asume análisis sobre "contenido textual" pero no describe cómo el audio se convierte en texto. [Gap, Spec §FR-009, FR-012, Assumptions]
- [ ] CHK008 - ¿El texto de retroalimentación de FR-014 tiene definida su longitud mínima y el idioma de salida obligatorio? SC-006 dice "al menos un párrafo" — ¿está formalizado como requisito? [Clarity, Spec §FR-014, SC-006, Ambiguity]

---

## 🔴 GATE — Seguridad y Autenticación (FR-001–004)

- [ ] CHK009 - ¿El ciclo de vida del JWT (tiempo de expiración del access token, tiempo del refresh token, invalidación al cerrar sesión) está especificado en FR-002 y FR-004? [Completeness, Spec §FR-002, FR-004, Gap]
- [ ] CHK010 - ¿Están definidas las restricciones de acceso por rol para cada recurso principal (student ≠ recruiter ≠ admin)? ¿Existe una matriz de permisos o equivalente en la spec? [Completeness, Spec §FR-003, Gap]
- [ ] CHK011 - ¿La política de contraseñas en FR-001 incluye requisitos de complejidad más allá de "mínimo 8 caracteres"? [Clarity, Spec §FR-001, Ambiguity]
- [ ] CHK012 - ¿Están cubiertos los escenarios de fallo de autorización (ej. un recruiter intenta acceder al panel admin, o un student a datos de otros students)? [Coverage, Spec §FR-003, Gap]
- [ ] CHK013 - ¿Están definidos los requisitos de privacidad para los datos de audio (retención, eliminación, quién puede acceder)? [Gap, Non-Functional]
- [ ] CHK014 - ¿Los requisitos de rate limiting están cuantificados (solicitudes/minuto por endpoint o por rol)? [Clarity, Gap]

---

## 🔴 GATE — Async y Notificaciones en Tiempo Real (FR-015–016)

- [ ] CHK015 - ¿El mecanismo de notificación en tiempo real está especificado (WebSocket, SSE, polling)? FR-016 define el QUÉ pero no el CÓMO ni los requisitos de fiabilidad. [Clarity, Spec §FR-016, Ambiguity]
- [ ] CHK016 - ¿Las garantías de entrega de la notificación están definidas (at-most-once, at-least-once)? [Gap, Spec §FR-016]
- [ ] CHK017 - ¿Están definidos los requisitos para cuando el estudiante está offline al completarse la evaluación? ¿Recibe la notificación al volver? ¿Por cuánto tiempo persiste? [Coverage, Edge Case, Spec §FR-016]
- [ ] CHK018 - ¿El comportamiento de la UI durante el procesamiento async (pantalla de feedback en espera) está especificado en la sección de US2? [Completeness, Spec §US2, Gap]

---

## Requirement Clarity

- [ ] CHK019 - ¿"Degradación perceptible" en SC-004 (50 entrevistas simultáneas) está cuantificada con umbrales concretos de latencia o tasa de error? [Measurability, Spec §SC-004, Ambiguity]
- [ ] CHK020 - ¿"Puntaje promedio global" en FR-018 tiene definida su fórmula de cálculo (qué métricas, qué período, cuántas entrevistas mínimo)? [Clarity, Spec §FR-018, Ambiguity]
- [ ] CHK021 - ¿"Tendencias por habilidad" en FR-018 define cuántos puntos de datos mínimos se necesitan antes de mostrar una tendencia? [Clarity, Spec §FR-018, Ambiguity]
- [ ] CHK022 - ¿"Temporizador opcional" en FR-008 especifica opcional para quién (configuración del sistema vs elección del estudiante) y qué ocurre cuando se agota? [Clarity, Spec §FR-008, Ambiguity]
- [ ] CHK023 - ¿"Diversidad de habilidades" en FR-006 está definida con criterios explícitos (ej. máximo N preguntas por skill, distribución uniforme)? [Clarity, Spec §FR-006, Ambiguity]

---

## Requirement Consistency

- [ ] CHK024 - ¿Las 5 métricas listadas en FR-013 son exactamente consistentes con los campos de la entidad `AnswerEvaluation` en Key Entities? [Consistency, Spec §FR-013, Key Entities]
- [ ] CHK025 - ¿SC-002 ("< 60 s") es alcanzable con el mecanismo de reintentos de FR-015 (3 intentos)? ¿El SLO contempla el tiempo de los reintentos? [Consistency, Spec §SC-002, FR-015]
- [ ] CHK026 - ¿La actualización de `user_skill_scores` en FR-028 es consistente con el display de tendencias del dashboard (FR-018)? ¿El score 0–100 se deriva directamente de las métricas 0–5 de FR-013? [Consistency, Spec §FR-028, FR-018]

---

## Scenario Coverage

- [ ] CHK027 - ¿Están cubiertos los escenarios de cruce de roles (un student intentando acceder a la vista de recruiter, un recruiter intentando iniciar una simulación)? [Coverage, Spec §US1-US4, Gap]
- [ ] CHK028 - ¿Están definidos los requisitos para sesiones concurrentes del mismo usuario (¿puede un student tener dos entrevistas activas al mismo tiempo)? [Coverage, Edge Case, Gap]
- [ ] CHK029 - ¿Están especificados los requisitos para caducidad del token de sesión durante una entrevista activa (mid-interview expiry)? [Coverage, Edge Case, Gap]
- [ ] CHK030 - ¿El comportamiento de "pausa y abandono seguro" mencionado en los planes del frontend está formalizado como requisito en FR-010 o FR-011? [Gap, Spec §FR-010, FR-011]

---

## Non-Functional Requirements

- [ ] CHK031 - ¿Los requisitos de control de costos LLM están especificados más allá del "modo sandbox"? ¿Existe un presupuesto por evaluación o por usuario? [Gap, Non-Functional]
- [ ] CHK032 - ¿Están definidos los requisitos de retención de datos para entrevistas, respuestas y archivos de audio? [Gap, Non-Functional]
- [ ] CHK033 - ¿SC-004 ("50 entrevistas simultáneas") está identificado claramente como el objetivo de carga pico o nominal? ¿Es un dato validado? [Measurability, Spec §SC-004, Assumption]
- [ ] CHK034 - ¿Los requisitos de observabilidad (logging estructurado, métricas, alertas) están especificados a nivel de requisitos funcionales o no funcionales? [Gap, Non-Functional]

---

## Dependencies & Assumptions

- [ ] CHK035 - ¿El default de 5 preguntas por sesión (Assumptions) está referenciado o formalizado en algún requisito (FR-005, FR-008) para que el implementador no lo pase por alto? [Traceability, Spec §Assumptions, Gap]
- [ ] CHK036 - ¿Está especificado el comportamiento de fallback cuando el proveedor LLM no está disponible (más allá de listar el modo sandbox como dependencia)? [Gap, Spec §Dependencies]
- [ ] CHK037 - ¿Está especificado el comportamiento cuando el almacenamiento S3 falla durante el upload de audio (FR-009)? [Gap, Spec §Dependencies, Edge Case]
- [ ] CHK038 - ¿La decisión de excluir el procesamiento de voz (audio analizado como texto únicamente) está documentada explícitamente como decisión de alcance en Assumptions o en FR-009? [Assumption, Spec §Assumptions, FR-009]
