# Matriz de Trazabilidad de Pruebas — Plataforma Vinki

> **Proyecto de grado** — Ingeniería de Sistemas, Universidad Privada Boliviana (UPB).
> **Fuentes autoritativas:** `docs/requerimientos.md` (42 RF + 34 RNF) y `qa/00-inventario/inventario_sistema.md`.
> **Documento vinculado:** `qa/01-plan-maestro/plan_maestro_pruebas.md`.
> **Estado del documento:** Fase 3 cerrada — actualizado tras aplicar las decisiones de QA (D-1 a D-8) y la suite de integración (`qa/03-pruebas-integracion/`).
> **Convención:** `ID caso de prueba` y `Estado` se inicializan en **"Pendiente"** hasta el diseño de casos, salvo los ítems afectados por las decisiones de QA. Los IDs `TC-U-XXX` corresponden a tests unitarios, `TC-I-XXX` a tests de integración (Fase 3), y `TC-E-XX` a tests E2E Playwright (Fase 4, diferidos).
> **Decisiones aplicadas:** ver `qa/01-plan-maestro/decisiones_qa.md` y la sección 13 del plan maestro. Afectan a RF-37–RF-41 (D-5), RNF-04 (D-3), RNF-06 (D-4), RNF-18/19/20 (D-1), 4 módulos sin RF declarado (D-7) y 8 pages frontend > 500 LOC reclasificadas a E2E (D-8).

---

## Tabla 1 — Trazabilidad de Requerimientos Funcionales (RF-01 a RF-42)

