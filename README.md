# Vinki — Plataforma de Simulación de Entrevistas Técnicas con IA

> Proyecto de grado — Universidad Privada Boliviana (UPB)

Vinki es una plataforma web que permite a estudiantes practicar entrevistas técnicas con evaluación automatizada por IA, obteniendo feedback detallado, detección de nivel (Junior/Mid/Senior) y un plan de mejora personalizado.

## Stack Tecnológico

### Backend
- **Runtime**: Node.js 20 + TypeScript (strict)
- **Framework**: NestJS 11
- **Base de datos**: PostgreSQL 15 + pgvector (búsqueda semántica)
- **ORM**: Prisma 6
- **Colas**: Redis 7 + BullMQ (evaluación asíncrona)
- **IA**: OpenAI gpt-4o-mini (evaluación) + Whisper (speech-to-text)
- **Almacenamiento**: MinIO (S3-compatible, audio)
- **Auth**: JWT RS256 en httpOnly cookies
- **Docs**: Swagger/OpenAPI en /docs

### Frontend
- **Framework**: React 19 + TypeScript (strict)
- **Bundler**: Vite 6
- **UI**: Ant Design 6 + CSS custom properties
- **Estado**: Zustand + TanStack Query
- **i18n**: react-i18next (español/inglés)
- **Charts**: Recharts
- **Code Editor**: Monaco Editor
- **Testing**: Vitest + React Testing Library
- **E2E**: Playwright

### Infraestructura
- Docker Compose (5 servicios)
- GitHub Actions CI
- PWA (installable)

## Features

### Entrevista
- Wizard de configuración (rol, lenguaje, framework, nivel, modo)
- Temporizador por pregunta (5 min)
- Respuesta por texto, código (Monaco Editor) o voz (Whisper STT)
- Preguntas de seguimiento con IA (follow-up conversacional)
- Modo práctica (feedback inmediato) vs modo evaluación (feedback al final)

### Evaluación IA
- 5 métricas (0-5): corrección técnica, claridad, comunicación, confianza, resolución
- Detección de nivel Junior/Mid/Senior por respuesta
- Respuestas recomendadas por nivel
- Procesamiento asíncrono via BullMQ con reintentos
- Notificaciones SSE en tiempo real + email

### Dashboard del Estudiante
- Puntaje promedio, entrevistas realizadas, pendientes
- Habilidades por skill con progress bars
- Gráficos de evolución temporal (Recharts)
- Comparativa anónima (percentiles)
- Historial paginado con filtros
- Plan de estudio personalizado con IA

### Panel del Reclutador
- Ranking de candidatos con filtros (nivel, lenguaje)
- Perfil individual de estudiante
- Notas privadas del reclutador
- Export CSV shortlist

### Administración
- CRUD de preguntas con categorización
- Generación de preguntas con IA
- Importación/exportación masiva (JSON/CSV)
- Dashboard de analíticas (usuarios, entrevistas/día, distribución)
- Logs de auditoría

### UX/Calidad
- Dark mode con toggle instantáneo
- Internacionalización (ES/EN)
- Breadcrumbs contextuales
- Búsqueda global (Cmd+K)
- Onboarding tour para nuevos usuarios
- Empty states, 404, Error Boundary
- Session timeout con auto-refresh
- PWA installable
- Accesibilidad (aria-labels, keyboard nav)
- Export PDF/CSV de reportes
- Reportes compartibles (link temporal 7 días)

## Requisitos

- Node.js 20+
- Docker & Docker Compose (para el setup con Docker)
- PostgreSQL 15 + pgvector, Redis 7 (para setup local sin Docker)

---

## Opcion 1: Levantar con Docker (recomendado)

Docker levanta los 5 servicios automaticamente (PostgreSQL, Redis, MinIO, Backend, Frontend).

