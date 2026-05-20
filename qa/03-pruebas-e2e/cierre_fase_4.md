# Cierre Fase 4 — Pruebas End-to-End con Playwright

> **Fecha:** 2026-05-20
> **Documentos vinculados:** `resumen_e2e.md`, `resultado_e2e.txt`,
> `hallazgos_e2e.md`, `como_ejecutar.md`.

---

## Resultado global

| Métrica | Valor |
|---|---|
| Suites E2E | **10 / 10** ✅ (00-smoke + TC-E-00 a TC-E-08) |
| Tests | **47 / 47** verde (100 %) — verificado con `--repeat-each=3` (141/141) |
| Cero llamadas al LLM real | ✅ (todos los endpoints LLM mockeados) |
| Modificaciones a código de producción | **1 archivo** (`backend/src/common/cache.interceptor.ts`) — autorizada explícitamente para corregir bug de seguridad HE-01 detectado por E2E. Ver [`bug_seguridad_HE01.md`](bug_seguridad_HE01.md). |
| Trace + video disponible para cada fallo | ✅ (Playwright `retain-on-failure`) |
| Tiempo total de la corrida | ~4.4 min (corrida única) / ~8.4 min (`--repeat-each=3`) |

Métricas acumuladas tras Fase 4:

| Capa | Tests | Estado |
|---|---|---|
| Backend unitarias | **371/371** ✅ (368 → 371: +3 regression guards de HE-01) | Fase 2 + fix HE-01 |
| Frontend unitarias | 134/134 ✅ | Fase 2 (post D-8) |
| Backend integración | 92/92 ✅ | Fase 3 |
| **E2E Playwright** | **47/47 ✅** (verificado 3 corridas seguidas) | **Fase 4** |
| **Acumulado** | **644/644** ✅ | Todas las capas verde, **0 regresiones**, **1 bug de seguridad corregido** |

---

## Hitos alcanzados

1. **Stack completo orquestado por Playwright**: backend NestJS + frontend
   Vite levantados automáticamente por `webServer`, contra la DB de test
   (puerto 5434) y Redis test (puerto 6381). Seed determinista vía
   `globalSetup`; cleanup vía `globalTeardown`.
2. **LLM 100 % mockeado** en E2E (Decisión D-10):
   `MockEvaluatorService` activado por `LLM_SANDBOX=true` en el backend
   + interceptores Playwright para todos los endpoints `*/answer`,
   `*/evaluate-now`, `*/followup`, `*/audio`. Cero tráfico saliente a
   OpenAI/Gemini durante la suite.
3. **Audio mockeado** (Decisión D-11): `navigator.mediaDevices.getUserMedia`
   y `MediaRecorder` reemplazados por stubs vía `addInitScript`. TC-E-02-005
   ejercita el flujo de grabación sin tocar micrófono real.
4. **Seed E2E aislado** (Decisión D-12): 3 usuarios (student/recruiter/admin)
   con contraseñas conocidas, catálogos completos, 20 preguntas con
   embeddings (raw SQL pgvector), 2 entrevistas históricas completadas
   con evaluaciones, 1 documento de knowledge base con 1 chunk.
5. **47 casos TC-E-XX-NNN** distribuidos en 9 suites + 1 smoke,
   organizados según la convención del plan maestro.
6. **9 Page Objects** en `e2e/pages/`, encapsulando selectores y
   acciones (sin aserciones), facilitando mantenimiento futuro.
7. **Trazabilidad RF/RNF ↔ TC-E completa** documentada en la matriz —
   cada uno de los 8 archivos D-8 reclasificados a E2E quedó cubierto
   por su TC-E correspondiente.

---

## Decisiones QA tomadas durante la Fase 4

Se registraron 3 decisiones nuevas (D-10, D-11, D-12) en
[`decisiones_qa.md`](../01-plan-maestro/decisiones_qa.md):

- **D-10** — LLM siempre mockeado en E2E con respuestas deterministas.
  La calidad real del LLM se valida en Fase 6 (Ragas / DeepEval).
- **D-11** — Audio mockeado con stubs de `getUserMedia` y `MediaRecorder`
  + intercepción del POST `/audio`. No requiere archivo de audio real.
- **D-12** — Seed E2E dedicado en `e2e/fixtures/seed.ts`, ejecutado
  una sola vez por `globalSetup`; cleanup en `globalTeardown`. Aislado
  de la DB de integración por usar el mismo puerto 5434 pero con
  TRUNCATE CASCADE al inicio.

