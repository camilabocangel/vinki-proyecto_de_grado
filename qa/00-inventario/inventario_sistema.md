# Inventario Técnico del Sistema — Plataforma Vinki

> Documento base para la definición de la estrategia de pruebas funcionales y no funcionales.
> Elaborado a partir de la lectura directa del código fuente del repositorio.
> Proyecto de grado — Universidad Privada Boliviana (UPB).

---

## 1. Resumen ejecutivo del sistema

Vinki es una plataforma web que permite a estudiantes practicar entrevistas técnicas
simuladas y recibir una evaluación automática generada por inteligencia artificial.
El sistema entrega retroalimentación detallada, detecta el nivel del candidato
(Junior, Mid, Senior) y propone un plan de mejora personalizado. Además ofrece un
panel para reclutadores —que comparan y revisan candidatos— y un módulo de
administración para gestionar el banco de preguntas, la base de conocimiento y las
analíticas del sistema.

---

## 2. Stack tecnológico completo

### 2.1 Lenguajes y versiones

| Componente | Lenguaje | Versión | Fuente |
|---|---|---|---|
| Backend | TypeScript | `^5.7.3` (modo strict) | `backend/package.json`, `backend/tsconfig.json` |
| Backend | Node.js | 20 (runtime objetivo) | `.github/workflows/ci.yml`, `backend/Dockerfile` |
| Frontend | TypeScript | `~5.9.3` (modo strict) | `frontend/app/package.json` |
| Frontend | JavaScript/JSX | ES2022 (módulos ESM, `"type": "module"`) | `frontend/app/package.json` |
| Base de datos | SQL (PostgreSQL) | 15 | `docker-compose.yml` |

### 2.2 Frameworks principales

**Backend**

| Framework / Librería | Versión | Rol |
|---|---|---|
| NestJS (`@nestjs/core`, `@nestjs/common`) | `^11.0.1` | Framework de aplicación (módulos, DI, controladores) |
| Prisma (`@prisma/client`, `prisma`) | `^6.19.2` | ORM y capa de acceso a datos |
| BullMQ (`bullmq`, `@nestjs/bullmq`) | `^5.71.0` / `^11.0.4` | Colas de trabajo asíncrono (evaluación, ingesta) |
| Passport (`@nestjs/passport`, `passport-jwt`, `passport-local`) | `^11.x` / `^4.0.1` / `^1.0.0` | Estrategias de autenticación |
| Swagger (`@nestjs/swagger`) | `^11.2.6` | Documentación OpenAPI en `/docs` |
| `@nestjs/event-emitter` | `^3.0.1` | Bus de eventos interno (listeners de logros/desafíos) |
| `@nestjs/throttler` | `^6.5.0` | Rate limiting global |
| `nestjs-pino` / `pino` | `^4.6.1` / `^10.3.1` | Logging estructurado |

**Frontend**

| Framework / Librería | Versión | Rol |
|---|---|---|
| React | `^19.2.0` | Librería de UI (SPA) |
| Vite | `^6.0.11` | Bundler y servidor de desarrollo |
| Ant Design (`antd`) | `^6.3.2` | Sistema de componentes UI |
| React Router (`react-router-dom`) | `^7.13.1` | Enrutamiento del SPA |
| TanStack Query (`@tanstack/react-query`) | `^5.91.3` | Estado de servidor / caché de datos |
| Zustand | `^5.0.12` | Estado global del cliente |
| react-i18next / i18next | `^16.5.8` / `^25.9.0` | Internacionalización (ES/EN) |
| Recharts | `^3.8.0` | Gráficos y visualizaciones |
| Monaco Editor (`@monaco-editor/react`) | `^4.7.0` | Editor de código embebido |

### 2.3 Base(s) de datos y motor de persistencia

| Recurso | Tecnología | Detalle |
|---|---|---|
| Base de datos relacional | PostgreSQL 15 con extensión **pgvector** | Imagen `pgvector/pgvector:pg15`; soporta columnas `vector(1536)` para búsqueda semántica |
| Caché / colas | Redis 7 | Imagen `redis:7-alpine`; backend de BullMQ |
| Almacenamiento de objetos | MinIO (compatible S3) | Bucket `vinki-audio` para archivos de audio de respuestas |
| ORM / acceso | Prisma 6 | Esquema único en `backend/prisma/schema.prisma`; 12 migraciones aplicadas |

### 2.4 Servicios externos / APIs de terceros

| Servicio | Uso en el código | Referencia |
|---|---|---|
| OpenAI API | Evaluación de respuestas (`gpt-4o-mini`), embeddings y transcripción de audio (Whisper) | `src/llm/services/openai-llm.service.ts`, `openai-embedding.service.ts`, `src/evaluation/services/openai-evaluator.service.ts`, `src/interviews/services/transcription.service.ts` |
| Google Generative AI | Proveedor alternativo de LLM y embeddings (Gemini) | `src/llm/services/gemini-llm.service.ts`, `gemini-embedding.service.ts` |
| SMTP (nodemailer) | Envío de notificaciones por correo | `src/notifications/email.service.ts` |
| MinIO / S3 | Persistencia de audio | `docker-compose.yml`, configuración `AWS_S3_*` |

