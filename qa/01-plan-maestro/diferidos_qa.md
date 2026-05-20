# Módulos y funcionalidades diferidas del alcance de pruebas

## Origen

Este documento consolida los módulos y funcionalidades del código de
producción que se mantienen **fuera del alcance de pruebas** del proyecto
académico, conforme a las decisiones QA documentadas
(`decisiones_qa.md`). La regla rectora es la trazabilidad
**requerimientos ↔ tests**: cualquier código sin RF/RNF asociado en
`docs/requerimientos.md` queda fuera del alcance de pruebas unitarias.

---

## Diferidos por Decisión D-5 (Plan Maestro §13)

CRUD administrativo de catálogos: la administración no está implementada
como interfaz CRUD HTTP — los catálogos se poblan vía `prisma db seed`.

| RF | Módulo | Ruta | Justificación |
|---|---|---|---|
| RF-37 | Gestión de roles | `catalogs` (admin write) | Fuera del MVP — solo READ implementado |
| RF-38 | Gestión de lenguajes | `catalogs` (admin write) | Fuera del MVP — solo READ implementado |
| RF-39 | Gestión de frameworks | `catalogs` (admin write) | Fuera del MVP — solo READ implementado |
| RF-40 | Gestión de niveles | `catalogs` (admin write) | Fuera del MVP — solo READ implementado |
| RF-41 | Gestión de habilidades | `catalogs` (admin write) | Fuera del MVP — solo READ implementado |

> RF-42 (gestión de preguntas) **NO** está diferido: existe endpoint CRUD
> (`admin-questions.controller.ts`) y entra en el alcance de la
> Sub-corrida 3B.

---

## Diferidos por Decisión D-7 (Sub-corrida 3B)

Módulos presentes en el código pero no declarados en los 42 RF.

| Módulo / archivo | Ruta | Tipo | Justificación |
|---|---|---|---|
| Achievements | `backend/src/achievements/` | Gamificación (logros desbloqueables) | No declarado en `docs/requerimientos.md` |
| Challenges | `backend/src/challenges/` | Gamificación (desafíos + leaderboard) | No declarado en `docs/requerimientos.md` |
| Notifications (correo + SSE + listener) | `backend/src/notifications/` | Comunicación con el usuario | No declarado en `docs/requerimientos.md` |
| Reports — módulo completo | `backend/src/reports/*` (incluye `reports.service.ts`, `reports.controller.ts`, `shared-report.controller.ts`, `career-prediction.service.ts`, `transfer-learning.service.ts`, `job-profiles.ts`) | Lógica + HTTP wrappers + features avanzadas (predicción de carrera, transfer learning, perfiles de empleo, reportes compartibles) | No declarado como módulo en `docs/requerimientos.md`. La coherencia exige que, si el controller está fuera del MVP, su service también lo está. Los RF-32–RF-36 (visualización básica) se cubren a nivel de **frontend** (Sub-corrida 3C — dashboard, historial, gráficos), no en el backend. |

---

## Implementación técnica

### `coveragePathIgnorePatterns`

Los diferidos se excluyen de la métrica de cobertura mediante
`coveragePathIgnorePatterns` en el bloque `jest` de
`backend/package.json`. Los specs preexistentes (si los hay) siguen
ejecutándose con normalidad — la exclusión es de **instrumentación**, no
de ejecución.

### Diferidos D-5 sin exclusión explícita

Para los RF-37 a RF-41 NO se aplica `coveragePathIgnorePatterns` sobre el
módulo `catalogs/` completo: las operaciones de lectura sí están en
alcance (RF-05 a RF-08 — selección desde catálogo). Como las
funcionalidades de escritura admin no existen como endpoints HTTP
separados, no hay código que excluir; simplemente no se escriben tests
para esas funciones inexistentes.

---

## Reversibilidad

Cualquier diferimiento puede revertirse si el alcance del proyecto cambia.
La acción correctiva sería:

1. Ampliar `docs/requerimientos.md` con los RF correspondientes.
2. Quitar el path del `coveragePathIgnorePatterns` en `backend/package.json`.
3. Generar los specs siguiendo los patrones establecidos (AAA, mocks
   deterministas, sin tests vacíos).
4. Recalcular cobertura y actualizar la matriz de trazabilidad.

---

## Diferidos detectados durante 3B

> Sección actualizable. Si durante la Sub-corrida 3B aparece otro módulo
> no mapeado a un RF, se documenta aquí y se añade a
> `coveragePathIgnorePatterns` con la justificación.

Por ahora ninguno adicional.

---

## Diferimientos en frontend (Sub-corrida 3C)

Aplicando el mismo criterio de D-5 y D-7 al frontend (Sub-corrida 3C
del Prompt 3), se difieren los siguientes componentes/páginas/hooks por
no mapear a ningún RF declarado o por corresponder a features ya
diferidas en el backend. Configurados en
`frontend/app/vite.config.ts` (bloque `test.coverage.exclude`).