| RF ID | Descripción corta | Módulo | Tipo de prueba sugerido | ID caso de prueba | Estado |
|---|---|---|---|---|---|
| RF-01 | Registro de usuario (email único) | M1 — Gestión de Usuarios y Autenticación | Unitaria + Integración + E2E | TC-U-001 + TC-I-001 + **TC-E-00-001** (`TC-E-00.spec.ts`: login student) | ✅ Verde — unit + integración + E2E |
| RF-02 | Autenticación segura (verificación de credenciales) | M1 — Gestión de Usuarios y Autenticación | Unitaria + Integración + E2E | TC-U-002 + TC-I-002 + **TC-E-00-001/002/003** | ✅ Verde — unit + integración + E2E |
| RF-03 | Gestión de sesiones | M1 — Gestión de Usuarios y Autenticación | Unitaria + Integración + E2E | TC-U-003 + TC-I-003 + **TC-E-00-005** (logout) + **TC-E-06-001** (perfil) | ✅ Verde — unit + integración + E2E |
| RF-04 | Registro de fecha de creación de cuenta | M1 — Gestión de Usuarios y Autenticación | Unitaria + Integración + E2E | TC-U-004 + **TC-E-06-002** (`TC-E-06.spec.ts`: fecha visible en perfil) | ✅ Verde — unit + E2E |
| RF-05 | Selección de rol técnico desde catálogo | M2 — Configuración de Entrevista | Unitaria + Integración + E2E | TC-U-005 + **TC-E-01-001** | ✅ Verde — unit + E2E |
| RF-06 | Selección de lenguaje desde catálogo | M2 — Configuración de Entrevista | Unitaria + Integración + E2E | TC-U-006 + **TC-E-01-001** | ✅ Verde — unit + E2E |
| RF-07 | Selección de framework (validación de pertenencia al lenguaje) | M2 — Configuración de Entrevista | Unitaria + Integración + E2E | TC-U-007 + **TC-E-01-001/003** | ✅ Verde — unit + E2E |
| RF-08 | Selección de nivel de dificultad | M2 — Configuración de Entrevista | Unitaria + Integración + E2E | TC-U-008 + **TC-E-01-001** | ✅ Verde — unit + E2E |
| RF-09 | Persistencia de la configuración de la entrevista | M2 — Configuración de Entrevista | Unitaria + Integración + E2E | TC-U-009 + TC-I-101 + **TC-E-01-002** | ✅ Verde — unit + int + E2E |
| RF-10 | Inicio de entrevista (registro de `started_at`) | M3 — Simulación de Entrevista | Unitaria + Integración + E2E | TC-U-010 + TC-I-101 + **TC-E-01-006/TC-E-02-001** | ✅ Verde — unit + int + E2E |
| RF-11 | Finalización de entrevista (registro de `finished_at`) | M3 — Simulación de Entrevista | Unitaria + Integración + E2E | TC-U-011 + TC-I-103 + **TC-E-02-007** | ✅ Verde — unit + int + E2E |
| RF-12 | Selección inteligente de preguntas (filtros) | M3 — Simulación de Entrevista | Unitaria + Integración + E2E | TC-U-012 + **TC-E-02-001** | ⚠ Verde con observación (HE-05). Observación documentada y diferida por **D-13**; funcionalidad core no afectada (afecta etiquetado de skill en generación IA administrativa). |
| RF-13 | Asignación de preguntas a entrevista con orden | M3 — Simulación de Entrevista | Unitaria + Integración + E2E | TC-U-013 + **TC-E-02-001/003** | ✅ Verde — unit + E2E |
| RF-14 | Snapshot del texto de la pregunta | M3 — Simulación de Entrevista | Unitaria + Integración + E2E | TC-U-014 + **TC-E-02-003** | ✅ Verde — unit + E2E |
| RF-15 | Identificación del origen de la pregunta (IA / BD) | M3 — Simulación de Entrevista | Unitaria + Integración + E2E | TC-U-015 + **TC-E-02-004** | ✅ Verde — unit + E2E |
| RF-16 | Captura de respuesta en texto | M3 — Simulación de Entrevista | Unitaria + Integración + E2E | TC-U-016 + TC-I-102 + **TC-E-02-002** | ✅ Verde — unit + int + E2E |
| RF-17 | Captura de respuesta en audio | M3 — Simulación de Entrevista | Unitaria + Integración + E2E | TC-U-017 + **TC-E-02-005** (audio mockeado D-11) | ✅ Verde — unit + E2E |
| RF-18 | Registro de tiempo de envío de respuesta | M3 — Simulación de Entrevista | Unitaria + Integración + E2E | TC-U-018 + **TC-E-02-002** | ✅ Verde — unit + E2E |
| RF-19 | Evaluación de corrección técnica (0–5) | M4 — Evaluación y Retroalimentación | Unitaria (LLM mockeado) + Integración + Evaluación RAG | TC-U-019 + TC-I-201 + **TC-E-03-001** | ✅ Verde — unit + int + E2E |
| RF-20 | Evaluación de claridad de la explicación (0–5) | M4 — Evaluación y Retroalimentación | Unitaria (LLM mockeado) + Integración + Evaluación RAG | TC-U-020 + TC-I-201 + **TC-E-03-001** | ✅ Verde — unit + int + E2E |
| RF-21 | Evaluación de comunicación (0–5) | M4 — Evaluación y Retroalimentación | Unitaria (LLM mockeado) + Integración + Evaluación RAG | TC-U-021 + TC-I-201 + **TC-E-03-001** | ✅ Verde — unit + int + E2E |
| RF-22 | Evaluación de confianza (0–5) | M4 — Evaluación y Retroalimentación | Unitaria (LLM mockeado) + Integración + Evaluación RAG | TC-U-022 + TC-I-201 + **TC-E-03-001** | ✅ Verde — unit + int + E2E |
| RF-23 | Evaluación de resolución de problemas (0–5) | M4 — Evaluación y Retroalimentación | Unitaria (LLM mockeado) + Integración + Evaluación RAG | TC-U-023 + TC-I-201 + **TC-E-03-001** | ✅ Verde — unit + int + E2E |
| RF-24 | Detección del nivel demostrado | M4 — Evaluación y Retroalimentación | Unitaria (LLM mockeado) + Integración + Evaluación RAG | TC-U-024 (`evaluation.processor.spec.ts` + `answers.service.spec.ts`: detectedLevelId mapping) | Verde — unitaria |
| RF-25 | Retroalimentación textual personalizada | M4 — Evaluación y Retroalimentación | Unitaria (LLM mockeado) + Integración + Evaluación RAG | TC-U-025 + TC-I-202 + **TC-E-03-002** | ✅ Verde — unit + int + E2E |
| RF-26 | Registro de la fecha de evaluación | M4 — Evaluación y Retroalimentación | Unitaria (LLM mockeado) + Integración + Evaluación RAG | TC-U-026 (`evaluation.processor.spec.ts`: upsert sets evaluatedAt default) | Verde — unitaria |
| RF-27 | Cálculo de scores por habilidad (0–100) | M4 — Evaluación y Retroalimentación | Unitaria (LLM mockeado) + Integración + Evaluación RAG | TC-U-027 + **TC-I-203** (`evaluations.integration.spec.ts`: UserSkillScore creado en [0,100]) | ⚠ Verde con observación (HE-05). Observación documentada y diferida por **D-13**; el cálculo es correcto y permanece dentro del rango [0,100]. Solo la atribución por habilidad queda sesgada para preguntas generadas vía "Generar con IA" del admin. Funcionalidad core no afectada. |
| RF-28 | Actualización de la fecha de modificación de scores | M4 — Evaluación y Retroalimentación | Unitaria (LLM mockeado) + Integración + Evaluación RAG | TC-U-028 + **TC-I-204** (`evaluations.integration.spec.ts`: /api/dashboard agrega métricas) | ✅ Verde — unit + integración |
| RF-29 | Almacenamiento de embeddings de preguntas | M5 — Búsqueda Semántica y RAG | Unitaria + Evaluación RAG + E2E (UI) | TC-U-029 + **TC-E-07-001/003** | ✅ Verde — unit + E2E UI |
| RF-30 | Búsqueda por similitud semántica | M5 — Búsqueda Semántica y RAG | Unitaria + Evaluación RAG + E2E (UI) | TC-U-030 + **TC-E-07-002** | ✅ Verde — unit + E2E UI |
| RF-31 | Recuperación de contexto para la IA (RAG) | M5 — Búsqueda Semántica y RAG | Unitaria + Evaluación RAG + E2E (UI) | TC-U-031 + **TC-E-07-002** | ✅ Verde — unit + E2E UI |
| RF-32 | Historial de entrevistas con estado | M6 — Visualización y Reportes | Unitaria frontend (render) + E2E (flujo) | TC-U-032 + **TC-E-04-001/002/005** | ✅ Verde — unit + E2E |
| RF-33 | Detalle completo de una entrevista | M6 — Visualización y Reportes | Unitaria frontend (render) + E2E (flujo) | TC-U-033 + **TC-E-04-003** + **TC-E-03-001** | ✅ Verde — unit + E2E |
| RF-34 | Dashboard de evolución de habilidades | M6 — Visualización y Reportes | Unitaria frontend (render) + E2E (flujo) | TC-U-034 + **TC-E-05-001/002/004** | ✅ Verde — unit + E2E (TC-E-05-003 flake doc. HE-01) |
| RF-35 | Visualización de las 5 dimensiones de evaluación | M6 — Visualización y Reportes | Unitaria frontend + E2E | TC-U-035 + **TC-E-03-001/005** | ✅ Verde — unit + E2E |
| RF-36 | Exportación de resultados (PDF / compartir) | M6 — Visualización y Reportes | Unitaria frontend + E2E | Pendiente — flujo completo se cubre en E2E (Fase 4) | Diferido a E2E |
| RF-37 | Gestión del catálogo de roles | M7 — Administración de Catálogos | N/A — diferido (ver Decisión D-5) | N/A — diferido | Fuera del MVP — diferido |
| RF-38 | Gestión del catálogo de lenguajes | M7 — Administración de Catálogos | N/A — diferido (ver Decisión D-5) | N/A — diferido | Fuera del MVP — diferido |
| RF-39 | Gestión del catálogo de frameworks (asociados a lenguaje) | M7 — Administración de Catálogos | N/A — diferido (ver Decisión D-5) | N/A — diferido | Fuera del MVP — diferido |
| RF-40 | Gestión del catálogo de niveles | M7 — Administración de Catálogos | N/A — diferido (ver Decisión D-5) | N/A — diferido | Fuera del MVP — diferido |
| RF-41 | Gestión del catálogo de habilidades | M7 — Administración de Catálogos | N/A — diferido (ver Decisión D-5) | N/A — diferido | Fuera del MVP — diferido |
| RF-42 | Gestión del banco de preguntas | M7 — Administración de Catálogos | Unitaria + Integración + E2E | TC-U-042 + **TC-E-08-001/002/003/004/005** | ⚠ Verde con observación (HE-05). Observación documentada y diferida por **D-13**; el feature "Generar con IA" persiste `skill_id` por defecto incorrecto (corregible manualmente vía edición del admin). El resto del CRUD (manual, edición, eliminación, import/export) funciona correctamente. Funcionalidad core no afectada. |