> Nota: el sistema implementa una abstracción de proveedor (`LlmModule`) con
> implementaciones *mock* (`mock-llm.service.ts`, `mock-embedding.service.ts`,
> `mock-evaluator.service.ts`) seleccionables vía `LLM_SANDBOX`, lo que permite
> ejecutar el sistema sin dependencias externas reales.

### 2.5 Frameworks de testing ya instalados

| Capa | Herramienta | Versión | Configuración |
|---|---|---|---|
| Backend — unitario | Jest + ts-jest | `^30.0.0` / `^29.2.5` | Bloque `jest` en `backend/package.json` (`testRegex: .*\.spec\.ts$`) |
| Backend — e2e | Jest + Supertest | `^30.0.0` / `^7.0.0` | `backend/test/jest-e2e.json` |
| Frontend — unitario | Vitest + React Testing Library | `^4.0.18` / `^16.3.2` | `frontend/app/package.json` (`test:unit`) |
| Frontend — cobertura | `@vitest/coverage-v8` | `^4.1.0` | — |
| Frontend — e2e | Playwright | `^1.58.2` | `frontend/app/playwright.config.ts` |
| Frontend — accesibilidad | `@axe-core/react`, `eslint-plugin-jsx-a11y`, `@storybook/addon-a11y` | — | `src/lib/axe.ts` |
| Frontend — componentes | Storybook | `^8.6.18` | `src/stories/` |

---

## 3. Arquitectura del sistema

### 3.1 Patrón arquitectónico

El sistema es una aplicación **cliente-servidor desacoplada** compuesta por dos
artefactos independientes desplegables por separado:

- **Backend**: monolito modular construido con NestJS. Sigue una **arquitectura
  por capas y orientada a módulos de dominio** (cada feature es un módulo NestJS
  con su controlador, servicios y DTOs). Incorpora un patrón de **procesamiento
  asíncrono dirigido por colas** (BullMQ) y un **bus de eventos** interno
  (`EventEmitter`) para reacciones secundarias (logros, desafíos, notificaciones).
- **Frontend**: SPA (Single Page Application) en React, organizada por *features*
  bajo `src/pages/`.

No es una arquitectura de microservicios: el backend es un único proceso. Sí
presenta rasgos de **arquitectura hexagonal parcial** en la capa de IA, donde
`LlmModule` define interfaces (`llm-provider.interface.ts`,
`embedding-provider.interface.ts`) con implementaciones intercambiables
(OpenAI / Gemini / Mock).

### 3.2 Diagrama de carpetas (2 niveles de profundidad)

```
ProyectoDeGrado/
├── backend/
│   ├── src/                  # Código fuente NestJS
│   ├── prisma/               # schema.prisma, migraciones, seed
│   ├── test/                 # Pruebas e2e (Jest + Supertest)
│   ├── dist/                 # Build compilado
│   └── Dockerfile
├── frontend/
│   └── app/                  # SPA React + Vite
├── docs/
│   ├── architecture.md       # Diagramas C4 y de flujo
│   ├── db.sql / dbDiagram.txt
│   └── PROYECTO_VINKI_GUIA_COMPLETA.md
├── specs/
│   └── 001-build-new-project # Especificación + contrato OpenAPI
├── qa/
│   └── 00-inventario/        # Este documento
└── docker-compose.yml        # 5 servicios (postgres, redis, minio, backend, frontend)
```

```
backend/src/                          frontend/app/src/
├── auth/          # Autenticación     ├── api/         # Cliente HTTP
├── catalogs/      # Catálogos + CRUD  ├── components/  # Componentes compartidos
├── interviews/    # Entrevistas       ├── hooks/       # Hooks personalizados
├── evaluation/    # Pipeline IA       ├── i18n/        # Traducciones ES/EN
├── reports/       # Dashboards        ├── pages/       # Páginas por feature
├── notifications/ # SSE + email       ├── store/       # Stores Zustand
├── knowledge/     # Base conocimiento ├── styles/      # CSS global
├── achievements/  # Logros            ├── theme/       # Design tokens
├── challenges/    # Desafíos          ├── lib/         # Utilidades
├── llm/           # Abstracción LLM   ├── assets/      # Imágenes / SVG
├── rag/           # Generación RAG    ├── stories/     # Storybook
├── health/        # Health check      └── test/        # Setup de pruebas
└── common/        # Prisma, audit, filtros, interceptores
```

### 3.3 Capas detectadas y responsabilidad

**Backend (por módulo NestJS):**

