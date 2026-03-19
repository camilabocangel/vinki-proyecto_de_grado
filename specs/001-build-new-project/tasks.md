---
description: "Task list for Vinki — Plataforma de Simulación de Entrevistas Técnicas"
---

# Tasks: Vinki — Plataforma de Simulación de Entrevistas Técnicas

**Input**: Design documents from `/specs/001-build-new-project/`
**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/ ✅ quickstart.md ✅

**Organization**: Tareas agrupadas por user story para entrega incremental e independiente.
**Tests**: No se incluyen tareas de test separadas salvo E2E Playwright por US (requerido por constitución Principio III).

## Format: `- [ ] [ID] [P?] [Story?] Description`

- **[P]**: Paralelizable (archivos distintos, sin dependencias de tareas incompletas)
- **[US1–US4]**: User story a la que pertenece la tarea
- Todas las tareas incluyen path exacto de archivo

---

## Phase 1: Setup (Infraestructura Compartida)

**Purpose**: Inicialización del proyecto, Docker Compose, Prisma schema, seeds y configuración base de calidad.

- [ ] T001 Crear `docker-compose.yml` en la raíz con servicios: `postgres` (pgvector/pgvector:pg15), `redis:7-alpine`, `minio/minio` — puertos 5432, 6379, 9000
- [ ] T002 Inicializar proyecto NestJS en `backend/` con TypeScript strict, ESLint, Prettier, Jest y estructura de módulos según plan.md (`auth`, `users`, `catalogs`, `interviews`, `evaluation`, `reports`, `notifications`, `common`)
- [ ] T003 [P] Crear `backend/.env.example` con todas las variables requeridas: `DATABASE_URL`, `REDIS_URL`, `JWT_PRIVATE_KEY`, `JWT_PUBLIC_KEY`, `OPENAI_API_KEY`, `LLM_SANDBOX`, `AWS_S3_BUCKET`, `AWS_REGION`, `NODE_ENV`
- [ ] T004 [P] Inicializar Prisma en `backend/prisma/schema.prisma` con provider `postgresql` y las 11 entidades del data-model.md: `User`, `Language`, `Framework`, `Level`, `Skill`, `Question` (con `embedding Unsupported("vector(1536)")`), `Interview` (con `evaluationStatus` y `evaluationNotificationSeen`), `InterviewQuestion`, `Answer`, `AnswerEvaluation`, `UserSkillScore`, `RecruiterNote`
- [ ] T005 Crear primera migración Prisma: `npx prisma migrate dev --name init` — debe generar `backend/prisma/migrations/` y ejecutar la extensión `CREATE EXTENSION IF NOT EXISTS vector`
- [ ] T006 Crear `backend/prisma/seed.ts` con seeds de `docs/db.sql`: roles de entrevista (Backend Engineer, Fullstack Engineer), lenguajes (JavaScript, Python), frameworks (Node.js, React, Django), niveles (Junior, Mid, Senior), skills (mínimo 5: async-patterns, error-handling, oop-design, rest-api-design, data-structures) y 10 preguntas mínimas con embeddings dummy `[0.0, ...]×1536`
- [ ] T007 [P] Crear índice HNSW en `backend/prisma/migrations/` (migración adicional): `CREATE INDEX CONCURRENTLY idx_questions_embedding_hnsw ON questions USING hnsw (embedding vector_cosine_ops) WITH (m=8, ef_construction=128)`
- [ ] T008 [P] Configurar `@nestjs/config` en `backend/src/app.module.ts` con validación de variables de entorno usando `class-validator` y `class-transformer`
- [ ] T009 [P] Configurar `@nestjs/throttler` en `backend/src/app.module.ts`: 100 req/min por IP en rutas públicas; 300 req/min para rutas autenticadas
- [ ] T010 [P] Configurar Pino logger en `backend/src/main.ts` con formato JSON estructurado y nivel `info` en producción, `debug` en desarrollo
- [ ] T011 Verificar setup del monorepo frontend: confirmar que `frontend/app/` tiene `vite.config.ts`, `tsconfig.app.json` con `strict: true`, `.env.example` con `VITE_API_URL`, scripts `test:unit`, `test:e2e` y `check` en `package.json`
- [ ] T012 [P] Crear script `frontend/app/package.json#generate:api` que ejecute `openapi-typescript contracts/openapi.yml -o src/api/generated.ts` — el archivo `specs/001-build-new-project/contracts/openapi.yml` es la fuente