**Total: 42 requerimientos funcionales trazados.**

---

## Tabla 2 — Trazabilidad de Requerimientos No Funcionales (RNF-01 a RNF-34)

| RNF ID | Categoría | Métrica / Validación | Umbral | Herramienta sugerida | ID caso | Estado |
|---|---|---|---|---|---|---|
| RNF-01 | Rendimiento y Escalabilidad | Latencia envío de respuesta → evaluación IA | P95 < 5 s | Apache JMeter (D-9) | **TC-P-001** (arquitectónico mock, `01-rnf01-arq.jmx`) + **TC-P-004** (real LLM, `04-rnf01-real.jmx`) | ✅ **Verde (flujo principal asíncrono)** — el modo `evaluation` (principal) usa `POST /finish` → BullMQ, ack ~12 ms, usuario NO bloqueado (D-17). **Observación HE-06 acotada al modo `practice`** (feedback inmediato opcional, P95 = 7 418 ms con gpt-4o-mini, dominada por LLM externo D-15). Reclasificación detallada en `qa/04-pruebas-no-funcionales/rendimiento/analisis_flujo_evaluacion.md`. |
| RNF-02 | Rendimiento y Escalabilidad | Latencia de búsqueda por similitud vectorial | P95 < 500 ms (hasta 10.000 preguntas) | Apache JMeter (D-9) | **TC-P-002** (`02-rnf02-search.jmx`) | ⚠ Verde — **validado hasta 20 usuarios concurrentes** (P95 = 90 ms, DB con 10 000 preguntas + 50 chunks) con holgura ~5.5×. Corrida parcial a 30 u (P95 = 70 ms). El perfil 50 u no se completó por **limitación de memoria del entorno de pruebas (8 GB RAM)** — ver `reporte_rendimiento.md` § 3.1. |
| RNF-03 | Rendimiento y Escalabilidad | Concurrencia de entrevistas simultáneas | ≥ 50 usuarios concurrentes sin degradación | Apache JMeter (D-9) | **TC-P-003** (`03-rnf03-concurrencia.jmx`, **diseñado, no ejecutado**) | ⚠ Cobertura parcial vía RNF-01 arquitectónico estrés (50 u sostenidos, 58 579 samples, **0 % errores**, P95 = 361 ms). Escenario dedicado pendiente por **limitación de memoria del entorno (8 GB RAM)** — plan `.jmx` + CSV de 50 usuarios disponibles para re-ejecución en infraestructura ≥ 16 GB. |
| RNF-04 | Rendimiento y Escalabilidad | Escalabilidad horizontal (frontend/backend independientes) | Separación de capas verificada | Validación arquitectónica (ver Decisión D-3 y §2.2 del plan) | TC-ARQ-001 | Pendiente |
| RNF-05 | Seguridad | Algoritmo de hash de contraseñas | Hash seguro `bcrypt` (nunca texto plano) | Revisión manual de código + test de integración + Semgrep | **TC-I-005** (`auth.integration.spec.ts`: passwordHash matches `^\$2[aby]\$10\$/`) + **TC-S-001** (revisión manual Fase 5-B: bcrypt cost=10 en `auth.service.ts:32/48/138/143`, password nunca expuesto en respuestas) | ✅ Verde — integración + revisión 5-B |
| RNF-06 | Seguridad | Cifrado de la comunicación en tránsito | 100 % del tráfico sobre TLS/HTTPS | Revisión manual + verificación de configuración de despliegue (`docker-compose.prod.yml`) | **TC-S-002** (revisión manual 5-B: cookies `secure` cuando `NODE_ENV==='production'` + Helmet HSTS `max-age=15552000` + `docker-compose.prod.yml` con reverse proxy TLS) | ✅ Objetivo de diseño cumplido (D-4) + revisión 5-B |
| RNF-07 | Seguridad | Autorización por propiedad de los datos | 0 accesos exitosos a datos de otro usuario | Tests de integración API (Supertest) + revisión manual + E2E | TC-I-007 + **TC-E-00-002/004/006 + TC-E-03-003 + TC-E-04-004 + TC-E-05-003 + TC-E-06-004 + TC-E-08-006** + **TC-S-003** (5 tests cross-user templates en `authorization.integration.spec.ts` + auditoría exhaustiva 27+ endpoints en Fase 5-B) | ✅ Verde — integración + E2E + revisión 5-B. **2 bugs detectados y corregidos por el proceso de QA:** HE-01 (cache cross-tenant, Fase 4) y HE-07 (BOLA en templates, Fase 5-B, **D-18**) — re-validados con 0 regresiones a 4 niveles |
| RNF-08 | Seguridad | Validación estricta de DTOs en el borde HTTP | 100 % de payloads malformados rechazados con 400 antes del servicio | Tests de integración (Supertest) | **TC-I-008** (`dto-validation.integration.spec.ts`: register / interviews / answers DTOs) + **TC-S-004** (revisión manual 5-B: `ValidationPipe` con `whitelist + forbidNonWhitelisted + transform` global en `main.ts:30-36`) | ✅ Verde — integración + revisión 5-B |
| RNF-08bis | Seguridad (URLs audio, definición textual de docs/requerimientos.md) | Protección de URLs de audio (tokens, acceso controlado) | URLs no enumerables ni públicas | Revisión manual + diseño del SUT | **TC-S-005** (revisión manual 5-B: audio se transcribe inline y se descarta; `answer.audio_url = 'audio://uploaded'` literal placeholder, no URL real; no hay endpoint para servir audio) | ✅ Cumple por descarte. Nota: el SUT no persiste el binario del audio en MVP. Si se activa S3 en el futuro, agregar presigned URLs con expiración. |
| RNF-09 | Integridad y Consistencia de Datos | FK framework → lenguaje | 0 frameworks sin lenguaje válido | Test de integración con Prisma contra DB de pruebas | **TC-I-009** (`foreign-keys.spec.ts`: missing/invalid language_id) | ✅ Verde — integración |
| RNF-10 | Integridad y Consistencia de Datos | FK de preguntas (lenguaje, nivel, habilidad obligatorios; framework opcional) | 0 preguntas con FK inválida | Test de integración con Prisma contra DB de pruebas | **TC-I-010** (`foreign-keys.spec.ts`: language/level/skill obligatorios; framework opcional) | ✅ Verde — integración |
| RNF-11 | Integridad y Consistencia de Datos | FK de entrevistas (usuario, rol, nivel obligatorios) | 0 entrevistas con FK inválida | Test de integración con Prisma contra DB de pruebas | **TC-I-011** (`foreign-keys.spec.ts`: user/role/chosenLevel obligatorios) | ✅ Verde — integración |
| RNF-12 | Integridad y Consistencia de Datos | Cascada al eliminar entrevista → preguntas | 0 `interview_questions` huérfanas | Test de integración con Prisma contra DB de pruebas | **TC-I-012** (`cascades.spec.ts`: interview → questions) | ✅ Verde — integración |
| RNF-13 | Integridad y Consistencia de Datos | Cascada al eliminar pregunta de entrevista → respuestas | 0 `answers` huérfanas | Test de integración con Prisma contra DB de pruebas | **TC-I-013** (`cascades.spec.ts`: interview_question → answers) | ✅ Verde — integración |
| RNF-14 | Integridad y Consistencia de Datos | Cascada al eliminar respuesta → evaluación | 0 `answer_evaluations` huérfanas | Test de integración con Prisma contra DB de pruebas | **TC-I-014** (`cascades.spec.ts`: answer → evaluation + sin over-cascade) | ✅ Verde — integración |
| RNF-15 | Integridad y Consistencia de Datos | Unicidad de email | 0 emails duplicados (constraint UNIQUE) | Test de integración con Prisma contra DB de pruebas | **TC-I-015** (`unique-constraints.spec.ts`: users.email) | ✅ Verde — integración |
| RNF-16 | Integridad y Consistencia de Datos | Unicidad de nombres en catálogos | 0 nombres duplicados en roles/languages/levels/skills | Test de integración con Prisma contra DB de pruebas | **TC-I-016** (`unique-constraints.spec.ts`: roles/languages/levels/skills.name) | ✅ Verde — integración |
| RNF-17 | Integridad y Consistencia de Datos | Unicidad de score por usuario-habilidad | 1 score por par `(user_id, skill_id)` | Test de integración con Prisma contra DB de pruebas | **TC-I-017** (`unique-constraints.spec.ts`: @@unique(user_id, skill_id)) | ✅ Verde — integración |
| RNF-18 | Integridad y Consistencia de Datos | Rango de las evaluaciones (CHECK) — requiere migración Prisma previa (Decisión D-1) | Valores ∈ [0, 5] | Test de integración con Prisma contra DB de pruebas | **TC-I-018** (`check-constraints.spec.ts`: 5 dimensiones × {<0, >5, ok}) | ✅ Verde — integración |
| RNF-19 | Integridad y Consistencia de Datos | Rango de los scores de habilidad (CHECK) — requiere migración Prisma previa (Decisión D-1) | Valores ∈ [0, 100] | Test de integración con Prisma contra DB de pruebas | **TC-I-019** (`check-constraints.spec.ts`: score < 0 / > 100 / boundaries 0 y 100) | ✅ Verde — integración |
| RNF-20 | Integridad y Consistencia de Datos | Número de orden de pregunta (CHECK) — requiere migración Prisma previa (Decisión D-1) | `order_number` > 0 | Test de integración con Prisma contra DB de pruebas | **TC-I-020** (`check-constraints.spec.ts`: order_number = 0 / < 0 / 1 / large) | ✅ Verde — integración |
| RNF-21 | Disponibilidad y Mantenibilidad | Disponibilidad del sistema (uptime) | 99,5 % (8am–10pm) — objetivo de diseño | Declarativo (no medible en proyecto académico — ver §2.2 del plan) | Pendiente | Pendiente |
| RNF-22 | Disponibilidad y Mantenibilidad | Backups automáticos de la base de datos | Backup diario | Declarativo / verificación del procedimiento documentado | Pendiente | Pendiente |
| RNF-23 | Disponibilidad y Mantenibilidad | Documentación de la API (OpenAPI/Swagger) | Swagger disponible en `/docs`; 100 % de endpoints documentados | Verificación automatizada del endpoint `/docs` | Pendiente | Pendiente |
| RNF-24 | Disponibilidad y Mantenibilidad | Logging de errores y eventos críticos | Errores y eventos críticos registrados | Revisión manual + verificación de logs (pino) | Pendiente | Pendiente |
| RNF-25 | Disponibilidad y Mantenibilidad | Índices en claves foráneas | Índice en el 100 % de las FK | Verificación de migraciones / introspección del esquema | Pendiente | Pendiente |
| RNF-26 | Usabilidad y Experiencia de Usuario | Flujo intuitivo configuración → entrevista → resultados | Flujo completable sin callejones sin salida | Test E2E (Playwright) | **TC-E-01-005** (back/forth sin pérdida) | ✅ Verde — E2E |
| RNF-27 | Usabilidad y Experiencia de Usuario | Indicador de progreso de la entrevista | Indicador "Pregunta X de N" visible | Test E2E (Playwright) | **TC-E-01-004 + TC-E-02-006** | ✅ Verde — E2E |
| RNF-28 | Usabilidad y Experiencia de Usuario | Visualización de las 5 dimensiones de evaluación | Gráfico claro (radar/barras) con 5 dimensiones | Test E2E (Playwright) + axe-core | **TC-E-03-005 + TC-E-05-004** | ✅ Verde — E2E |
| RNF-29 | Usabilidad y Experiencia de Usuario | Diseño responsive (móvil/tablet/desktop) | Funcional en los 3 *breakpoints* | Test E2E (Playwright) + axe-core | Pendiente | Pendiente |
| RNF-30 | Usabilidad y Experiencia de Usuario | Tiempo de carga de páginas principales | < 2 s | Lighthouse CI (+ k6 como apoyo) | Pendiente | Pendiente |
| RNF-31 | Requerimientos Tecnológicos | Stack frontend (React + TS + Vite 6 + Docker) | Stack verificado | Validación arquitectónica | Pendiente | Pendiente |
| RNF-32 | Requerimientos Tecnológicos | Stack backend (Node.js + NestJS modular) | Stack y arquitectura modular verificados | Validación arquitectónica | Pendiente | Pendiente |
| RNF-33 | Requerimientos Tecnológicos | Base de datos (PostgreSQL + pgvector) | Motor y extensión verificados | Validación arquitectónica | Pendiente | Pendiente |
| RNF-34 | Requerimientos Tecnológicos | Compatibilidad / intercambiabilidad de proveedor LLM | Abstracción de IA que permite cambiar de proveedor | Validación arquitectónica | Pendiente | Pendiente |