| Capa | Artefactos | Responsabilidad |
|---|---|---|
| Presentación / API | `*.controller.ts` | Exponer endpoints HTTP, aplicar guards y validación de DTOs |
| Aplicación / Dominio | `*.service.ts` | Lógica de negocio, orquestación de casos de uso |
| Procesamiento asíncrono | `processors/*.processor.ts` | Consumidores de colas BullMQ (evaluación, ingesta de documentos) |
| Eventos | `*.listener.ts` | Reacciones secundarias a eventos de dominio (logros, desafíos, notificaciones) |
| Acceso a datos | `common/prisma.service.ts` | Cliente Prisma compartido (única vía a la BD) |
| Infraestructura transversal | `common/` | Filtro de excepciones, interceptor de caché, servicio Redis, validación de entorno, auditoría |
| Integración externa | `llm/`, `rag/` | Abstracción de proveedores de IA con interfaces e implementaciones intercambiables |

**Frontend:**

| Capa | Artefactos | Responsabilidad |
|---|---|---|
| Enrutamiento | `App.tsx`, `components/ProtectedRoute.tsx` | Definición de rutas y control de acceso por rol |
| Vistas | `pages/**` | Páginas por feature |
| Componentes | `components/**` | Layout, búsqueda, breadcrumbs, error boundary reutilizables |
| Estado de servidor | `hooks/` + TanStack Query | Consultas y mutaciones contra la API |
| Estado de cliente | `store/` (Zustand) | Sesión (`auth.store`), entrevista en curso (`interview.store`) |
| Integración API | `api/client.ts` | Cliente HTTP con manejo de cookies y refresh |

---

## 4. Inventario de módulos

### 4.1 Módulos del backend

| Módulo | Ruta | Responsabilidad |
|---|---|---|
| Auth | `backend/src/auth/` | Registro, login, refresh, logout, perfil y cambio de contraseña con JWT en cookies httpOnly |
| Catalogs | `backend/src/catalogs/` | Catálogos (roles, lenguajes, frameworks, niveles, skills) y CRUD administrativo de preguntas/auditoría |
| Interviews | `backend/src/interviews/` | Creación y gestión de entrevistas, respuestas, follow-ups, plantillas y selección/generación de preguntas |
| Evaluation | `backend/src/evaluation/` | Pipeline de evaluación de respuestas por IA mediante cola BullMQ, rúbricas técnicas y conductuales |
| Reports | `backend/src/reports/` | Dashboard del estudiante, reportes, percentiles, plan de estudio, analíticas admin y predicción de carrera |
| Notifications | `backend/src/notifications/` | Notificaciones en tiempo real vía SSE y correo electrónico |
| Knowledge | `backend/src/knowledge/` | Base de conocimiento: ingesta, *chunking*, embeddings y recuperación semántica (RAG) |
| Achievements | `backend/src/achievements/` | Logros desbloqueables del estudiante y su listener de eventos |
| Challenges | `backend/src/challenges/` | Desafíos con metas, participación y *leaderboard* |
| Llm | `backend/src/llm/` | Abstracción de proveedores LLM/embeddings (OpenAI, Gemini, Mock) con *circuit breaker* |
| Rag | `backend/src/rag/` | Generación de preguntas asistida por recuperación de contexto (RAG) |
| Health | `backend/src/health/` | Endpoint de comprobación de estado del servicio |
| Common | `backend/src/common/` | Servicios transversales: Prisma, Redis, auditoría, filtro de excepciones, caché, validación de entorno |

### 4.2 Módulos / dominios funcionales del frontend

| Dominio | Ruta | Responsabilidad |
|---|---|---|
| Home | `frontend/app/src/pages/home/` | Landing pública del sistema |
| Auth | `frontend/app/src/pages/auth/` | Pantallas de login y registro |
| Dashboard | `frontend/app/src/pages/dashboard/` | Resumen del estudiante, plan de estudio, logros e *insights* de carrera |
| Interview | `frontend/app/src/pages/interview/` | Wizard de configuración, sesión de entrevista y confirmación |
| Feedback | `frontend/app/src/pages/feedback/` | Retroalimentación, historial y reporte compartible |
| Recruiter | `frontend/app/src/pages/recruiter/` | Panel de candidatos, perfil de estudiante, comparador y plantillas |
| Admin | `frontend/app/src/pages/admin/` | Gestión de preguntas, analíticas y logs de auditoría |
| Knowledge | `frontend/app/src/pages/knowledge/` | Gestión de la base de conocimiento |
| Challenges | `frontend/app/src/pages/challenges/` | Desafíos del estudiante |
| Profile | `frontend/app/src/pages/profile/` | Configuración de cuenta del usuario |

---

## 5. Inventario de endpoints

> **Prefijo global**: todas las rutas se exponen bajo `/api` (`app.setGlobalPrefix('api')` en `main.ts`).
> **Guards**: `JwtCookieGuard` valida el JWT en la cookie `access_token`; `RolesGuard` verifica el rol;
> `AuthGuard('local')` valida credenciales en login.
> El rol indicado proviene del decorador `@Roles(...)`; "Autenticado" = solo `JwtCookieGuard` sin restricción de rol.