---

## Phase 2: Foundational (Prerrequisitos Bloqueantes)

**Purpose**: Auth completo y guards de roles — DEBE completarse antes de cualquier user story.

**Independent test**: `POST /auth/register`, `POST /auth/login`, `POST /auth/logout` y `GET /auth/me` funcionan; guards rechazan con 401/403 según rol.

- [ ] T013 Crear `backend/src/auth/auth.module.ts` con `PassportModule`, `JwtModule` (RS256, clave privada de env), y registro de estrategias `JwtCookieStrategy` y `LocalStrategy`
- [ ] T014 Crear `backend/src/auth/strategies/jwt-cookie.strategy.ts`: extrae JWT de `req.cookies.access_token`, verifica con clave pública RS256, retorna `{ userId, email, role }`
- [ ] T015 Crear `backend/src/auth/strategies/local.strategy.ts`: valida email + contraseña `bcrypt.compare`, lanza `UnauthorizedException` si inválido
- [ ] T016 Crear `backend/src/auth/guards/jwt-cookie.guard.ts` (`AuthGuard('jwt-cookie')`) y `backend/src/auth/guards/roles.guard.ts` con decorador `@Roles(...roles)` usando `Reflector`
- [ ] T017 Crear `backend/src/users/entities/user.entity.ts` con Prisma (sin clases de entidad separadas — usar tipos generados por Prisma Client)
- [ ] T018 Crear `backend/src/auth/auth.service.ts`: métodos `register(dto)` — hashing bcrypt, crear user con role=student; `login(user)` — emitir access token (15min RS256) + refresh token (7d, guardado en Redis con TTL); `logout(userId, jti)` — clear cookies + añadir jti a Redis blocklist; `refresh(refreshToken)` — rotar refresh token
- [ ] T019 Crear `backend/src/auth/auth.controller.ts` con endpoints: `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me` — tokens enviados en cookies `httpOnly` (`sameSite: lax`, `secure` en prod)
- [ ] T020 [P] Crear DTOs con `class-validator` en `backend/src/auth/dto/`: `RegisterDto` (name, email, password min 8), `LoginDto`
- [ ] T021 [P] Generar cliente OpenAPI en `frontend/app/src/api/generated.ts` ejecutando `npm run generate:api` (requiere T012 + T019 con Swagger habilitado)
- [ ] T022 [P] Crear `backend/src/common/prisma.service.ts` inyectable (extiende `PrismaClient`, implementa `onModuleInit` y `enableShutdownHooks`)

---

## Phase 3: User Story 1 — Simulación de Entrevista (P1)

**Story goal**: El estudiante puede registrarse, configurar una sesión, responder 5 preguntas (texto o audio) y cerrarla disparando la evaluación IA en batch.

**Independent test**: Registro → login → `POST /interviews` → responder 5 preguntas → `POST /interviews/:id/finish` → status 200 con `evaluationStatus: processing`. Playwright E2E cubre el flujo completo.

### Backend — Catálogos

- [ ] T023 [P] [US1] Crear `backend/src/catalogs/catalogs.module.ts` con `CatalogsController` y `CatalogsService`
- [ ] T024 [P] [US1] Crear `backend/src/catalogs/catalogs.controller.ts` con endpoints: `GET /catalogs/languages`, `GET /catalogs/languages/:id/frameworks`, `GET /catalogs/levels`, `GET /catalogs/roles` — todos públicos (sin auth)
- [ ] T025 [P] [US1] Crear `backend/src/catalogs/catalogs.service.ts` con métodos que usan `PrismaService` para devolver lenguajes, frameworks por lenguaje, niveles y roles

### Backend — Motor de Entrevistas

