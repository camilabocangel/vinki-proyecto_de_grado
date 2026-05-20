# Cierre Fase 3 — Pruebas de integración + integridad de datos

> **Fecha:** 2026-05-20
> **Documentos vinculados:** `resumen_integracion.md`,
> `resultado_integracion.txt`, `setup_summary.md`.

---

## Resultado global

| Capa | Suites | Tests | Verde | Tiempo |
|---|---|---|---|---|
| Integridad (A.1 – A.4) | 4 | 44 | ✅ 100 % | ~ 12 s |
| API end-to-end (B.1 – B.4) | 4 | 37 | ✅ 100 % | ~ 26 s |
| DTOs (C.1) | 1 | 11 | ✅ 100 % | ~ 6 s |
| **Total Fase 3** | **9** | **92** | ✅ 100 % | ~ 44 s |

Métricas globales tras Fase 3:

| Capa | Tests | Estado |
|---|---|---|
| Backend unitarias | 368/368 ✅ | Aceptado en Fase 2 |
| Frontend unitarias | 134/134 ✅ | Aceptado en Fase 2 (post D-8) |
| **Backend integración** | **92/92** ✅ | **Cerrado en Fase 3** |
| **Acumulado** | **594/594** | ✅ |

---

## Hitos alcanzados

1. **Infraestructura de pruebas dedicada** funcionando: docker-compose
   aislado (postgres-test:5434, redis-test:6381), `.env.test` con
   sandbox de LLM, guardrail anti-dev-DB en `setup.ts`.
2. **Migración Prisma D-1 efectivamente verificada**: las 7 CHECK
   constraints (`chk_*`) instaladas por
   `20260519120000_add_check_constraints` rechazan inserts inválidos
   con error de PostgreSQL nombrado.
3. **Cascadas ON DELETE verificadas**: `interview → questions →
   answers → answer_evaluation` borra en cadena; ningún over-cascade
   detectado en hermanos no relacionados.
4. **UNIQUE constraints validados** en `users.email`, catálogos por
   nombre, y `user_skill_scores (user_id, skill_id)`.
5. **FK obligatorias validadas**: inserts con IDs inexistentes y con
   columnas obligatorias en `null` rechazan con error referencial.
6. **Aislamiento por propietario (RNF-07)** verificado E2E: student A
   no puede leer / cerrar / responder entrevistas de student B (403).
7. **Bcrypt + salt rounds 10 (RNF-05)** verificado leyendo el hash
   persistido y validándolo con `bcrypt.compare`.
8. **Validación de DTOs (RNF-08)** verificada en el borde HTTP:
   propiedades extra rechazadas, tipos, enums, longitudes.
9. **Pipeline asíncrono completo** (interview → finish → BullMQ →
   EvaluationProcessor → AnswerEvaluation + UserSkillScore →
   evaluationStatus completed) ejecutado contra Redis y Postgres
   reales en B.4.
10. **0 modificaciones a código de producción** durante toda la fase.

---

## Decisiones QA tomadas durante la Fase 3

Ninguna decisión D-X adicional fue necesaria — las decisiones D-1 a
D-8 acordadas en Fases 1 y 2 cubrieron todas las situaciones que
surgieron. Las observaciones puntuales sobre comportamiento del
sistema (Guards antes de Pipes, RS256 requiere PEM real, ESM de
`uuid` v13) se registraron como Notas Técnicas, no como decisiones.

---

## Notas técnicas registradas (nuevas en Fase 3)

| ID | Tema | Origen |
|---|---|---|
| NT-011 | Test DB con docker-compose aislado por puertos y volumen | Setup Fase 3 (A.x) |
| NT-012 | `transformIgnorePatterns` whitelist para `uuid` v13 ESM en integración | B.1 bootstrap |
| NT-013 | JWT RS256 requiere par RSA real (PEM) almacenado con `\n` escapado en `.env.test` | B.1 bootstrap |
| NT-014 | NestJS ejecuta Guards ANTES que Pipes — login con email inválido devuelve 401, no 400 | B.1 RF-02 |
| NT-015 | Polling sobre `evaluationStatus` para validar el worker BullMQ async | B.4 RF-19/20 |
| NT-016 | `createQuestionWithEmbedding` vía raw SQL para `vector` de pgvector | B.3 |

Bitácora completa: [`qa/00-inventario/notas_tecnicas.md`](../00-inventario/notas_tecnicas.md).

---

## Diferimientos confirmados (sin cambios respecto a Fase 2)

Las features diferidas por D-5 y D-7 siguen excluidas. No se cubrieron
en Fase 3 porque tampoco están instrumentadas en Fase 2. La cobertura
RF/RNF que demanda el plan maestro no las requiere.

| ID | Alcance diferido | Sigue diferido |
|---|---|---|
| D-5 | RF-37 a RF-41 (CRUD admin de catálogos) | ✅ |
| D-7 | `achievements`, `challenges`, `notifications`, `reports` avanzado | ✅ |
| D-8 | 8 páginas frontend > 500 LOC → E2E Playwright | Fase 4 |

---

## Resultado consolidado vs criterios del plan maestro

| Criterio | Umbral | Resultado | Estado |
|---|---|---|---|
| Suite integración verde | 100 % | 92/92 | ✅ |
| RNFs de integridad cubiertos (RNF-09 a RNF-20) | 12/12 | 12/12 | ✅ |
| RNF-07 (autorización) E2E | sí | sí (B.2) | ✅ |
| RNF-05 (bcrypt) verificado | sí | sí (B.1) | ✅ |
| RNF-08 (validación DTO) E2E | sí | sí (C.1) | ✅ |
| Cero modificaciones a código de producción | 0 | 0 | ✅ |
| Trazabilidad RF/RNF ↔ tests TC-I-XXX | completa | completa | ✅ |
| Infraestructura aislada de dev | sí | docker-compose.test.yml + guardrail | ✅ |

---

## Próximo paso

**Fase 4 — Pruebas E2E con Playwright (Decisión D-8 aplicada)**:

Cubrir los 8 flujos `TC-E-01` a `TC-E-08` declarados en
`qa/01-plan-maestro/diferidos_qa.md` § D-8 contra el stack levantado:

- TC-E-01 InterviewWizardPage — multi-step submit
- TC-E-02 InterviewSessionPage — flujo de respuesta + audio (mocked)
- TC-E-03 FeedbackPage — render con evaluación completa
- TC-E-04 FeedbackHistoryPage — paginación + filtros
- TC-E-05 DashboardPage — métricas reales del estudiante
- TC-E-06 ProfilePage — edición + cambio de contraseña
- TC-E-07 KnowledgeBasePage — upload + listado
- TC-E-08 AdminQuestionsPage — CRUD admin sandboxeado

Stack para Fase 4 (no instalado aún): Playwright + workers contra el
mismo docker-compose.test.yml, con el frontend buildeado y servido
estáticamente. La estrategia de seed determinista de Fase 3 se reusa.

**Detengo aquí.** Fase 3 cerrada y verde. Espero confirmación para
avanzar a la Fase 4 (Playwright E2E).