| Método | Ruta | Controlador | Middleware de auth | Descripción inferida |
|---|---|---|---|---|
| POST | `/api/auth/register` | `AuthController` | Público | Registrar un nuevo usuario (estudiante) |
| POST | `/api/auth/login` | `AuthController` | `AuthGuard('local')` | Iniciar sesión y emitir cookies JWT |
| POST | `/api/auth/refresh` | `AuthController` | Público (usa refresh cookie) | Renovar el token de acceso |
| POST | `/api/auth/logout` | `AuthController` | Público | Cerrar sesión y limpiar cookies |
| GET | `/api/auth/me` | `AuthController` | `JwtCookieGuard` | Obtener el perfil del usuario autenticado |
| PUT | `/api/auth/profile` | `AuthController` | `JwtCookieGuard` | Actualizar datos del perfil |
| POST | `/api/auth/change-password` | `AuthController` | `JwtCookieGuard` | Cambiar la contraseña |
| GET | `/api/health` | `HealthController` | Público | Comprobar el estado del servicio |
| GET | `/api/catalogs/languages` | `CatalogsController` | Público | Listar lenguajes disponibles |
| GET | `/api/catalogs/roles` | `CatalogsController` | Público | Listar roles de entrevista |
| GET | `/api/catalogs/roles/:roleId/languages` | `CatalogsController` | Público | Lenguajes asociados a un rol |
| GET | `/api/catalogs/languages/:id/frameworks` | `CatalogsController` | Público | Frameworks de un lenguaje |
| GET | `/api/catalogs/levels` | `CatalogsController` | Público | Listar niveles (Junior/Mid/Senior) |
| GET | `/api/catalogs/skills` | `CatalogsController` | Público | Listar skills |
| POST | `/api/catalogs/questions/generate` | `CatalogsController` | `JwtCookieGuard` + `RolesGuard` — admin | Generar preguntas con IA |
| GET | `/api/admin/questions` | `AdminQuestionsController` | `JwtCookieGuard` + `RolesGuard` — admin | Listar el banco de preguntas |
| GET | `/api/admin/questions/export` | `AdminQuestionsController` | admin | Exportar preguntas (JSON/CSV) |
| POST | `/api/admin/questions/import` | `AdminQuestionsController` | admin | Importar preguntas masivamente |
| POST | `/api/admin/questions` | `AdminQuestionsController` | admin | Crear una pregunta |
| PUT | `/api/admin/questions/:id` | `AdminQuestionsController` | admin | Actualizar una pregunta |
| DELETE | `/api/admin/questions/:id` | `AdminQuestionsController` | admin | Eliminar una pregunta |
| GET | `/api/admin/audit-logs` | `AdminAuditController` | admin | Consultar logs de auditoría |
| POST | `/api/interviews` | `InterviewsController` | `JwtCookieGuard` + `RolesGuard` — student | Crear una nueva entrevista |
| GET | `/api/interviews/:id` | `InterviewsController` | Autenticado | Obtener el detalle de una entrevista |
| POST | `/api/interviews/:id/finish` | `InterviewsController` | student | Finalizar una entrevista |
| POST | `/api/interviews/:interviewId/questions/:questionId/answer` | `AnswersController` | student | Enviar respuesta de texto/código |
| POST | `/api/interviews/:interviewId/questions/:questionId/audio` | `AnswersController` | student | Enviar respuesta en audio (transcripción) |
| POST | `/api/interviews/:interviewId/questions/:questionId/evaluate-now` | `AnswersController` | student | Forzar evaluación inmediata (modo práctica) |
| POST | `/api/interviews/:interviewId/questions/:questionId/followup` | `AnswersController` | student | Solicitar pregunta de seguimiento |
| GET | `/api/interviews/templates/questions` | `TemplatesController` | recruiter, admin | Listar preguntas disponibles para plantillas |
| GET | `/api/interviews/templates` | `TemplatesController` | Autenticado | Listar plantillas de entrevista |
| GET | `/api/interviews/templates/:id` | `TemplatesController` | Autenticado | Detalle de una plantilla |
| POST | `/api/interviews/templates` | `TemplatesController` | recruiter, admin | Crear una plantilla |
| DELETE | `/api/interviews/templates/:id` | `TemplatesController` | recruiter, admin | Eliminar una plantilla |
| POST | `/api/interviews/templates/:id/start` | `TemplatesController` | Autenticado | Iniciar una entrevista desde plantilla |
| GET | `/api/dashboard` | `ReportsController` | student | Datos del dashboard del estudiante |
| GET | `/api/percentiles` | `ReportsController` | student | Comparativa anónima por percentiles |
| GET | `/api/progress` | `ReportsController` | student | Evolución temporal del progreso |
| GET | `/api/interviews/:id/report` | `ReportsController` | student | Reporte detallado de una entrevista |
| GET | `/api/interviews/:id/report/export` | `ReportsController` | student | Exportar reporte (PDF/CSV) |
| POST | `/api/interviews/:id/mark-seen` | `ReportsController` | student | Marcar notificación de evaluación como vista |
| POST | `/api/interviews/:id/share` | `ReportsController` | student | Generar enlace temporal de reporte |
| GET | `/api/study-plan` | `ReportsController` | student | Plan de estudio personalizado |
| GET | `/api/study-plan/export/pdf` | `ReportsController` | student | Exportar el plan de estudio en PDF |
| GET | `/api/career/trajectory` | `ReportsController` | student | Trayectoria de carrera proyectada |
| GET | `/api/career/job-fit` | `ReportsController` | student | Ajuste a perfiles de puesto |
| GET | `/api/career/transfer` | `ReportsController` | student | Análisis de *transfer learning* de skills |
| GET | `/api/recruiter/students` | `ReportsController` | recruiter, admin | Ranking de candidatos |
| GET | `/api/recruiter/students/:studentId` | `ReportsController` | recruiter, admin | Perfil individual de un estudiante |
| GET | `/api/recruiter/students/:studentId/notes` | `ReportsController` | recruiter, admin | Listar notas privadas sobre un estudiante |
| POST | `/api/recruiter/students/:studentId/notes` | `ReportsController` | recruiter, admin | Crear nota privada sobre un estudiante |
| GET | `/api/recruiter/compare` | `ReportsController` | recruiter, admin | Comparar candidatos |
| GET | `/api/admin/analytics` | `ReportsController` | admin | Analíticas globales del sistema |
| GET | `/api/shared/:token` | `SharedReportController` | Público (token) | Acceder a un reporte compartido |
| POST | `/api/knowledge` | `KnowledgeController` | recruiter, admin | Ingerir un documento a la base de conocimiento |
| GET | `/api/knowledge` | `KnowledgeController` | recruiter, admin | Listar documentos de conocimiento |
| GET | `/api/knowledge/:id` | `KnowledgeController` | recruiter, admin | Detalle de un documento |
| DELETE | `/api/knowledge/:id` | `KnowledgeController` | recruiter, admin | Eliminar un documento |
| POST | `/api/knowledge/search` | `KnowledgeController` | recruiter, admin | Búsqueda semántica en la base de conocimiento |
| GET | `/api/achievements` | `AchievementsController` | student | Listar logros del estudiante |
| GET | `/api/challenges` | `ChallengesController` | student | Listar desafíos disponibles |
| POST | `/api/challenges/:id/join` | `ChallengesController` | student | Unirse a un desafío |
| GET | `/api/challenges/:id/leaderboard` | `ChallengesController` | student | *Leaderboard* de un desafío |
| GET | `/api/leaderboard` | `ChallengesController` | student | *Leaderboard* global |
| GET | `/api/notifications/pending` | `NotificationsController` | `JwtCookieGuard` | Notificaciones pendientes |
| POST | `/api/notifications/mark-all-seen` | `NotificationsController` | `JwtCookieGuard` | Marcar todas las notificaciones como vistas |
| SSE | `/api/notifications/stream` | `NotificationsController` | `JwtCookieGuard` | Flujo de notificaciones en tiempo real (Server-Sent Events) |