- [ ] T026 [US1] Crear `backend/src/interviews/interviews.module.ts` importando `BullModule.registerQueue({ name: 'evaluation' })` y dependencias
- [ ] T027 [US1] Crear `backend/src/interviews/services/question-selector.service.ts`: método `selectQuestions(embedding, filters)` que ejecuta `$queryRaw` con coseno `<=>` (ver research.md R1.3), recupera 25 candidatos y aplica two-phase skill-bucketing (R1.4) para devolver 5 `interviewQuestionIds`
- [ ] T028 [US1] Crear `backend/src/interviews/services/embedding.service.ts`: método `embed(text)` que llama `openai.embeddings.create({ model: 'text-embedding-3-small', input: text })` y devuelve `number[1536]`; en modo `LLM_SANDBOX=true` devuelve vector de ceros
- [ ] T029 [US1] Crear `backend/src/interviews/interviews.service.ts` con métodos: `create(userId, dto)` — verifica no hay entrevista activa del user, genera embedding de la combinación lang+framework+level, selecciona 5 preguntas, crea `Interview` + 5 `InterviewQuestion` en transacción Prisma; `findOne(id, userId)` — retorna entrevista con preguntas y respuestas; `finish(id, userId)` — setea `finishedAt`, `evaluationStatus=processing`, encola job BullMQ
- [ ] T030 [US1] Crear `backend/src/interviews/interviews.controller.ts` con endpoints: `POST /interviews`, `GET /interviews/:id`, `POST /interviews/:id/finish` — todos protegidos con `JwtCookieGuard` + `@Roles('student')`
- [ ] T031 [P] [US1] Crear DTOs en `backend/src/interviews/dto/`: `CreateInterviewDto` (roleId, languageId?, frameworkId?, chosenLevelId)

### Backend — Respuestas

- [ ] T032 [US1] Crear `backend/src/interviews/answers/answers.service.ts`: método `submit(interviewId, questionId, userId, dto)` — verifica entrevista activa del user, verifica question pertenece a la entrevista, upsert en `Answer` (permite editar respuesta si aún no finalizada)
- [ ] T033 [US1] Crear endpoint `POST /interviews/:interviewId/questions/:questionId/answer` en `backend/src/interviews/answers/answers.controller.ts` — `JwtCookieGuard` + `@Roles('student')`

### Backend — Pipeline IA (BullMQ)

- [ ] T034 [US1] Crear `backend/src/evaluation/evaluation.module.ts` con `BullModule.registerQueue({ name: 'evaluation' })`, `BullModule.registerFlowProducer`, workers y factory del evaluador (ver research.md R3.2)
- [ ] T035 [US1] Crear `backend/src/evaluation/rubrics.ts` con constante `EVALUATION_RUBRICS` que define criterios 0/1-2/3-4/5 para las 5 métricas (ver research.md R5.1 — texto completo de cada rúbrica)
- [ ] T036 [US1] Crear `backend/src/evaluation/interfaces/evaluator.interface.ts` con interfaz `IEvaluatorService` y método `evaluate(answers: AnswerInput[]): Promise<EvaluationOutput[]>`
- [ ] T037 [US1] Crear `backend/src/evaluation/services/openai-evaluator.service.ts` que implementa `IEvaluatorService`: construye prompt con rúbricas de `rubrics.ts`, llama `openai.chat.completions.create`, parsea JSON de respuesta con las 5 métricas y `feedbackText`
- [ ] T038 [US1] Crear `backend/src/evaluation/services/mock-evaluator.service.ts` que implementa `IEvaluatorService`: devuelve puntuaciones `Math.random() * 2 + 3` (3.0–5.0) y feedback genérico por métrica
- [ ] T039 [US1] Crear `backend/src/evaluation/processors/evaluation.processor.ts` (BullMQ Worker): recibe `{ interviewId }`, carga todas las respuestas escritas de la entrevista, llama `IEvaluatorService.evaluate()`, persiste `AnswerEvaluation` por cada respuesta, actualiza `UserSkillScore` (promedio exponencial α=0.3), emite evento `EventEmitter2` `evaluation.completed` o `evaluation.failed`, actualiza `interview.evaluationStatus`
- [ ] T040 [US1] Configurar DLQ en `backend/src/evaluation/processors/evaluation.processor.ts`: listener `on('failed')` — si `job.attemptsMade >= attempts` mover a cola `evaluation-dlq` y marcar `interview.evaluationStatus = 'failed'`

### Frontend — Auth