```bash
# 1. Clonar el repositorio
git clone https://github.com/camilabocangel/vinki-proyecto_de_grado.git
cd vinki-proyecto_de_grado

# 2. Configurar variables de entorno
cp .env.example .env
cp backend/.env.example backend/.env

# 3. Generar claves JWT (si no tienes)
openssl genpkey -algorithm RSA -out jwt.key -pkeyopt rsa_keygen_bits:2048
openssl rsa -pubout -in jwt.key -out jwt.pub
# Luego copia el contenido de jwt.key y jwt.pub en .env
# reemplazando saltos de linea con \n

# 4. Levantar todos los servicios
docker compose up -d

# 5. Esperar que los servicios esten saludables (~15 seg)
docker compose ps

# 6. Aplicar migraciones de base de datos
docker compose exec backend npx prisma migrate deploy

# 7. Cargar datos de prueba (61 preguntas, 5 roles, 7 lenguajes, 5 usuarios)
docker compose exec backend npx prisma db seed

# 8. Acceder a la aplicacion
# Frontend:      http://localhost:5174
# Backend API:   http://localhost:3001/api
# Swagger Docs:  http://localhost:3001/docs
# MinIO Console: http://localhost:9001 (minioadmin/minioadmin)
```

### Puertos Docker

| Servicio | Puerto local | Puerto interno |
|----------|-------------|----------------|
| Frontend | 5174 | 5173 |
| Backend | 3001 | 3000 |
| PostgreSQL | 5433 | 5432 |
| Redis | 6380 | 6379 |
| MinIO | 9000, 9001 | 9000, 9001 |

---

## Opcion 2: Levantar en local (sin Docker)

Necesitas PostgreSQL 15 con pgvector y Redis 7 instalados localmente.

### Requisitos previos

```bash
# macOS con Homebrew
brew install postgresql@15 redis
brew install pgvector  # extension para PostgreSQL

# Iniciar servicios
brew services start postgresql@15
brew services start redis

# Crear base de datos
createdb vinki
psql vinki -c "CREATE EXTENSION IF NOT EXISTS vector;"
psql vinki -c "CREATE USER vinki WITH PASSWORD 'vinki_dev';"
psql vinki -c "GRANT ALL PRIVILEGES ON DATABASE vinki TO vinki;"
```

### Backend

```bash
cd backend

# 1. Configurar variables de entorno
cp .env.example .env
# Editar .env:
#   DATABASE_URL=postgresql://vinki:vinki_dev@localhost:5432/vinki?schema=public
#   REDIS_URL=redis://localhost:6379
#   FRONTEND_URL=http://localhost:5173

# 2. Generar claves JWT y pegarlas en .env
openssl genpkey -algorithm RSA -out jwt.key -pkeyopt rsa_keygen_bits:2048
openssl rsa -pubout -in jwt.key -out jwt.pub

# 3. Instalar dependencias
npm install

# 4. Aplicar migraciones
npx prisma migrate deploy

# 5. Generar Prisma Client
npx prisma generate

# 6. Cargar datos de prueba
npx prisma db seed

# 7. Iniciar en modo desarrollo (hot reload)
npm run start:dev
# Backend disponible en http://localhost:3000/api
# Swagger en http://localhost:3000/docs
```

### Frontend

```bash
cd frontend/app

# 1. Configurar variables de entorno
cp .env.example .env
# Editar .env:
#   VITE_API_URL=http://localhost:3000/api  (nota: puerto 3000, no 3001)

# 2. Instalar dependencias
npm install

# 3. Iniciar en modo desarrollo
npm run dev
# Frontend disponible en http://localhost:5173
```

---

## Usuarios de prueba

Todos los usuarios usan la contrasena `password123`.

| Rol | Email | Nombre | Acceso |
|-----|-------|--------|--------|
| Estudiante | student@vinki.dev | Ana Garcia | Dashboard, entrevistas, feedback, plan de estudio |
| Estudiante | luis@vinki.dev | Luis Fernandez | Dashboard, entrevistas, feedback |
| Estudiante | sofia@vinki.dev | Sofia Ramirez | Dashboard, entrevistas, feedback |
| Reclutador | recruiter@vinki.dev | Carlos Mendez | Panel de reclutador, perfiles de estudiantes |
| Admin | admin@vinki.dev | Maria Torres | Todo + admin preguntas, analytics, auditoria |