**Total: 34 requerimientos no funcionales trazados.**

### Caso de verificación arquitectónica TC-ARQ-001 (RNF-04)

Caso formalizado por la Decisión D-3. Se considera **aprobado** si se cumplen los
cuatro criterios siguientes mediante inspección del repositorio y la configuración:

| Criterio | Verificación |
|---|---|
| C1 — Contenedores independientes | Frontend y backend son servicios Docker distintos, con `Dockerfile` propio y desplegables por separado. |
| C2 — Backend sin estado en memoria | La autenticación se basa en JWT transportado en cookies; ninguna réplica depende de estado de sesión local. |
| C3 — Configuración externalizada | Base de datos y servicios externos se configuran vía variables de entorno, sin valores fijos en el código. |
| C4 — Endpoints *stateless* | El estado compartido reside únicamente en la base de datos y en Redis, externos al proceso del backend. |

---

## Tabla 3 — Trazabilidad del Componente RAG / Evaluación con IA

> Cubre la evaluación específica de los Módulos 4 (Evaluación con IA) y 5 (Búsqueda
> Semántica y RAG). Se ejecuta sobre el dataset estático de 25–30 preguntas
> definido en la sección 6 del plan maestro, con herramientas Ragas + DeepEval.

| Req IA ID | Capacidad evaluada | Métrica | Umbral | Dataset | RF/RNF relacionado | Estado |
|---|---|---|---|---|---|---|
| IA-01 | Generación de retroalimentación fiel al contexto recuperado | Faithfulness | ≥ 0,80 | Dataset RAG estático (25–30 preguntas) | RF-25, RF-31 | Pendiente |
| IA-02 | Respuestas relevantes a la pregunta del estudiante | Answer Relevancy | ≥ 0,80 | Dataset RAG estático (25–30 preguntas) | RF-25 | Pendiente |
| IA-03 | Precisión del contexto recuperado por búsqueda semántica | Context Precision | ≥ 0,70 | Dataset RAG estático (25–30 preguntas, con contexto esperado) | RF-30, RF-31 | Pendiente |
| IA-04 | Tasa de alucinaciones en las evaluaciones | Hallucination Rate | ≤ 10 % | Dataset RAG estático (25–30 preguntas) | RF-19, RF-20, RF-21, RF-22, RF-23 | Pendiente |
| IA-05 | Consistencia de las evaluaciones numéricas (escala 0–5) | Varianza intra-pregunta en ejecuciones repetidas | Varianza ≤ umbral definido en Fase 2 (objetivo: baja dispersión) | Subconjunto del dataset RAG ejecutado N veces | RF-19, RF-20, RF-21, RF-22, RF-23, RNF-18 | Pendiente |
| IA-06 | Latencia del pipeline RAG completo | Latencia extremo a extremo | P95 < 5 s | Dataset RAG estático (25–30 preguntas) | RNF-01 | Pendiente |