- [ ] T041 [P] [US1] Crear `frontend/app/src/store/auth.store.ts` con Zustand: estado `{ user, isAuthenticated }`, acciones `login`, `logout`, `setUser`
- [ ] T042 [P] [US1] Crear `frontend/app/src/hooks/useAuth.ts` que usa `authStore` + TanStack Query para `GET /auth/me` en mount (restaurar sesión)
- [ ] T043 [US1] Crear `frontend/app/src/pages/auth/RegisterPage.tsx`: formulario con validación (name, email, password), llama `POST /auth/register` via cliente generado, redirige al dashboard en éxito
- [ ] T044 [US1] Crear `frontend/app/src/pages/auth/LoginPage.tsx`: formulario con validación, llama `POST /auth/login`, redirige al dashboard
- [ ] T045 [P] [US1] Crear `frontend/app/src/components/ProtectedRoute.tsx` que verifica `isAuthenticated` y tiene guard de rol; redirige a `/login` si no autenticado

### Frontend — Wizard de Entrevista

- [ ] T046 [US1] Crear `frontend/app/src/pages/interview/InterviewWizardPage.tsx`: wizard 4 pasos (rol → lenguaje → framework → nivel) usando datos de `GET /catalogs/*`, llama `POST /interviews` al confirmar, redirige a `/interview/:id`
- [ ] T047 [US1] Crear `frontend/app/src/pages/interview/InterviewSessionPage.tsx`: muestra pregunta actual, contador de progreso (N/5), área de texto enriquecida, grabadora de audio (Web Audio API), botón "Enviar respuesta" llama `POST /interviews/:id/questions/:qId/answer`, botón "Finalizar" con confirmación llama `POST /interviews/:id/finish`
- [ ] T048 [P] [US1] Crear `frontend/app/src/store/interview.store.ts` con Zustand: estado `{ currentInterview, currentQuestionIndex, answers }`, acciones para navegar entre preguntas
- [ ] T049 [P] [US1] Crear `frontend/app/src/components/AudioRecorder.tsx`: graba audio con `MediaRecorder`, sube a `POST /audio-upload` (presigned URL S3 o endpoint proxy), devuelve `audioUrl`; fallback graceful si `getUserMedia` falla — muestra solo campo de texto
- [ ] T050 [US1] Crear `frontend/app/src/pages/interview/InterviewConfirmationPage.tsx`: pantalla mostrada tras `POST /interviews/:id/finish` con mensaje "Evaluación en proceso" y botón para ir al dashboard

### Frontend — E2E US1

- [ ] T051 [US1] Crear `frontend/app/tests/e2e/interview-flow.spec.ts` con Playwright: flujo completo register → login → wizard (seleccionar Python/Django/Mid) → responder 5 preguntas en texto → finalizar → ver pantalla de confirmación con `evaluationStatus: processing`

---

## Phase 4: User Story 2 — Feedback y Dashboard del Estudiante (P2)

**Story goal**: El estudiante recibe notificación SSE al completarse la evaluación, ve el reporte con 5 métricas + feedback por respuesta, consulta su historial y puede exportar.

**Independent test**: Con evaluaciones ya en DB, el estudiante abre `/feedback/:id` y ve las 5 puntuaciones y feedback. Dashboard muestra puntaje promedio. Playwright E2E cubre notificación SSE → reporte → exportación.

### Backend — Notificaciones SSE

- [ ] T052 [US2] Crear `backend/src/notifications/notifications.module.ts` con `EventEmitter2Module.forRoot()` y `NotificationsController`
- [ ] T053 [US2] Crear `backend/src/notifications/notifications.controller.ts` con endpoint `GET /notifications/stream` usando `@Sse()`: Observable suscrito a `EventEmitter2` filtrando por `userId`, con `takeUntil(fromEvent(req, 'close'))` — protegido con `JwtCookieGuard`

### Backend — Reportes y Dashboard

- [ ] T054 [US2] Crear `backend/src/reports/reports.module.ts` con `ReportsService` y `ReportsController`
- [ ] T055 [US2] Crear `backend/src/reports/reports.service.ts` con métodos: `getDashboard(userId)` — últimas 5 entrevistas, puntaje promedio global (media de `technicalCorrectness`), `pendingNotifications` count, `skillScores`; `getInterviewReport(id, userId)` — entrevista + preguntas + respuestas + evaluaciones
- [ ] T056 [P] [US2] Crear `backend/src/reports/reports.service.ts#exportPdf(id, userId)` — genera PDF con `puppeteer-core` (plantilla HTML con tokens Vinki); `exportCsv(id, userId)` — genera CSV con `fast-csv`; ambos devuelven `Readable` stream
- [ ] T057 [US2] Crear `backend/src/reports/reports.controller.ts` con endpoints: `GET /dashboard`, `GET /interviews/:id/report`, `GET /interviews/:id/report/export?format=pdf|csv`, `POST /interviews/:id/mark-seen` — todos `JwtCookieGuard` + `@Roles('student')`