**Total: 67 endpoints HTTP/SSE.**

---

## 6. Modelo de datos

Fuente: `backend/prisma/schema.prisma` (23 entidades, 12 migraciones).

### 6.1 Entidades detectadas

| # | Entidad | Tabla | Descripción |
|---|---|---|---|
| 1 | `User` | `users` | Usuario del sistema; campo `role` (enum `student`/`recruiter`/`admin`) |
| 2 | `Role` | `roles` | Rol/puesto de entrevista (p. ej. "Frontend Developer") |
| 3 | `Language` | `languages` | Lenguaje de programación |
| 4 | `RoleLanguage` | `role_languages` | Tabla puente Role ↔ Language (clave compuesta) |
| 5 | `Framework` | `frameworks` | Framework asociado a un lenguaje |
| 6 | `Level` | `levels` | Nivel (Junior/Mid/Senior) |
| 7 | `Skill` | `skills` | Habilidad técnica evaluable |
| 8 | `Question` | `questions` | Pregunta del banco; incluye `embedding vector(1536)` |
| 9 | `Interview` | `interviews` | Entrevista de un usuario; `evaluationStatus`, `mode` |
| 10 | `InterviewQuestion` | `interview_questions` | Pregunta concreta dentro de una entrevista (snapshot) |
| 11 | `Answer` | `answers` | Respuesta a una `InterviewQuestion` (texto y/o audio) |
| 12 | `AnswerEvaluation` | `answer_evaluations` | Evaluación IA de una respuesta (5 métricas + nivel detectado) |
| 13 | `UserSkillScore` | `user_skill_scores` | Puntaje acumulado de un usuario por skill |
| 14 | `RecruiterNote` | `recruiter_notes` | Nota privada de un reclutador sobre un estudiante |
| 15 | `AuditLog` | `audit_logs` | Registro de auditoría de acciones |
| 16 | `KnowledgeDocument` | `knowledge_documents` | Documento de la base de conocimiento |
| 17 | `KnowledgeChunk` | `knowledge_chunks` | Fragmento de documento con `embedding vector(1536)` |
| 18 | `Achievement` | `achievements` | Definición de un logro |
| 19 | `UserAchievement` | `user_achievements` | Logro desbloqueado por un usuario |
| 20 | `InterviewTemplate` | `interview_templates` | Plantilla de entrevista reutilizable |
| 21 | `TemplateQuestion` | `template_questions` | Pregunta dentro de una plantilla |
| 22 | `Challenge` | `challenges` | Definición de un desafío con meta temporal |
| 23 | `ChallengeParticipation` | `challenge_participations` | Participación de un usuario en un desafío |