**Total: 6 capacidades de IA/RAG trazadas.**

---

## Resumen de cobertura

| Conjunto | Cantidad de ítems | Estado |
|---|---|---|
| Requerimientos funcionales (RF) | 42 / 42 | Trazados — 37 activos + 5 diferidos (D-5). **27 con cobertura E2E** además de unitarias/integración |
| Requerimientos no funcionales (RNF) | 34 / 34 | Trazados — 15 verdes en integración + **4 verdes en E2E (RNF-07/26/27/28)**; resto pendientes / arquitectónicos |
| Capacidades de IA/RAG (IA) | 6 / 6 | Trazadas — Fase 7 (Ragas / DeepEval) |
| **Total de ítems trazados** | **82** | — |
| **Tests de integración (TC-I-XXX)** | **92 / 92** ✅ | Fase 3 cerrada — ver `qa/03-pruebas-integracion/resumen_integracion.md` |
| **Tests E2E (TC-E-XX-NNN)** | **46 / 47** ✅ (1 flake HE-01) | Fase 4 cerrada — ver `qa/03-pruebas-e2e/resumen_e2e.md` |

> Tras la Decisión D-5, los RF-37 a RF-41 quedan **fuera del MVP académico** y no
> generan casos de prueba; el catálogo de casos de la Fase 2 abarcará **37 RF activos**,
> los 34 RNF y las 6 capacidades de IA/RAG.