### Frontend — SSE Hook y Notificaciones

- [ ] T058 [US2] Crear `frontend/app/src/hooks/useSSE.ts`: conecta `EventSource('/api/notifications/stream', { withCredentials: true })`, escucha `evaluation.completed` y `evaluation.failed`, invalida TanStack Query `['dashboard']` en éxito, expone `close()` para cleanup
- [ ] T059 [P] [US2] Crear `frontend/app/src/components/EvaluationToast.tsx`: toast con enlace directo a `/feedback/:interviewId` para el evento `evaluation.completed`; toast de error para `evaluation.failed`

### Frontend — Dashboard

- [ ] T060 [US2] Crear `frontend/app/src/pages/dashboard/DashboardPage.tsx`: tarjeta de puntaje promedio, lista de últimas entrevistas con estado + puntaje, badge de notificaciones pendientes, CTA "Iniciar simulación", skeleton loader mientras carga; usa `GET /dashboard` via TanStack Query
- [ ] T061 [P] [US2] Crear `frontend/app/src/components/SkillRadarChart.tsx` con Recharts/Chart.js: gráfico radial de las 5 métricas de evaluación; recibe `skillScores[]` como props
- [ ] T062 [P] [US2] Crear `frontend/app/src/components/InterviewHistoryTable.tsx`: tabla paginada de entrevistas con columnas fecha, nivel, lenguaje, puntaje promedio, estado — reutilizable en dashboard y feedback

### Frontend — Feedback y Reporte

- [ ] T063 [US2] Crear `frontend/app/src/pages/feedback/FeedbackPage.tsx`: carga `GET /interviews/:id/report`, muestra por cada pregunta: snapshot de texto, respuesta del estudiante, 5 puntuaciones numeradas con `SkillRadarChart`, texto de feedback del LLM; botón "Exportar PDF" y "Exportar CSV" llaman `GET /interviews/:id/report/export?format=`
- [ ] T064 [P] [US2] Crear `frontend/app/src/pages/feedback/FeedbackHistoryPage.tsx`: lista de todas las entrevistas del estudiante con comparación de puntaje por métrica entre sesiones usando `InterviewHistoryTable`

### Frontend — E2E US2

- [ ] T065 [US2] Crear `frontend/app/tests/e2e/feedback-flow.spec.ts` con Playwright: dado mock de evaluación completada en DB, el estudiante abre la notificación SSE (simulada via `page.route`), navega al reporte, verifica las 5 métricas y el feedback visible, descarga CSV

---

## Phase 5: User Story 3 — Panel de Reclutador (P3)

**Story goal**: Un usuario con role=recruiter ve tabla paginada de todos los estudiantes, filtra, accede a perfiles, agrega notas y descarga reportes.

**Independent test**: Con usuarios seeded en DB, el recruiter accede a `GET /recruiter/students`, filtra por nivel y ve `averageScore`. Playwright E2E cubre filtros + descarga.

### Backend — Panel de Reclutador

- [ ] T066 [US3] Crear `backend/src/recruiter/recruiter.module.ts` con `RecruiterService` y `RecruiterController`
- [ ] T067 [US3] Crear `backend/src/recruiter/recruiter.service.ts` con métodos: `listStudents(filters, page, limit)` — Prisma query sobre `User` (role=student) join `UserSkillScore`, retorna paginado; `getStudentProfile(studentId)` — perfil + últimas entrevistas + skill scores; `addNote(recruiterId, studentId, interviewId?, content)` — crea `RecruiterNote`; `exportStudents(studentIds, format)` — genera PDF/CSV de múltiples estudiantes
- [ ] T068 [US3] Crear `backend/src/recruiter/recruiter.controller.ts` con endpoints: `GET /recruiter/students`, `GET /recruiter/students/:studentId`, `POST /recruiter/students/:studentId/notes`, `GET /recruiter/students/export` — todos `JwtCookieGuard` + `@Roles('recruiter')`