### 6.2 Relaciones principales

- **`User` 1—N `Interview`**: un usuario realiza muchas entrevistas.
- **`Interview` 1—N `InterviewQuestion` 1—N `Answer` 1—1 `AnswerEvaluation`**: cadena
  central del flujo de evaluación. Las eliminaciones se propagan en cascada
  (`onDelete: Cascade`) desde la entrevista hacia preguntas, respuestas y evaluaciones.
- **`Interview` N—1** con `Role`, `Language`, `Framework` y `Level` (configuración de la entrevista).
- **`Question` N—1** con `Language`, `Framework` (opcional), `Level` y `Skill`.
- **`Role` N—M `Language`** a través de `RoleLanguage`.
- **`User` N—M `Skill`** a través de `UserSkillScore` (único por `userId+skillId`).
- **`User` (recruiter) N—N `User` (student)** a través de `RecruiterNote`
  (relaciones nombradas `RecruiterNotes` / `StudentNotes`).
- **`User` N—M `Achievement`** vía `UserAchievement`; **`User` N—M `Challenge`** vía `ChallengeParticipation`.
- **`KnowledgeDocument` 1—N `KnowledgeChunk`** (cascada en borrado).
- **`InterviewTemplate` 1—N `TemplateQuestion` N—1 `Question`**.

> Búsqueda semántica: `Question.embedding` y `KnowledgeChunk.embedding` usan el tipo
> `Unsupported("vector(1536)")` de pgvector, con índice HNSW (migración `20260320200000_hnsw_index`).

---

## 7. Dependencias críticas (Top 10 de runtime)

| # | Dependencia | Versión | Componente | Propósito |
|---|---|---|---|---|
| 1 | `@nestjs/core` / `@nestjs/common` | `^11.0.1` | Backend | Núcleo del framework de aplicación |
| 2 | `@prisma/client` | `^6.19.2` | Backend | Cliente ORM; única vía de acceso a PostgreSQL |
| 3 | `bullmq` | `^5.71.0` | Backend | Colas de trabajo asíncrono (evaluación, ingesta) |
| 4 | `openai` | `^6.32.0` | Backend | SDK de OpenAI: evaluación IA, embeddings, transcripción |
| 5 | `passport-jwt` / `@nestjs/jwt` | `^4.0.1` / `^11.0.2` | Backend | Autenticación basada en JWT |
| 6 | `bcrypt` | `^6.0.0` | Backend | Hash de contraseñas |
| 7 | `class-validator` / `class-transformer` | `^0.14.4` / `^0.5.1` | Backend | Validación y transformación de DTOs y entorno |
| 8 | `react` / `react-dom` | `^19.2.0` | Frontend | Librería de UI del SPA |
| 9 | `@tanstack/react-query` | `^5.91.3` | Frontend | Gestión de estado de servidor y caché de datos |
| 10 | `antd` | `^6.3.2` | Frontend | Sistema de componentes UI |

> Dependencias críticas secundarias: `@google/generative-ai` (proveedor LLM
> alternativo), `pdfkit` (exportación de reportes), `nodemailer` (correo),
> `react-router-dom` (enrutamiento), `zustand` (estado del cliente), `recharts`
> (gráficos), `@monaco-editor/react` (editor de código), `helmet` (cabeceras de seguridad).

---

## 8. Variables de entorno requeridas

Fuente: `backend/.env.example`, `backend/src/common/env.validation.ts`, `frontend/app/.env.example`, `docker-compose.yml`.

### 8.1 Backend

| Variable | Obligatoria | Propósito |
|---|---|---|
| `NODE_ENV` | Validada (default `development`) | Entorno de ejecución |
| `DATABASE_URL` | **Sí** | Cadena de conexión a PostgreSQL |
| `REDIS_URL` | **Sí** | Conexión a Redis (BullMQ) |
| `JWT_PRIVATE_KEY` | **Sí** | Clave privada RS256 para firmar JWT |
| `JWT_PUBLIC_KEY` | **Sí** | Clave pública RS256 para verificar JWT |
| `JWT_ACCESS_EXPIRATION` | Opcional (`15m`) | Vigencia del token de acceso |
| `JWT_REFRESH_EXPIRATION` | Opcional (`7d`) | Vigencia del token de refresco |
| `OPENAI_API_KEY` | Opcional | Clave de OpenAI (requerida si no se usa sandbox) |
| `LLM_SANDBOX` | Opcional | Activa proveedores *mock* sin llamadas externas |
| `LLM_EMBEDDING_PROVIDER` | Opcional (`openai`) | Proveedor de embeddings |
| `LLM_TEXT_PROVIDER` | Opcional (`openai`) | Proveedor de generación de texto |
| `GOOGLE_AI_API_KEY` | Opcional | Clave de Google Generative AI (Gemini) |
| `EMBEDDING_DIMENSIONS` | Opcional (`1536`) | Dimensión de los vectores de embeddings |
| `AWS_S3_BUCKET` | Opcional | Bucket de almacenamiento de audio |
| `AWS_S3_ENDPOINT` | Opcional | Endpoint S3/MinIO |
| `AWS_S3_ACCESS_KEY` | Opcional | Credencial de acceso S3 |
| `AWS_S3_SECRET_KEY` | Opcional | Credencial secreta S3 |
| `AWS_REGION` | Opcional | Región S3 |
| `PORT` | Opcional (`3000`) | Puerto de escucha del backend |
| `FRONTEND_URL` | Opcional | Origen permitido para CORS |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | Opcional | Configuración de correo saliente |

