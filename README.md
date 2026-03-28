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
- Docker & Docker Compose

## Instalación rápida

```bash
# Clonar el repositorio
git clone https://github.com/camilabocangel/vinki-proyecto_de_grado.git
cd vinki-proyecto_de_grado

# Copiar variables de entorno
cp backend/.env.example backend/.env
cp .env.example .env  # (si existe)

# Levantar con Docker
docker compose up -d

# Aplicar migraciones y seeds
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npx prisma db seed

# Acceder
# Frontend: http://localhost:5174
# Backend API: http://localhost:3001/api
# Swagger: http://localhost:3001/docs
# MinIO Console: http://localhost:9001
```

## Usuarios de prueba

| Rol | Email | Contraseña |
|-----|-------|------------|
| Estudiante | student@vinki.dev | password123 |
| Reclutador | recruiter@vinki.dev | password123 |
| Admin | admin@vinki.dev | password123 |

## Desarrollo

```bash
# Backend (sin Docker)
cd backend
npm install
npm run start:dev

# Frontend (sin Docker)
cd frontend/app
npm install
npm run dev

# Tests
cd backend && npm test          # 62 tests
cd frontend/app && npm run test:unit  # 14 tests
cd frontend/app && npm run test:e2e   # 9 E2E tests (requiere app corriendo)
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