### Frontend — Panel de Reclutador

- [ ] T069 [US3] Crear `frontend/app/src/pages/recruiter/RecruiterDashboardPage.tsx`: tabla paginada con filtros (nivel, lenguaje, puntaje mínimo) usando `GET /recruiter/students`, columnas: nombre, email, total entrevistas, puntaje promedio, última entrevista; botón de descarga bulk
- [ ] T070 [P] [US3] Crear `frontend/app/src/pages/recruiter/StudentProfilePage.tsx`: perfil del estudiante con `InterviewHistoryTable`, `SkillRadarChart`, sección de notas del reclutador con formulario inline para agregar nota
- [ ] T071 [P] [US3] Crear `frontend/app/src/components/RecruiterNoteForm.tsx`: formulario inline con campo de texto y selector opcional de entrevista; llama `POST /recruiter/students/:id/notes`

### Frontend — E2E US3

- [ ] T072 [US3] Crear `frontend/app/tests/e2e/recruiter-panel.spec.ts` con Playwright: login como recruiter → ver tabla de estudiantes → aplicar filtro por nivel → abrir perfil de estudiante → agregar nota → descargar CSV

---

## Phase 6: User Story 4 — Catálogo de Preguntas Admin (P4)

**Story goal**: Un admin puede crear, editar, eliminar e importar preguntas del banco con embeddings generados automáticamente.

**Independent test**: Admin crea pregunta via `POST /admin/questions` con texto, sin embedding previo; el sistema genera el embedding y la pregunta aparece en `GET /admin/questions` con los filtros correctos.

### Backend — Admin Catálogo

- [ ] T073 [US4] Crear `backend/src/catalogs/admin/admin-questions.service.ts` con métodos: `create(dto)` — genera embedding via `EmbeddingService`, crea `Question`; `update(id, dto)` — regenera embedding si cambia el texto; `delete(id)`; `list(filters, page, limit)` con búsqueda por texto (`questionText ILIKE %q%`) y filtros; `importBatch(file)` — parsea CSV/JSON, valida cada fila, crea en batch, retorna `{ created, errors[] }`
- [ ] T074 [US4] Crear `backend/src/catalogs/admin/admin-questions.controller.ts` con endpoints: `GET /admin/questions`, `POST /admin/questions`, `PUT /admin/questions/:id`, `DELETE /admin/questions/:id`, `POST /admin/questions/import` — todos `JwtCookieGuard` + `@Roles('admin')`

### Frontend — Panel Admin

- [ ] T075 [US4] Crear `frontend/app/src/pages/admin/AdminQuestionsPage.tsx`: tabla con filtros (lenguaje, nivel, skill, búsqueda texto libre), botones crear/editar/eliminar y botón de importación; usa `GET /admin/questions` paginado
- [ ] T076 [P] [US4] Crear `frontend/app/src/components/QuestionFormModal.tsx`: modal de Ant Design con campos: texto, tipo, lenguaje, framework (dependiente de lenguaje), nivel, skill; llama `POST /admin/questions` o `PUT /admin/questions/:id`
- [ ] T077 [P] [US4] Crear `frontend/app/src/components/QuestionImportModal.tsx`: uploader de Ant Design para CSV/JSON, muestra resultado de importación `{ created, errors[] }`

### Frontend — E2E US4

- [ ] T078 [US4] Crear `frontend/app/tests/e2e/admin-questions.spec.ts` con Playwright: login como admin → crear pregunta (Python/Django/Mid/oop-design) → verificar aparece en tabla → importar CSV con 3 preguntas → verificar 2 creadas y 1 con error reportado

---

## Phase 7: Polish y Aspectos Transversales

**Purpose**: Accesibilidad, performance, observabilidad y hardening de seguridad cruzados a todas las US.

