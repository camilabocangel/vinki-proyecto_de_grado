# Implementation Plan: Vinki — Plataforma de Simulación de Entrevistas Técnicas

**Branch**: `001-build-new-project` | **Date**: 2026-03-19 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-build-new-project/spec.md`

## Summary

Vinki es una plataforma web full-stack para simulación de entrevistas técnicas para estudiantes de UPB. El estudiante configura una sesión (rol/lenguaje/framework/nivel), responde 5 preguntas técnicas seleccionadas semánticamente con `pgvector`, y al cerrar la entrevista se dispara un job BullMQ que invoca un LLM (OpenAI) evaluando cada respuesta en batch con rúbricas predefinidas. Los resultados se notifican al frontend vía SSE. Reclutadores pueden consultar métricas globales de todos los estudiantes; un admin gestiona el catálogo de preguntas.

## Technical Context

**Language/Version**: TypeScript 5.x — Node.js 20 (backend) / React 18 + Vite (frontend)  
**Primary Dependencies**:

- Backend: NestJS, Prisma (ORM), BullMQ + Redis (colas), `pgvector` (semantic search), OpenAI SDK, Passport + JWT, Pino (logs)
- Frontend: React 18, Ant Design, Zustand, TanStack Query, Vite, Vitest, Playwright

**Storage**: PostgreSQL 15 con extensión `pgvector`; Redis (colas BullMQ); S3-compatible (audio, registro complementario)  
**Testing**: Backend — Jest + Supertest (unit/e2e, ≥70% cobertura módulos críticos); Frontend — Vitest + React Testing Library (unit) + Playwright (E2E)  
**Target Platform**: Web app (desktop + mobile responsive); backend desplegado en Linux (Render/Fly.io); Docker Compose para desarrollo local  
**Project Type**: Web application full-stack (monorepo `backend/` + `frontend/app/`)  
**Performance Goals**: Endpoints no-IA < 200 ms p95; evaluación IA batch < 60 s (95% de sesiones); Lighthouse ≥ 90 en páginas críticas  
**Constraints**: JWT en cookies `httpOnly` exclusivamente; secretos en variables de entorno; WCAG 2.1 AA; rate limiting en endpoints públicos; OWASP Top 10  
**Scale/Scope**: ~50 entrevistas simultáneas activas; audiencia académica UPB v1; español únicamente

## Constitution Check

_GATE: Pre-Phase 0 — PASS ✅ | Re-check after Phase 1 design — PASS ✅_

- [x] **I. IA-First** — Sí. Todas las respuestas pasan por el pipeline RAG (pgvector retrieval + OpenAI LLM) en batch al cierre. Modo sandbox activable via `LLM_SANDBOX=true`.
- [x] **II. Tipado Estricto** — Plan incluye generación del esquema OpenAPI (NestJS Swagger) como prerrequisito de cualquier integración frontend. Cliente tipado con `openapi-typescript`. `strict: true` en ambos `tsconfig.json`.
- [x] **III. Test-First** — TDD mandatorio en módulos de auth, motor de entrevistas y pipeline IA. Cobertura objetivo ≥70% en backend. Cada US tiene flujo E2E Playwright.
- [x] **IV. Asincronía IA** — Job BullMQ único por entrevista al cierre; retries=3; DLQ habilitada. Frontend subscribes a SSE tras cerrar entrevista; muestra estado "procesando" con skeleton.
- [x] **V. Accesibilidad & Performance** — Auditorías axe en CI (Playwright + axe-playwright); Lighthouse CI en páginas críticas (≥90). Endpoints no-IA target <200ms p95.
- [x] **VI. Seguridad** — JWT access+refresh en cookies `httpOnly`; secretos en `.env` (nunca en repo); Prisma previene SQL injection; `class-validator` sanitiza inputs; `@nestjs/throttler` en endpoints públicos; OWASP Top 10 cubierto.

**No violations** — Complexity Tracking no requerido.

## Project Structure

### Documentation (this feature)

```text
specs/001-build-new-project/
├── plan.md              # Este archivo
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── openapi.yml      # API REST contract
│   └── sse-events.md    # SSE event schema
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── auth/              # JWT, guards, roles decorator
│   ├── users/             # User entity, profile endpoints
│   ├── catalogs/          # Languages, frameworks, levels, skills, questions
│   ├── interviews/        # Interview creation, question selection, answer storage
│   ├── evaluation/        # BullMQ job, RAG pipeline, LLM invocation, rubrics
│   ├── reports/           # Aggregated metrics, export (PDF/CSV)
│   ├── notifications/     # SSE gateway
│   └── common/            # Guards, interceptors, pipes, filters
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── test/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── .env.example
└── docker-compose.yml

frontend/app/
├── src/
│   ├── api/               # Generated OpenAPI client (openapi-typescript)
│   ├── store/             # Zustand stores (auth, interview, ui)
│   ├── pages/
│   │   ├── auth/          # Login, Register
│   │   ├── dashboard/     # Student dashboard
│   │   ├── interview/     # Wizard + live session
│   │   ├── feedback/      # Report + history
│   │   └── recruiter/     # Recruiter panel
│   ├── components/        # Reusable UI components
│   ├── hooks/             # useSSE, useAuth, useInterview
│   ├── styles/            # Tokens, global CSS
│   └── theme/             # Ant Design token overrides
├── tests/
│   └── e2e/               # Playwright suites
└── src/stories/           # Storybook

docs/
├── db.sql                 # Canonical schema + seeds
└── dbDiagram.txt
```

**Structure Decision**: Web application (Option 2) — monorepo con workspaces independientes `backend/` y `frontend/app/` bajo la raíz del repositorio, tal como establece la Constitución.

## Complexity Tracking

> No violations — tabla omitida.