---

## Observaciones para confirmar con el tutor

> Las siguientes observaciones surgen del cruce de las reglas de asignación con el
> catálogo de requerimientos y el inventario técnico. **No** alteran
> `docs/requerimientos.md` ni introducen requerimientos nuevos.
>
> **Estado:** todas las observaciones cuentan con una **decisión de QA adoptada**
> (supuesto justificado, abierto a revisión). Ver `qa/01-plan-maestro/decisiones_qa.md`
> y la sección 13 del plan maestro.

1. **RNF-04 — herramienta de validación.** La regla de la matriz asigna **k6** al
   bloque RNF-01–RNF-04, pero la sección 2.2 del plan maestro excluye RNF-04 de las
   pruebas de carga distribuida. En esta matriz se asignó **validación
   arquitectónica** a RNF-04 para mantener la coherencia con el plan.
   **→ Decisión adoptada: D-3** — validación arquitectónica formalizada en el caso TC-ARQ-001 (ver `decisiones_qa.md` y §13 del plan).

2. **RNF-18, RNF-19 y RNF-20 — CHECK constraints.** Estos tres RNF se trazan como
   pruebas de integración con Prisma, conforme a la regla del bloque RNF-09–RNF-20.
   No obstante, el inventario (Fase 0) indica que el esquema Prisma **no declara**
   dichas restricciones CHECK.
   **→ Decisión adoptada: D-1** — se agregan las restricciones CHECK mediante la migración `20260519120000_add_check_constraints`, que debe aplicarse antes de implementar las pruebas de integridad.