- [ ] T079 [P] Configurar `@nestjs/swagger` en `backend/src/main.ts` — generar esquema OpenAPI sincronizado con `contracts/openapi.yml` en cada arranque; documentar todos los DTOs con `@ApiProperty()`
- [ ] T080 [P] Configurar GitHub Actions CI en `.github/workflows/ci.yml`: jobs paralelos — `backend-test` (Jest + cobertura) y `frontend-check` (`npm run check`); fallar si cobertura backend < 70% en módulos críticos (`auth`, `interviews`, `evaluation`)
- [ ] T081 [P] Añadir `axe-playwright` en `frontend/app/tests/e2e/setup.ts` y ejecutar auditorías de accesibilidad WCAG 2.1 AA en las 4 páginas críticas: login, dashboard, interview session, feedback — CI falla ante violaciones críticas o serias
- [ ] T082 [P] Configurar `@lhci/cli` (Lighthouse CI) en `.github/workflows/ci.yml` para páginas críticas con budgets `performance >= 90`, `accessibility >= 90`, `best-practices >= 90`, `seo >= 90`
- [ ] T083 [P] Implementar global exception filter en `backend/src/common/filters/http-exception.filter.ts` — formato consistente `{ statusCode, message, error }` para todos los errores; nunca exponer stack traces en producción
- [ ] T084 [P] Añadir `helmet` middleware en `backend/src/main.ts` para headers de seguridad HTTP; configurar CORS restrictivo a `FRONTEND_URL` de env
- [ ] T085 [P] Agregar Storybook stories para componentes nuevos: `SkillRadarChart.stories.tsx`, `AudioRecorder.stories.tsx`, `InterviewHistoryTable.stories.tsx`, `QuestionFormModal.stories.tsx` en `frontend/app/src/stories/`
- [ ] T086 [P] Configurar code splitting por rutas en `frontend/app/src/App.tsx` con `React.lazy` + `Suspense` para todas las páginas — skeleton fallback durante carga

---

## Dependencies (Story Completion Order)

```
Phase 1 (Setup) → Phase 2 (Auth/Guards)
                       ↓
              Phase 3 (US1 — MVP)
                       ↓
              Phase 4 (US2 — Feedback)
                       ↓
         Phase 5 (US3)  ←→  Phase 6 (US4)   ← Paralelas entre sí
                       ↓
              Phase 7 (Polish)
```

US3 y US4 pueden desarrollarse en paralelo una vez completadas US1 y US2.

---

## Parallel Execution Examples

### Phase 3 (US1) — Paralelo interno

Backend y Frontend pueden avanzar en paralelo una vez T022 (PrismaService) y T019 (Auth endpoints) están listos:

```
Backend stream:  T023→T024→T025 (catálogos) en paralelo con T026→T027→T028→T029→T030 (entrevistas)
Frontend stream: T041→T042→T043→T044 (auth) → T046→T047→T048 (interview UI)
BullMQ stream:   T034→T035→T036→T037→T038→T039→T040 (evaluation pipeline)
```

### Phase 4 (US2) — Paralelo interno

```
Backend SSE:     T052→T053
Backend Reports: T054→T055→T056→T057
Frontend hooks:  T058→T059 (SSE) en paralelo con T060→T061→T062 (Dashboard) → T063→T064 (Feedback)
```

---

## Implementation Strategy

**MVP recomendado**: Completar Phases 1–3 (US1) primero.

Al terminar Phase 3 se puede demostrar el flujo de valor completo:

- Registro de estudiante
- Configuración y ejecución de una sesión de 5 preguntas
- Cierre de entrevista con job de evaluación encolado (modo sandbox)
- Pantalla de confirmación

La evaluación IA procesa en background pero sin feedback visible aún — eso llega en Phase 4 (US2).

**Minimum viable demo** para entrega académica: Phases 1–4 (US1 + US2).

---

## Task Count Summary

| Phase                 | Tasks        | Story          |
| --------------------- | ------------ | -------------- |
| Phase 1: Setup        | T001–T012    | —              |
| Phase 2: Foundational | T013–T022    | —              |
| Phase 3: US1          | T023–T051    | US1 (29 tasks) |
| Phase 4: US2          | T052–T065    | US2 (14 tasks) |
| Phase 5: US3          | T066–T072    | US3 (7 tasks)  |
| Phase 6: US4          | T073–T078    | US4 (6 tasks)  |
| Phase 7: Polish       | T079–T086    | —              |
| **Total**             | **86 tasks** |                |

**Paralelizables**: 42 tareas marcadas `[P]`  
**MVP (Phases 1–3)**: T001–T051 (51 tareas)  
**Demo completo (Phases 1–4)**: T001–T065 (65 tareas)
