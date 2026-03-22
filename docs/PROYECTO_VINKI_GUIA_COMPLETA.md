# Guía Completa del Proyecto Vinki

> Plataforma de Simulación de Entrevistas Técnicas con IA
> Proyecto de Grado — Universidad Privada Boliviana (UPB)

---

## Tabla de Contenidos

1. [Estructura del Proyecto](#1-estructura-del-proyecto)
2. [Backend](#2-backend)
3. [Frontend](#3-frontend)
4. [Infraestructura](#4-infraestructura)
5. [Flujo General del Sistema](#5-flujo-general-del-sistema)
6. [Guía para Desarrolladores](#6-guía-para-desarrolladores)
7. [Resumen Final](#7-resumen-final)

---

## 1. Estructura del Proyecto

### 1.1 Árbol de Carpetas Principales

```
ProyectoDeGrado/
├── backend/                    # API REST — NestJS + TypeScript
│   ├── src/                    # Código fuente
│   │   ├── auth/               # Autenticación y autorización
│   │   ├── catalogs/           # Catálogos (roles, lenguajes, frameworks)
│   │   ├── common/             # Utilidades compartidas
│   │   ├── evaluation/         # Pipeline de evaluación con IA
│   │   ├── health/             # Health check endpoint
│   │   ├── interviews/         # Lógica de entrevistas y respuestas
│   │   ├── notifications/      # SSE + emails
│   │   ├── reports/            # Dashboard y reportes
│   │   ├── app.module.ts       # Módulo raíz de NestJS
│   │   └── main.ts             # Entry point del servidor
│   ├── prisma/                 # ORM: esquema y migraciones
│   │   ├── schema.prisma       # Modelos de base de datos
│   │   ├── migrations/         # Historial de migraciones
│   │   └── seed.ts             # Datos iniciales
│   ├── test/                   # Tests E2E
│   ├── .env.example            # Variables de entorno requeridas
│   └── Dockerfile
│
├── frontend/app/               # SPA — React 19 + TypeScript + Vite
│   ├── src/
│   │   ├── api/                # Cliente HTTP
│   │   ├── components/         # Componentes reutilizables
│   │   ├── hooks/              # Custom hooks
│   │   ├── i18n/               # Traducciones (ES/EN)
│   │   ├── pages/              # Páginas por funcionalidad
│   │   ├── store/              # Estado global (Zustand)
│   │   ├── styles/             # CSS y tokens de diseño
│   │   ├── App.tsx             # Router raíz
│   │   └── main.tsx            # Entry point React
│   ├── .env.example
│   └── Dockerfile
│
├── docs/                       # Documentación del proyecto
├── specs/                      # Especificaciones OpenAPI
├── .github/workflows/          # CI/CD (GitHub Actions)
├── .husky/                     # Git hooks (linting pre-commit)
└── docker-compose.yml          # Orquestación de todos los servicios
```

### 1.2 Tecnologías por Área

| Área | Tecnologías |
|------|-------------|
| **Backend** | Node.js 20, NestJS 11, TypeScript (strict), Prisma 6 |
| **Base de Datos** | PostgreSQL 15 + extensión pgvector |
| **Colas** | Redis 7 + BullMQ |
| **IA** | OpenAI GPT-4o-mini (evaluación), Whisper (voz a texto) |
| **Storage** | MinIO (compatible S3, para audios) |
| **Frontend** | React 19, Vite 6, TypeScript (strict) |
| **UI** | Ant Design 6, CSS custom properties |
| **Estado** | Zustand + TanStack Query (React Query) |
| **Gráficos** | Recharts |
| **Auth** | JWT RS256 en cookies httpOnly |
| **Infra** | Docker Compose, GitHub Actions CI |
| **Testing** | Jest/Vitest, Playwright (E2E), React Testing Library |

---

## 2. Backend

### 2.1 Framework y Configuración

El backend usa **NestJS 11** con TypeScript en modo strict. El servidor corre en el puerto `3000` y expone la API bajo el prefijo `/api`.

Configuraciones activas en `main.ts`:
- **CORS** habilitado (origen definido en `FRONTEND_URL`)
- **Helmet** para headers de seguridad
- **ValidationPipe** global (whitelist + transform automático)
- **Swagger** en `/docs` (solo ambiente desarrollo)
- **Pino** como logger estructurado
- **Cookie-parser** para manejo de tokens JWT

### 2.2 Módulos del Backend

Cada módulo en `src/` sigue el patrón NestJS: `controller → service → repository (Prisma)`.

#### `auth/` — Autenticación
Maneja registro, login, logout y gestión de sesión.

| Archivo | Propósito |
|---------|-----------|
| `auth.controller.ts` | Endpoints: `POST /auth/login`, `register`, `logout`, `refresh`, `GET /auth/me` |
| `auth.service.ts` | Lógica: hash passwords (bcrypt), generar JWT RS256, validar tokens |
| `jwt-cookie.strategy.ts` | Estrategia Passport que lee el JWT de la cookie httpOnly |
| `local.strategy.ts` | Estrategia Passport para validar email + password |
| `jwt-cookie.guard.ts` | Guard que protege rutas con JWT |
| `roles.guard.ts` | Guard que valida rol del usuario (student, recruiter, admin) |
| `roles.decorator.ts` | Decorador `@Roles('admin')` para anotaciones en controllers |

**Tokens:**
- Access token: 15 minutos
- Refresh token: 7 días
- Algoritmo: RS256 (clave privada/pública — configuradas en `.env`)
- Almacenados en cookies httpOnly (protección contra XSS)

#### `interviews/` — Entrevistas y Respuestas
Es el módulo más grande. Maneja el ciclo completo de una entrevista.

| Archivo | Propósito |
|---------|-----------|
| `interviews.controller.ts` | CRUD entrevistas, iniciar/finalizar |
| `interviews.service.ts` | Crear entrevista, cargar preguntas, marcar finalizada |
| `answers.controller.ts` | Enviar respuesta de texto, audio, código |
| `answers.service.ts` | Persistir respuestas, actualizar estado |
| `question-selector.service.ts` | Selección inteligente de preguntas via pgvector |
| `embedding.service.ts` | Genera embeddings con OpenAI para búsqueda semántica |
| `transcription.service.ts` | Convierte audio a texto con Whisper |
| `followup.service.ts` | Genera preguntas de seguimiento en base a la respuesta |
| `question-generator.service.ts` | Genera preguntas nuevas con IA (uso admin) |

#### `evaluation/` — Pipeline de Evaluación IA
Procesamiento asincrónico de evaluaciones.

| Archivo | Propósito |
|---------|-----------|
| `evaluation.processor.ts` | Worker BullMQ: consume jobs, orquesta evaluación |
| `openai-evaluator.service.ts` | Llama a GPT-4o-mini con rúbricas estructuradas |
| `mock-evaluator.service.ts` | Evaluador fake para desarrollo (activo si `LLM_SANDBOX=true`) |
| `rubrics.ts` | Definición de las 5 métricas y prompts para el LLM |

**Las 5 métricas de evaluación (escala 0-5):**

| Métrica | Descripción |
|---------|-------------|
| `technicalCorrectness` | Qué tan correcto es el contenido técnico |
| `clarityOfExplanation` | Qué tan claro y estructurado es el razonamiento |
| `communication` | Calidad de la comunicación verbal/escrita |
| `confidence` | Nivel de seguridad y dominio del tema |
| `problemSolving` | Capacidad de abordar y resolver el problema |

La evaluación también detecta nivel (`Junior / Mid / Senior`) y genera respuestas modelo para cada nivel.

#### `reports/` — Dashboard y Reportes

| Archivo | Propósito |
|---------|-----------|
| `reports.controller.ts` | Endpoints del dashboard del estudiante |
| `shared-report.controller.ts` | Reportes compartibles via link público |
| `reports.service.ts` | Calcula promedios, percentiles, historial |

Funcionalidades:
- Puntaje promedio histórico
- Habilidades por skill con EMA (Exponential Moving Average, α=0.3)
- Comparativa anónima (percentiles)
- Reporte exportable como PDF o CSV
- Reportes compartibles con JWT temporal (7 días)

#### `catalogs/` — Catálogos de Datos

| Archivo | Propósito |
|---------|-----------|
| `catalogs.controller.ts` | Endpoints públicos: `GET /catalogs/roles`, `/languages`, etc. |
| `admin-questions.controller.ts` | CRUD preguntas (admin): crear, editar, generar IA, importar |
| `admin-audit.controller.ts` | Logs de auditoría paginados (admin) |
| `catalogs.service.ts` | Consultas a catálogos de la BD |

#### `notifications/` — Notificaciones en Tiempo Real

| Archivo | Propósito |
|---------|-----------|
| `notifications.controller.ts` | Endpoint SSE: `GET /notifications/stream` |
| `email.service.ts` | Envío emails via SMTP (Nodemailer) |
| `notification.listener.ts` | Escucha eventos internos (EventEmitter) y dispara notificaciones |

Cuando la evaluación termina, el backend emite un evento que el listener recibe y envía:
1. Notificación SSE al frontend (tiempo real)
2. Email al usuario (si SMTP configurado)

#### `common/` — Compartido

| Archivo | Propósito |
|---------|-----------|
| `prisma.service.ts` | Singleton del cliente Prisma (ORM) |
| `audit.service.ts` | Registra todas las acciones en `AuditLog` |
| `env.validation.ts` | Valida variables de entorno al iniciar el servidor |
| `http-exception.filter.ts` | Formatea errores HTTP de manera consistente |

### 2.3 Endpoints Principales

```
# Auth
POST   /api/auth/register          # Crear cuenta
POST   /api/auth/login             # Iniciar sesión
POST   /api/auth/logout            # Cerrar sesión
POST   /api/auth/refresh           # Renovar tokens
GET    /api/auth/me                # Usuario actual

# Catálogos
GET    /api/catalogs/roles
GET    /api/catalogs/languages
GET    /api/catalogs/frameworks
GET    /api/catalogs/levels

# Entrevistas
POST   /api/interviews             # Crear entrevista
GET    /api/interviews             # Listar mis entrevistas
GET    /api/interviews/:id         # Detalle entrevista
POST   /api/interviews/:id/finish  # Finalizar → encolar evaluación
POST   /api/interviews/:id/answers/:questionId  # Enviar respuesta

# Reports
GET    /api/reports/dashboard      # Dashboard estudiante
GET    /api/reports/:id            # Reporte detallado entrevista
GET    /api/reports/shared/:token  # Reporte público

# Admin
GET    /api/admin/questions        # Listar preguntas
POST   /api/admin/questions        # Crear pregunta
POST   /api/admin/questions/generate  # Generar IA
GET    /api/admin/audit            # Logs auditoría

# Notificaciones
GET    /api/notifications/stream   # SSE stream

# Health
GET    /api/health                 # Estado servidor
```

Documentación completa disponible en `http://localhost:3001/docs` (Swagger UI).

### 2.4 Base de Datos (Prisma + PostgreSQL)

**ORM:** Prisma 6 con PostgreSQL 15 y la extensión `pgvector` (búsqueda vectorial).

**Modelos principales:**

```
User              — Usuarios (student, recruiter, admin)
Interview         — Sesiones de entrevista
InterviewQuestion — Preguntas asignadas a una entrevista
Answer            — Respuestas del usuario
AnswerEvaluation  — Evaluación IA de cada respuesta
Question          — Banco de preguntas con embedding vectorial
UserSkillScore    — Historial de habilidades por usuario
Role              — Catálogo: roles (Frontend, Backend, etc.)
Language          — Catálogo: lenguajes (Python, JavaScript, etc.)
Framework         — Catálogo: frameworks (React, Django, etc.)
Level             — Catálogo: niveles (Junior, Mid, Senior)
Skill             — Catálogo: habilidades (Arrays, OOP, etc.)
RecruiterNote     — Notas privadas del reclutador
AuditLog          — Historial de todas las acciones
```

El campo `Question.embedding` es de tipo `vector(1536)` (pgvector). Permite buscar preguntas similares a las ya respondidas para no repetir contenido durante una sesión.

### 2.5 Variables de Entorno

Archivo de referencia: `backend/.env.example`

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `DATABASE_URL` | Conexión PostgreSQL | `postgresql://vinki:vinki_dev@postgres:5432/vinki` |
| `REDIS_URL` | Conexión Redis | `redis://redis:6379` |
| `JWT_PRIVATE_KEY` | Clave privada RSA (multi-línea) | `-----BEGIN RSA PRIVATE KEY-----\n...` |
| `JWT_PUBLIC_KEY` | Clave pública RSA | `-----BEGIN PUBLIC KEY-----\n...` |
| `JWT_ACCESS_EXPIRATION` | Duración access token | `15m` |
| `JWT_REFRESH_EXPIRATION` | Duración refresh token | `7d` |
| `OPENAI_API_KEY` | API key de OpenAI | `sk-...` |
| `LLM_SANDBOX` | Usar evaluador mock (sin OpenAI) | `true` / `false` |
| `AWS_S3_BUCKET` | Nombre del bucket (MinIO) | `vinki-audio` |
| `AWS_S3_ENDPOINT` | URL del storage | `http://minio:9000` |
| `AWS_S3_ACCESS_KEY` | Usuario MinIO | `minioadmin` |
| `AWS_S3_SECRET_KEY` | Contraseña MinIO | `minioadmin` |
| `FRONTEND_URL` | URL del frontend (CORS) | `http://localhost:5174` |
| `PORT` | Puerto del servidor | `3000` |
| `SMTP_HOST` | Servidor email (opcional) | `smtp.gmail.com` |

### 2.6 Flujo de una Request

Ejemplo: un estudiante envía una respuesta a una pregunta.

```
1. Frontend → POST /api/interviews/:id/answers/:questionId
   { answerText: "...", answeredInSeconds: 45 }

2. JwtCookieGuard
   └─ Lee cookie "access_token"
   └─ Verifica firma RS256
   └─ Extrae payload: { sub: userId, role: "student" }

3. AnswersController.submitAnswer()
   └─ ValidationPipe valida SubmitAnswerDto

4. AnswersService.submitAnswer()
   └─ Verifica que la entrevista pertenece al usuario
   └─ Verifica que la pregunta está en la entrevista
   └─ Persiste Answer en la BD (Prisma)
   └─ AuditService.log("answer.submitted", ...)

5. Respuesta → 201 Created { id, answerText, ... }
```

Ejemplo: cuando el usuario finaliza la entrevista y se dispara la evaluación:

```
1. POST /api/interviews/:id/finish
2. InterviewsService.finishInterview()
   └─ Marca Interview.finishedAt = now
   └─ Interview.evaluationStatus = "pending"
   └─ BullMQ.add("evaluation", { interviewId })

3. (Asincrónico) EvaluationProcessor consume el job
   └─ Carga Interview + Answers + contexto
   └─ OpenaiEvaluatorService.evaluate() → GPT-4o-mini
   └─ Persiste AnswerEvaluation (5 métricas, nivel, feedback)
   └─ Actualiza UserSkillScore con EMA
   └─ Interview.evaluationStatus = "completed"
   └─ EventEmitter.emit("evaluation.completed", { userId, interviewId })

4. NotificationListener escucha el evento
   └─ SSE push al frontend (si conectado)
   └─ Email al usuario (si SMTP configurado)
```

---

## 3. Frontend

### 3.1 Framework y Stack

**React 19** con **TypeScript strict**, empaquetado con **Vite 6**.

- **UI:** Ant Design 6 (componentes) + CSS custom properties (theming)
- **Enrutamiento:** React Router v7 (rutas declarativas)
- **Datos del servidor:** TanStack Query (React Query v5) — cache, loading states, invalidación
- **Estado local/global:** Zustand v5
- **Internacionalización:** react-i18next (ES/EN)
- **Gráficos:** Recharts
- **Editor de código:** Monaco Editor (igual al de VS Code)

### 3.2 Estructura de Carpetas

```
src/
├── api/
│   ├── client.ts           # Wrapper sobre fetch con tipado
│   └── generated.ts        # Tipos generados desde OpenAPI
│
├── components/             # Componentes compartidos entre páginas
│   ├── AppLayout.tsx       # Layout principal (header, sidebar, outlet)
│   ├── ProtectedRoute.tsx  # Verifica auth + roles antes de renderizar
│   ├── ErrorBoundary.tsx   # Catch de errores React con UI fallback
│   ├── AudioRecorder.tsx   # Grabación de audio (respuestas voz)
│   ├── CodeEditor.tsx      # Editor Monaco para respuestas código
│   ├── ProgressChart.tsx   # Gráfico evolución temporal (Recharts)
│   ├── SkillRadarChart.tsx # Radar de habilidades (Recharts)
│   └── GlobalSearch.tsx    # Búsqueda global Cmd+K
│
├── hooks/                  # Lógica reutilizable
│   ├── useAuth.ts          # Query + mutations de autenticación
│   ├── useSSE.ts           # Conexión Server-Sent Events
│   ├── useTheme.ts         # Toggle dark/light mode
│   ├── useSessionTimeout.ts # Warning + auto-logout por inactividad
│   └── usePageTitle.ts     # Actualiza document.title
│
├── pages/                  # Una carpeta por feature
│   ├── auth/               # LoginPage, RegisterPage
│   ├── dashboard/          # DashboardPage, StudyPlanPage
│   ├── interview/          # WizardPage, SessionPage, ConfirmationPage
│   ├── feedback/           # FeedbackPage, HistoryPage, SharedReportPage
│   ├── recruiter/          # RecruiterDashboardPage, StudentProfilePage
│   ├── admin/              # QuestionsPage, AuditPage, AnalyticsPage
│   └── profile/            # ProfilePage (configuración usuario)
│
├── store/
│   ├── auth.store.ts       # Usuario actual, isAuthenticated
│   └── interview.store.ts  # Entrevista en curso, índice de pregunta actual
│
├── i18n/
│   ├── index.ts            # Configuración i18next
│   ├── es.json             # Traducciones en español
│   └── en.json             # Traducciones en inglés
│
├── styles/                 # CSS global + variables de tema
├── App.tsx                 # Router raíz con todas las rutas declaradas
└── main.tsx                # Bootstrap: QueryClient, Zustand, i18n
```

### 3.3 Rutas de la Aplicación

**Rutas públicas** (no requieren sesión):
```
/login                    → LoginPage
/register                 → RegisterPage
/shared/:token            → SharedReportPage (reportes públicos)
```

**Rutas protegidas** (requieren login, envueltas en `ProtectedRoute`):
```
/dashboard                → Dashboard del estudiante
/interview/new            → Wizard de configuración (5 pasos)
/interview/:id            → Sesión de entrevista activa
/interview/:id/confirm    → Confirmación al finalizar
/feedback/:id             → Reporte detallado de evaluación
/history                  → Historial paginado de entrevistas
/study-plan               → Plan de estudio personalizado por IA
/settings                 → Perfil y configuración

# Solo reclutadores y admins:
/recruiter                → Ranking de candidatos
/recruiter/students/:id   → Perfil detallado de un estudiante

# Solo admins:
/admin/questions          → CRUD banco de preguntas
/admin/audit              → Logs de auditoría
/admin/analytics          → Estadísticas globales
```

El componente `ProtectedRoute` verifica el token JWT (via `useAuth`), valida el rol si la ruta lo requiere y redirige a `/login` si no hay sesión activa.

### 3.4 Manejo de Estado

**Zustand** para estado que persiste entre navegaciones:

```typescript
// auth.store.ts
{
  user: { id, name, email, role } | null,
  isAuthenticated: boolean,
  setUser(user), login(user), logout()
}

// interview.store.ts
{
  currentInterview: Interview | null,
  currentQuestionIndex: number,
  setInterview(interview), nextQuestion(), prevQuestion()
}
```

**TanStack Query** para datos del servidor:
- `useQuery(['dashboard'])` → carga el dashboard del estudiante
- `useMutation()` → login, enviar respuesta, finalizar entrevista
- Cuando llega una notificación SSE de evaluación completada, se invalida el query del dashboard y se recarga automáticamente

### 3.5 Conexión con el Backend (API Client)

Archivo: `src/api/client.ts`

Es un wrapper sobre `fetch` nativo con:
- URL base configurable via `VITE_API_URL`
- `credentials: 'include'` (envía cookies automáticamente)
- Tipado genérico con TypeScript
- Soporte para query params, JSON body y FormData (archivos)
- Manejo de errores HTTP (lanza excepciones con mensaje del backend)

```typescript
// Uso en hooks/páginas:
const data = await api.get<Dashboard>('/reports/dashboard')
const interview = await api.post<Interview>('/interviews', { roleId, levelId })
await api.postForm<void>('/interviews/1/answers/5', formData) // audio
```

### 3.6 Páginas Clave

**InterviewWizardPage** — Configuración de entrevista en 5 pasos:
1. Seleccionar Rol (Frontend, Backend, etc.)
2. Seleccionar Lenguaje (Python, JS, etc.)
3. Seleccionar Framework (React, Django, etc.)
4. Seleccionar Nivel (Junior, Mid, Senior)
5. Seleccionar Modo (Práctica vs Evaluación)

Cada paso está deshabilitado hasta completar el anterior. Al finalizar, crea la entrevista vía `POST /interviews` y redirige a la sesión.

**InterviewSessionPage** — Sesión activa de entrevista:
- Muestra la pregunta actual con timer de 5 minutos
- 3 formas de responder: texto libre, código (Monaco), voz (AudioRecorder → Whisper)
- Botones prev/next, submit respuesta
- Estado global: `useInterviewStore`

**DashboardPage** — Vista principal del estudiante:
- Cards con puntaje promedio, entrevistas completadas, pendientes
- Tabla de entrevistas recientes con filtros
- Radar/progress de habilidades
- Gráfico de evolución temporal
- Actualizaciones en tiempo real via SSE

---

## 4. Infraestructura

### 4.1 Docker Compose

El archivo `docker-compose.yml` orquesta 5 servicios que conforman el sistema completo:

| Servicio | Imagen | Puerto Host | Puerto Contenedor | Función |
|----------|--------|-------------|-------------------|---------|
| `postgres` | `pgvector/pgvector:pg15` | 5433 | 5432 | Base de datos principal |
| `redis` | `redis:7-alpine` | 6380 | 6379 | Colas (BullMQ) + cache |
| `minio` | `minio/minio` | 9000, 9001 | 9000, 9001 | Storage de audios (S3) |
| `backend` | Build local (`./backend`) | 3001 | 3000 | API NestJS |
| `frontend` | Build local (`./frontend/app`) | 5174 | 5173 | App React (Vite) |

### 4.2 Comunicación entre Servicios

```
Navegador (puerto 5174)
    │
    ├─ HTTP → Frontend (Vite, 5174)
    │
    └─ HTTP/SSE → Backend (3001)
                      │
                      ├─ TCP → PostgreSQL (5433) — datos principales
                      ├─ TCP → Redis (6380)       — colas BullMQ
                      └─ HTTP → MinIO (9000)      — archivos de audio
```

**Nota:** Los contenedores se comunican entre sí usando los nombres de servicio como hostname (`postgres`, `redis`, `minio`), no `localhost`. Por eso en las variables de entorno del backend dentro de Docker se usa `postgresql://vinki:vinki_dev@postgres:5432/vinki` y no `localhost:5433`.

### 4.3 Dependencias de Arranque

Docker Compose define el orden de inicio:
- `backend` espera a que `postgres` y `redis` estén **healthy** antes de arrancar
- `frontend` espera a que `backend` esté **healthy**
- Los health checks usan `pg_isready` (Postgres) y `redis-cli ping` (Redis)

### 4.4 Volúmenes

| Volumen | Propósito |
|---------|-----------|
| `pgdata` | Persistencia de datos PostgreSQL entre reinicios |
| `redisdata` | Persistencia de datos Redis |
| `miniodata` | Archivos almacenados en MinIO |
| `./backend/src:/app/src` | Live reload de código backend |
| `./backend/prisma:/app/prisma` | Live reload de schema Prisma |
| `./frontend/app/src:/app/src` | Live reload de código frontend |

### 4.5 MinIO (Console)

MinIO tiene una consola web accesible en `http://localhost:9001`:
- Usuario: `minioadmin`
- Contraseña: `minioadmin`
- Bucket necesario: `vinki-audio` (se crea automáticamente)

---

## 5. Flujo General del Sistema

### 5.1 Diagrama de Interacción

```
┌──────────┐    HTTP/JSON     ┌──────────────┐    Prisma ORM    ┌────────────┐
│ React SPA│ ──────────────► │  NestJS API  │ ───────────────► │ PostgreSQL │
│ (Vite)   │ ◄────────────── │  (NestJS)    │ ◄─────────────── │ (pgvector) │
└──────────┘    Cookies JWT   └──────┬───────┘                  └────────────┘
     ▲                               │
     │  SSE (tiempo real)            ├─── BullMQ ──► Redis
     └───────────────────────────────┘                  │
                                                    Worker Job
                                                    (evaluación)
                                                         │
                                                    OpenAI GPT-4o-mini
```

### 5.2 Flujo de Login

1. Usuario ingresa email/password en `LoginPage`
2. `POST /api/auth/login` → backend valida credenciales (bcrypt)
3. Backend genera JWT RS256 → lo guarda en cookie httpOnly
4. Frontend recibe respuesta, actualiza `useAuthStore`
5. React Router redirige a `/dashboard`

### 5.3 Flujo de una Entrevista Completa

```
1. Wizard (5 pasos) → POST /api/interviews
   Backend: crea Interview, selecciona preguntas con pgvector

2. Session → por cada pregunta:
   Usuario responde → POST /api/interviews/:id/answers/:questionId
   Backend: persiste Answer

3. Finalizar → POST /api/interviews/:id/finish
   Backend: encola job en Redis (BullMQ)

4. Worker (async):
   - Lee respuestas de la BD
   - Llama GPT-4o-mini con rúbricas
   - Persiste AnswerEvaluation (5 métricas, nivel, feedback)
   - Actualiza UserSkillScore (EMA α=0.3)
   - Emite evento "evaluation.completed"

5. NotificationListener:
   - Push SSE al navegador: "tu evaluación está lista"
   - Email al usuario (si SMTP configurado)

6. Frontend recibe SSE:
   - Toast notification
   - Invalida query dashboard → recarga automáticamente

7. Usuario navega a /feedback/:id
   - Ve métricas, feedback, ejemplos por nivel
   - Puede exportar PDF o compartir link
```

---

## 6. Guía para Desarrolladores

### 6.1 Levantar el Proyecto (Paso a Paso)

**Prerrequisitos:**
- Docker Desktop instalado y corriendo
- Git

**Pasos:**

```bash
# 1. Clonar el repositorio
git clone <repo-url>
cd ProyectoDeGrado

# 2. Copiar variables de entorno
cp backend/.env.example backend/.env
cp frontend/app/.env.example frontend/app/.env

# 3. Editar backend/.env según necesidades
#    (opcional) OPENAI_API_KEY=sk-... para evaluación real
#    (por defecto) LLM_SANDBOX=true → usa evaluador mock (no necesita OpenAI)

# 4. Construir y levantar todos los servicios
docker compose up --build -d

# 5. Esperar que estén healthy (~2-3 minutos)
docker compose ps

# 6. Ejecutar migraciones de BD
docker compose exec backend npx prisma migrate deploy

# 7. Cargar datos iniciales (catálogos + usuarios de prueba)
docker compose exec backend npx prisma db seed
```

**URLs disponibles:**
| Servicio | URL |
|----------|-----|
| Frontend | http://localhost:5174 |
| Backend API | http://localhost:3001/api |
| Swagger Docs | http://localhost:3001/docs |
| MinIO Console | http://localhost:9001 |

**Usuarios de prueba (después del seed):**
| Rol | Email | Contraseña |
|-----|-------|------------|
| Estudiante | student@vinki.dev | password123 |
| Reclutador | recruiter@vinki.dev | password123 |
| Admin | admin@vinki.dev | password123 |

**Comandos útiles:**
```bash
# Ver logs en tiempo real
docker compose logs -f backend
docker compose logs -f frontend

# Acceder a la BD directamente
docker compose exec postgres psql -U vinki -d vinki

# Reiniciar solo el backend (útil al cambiar .env)
docker compose restart backend

# Parar todo
docker compose down

# Parar y borrar volúmenes (resetea la BD)
docker compose down -v
```

### 6.2 Agregar una Nueva Funcionalidad

#### Caso: Nuevo endpoint en el backend

1. **Crear o modificar el módulo en `backend/src/`**

   Si es funcionalidad nueva, crear carpeta del módulo:
   ```
   backend/src/mi-modulo/
   ├── mi-modulo.module.ts
   ├── mi-modulo.controller.ts
   ├── mi-modulo.service.ts
   └── dto/
       └── create-mi-recurso.dto.ts
   ```

2. **Registrar en `app.module.ts`**:
   ```typescript
   imports: [
     ...,
     MiModuloModule, // ← agregar aquí
   ]
   ```

3. **Agregar el DTO con validaciones:**
   ```typescript
   import { IsString, IsNotEmpty } from 'class-validator'
   export class CreateMiRecursoDto {
     @IsString() @IsNotEmpty()
     nombre: string
   }
   ```

4. **Si necesita tabla nueva:** agregar modelo en `prisma/schema.prisma` y correr:
   ```bash
   docker compose exec backend npx prisma migrate dev --name add-mi-tabla
   ```

5. **Proteger el endpoint** con guards si aplica:
   ```typescript
   @UseGuards(JwtCookieGuard, RolesGuard)
   @Roles('admin')
   @Post()
   create(@Body() dto: CreateMiRecursoDto) { ... }
   ```

#### Caso: Nueva página en el frontend

1. **Crear el archivo de página** en `frontend/app/src/pages/mi-feature/MiPage.tsx`

2. **Agregar la ruta** en `src/App.tsx`:
   ```tsx
   <Route
     path="/mi-ruta"
     element={
       <ProtectedRoute>
         <MiPage />
       </ProtectedRoute>
     }
   />
   ```

3. **Agregar al menú** en `src/components/AppLayout.tsx` (array de items del sidebar)

4. **Hacer API calls** usando el cliente:
   ```typescript
   import { api } from '@/api/client'
   import { useQuery } from '@tanstack/react-query'

   const { data, isLoading } = useQuery({
     queryKey: ['mi-recurso'],
     queryFn: () => api.get<MiRecurso[]>('/mi-modulo')
   })
   ```

5. **Agregar traducción** en `src/i18n/es.json` y `en.json`

### 6.3 Modificar Endpoints Existentes

- Los controllers están en `backend/src/<modulo>/<modulo>.controller.ts`
- Los DTOs de validación están en `backend/src/<modulo>/dto/`
- La lógica de negocio en `backend/src/<modulo>/<modulo>.service.ts`
- El acceso a BD siempre pasa por `prisma.service.ts`
- Al cambiar la firma de un endpoint, actualizar también el `api/client.ts` del frontend

### 6.4 Cambiar la UI (Frontend)

- **Componentes compartidos:** `src/components/`
- **Páginas:** `src/pages/<feature>/`
- **Tema / colores:** `src/styles/theme.css` (variables CSS `--color-*`)
- **Dark mode:** las variables cambian automáticamente con la clase `.dark` en el `<html>`
- **Ant Design:** para personalizar el tema, buscar `ThemeProvider.tsx`
- **Tipografía, espaciados globales:** `src/styles/global.css`

### 6.5 Puntos Críticos del Proyecto

1. **Claves JWT (RS256):** El backend requiere un par de claves RSA (privada y pública) en las variables `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY`. Deben ser multi-línea con `\n`. Si el servidor no arranca, este es el primer lugar a revisar.

2. **pgvector:** PostgreSQL necesita la extensión `vector`. La imagen usada es `pgvector/pgvector:pg15` (no la imagen oficial de Postgres). Si se cambia la imagen de Docker, las preguntas no tendrán embedding y la selección semántica fallará.

3. **LLM_SANDBOX:** Si `LLM_SANDBOX=true` (default en desarrollo), se usa el `MockEvaluatorService` que devuelve scores aleatorios sin llamar a OpenAI. Para evaluación real, setear `LLM_SANDBOX=false` y proveer `OPENAI_API_KEY`.

4. **BullMQ y Redis:** Los jobs de evaluación requieren que Redis esté corriendo. Si Redis cae, los jobs quedan en la cola y se reintentarán automáticamente (3 intentos con backoff exponencial) cuando Redis vuelva.

5. **Prisma migrations:** Si se modifica `schema.prisma`, hay que correr las migraciones manualmente. Olvidarse de esto causa errores de "tabla no encontrada" en runtime. Siempre correr `prisma migrate dev` en desarrollo o `prisma migrate deploy` en producción/docker.

6. **Cookies httpOnly y CORS:** El frontend envía cookies automáticamente solo si `credentials: 'include'` está configurado en el fetch y el backend tiene CORS configurado con `origin: FRONTEND_URL`. Si cambia el puerto del frontend, actualizar `FRONTEND_URL` en el `.env` del backend.

7. **Rutas protegidas por rol:** Asegurarse de pasar el rol correcto tanto al guard del backend (`@Roles('admin')`) como al `ProtectedRoute` del frontend (`allowedRoles={['admin']}`). Si solo se protege en uno de los dos lados, hay inconsistencias.

---

## 7. Resumen Final

### 7.1 ¿Qué es Vinki?

**Vinki** es una plataforma web donde estudiantes de programación pueden practicar entrevistas técnicas simuladas con ayuda de inteligencia artificial. El usuario elige un rol (por ejemplo, "Frontend Developer"), un lenguaje (JavaScript) y su nivel (Junior). El sistema le hace preguntas técnicas, el estudiante responde por texto, código o voz, y al finalizar, una IA (GPT-4o-mini) evalúa cada respuesta en 5 dimensiones, detecta el nivel demostrado y genera feedback detallado con ejemplos de cómo debería haberse respondido en cada nivel. Los reclutadores pueden ver los perfiles de los candidatos y los administradores gestionan el banco de preguntas.

### 7.2 Recomendaciones para Alguien Nuevo

1. **Empieza por `docker-compose.yml`** para entender los servicios. Luego lee `backend/prisma/schema.prisma` para entender el modelo de datos — eso te dará el 80% del contexto.

2. **El ciclo core del sistema** es: `InterviewWizardPage → InterviewSessionPage → EvaluationProcessor → FeedbackPage`. Entiende ese flujo primero.

3. **Si algo falla al iniciar**, revisa los logs con `docker compose logs -f backend`. Los errores más comunes son: claves JWT mal formateadas, Prisma sin migraciones, o variables de entorno faltantes.

4. **Usa `LLM_SANDBOX=true`** mientras desarrollas. Así no necesitas una API key de OpenAI y la evaluación igual funciona (con datos mock).

5. **La documentación de la API está en Swagger** en `http://localhost:3001/docs`. Es generada automáticamente desde los decoradores de NestJS y siempre está actualizada.

6. **Para el frontend**, `src/api/client.ts` es el único lugar donde se hacen HTTP calls. Si necesitas entender qué endpoints consume el frontend, busca en ese archivo primero.

7. **No toques `generated.ts`** en el frontend — ese archivo es auto-generado desde el schema OpenAPI. Si necesitas tipos nuevos, modifíca el backend y regenera.

8. **El sistema de roles** es: `student` (usa entrevistas), `recruiter` (ve candidatos), `admin` (gestiona todo). Los guards están en el backend (`@Roles`) y en el frontend (`ProtectedRoute allowedRoles`).

---

*Documento generado automáticamente. Última actualización: Marzo 2026.*