3. **RF-37 a RF-41 — CRUD de catálogos.** Se trazan como "Unitaria + Integración"
   según la regla del bloque RF-37–RF-42. El inventario solo detectó endpoints CRUD
   para preguntas (RF-42); para roles, lenguajes, frameworks, niveles y habilidades
   no se hallaron endpoints de escritura.
   **→ Decisión adoptada: D-5** — RF-37 a RF-41 quedan fuera del MVP académico y se difieren; su estado en la Tabla 1 es "Fuera del MVP — diferido". RF-42 se mantiene en alcance.

4. **RF-19 a RF-28 — evaluación específica de RAG.** La regla asigna "Evaluación
   específica de RAG" a todo el bloque. Para RF-26, RF-27 y RF-28 (registro de fecha
   de evaluación, cálculo y actualización de scores) la verificación es
   principalmente determinista (persistencia y aritmética); la componente de
   evaluación RAG aplica de forma indirecta. Confirmar si para esos tres RF basta la
   verificación unitaria + integración, reservando la evaluación RAG para RF-19–RF-25.
   **→ Pendiente de revisión con el tutor.** No incluida en las decisiones D-1 a D-6; se mantiene la asignación del bloque sin cambios hasta su confirmación.

5. **Doble escala de evaluación.** RF-19–RF-23 usan escala 0–5 y RF-27 usa escala
   0–100. Los umbrales de los casos de prueba dependen de confirmar que son escalas
   independientes (evaluación por respuesta vs. score agregado por habilidad).
   **→ Decisión adoptada: D-2** — confirmadas como escalas independientes (ver `decisiones_qa.md` y §13 del plan).
