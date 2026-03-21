<!--
SYNC IMPACT REPORT
==================
Version change: 1.0.0 → 1.1.0
Bump rationale: MINOR — added Principle VII (Internacionalización / i18n)

Modified principles: N/A
Added sections:
  - Principle VII: Internacionalización (i18n) — react-i18next, es/en support
  - Stack Tecnológico: added i18n tooling (react-i18next)
Removed sections: N/A

Templates reviewed and aligned:
  - .specify/templates/plan-template.md  ✅ Constitution Check section already present
  - .specify/templates/spec-template.md  ✅ User story / acceptance criteria structure aligned
  - .specify/templates/tasks-template.md ✅ Test task guidance aligned with Principle III
  - .specify/templates/checklist-template.md ✅ No conflicting guidance

Follow-up TODOs: None — all fields resolved from project documentation.
-->

# Vinki Constitution

## Core Principles

### I. IA-First en Evaluación (NO NEGOCIABLE)

Toda respuesta registrada en una entrevista DEBE pasar por el pipeline RAG
(retrieval semántico con `pgvector` + invocación LLM). No se permiten
evaluaciones manuales como única fuente de calificación.

- La búsqueda semántica de preguntas mediante `pgvector` es obligatoria para
  la selección dinámica de preguntas en cada simulación.
- Las cinco métricas (`technical_correctness`, `clarity_of_explanation`,
  `communication`, `confidence`, `problem_solving`) DEBEN ser producidas por
  el modelo y persistidas en `answer_evaluations`.
- Un modo sandbox con respuestas simuladas está permitido **solo** durante
  desarrollo local para reducir costos LLM, pero DEBE ser desactivable por
  variable de entorno.

**Rationale**: La propuesta de valor central de Vinki es la evaluación
objetiva y escalable mediante IA; sin esto el producto no tiene diferencial.

### II. Tipado Estricto y Contratos de API

El código TypeScript en backend y frontend DEBE mantenerse estrictamente
tipado — `strict: true` en `tsconfig.json`, cero usos de `any` no
justificados.

- El backend DEBE exponer un esquema OpenAPI/Swagger actualizado en cada
  release; ese esquema es la única fuente de verdad del contrato HTTP.
- El frontend DEBE consumir la API exclusivamente a través de un cliente
  TypeScript generado desde el esquema OpenAPI (p. ej. con
  `openapi-typescript`). Ningún módulo puede realizar llamadas HTTP sin tipos
  explícitos.
- Los contratos DEBEN mantener retrocompatibilidad dentro de una misma versión
  MAJOR de la API.

**Rationale**: Un proyecto académico con múltiples integraciones (LLM, audio,
WebSocket) requiere contratos explícitos para evitar regresiones silenciosas.

### III. Test-First — Calidad No Negociable

TDD es mandatorio en los módulos críticos del backend (auth, motor de
entrevistas, pipeline de evaluación IA):

1. Tests escritos y revisados en equipo.
2. Tests corren en rojo.
3. Implementación hasta verde.
4. Refactor.

- Cobertura mínima: **70 %** en módulos críticos del backend, medida en CI.
- El frontend DEBE tener pruebas unitarias (Vitest + React Testing Library)
  para componentes de flujo de entrevista y feedback.
- Cada user story DEBE tener al menos un flujo E2E cubierto con Playwright
  antes de ser marcada como completada.

**Rationale**: El corto ciclo de un proyecto de grado eleva el riesgo de
regresiones; las pruebas automatizadas son la única red de seguridad viable.

### IV. Asincronía Obligatoria para Operaciones de IA

Ninguna evaluación LLM puede bloquear una respuesta HTTP síncrona.

- Toda evaluación DEBE encolarse en BullMQ (Redis) con reintentos
  configurados (mínimo 3) y Dead Letter Queue (DLQ) habilitada.
- El frontend DEBE recibir notificación del resultado vía WebSocket o SSE
  y mostrar estados de progreso claros durante el procesamiento.
- Los jobs de evaluación DEBEN emitir métricas de duración y tasa de error
  hacia el sistema de observabilidad.

**Rationale**: La latencia de los LLMs (2–30 s) hace inviable el modelo
síncrono; la asincronía además mejora la resiliencia ante fallos del proveedor.

### V. Accesibilidad y Performance (NO NEGOCIABLE)

- Todas las vistas públicas **DEBEN** cumplir WCAG 2.1 AA.
- Las auditorías con `axe` DEBEN ejecutarse en CI; ninguna violación crítica
  o seria puede mergearse a `main`.
- Los puntajes Lighthouse para páginas críticas (login, dashboard, entrevista,
  feedback) DEBEN superar **90** en Performance, Accessibility, Best Practices
  y SEO.
- Los endpoints del backend no relacionados con IA DEBEN responder con
  latencia **< 200 ms p95** bajo carga nominal.

**Rationale**: Vinki está dirigido a estudiantes y reclutadores de UPB;
la experiencia inclusiva y rápida es un requisito de calidad académica.

### VII. Internacionalización (i18n)

Todo texto visible al usuario en el frontend DEBE estar externalizado en
archivos de traducción (`src/i18n/locales/{lang}.json`) y accedido mediante
`useTranslation()` de `react-i18next`. No se permiten cadenas hardcoded en
componentes React.

- Los idiomas soportados son **español (es)** e **inglés (en)**.
  El idioma por defecto es español.
- Nuevas claves de traducción DEBEN añadirse en **todos** los archivos de
  idioma simultáneamente. Un PR que agregue claves solo en un idioma será
  rechazado.