| Path | Origen | Justificación |
|---|---|---|
| `src/pages/admin/AdminAnalyticsPage.tsx` | D-7 | Analíticas globales no declaradas como RF (es la landing del admin tras un rediseño reciente) |
| `src/pages/challenges/*` | D-7 | Gamificación (challenges), espejo del módulo backend diferido |
| `src/pages/dashboard/AchievementsPage.tsx` | D-7 | Gamificación (achievements), espejo del módulo backend diferido |
| `src/pages/dashboard/CareerInsightsPage.tsx` | D-7 | Career prediction — feature avanzada de reports diferida |
| `src/pages/dashboard/StudyPlanPage.tsx` | Sin RF | "Plan de estudio" no está declarado entre los 42 RF |
| `src/pages/feedback/SharedReportPage.tsx` | D-7 | Reportes compartibles vía link temporal — espejo de `shared-report.controller.ts` |
| `src/pages/recruiter/*` | Sin RF | "Panel del reclutador", "Perfil de candidato", "Comparador", "Plantillas" — el actor recruiter aparece en el inventario pero los 42 RF no declaran un dashboard/comparador propio |
| `src/pages/home/HomePage.tsx` | Sin RF | Landing pública del sitio (no autenticada) — no mapea a ningún RF declarado; redirect post-login sí está cubierto por `lib/roleHome` y `ProtectedRoute` |
| `src/components/GlobalSearch.tsx` | Sin RF | Command-palette (Cmd+K) — UX no declarada en RF |
| `src/components/ThemeProvider.tsx` | Sin RF | Soporte de tema claro/oscuro — UX no declarada en RF |
| `src/hooks/useRateLimit.ts` | Sin RF | Rate limit del cliente — no declarado |
| `src/hooks/useSSE.ts` | D-7 | Server-Sent Events para notificaciones (D-7 difiere el módulo notifications) |
| `src/lib/axe.ts` | Helper de dev | Inicialización de axe-core en runtime de desarrollo (no es código de negocio) |

### Reversibilidad

Igual que en backend: si se amplía `docs/requerimientos.md` con RF
correspondientes (p. ej. RF de gamificación o de recruiter dashboard),
se quita la entrada del `exclude` del `vite.config.ts` y se generan los
specs siguiendo los patrones de RTL ya establecidos.

---

## Reclasificados a E2E (Decisión D-8)

> Origen: Decisión D-8 (`decisiones_qa.md`). Estos archivos **no son
> diferidos por falta de RF** — sí mapean a RF declarados; lo que se
> difiere es la capa donde se validan, no el alcance. Por la pirámide
> de testing, su validación natural es end-to-end (Fase 4 — Playwright).

Los specs unitarios existentes (`*.test.tsx`) **se mantienen activos**
como detección temprana de regresiones de render, pero el código fuente
**no contabiliza para la métrica unitaria de coverage**.

| Archivo | RF cubierto | TC-E previsto (Fase 4) | Spec unitario que se mantiene |
|---|---|---|---|
| `frontend/app/src/pages/interview/InterviewWizardPage.tsx` | RF-05 a RF-09 (configuración de entrevista) | **TC-E-01** | `InterviewWizardPage.test.tsx` (smoke focal) |
| `frontend/app/src/pages/interview/InterviewSessionPage.tsx` | RF-10 a RF-18 (simulación, captura de respuesta, follow-up, finalización) | **TC-E-02** | `InterviewSessionPage.test.tsx` (smoke focal) |
| `frontend/app/src/pages/feedback/FeedbackPage.tsx` | RF-25, RF-33, RF-35 (reporte con 5 dimensiones + feedback IA) | **TC-E-03** | `FeedbackPage.test.tsx` (smoke focal) |
| `frontend/app/src/pages/feedback/FeedbackHistoryPage.tsx` | RF-32 (historial paginado) | **TC-E-04** | `FeedbackHistoryPage.test.tsx` (smoke focal) |
| `frontend/app/src/pages/dashboard/DashboardPage.tsx` | RF-32, RF-34 (dashboard + gráficos agregados) | **TC-E-05** | `DashboardPage.test.tsx` (smoke focal) |
| `frontend/app/src/pages/profile/ProfilePage.tsx` | RF-03 (perfil + cambio de contraseña) | **TC-E-06** | `ProfilePage.test.tsx` (smoke focal) |
| `frontend/app/src/pages/knowledge/KnowledgeBasePage.tsx` | RF-29 a RF-31 (ingesta + búsqueda semántica RAG) | **TC-E-07** | `KnowledgeBasePage.test.tsx` (smoke focal) |
| `frontend/app/src/pages/admin/AdminQuestionsPage.tsx` | RF-42 (CRUD del banco de preguntas) | **TC-E-08** | `AdminQuestionsPage.test.tsx` (smoke focal) |

### Reversibilidad de D-8

Si en futuras sub-corridas se decide ampliar la cobertura unitaria de
alguno de estos archivos (p. ej. por imposibilidad de levantar
Playwright en el entorno de CI o por necesidad de TDD sobre un bug
concreto), se elimina la entrada correspondiente de `coverage.exclude`,
se profundizan los tests existentes y la métrica unitaria los volverá a
contar.