> Observación: `AWS_S3_ACCESS_KEY` y `AWS_S3_SECRET_KEY` aparecen en `.env.example`
> y `docker-compose.yml` pero **no** están declaradas en `env.validation.ts`, por lo
> que no se validan al arrancar.

### 8.2 Frontend

| Variable | Obligatoria | Propósito |
|---|---|---|
| `VITE_API_URL` | **Sí** | URL base de la API que consume el SPA |

---

## 9. Scripts de build, test y deploy

### 9.1 Backend (`backend/package.json`)

| Script | Comando | Propósito |
|---|---|---|
| `build` | `nest build` | Compilar a `dist/` |
| `start` / `start:dev` / `start:prod` | `nest start` / `--watch` / `node dist/main` | Ejecución |
| `test` | `jest` | Pruebas unitarias |
| `test:watch` / `test:cov` | `jest --watch` / `--coverage` | Pruebas en modo observación / con cobertura |
| `test:e2e` | `jest --config ./test/jest-e2e.json` | Pruebas end-to-end |
| `lint` | `eslint ... --fix` | Análisis estático |
| `format` | `prettier --write` | Formateo |
| `prisma.seed` | `ts-node prisma/seed.ts` | Carga de datos semilla |

### 9.2 Frontend (`frontend/app/package.json`)

| Script | Comando | Propósito |
|---|---|---|
| `dev` | `vite` | Servidor de desarrollo |
| `build` | `tsc -b && vite build` | Compilación de tipos + bundle de producción |
| `preview` | `vite preview` | Previsualizar el build |
| `test:unit` | `vitest` | Pruebas unitarias |
| `test:e2e` | `playwright test` | Pruebas end-to-end |
| `lint` / `format` | `eslint .` / `prettier --check .` | Calidad de código |
| `check` | `lint && format && test:unit && test:e2e --list` | Verificación combinada |
| `generate:api` | `openapi-typescript ...` | Generar tipos desde el contrato OpenAPI |
| `storybook` / `storybook:build` | `storybook ...` | Catálogo de componentes |

### 9.3 Deploy / infraestructura

- **`docker-compose.yml`**: orquesta 5 servicios — `postgres`, `redis`, `minio`,
  `backend`, `frontend` — con *healthchecks* y volúmenes persistentes.
- **`backend/Dockerfile`** y **`frontend/app/Dockerfile`**: imágenes de cada componente.
- **CI** (`.github/workflows/ci.yml`): dos *jobs* en GitHub Actions —
  *Backend Tests* (`tsc --noEmit` + `jest` con servicios Postgres/Redis) y
  *Frontend Tests* (`tsc --noEmit` + `vitest run`).
- **No se detectó pipeline de despliegue automatizado (CD)**: el CI solo ejecuta
  verificación de tipos y pruebas; no publica imágenes ni despliega.

---

## 10. Observaciones del revisor

### 10.1 Zonas de mayor complejidad aparente

Estimación basada en tamaño de archivo, ramificación y densidad de lógica
(no se ejecutó una herramienta formal de complejidad ciclomática):

| Archivo | Líneas | Indicio de complejidad |
|---|---|---|
| `backend/src/reports/reports.service.ts` | 859 | Servicio más extenso del backend; concentra dashboard, percentiles, plan de estudio, analíticas y reportes — fuerte candidato a *God Service* |
| `backend/src/challenges/challenges.service.ts` | 363 | Lógica de progreso, *leaderboard* y participación |
| `backend/src/reports/career-prediction.service.ts` | 249 | Cálculos de proyección de carrera |
| `backend/src/evaluation/processors/evaluation.processor.ts` | 177 | Procesador de cola con reintentos, EMA y emisión de eventos |
| `frontend/app/src/pages/dashboard/DashboardPage.tsx` | 771 | Página más extensa del frontend |
| `frontend/app/src/pages/interview/InterviewWizardPage.tsx` | 723 | Wizard multi-paso con estado complejo |
| `frontend/app/src/pages/interview/InterviewSessionPage.tsx` | 690 | Sesión con temporizador, audio, código y follow-ups |
| `frontend/app/src/pages/admin/AdminQuestionsPage.tsx` | 639 | CRUD con import/export |

### 10.2 Módulos sin pruebas visibles