- El selector de idioma DEBE estar accesible en el header de la aplicación.
- Las traducciones dinámicas (datos del servidor como nombres de roles, niveles
  o skills) se manejan en el backend y se devuelven en el idioma de la sesión
  del usuario en futuras iteraciones.

**Rationale**: La internacionalización permite demostrar escalabilidad de la
plataforma más allá del mercado hispanohablante, y es un diferenciador en la
defensa del proyecto de grado.

### VI. Seguridad (NO NEGOCIABLE)

- Los tokens JWT DEBEN transmitirse **exclusivamente** en cookies `httpOnly`;
  jamás en `localStorage` ni en headers expuestos al JS del cliente.
- Los secretos (API keys, credenciales de base de datos, tokens LLM) DEBEN
  gestionarse en variables de entorno cifradas o vault — nunca en el
  repositorio.
- Los inputs de usuario DEBEN sanitizarse en el backend antes de cualquier
  procesamiento o almacenamiento.
- Rate limiting DEBE implementarse en todos los endpoints públicos.
- El proyecto DEBE cumplir **OWASP Top 10** (broken access control, injection,
  cryptographic failures, etc.).

**Rationale**: Vínki almacena datos personales y audios de candidatos;
la privacidad y la integridad de los datos son obligaciones éticas y legales.

## Stack Tecnológico y Restricciones

**Backend**

- Runtime: Node.js 20 + TypeScript — NestJS como framework principal.
- Base de datos: PostgreSQL 15 con extensión `pgvector`.
  ORM: Prisma o TypeORM (acordar uno al inicio del proyecto y no mezclarlo).
- Mensajería / Colas: Redis + BullMQ para trabajos asincrónicos de evaluación.
- LLM: OpenAI / Azure OpenAI. Modo sandbox con respuestas simuladas para
  desarrollo local (ver Principio I).
- Almacenamiento de audio: S3-compatible (ej. MinIO local, AWS S3 en prod).
- Observabilidad: logs estructurados con Pino o Winston, métricas Prometheus,
  tracing OpenTelemetry (opcional pero recomendado).

**Frontend**

- Framework: React 18 + TypeScript con Vite como bundler.
- UI: Ant Design con tokens de identidad UPB/Vinki
  (`src/theme/tokens.ts` + CSS custom properties).
- i18n: `react-i18next` con detección automática de idioma del navegador.
  Traducciones en `src/i18n/locales/{es,en}.json`.
- Estado global: Zustand o Redux Toolkit para entrevistas y sesión de usuario.
- Fetching / Caché: TanStack Query (react-query).
- Testing: Vitest + React Testing Library (unit) + Playwright (E2E, contra
  servidor Vite real en `http://localhost:5173`).
- Documentación visual: Storybook para todos los componentes base.

**Base de datos**

- Esquema canónico: `docs/db.sql`. Toda migración DEBE incluir script de
  rollback. Los seeds básicos DEBEN ejecutarse con un solo comando.

**Monorepo**

- Estructura: `backend/` y `frontend/app/` como workspaces independientes
  bajo la raíz del repositorio.
- Husky + lint-staged activos; hooks en `.husky/`.

## Flujo de Desarrollo y Puertas de Calidad

1. **Pre-commit**: `lint-staged` + Husky ejecutan ESLint y Prettier sobre
   `frontend/app`. No se permite `--no-verify` sin justificación documentada
   en el PR.

2. **CI (GitHub Actions)**: `npm run check` (lint + format + unit + e2e list)
   en frontend; suite de pruebas del backend con reporte de cobertura. El CI
   DEBE pasar en verde antes de hacer merge a `main`.

3. **Revisión de código**: todo PR que impacte módulos de auth, evaluación IA
   o modelo de datos DEBE ser revisado por al menos un integrante del equipo
   distinto al autor.

4. **OpenAPI sincronizado**: cualquier cambio en los endpoints del backend
   DEBE reflejarse en el esquema OpenAPI y en el cliente frontend generado
   antes de marcar la tarea como completada.

5. **Documentación viva**: nuevos componentes de UI se documentan en Storybook;
   nuevos endpoints se incluyen en Swagger y en la colección Postman/Bruno con
   ejemplo de request/response.

6. **Checklist constitucional**: cada iteración DEBE completar el checklist
   generado por `/speckit.checklist` verificando cumplimiento de los seis
   principios antes del cierre del sprint.

## Governance

Esta constitución es el documento rector del proyecto Vinki. Ninguna decisión
de arquitectura, stack o práctica de calidad puede contradecirla sin pasar por
el proceso de enmienda formal.

**Proceso de enmienda**:

1. Abrir un issue describiendo la propuesta y la motivación.
2. Discusión en equipo con un mínimo de 48 horas de ventana.
3. Aprobación por mayoría simple del equipo.
4. Actualizar este documento con bump de versión siguiendo SemVer.
5. Propagar cambios a los templates dependientes
   (`.specify/templates/plan-template.md`, `spec-template.md`,
   `tasks-template.md`) y registrarlo en el Sync Impact Report de esta misma
   sección.

**Política de versiones SemVer**:

- **MAJOR**: eliminación o redefinición incompatible de un principio existente.
- **MINOR**: nuevo principio, nueva sección o expansión material de guía
  existente.
- **PATCH**: clarificaciones, correcciones de redacción, refinamientos no
  semánticos.

**Revisión de cumplimiento**: cada iteración/sprint DEBE incluir un
constitution check (ver sección homónima en
`.specify/templates/plan-template.md`) y el checklist generado por
`/speckit.checklist`.

**Version**: 1.1.0 | **Ratified**: 2026-03-19 | **Last Amended**: 2026-03-21