---

## Tests

```bash
# Backend (62 tests)
cd backend && npm test

# Frontend (31 tests)
cd frontend/app && npx vitest run

# E2E - Playwright (9 tests, requiere app corriendo)
cd frontend/app && npx playwright test
```

| Modulo | Tests | Cubre |
|--------|-------|-------|
| AuthService | 14 | registro, login, perfil, contrasena |
| EvaluationProcessor | 8 | persistencia, EMA, eventos, reintentos |
| MockEvaluator | 6 | scores, niveles, feedback |
| InterviewsService | 12 | crear, buscar, finalizar |
| AnswersService | 9 | enviar, actualizar, validaciones |
| ReportsService | 13 | dashboard, reporte, percentiles |
| Frontend hooks | 10 | useTheme, usePageTitle, interviewStore |
| Frontend pages | 10 | Login, Register, Breadcrumbs, ErrorBoundary, API |
| Frontend components | 3 | ProgressChart, App |
| E2E (Playwright) | 9 | auth, interview, smoke |
| **Total** | **94** | |

---

## Activar evaluacion con IA real

Por defecto, `LLM_SANDBOX=true` usa respuestas simuladas (no consume API de OpenAI).

Para activar la evaluacion real con `gpt-4o-mini`:

```bash
# En backend/.env (local) o .env (Docker):
OPENAI_API_KEY=sk-tu-key-real
LLM_SANDBOX=false

# Reiniciar el backend
docker compose restart backend  # Docker
# o Ctrl+C y npm run start:dev  # local
```

## Arquitectura

Ver [diagramas de arquitectura](docs/architecture.md) para:
- Diagrama de contexto (C4)
- Flujo de entrevista
- Pipeline de evaluación IA
- Modelo de datos

## Estructura del proyecto

```
vinki-proyecto_de_grado/
├── backend/                 # NestJS API
│   ├── src/
│   │   ├── auth/           # Autenticación JWT
│   │   ├── catalogs/       # Catálogos + admin CRUD
│   │   ├── common/         # Prisma, audit service
│   │   ├── evaluation/     # Pipeline IA (BullMQ)
│   │   ├── health/         # Health check
│   │   ├── interviews/     # Entrevistas + respuestas
│   │   ├── notifications/  # SSE + email
│   │   └── reports/        # Dashboard + reportes
│   └── prisma/             # Schema + migraciones
├── frontend/app/           # React SPA
│   ├── src/
│   │   ├── api/            # HTTP client
│   │   ├── components/     # Componentes compartidos
│   │   ├── hooks/          # Custom hooks
│   │   ├── i18n/           # Traducciones ES/EN
│   │   ├── pages/          # Páginas por feature
│   │   ├── store/          # Zustand stores
│   │   ├── styles/         # CSS + theme
│   │   └── theme/          # Design tokens
│   └── tests/e2e/          # Playwright tests
├── specs/                  # Especificaciones
├── .github/workflows/      # CI pipeline
└── docker-compose.yml      # 5 servicios
```

## Tests

| Módulo | Tests | Cobertura |
|--------|-------|-----------|
| AuthService | 14 | registro, login, perfil, contraseña |
| EvaluationProcessor | 8 | persistencia, EMA, eventos, reintentos |
| MockEvaluator | 6 | scores, niveles, feedback |
| InterviewsService | 12 | crear, buscar, finalizar |
| AnswersService | 9 | enviar, actualizar, validaciones |
| ReportsService | 13 | dashboard, reporte, percentiles |
| Frontend hooks | 7 | useTheme, interviewStore |
| Frontend pages | 6 | LoginPage, ProgressChart, App |
| E2E (Playwright) | 9 | auth, interview, smoke |
| **Total** | **84** | |

## Licencia

Proyecto académico — Universidad Privada Boliviana (UPB)