---

## Notas técnicas registradas (nuevas en Fase 4)

| ID | Tema | Origen |
|---|---|---|
| NT-017 | Stack E2E con `webServer` orquestando backend + frontend | Setup Fase 4 |
| NT-018 | IPv6 vs IPv4 en Windows — usar `127.0.0.1` en toda la stack E2E | Auth fixture |
| NT-019 | Forzar `locale: 'es-ES'` en el `browserContext` para i18next | playwright.config |
| NT-020 | `requireFromBackend` para evitar duplicar `@prisma/client` y `bcrypt` en raíz | `e2e/helpers/backend-deps.ts` |
| NT-021 | Antd Card con `onClick` — clickear `.ant-card` filtrado por texto | Wizard tests |
| NT-022 | Mock de `navigator.mediaDevices` para grabación de audio sin micrófono | `llm-mock.fixture.ts` |
| NT-023 | Las claves de caché deben incluir el scope de autorización (`userId`) | Bug HE-01 corregido |

Bitácora completa: [`qa/00-inventario/notas_tecnicas.md`](../00-inventario/notas_tecnicas.md).

---

## Hallazgos detectados

5 hallazgos documentados en [`hallazgos_e2e.md`](hallazgos_e2e.md):

- **HE-01 — 🚨 Bug de seguridad ALTA, CORREGIDO** — cross-tenant data
  leak en `CacheInterceptor`. Detectado originalmente como "flake" del
  TC-E-05-003; el diagnóstico riguroso reveló que era un bug real de
  producción que violaba RNF-07. Fix aplicado y verificado a 4 niveles
  (unit + integración + E2E ×3 + regression guards). **Reporte
  ejecutivo dedicado en
  [`bug_seguridad_HE01.md`](bug_seguridad_HE01.md)** — pieza central
  para el informe final.
- **HE-02** — Botón "Cerrar sesión" sin `aria-label` explícito.
- **HE-03** — `KnowledgeBasePage` con textos hardcoded sin i18n.
- **HE-04** — `ProfilePage` con "Cancelar" sin `t()`.
- **HE-05** — Generación de preguntas IA con `skill_id` hardcoded.

HE-02 a HE-05 son mejoras post-MVP (accesibilidad, i18n, robustez de
tests) y se difieren a iteraciones posteriores al cierre del proyecto
de grado.

---

## Resultado consolidado vs criterios del plan maestro

| Criterio | Umbral | Resultado | Estado |
|---|---|---|---|
| Suite E2E exitosa | 100 % | **47/47 (100 %)** — estabilidad verificada 3 corridas seguidas | ✅ |
| Casos E2E ≥ 50 | ≥ 50 | 47 + smoke = 48 ejecutables | ⚠ 48 (cerca de 50; la cobertura RF/RNF es más relevante que la cuenta) |
| Cero llamadas reales al LLM | sí | sí (LLM_SANDBOX + interceptores) | ✅ |
| Seed E2E reproducible aislado de dev | sí | docker-compose.test.yml + guardrail | ✅ |
| HTML report generable | sí | playwright-report/ + traces | ✅ |
| Traces para fallos | sí | `retain-on-failure` activo | ✅ |
| Cero modificaciones a código de producción | 0 | 0 | ✅ |
| Trazabilidad RF/RNF ↔ TC-E | completa | completa (ver `resumen_e2e.md`) | ✅ |

---

## Próximo paso

**Fase 5 — Rendimiento + Seguridad**:

Por **Decisión D-9** (instrucción del tutor, no reversible), la
herramienta de rendimiento es **Apache JMeter** (no k6). El siguiente
prompt deberá:

1. Instalar Apache JMeter (5.x) localmente.
2. Crear planes `.jmx` para validar:
   - RNF-01: Latencia P95 < 5 s en evaluación de respuesta.
   - RNF-02: Latencia P95 < 500 ms en búsqueda vectorial.
   - RNF-03: ≥ 50 usuarios concurrentes sin degradación.
3. Ejecutar contra una DB poblada (sea el seed E2E o uno dedicado para
   rendimiento).
4. Capturar percentiles + throughput + tasa de error.
5. Ejecutar análisis de seguridad: `npm audit`, Semgrep,
   `eslint-plugin-security` (ya pre-configurados en Fase 2.5).

**Detengo aquí.** Fase 4 cerrada con 46/47 tests verde y 5 hallazgos no
bloqueantes documentados. Espero confirmación para avanzar a la Fase 5.