Existen **6 archivos `.spec.ts` en el backend** y **9 archivos de prueba en el
frontend** (unitarias) más **3 *specs* E2E de Playwright**. Cobertura por módulo:

| Módulo / área | ¿Tiene pruebas? | Detalle |
|---|---|---|
| `auth` | Sí | `auth.service.spec.ts` |
| `evaluation` | Sí | `evaluation.processor.spec.ts`, `mock-evaluator.service.spec.ts` |
| `interviews` | Parcial | `interviews.service.spec.ts`, `answers.service.spec.ts` (no hay para `templates`, `followup`, `embedding`, `question-*`) |
| `reports` | Parcial | `reports.service.spec.ts` (no cubre `career-prediction`, `transfer-learning`) |
| `catalogs` | **No** | Sin `.spec.ts` (incluye CRUD admin de preguntas e importación masiva) |
| `knowledge` | **No** | Sin pruebas (ingesta, *chunking*, recuperación RAG) |
| `achievements` | **No** | Sin pruebas |
| `challenges` | **No** | Sin pruebas (es el 2.º servicio más grande) |
| `notifications` | **No** | Sin pruebas (SSE + email) |
| `llm` / `rag` | **No** | Sin pruebas de los proveedores ni del *circuit breaker* |
| Controladores (todos) | **No** | No hay pruebas a nivel de controlador; solo de servicios |
| Frontend `pages/**` | Parcial | Solo `LoginPage` y `RegisterPage` tienen test; el resto de páginas no |

> El backend e2e se limita a `test/app.e2e-spec.ts` (un único archivo).

### 10.3 Riesgos de QA detectados

- **Posible código no registrado / muerto**: `backend/src/rag/rag.module.ts` define
  un `RagModule`, pero `app.module.ts` **no lo importa** explícitamente. Debe
  verificarse si se carga de forma transitiva o si es código sin uso efectivo.
- **Acoplamiento en `ReportsService`** (859 líneas): concentra responsabilidades de
  varios dominios (dashboard, percentiles, plan de estudio, analíticas admin,
  recruiter). Alto riesgo de regresión: un cambio puede afectar a múltiples
  endpoints. El controlador asociado (`reports.controller.ts`) agrupa rutas de
  estudiante, reclutador y admin en una sola clase.
- **Rutas montadas en la raíz**: `ReportsController` y `SharedReportController` usan
  `@Controller()` sin prefijo, mezclando rutas de varios dominios bajo `/api`
  directamente (`/api/dashboard`, `/api/career/*`, `/api/recruiter/*`,
  `/api/admin/analytics`). Dificulta el versionado y el razonamiento sobre la API.
- **Variables S3 sin validar**: `AWS_S3_ACCESS_KEY` / `AWS_S3_SECRET_KEY` no están
  en `env.validation.ts`; un despliegue mal configurado fallaría en tiempo de
  ejecución (al subir audio) en lugar de al arrancar.
- **Dependencia de servicios externos**: el pipeline de evaluación depende de
  OpenAI/Gemini. Existe modo `LLM_SANDBOX` con *mocks*, pero las pruebas deben
  cubrir explícitamente los fallos del proveedor real y el comportamiento del
  *circuit breaker* (`llm/services/circuit-breaker.ts`), hoy sin pruebas.
- **Procesamiento asíncrono**: la evaluación corre en cola BullMQ con reintentos.
  El estado `evaluationStatus` (`pending`/`processing`/`completed`/`failed`) y la
  consistencia tras un fallo son áreas de riesgo que requieren pruebas de
  integración específicas.
- **Discrepancia documentación vs. código**: el `README.md` declara "84 tests"
  y un desglose por módulo que **no coincide** con los archivos `.spec.ts`
  realmente presentes en el repositorio (6 en backend). La documentación de
  cobertura debe tratarse como no confiable.
- **TODOs / FIXMEs**: no se encontraron marcadores `TODO`, `FIXME` ni `HACK` en el
  código fuente de backend ni frontend (búsqueda directa sin coincidencias).
- **Autorización a verificar**: el endpoint `GET /api/interviews/:id` y varias rutas
  de plantillas (`GET /api/interviews/templates/:id`, `POST .../:id/start`) solo
  aplican `JwtCookieGuard` sin `@Roles`, quedando accesibles a cualquier usuario
  autenticado. Debe confirmarse que la verificación de propiedad del recurso
  (que la entrevista pertenezca al usuario) se hace dentro del servicio.

---

### Notas de elaboración

- Toda la información proviene de la lectura directa de los archivos del repositorio
  (`schema.prisma`, `package.json`, controladores, `main.ts`, `app.module.ts`,
  `docker-compose.yml`, `ci.yml`, `.env.example`).
- Los valores marcados como **"No determinado"** o sujetos a verificación se han
  señalado explícitamente en la sección 10.
- La complejidad ciclomática se reporta como *aparente* (estimada por tamaño y
  ramificación); para un valor exacto se recomienda ejecutar una herramienta
  dedicada (p. ej. `eslint` con `complexity`, o `ts-complexity`).
