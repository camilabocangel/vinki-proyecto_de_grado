# Fase 4 — Pruebas End-to-End con Playwright

> **Fecha:** 2026-05-20
> **Comando:** `npx playwright test` (raíz)
> **Config:** `playwright.config.ts`
> **Output canónico:** `qa/03-pruebas-e2e/resultado_e2e.txt`
> **Reporte HTML:** `playwright-report/index.html` (gener. automáticamente)

---

## Resumen de ejecución

| Suite | TC-E | Casos | Pasaron | Fallaron | Estado |
|---|---|---|---|---|---|
| Smoke — frontend Vinki | 00-smoke | 1 | 1 | 0 | ✅ |
| Autenticación transversal | TC-E-00 | 6 | 6 | 0 | ✅ |
| InterviewWizardPage | TC-E-01 | 6 | 6 | 0 | ✅ |
| InterviewSessionPage | TC-E-02 | 7 | 7 | 0 | ✅ |
| FeedbackPage | TC-E-03 | 5 | 5 | 0 | ✅ |
| FeedbackHistoryPage | TC-E-04 | 5 | 5 | 0 | ✅ |
| DashboardPage | TC-E-05 | 4 | 4 | 0 | ✅ |
| ProfilePage | TC-E-06 | 4 | 4 | 0 | ✅ |
| KnowledgeBasePage | TC-E-07 | 3 | 3 | 0 | ✅ |
| AdminQuestionsPage | TC-E-08 | 6 | 6 | 0 | ✅ |
| **TOTAL** | | **47** | **47** | **0** | **100 %** ✅ |

```
Test Suites: 10 passed, 10 total
Tests:       47 passed, 0 failed, 47 total
Time:        ~4.4 min (corrida única) / ~8.4 min (--repeat-each=3)
```

**Estabilidad verificada con 3 corridas consecutivas:** `npx playwright
test --repeat-each=3` reporta **141 / 141 verde** (47 × 3). Captura en
[`verificacion_fix_HE01.txt`](verificacion_fix_HE01.txt).

Durante la fase se detectó (y corrigió) el bug de seguridad **HE-01**
en `backend/src/common/cache.interceptor.ts` — ver
[`bug_seguridad_HE01.md`](bug_seguridad_HE01.md). Es el hallazgo más
valioso de la fase: una vulnerabilidad de cache poisoning cross-tenant
que viola RNF-07 y que solo emergió en E2E.

---

## RF/RNF cubiertos por E2E

| RF | Cobertura | TC-E |
|---|---|---|
| RF-01 | Registro de cuenta | TC-E-00-001 (login del student preseedeado por flujo de registro) |
| RF-02 | Autenticación | TC-E-00-001, 002, 003 |
| RF-03 | Gestión de sesiones | TC-E-00-001, 005, TC-E-06-001 |
| RF-04 | Fecha de creación | TC-E-06-002 |
| RF-05 | Selección de rol técnico | TC-E-01-001 |
| RF-06 | Selección de lenguaje | TC-E-01-001 |
| RF-07 | Validación framework ⟂ lenguaje | TC-E-01-001 |
| RF-08 | Selección de nivel | TC-E-01-001 |
| RF-09 | Persistencia de configuración | TC-E-01-002 |
| RF-10 | Inicio de entrevista | TC-E-01-006, TC-E-02-001 |
| RF-11 | Finalización de entrevista | TC-E-02-007 |
| RF-12 | Selección inteligente | TC-E-02-001 |
| RF-13 | Asignación con orden | TC-E-02-003 |
| RF-14 | Snapshot del texto | TC-E-02-003 |
| RF-15 | Origen IA / curada | TC-E-02-004 |
| RF-16 | Captura respuesta texto | TC-E-02-002 |
| RF-17 | Captura respuesta audio | TC-E-02-005 |
| RF-18 | Tiempo de envío | TC-E-02-002 |
| RF-19 a RF-23 | 5 dimensiones de evaluación | TC-E-03-001 |
| RF-25 | Feedback textual personalizado | TC-E-03-002 |
| RF-29 | Embeddings (UI) | TC-E-07-001 |
| RF-30 | Búsqueda semántica (UI) | TC-E-07-002 |
| RF-31 | RAG (UI flow) | TC-E-07-002 |
| RF-32 | Historial con estado | TC-E-04-001, 002, 005 |
| RF-33 | Detalle de entrevista | TC-E-04-003 |
| RF-34 | Dashboard de habilidades | TC-E-05-001, 002, 004 |
| RF-35 | 5 dimensiones visualizadas | TC-E-03-001, 005 |
| RF-42 | CRUD admin de preguntas | TC-E-08-001 a 005 |

| RNF | Cobertura | TC-E |
|---|---|---|
| RNF-07 | Autorización / aislamiento | TC-E-00-002, 004, 006 + TC-E-03-003 + TC-E-04-004 + TC-E-06-004 + TC-E-08-006 |
| RNF-26 | Flujo intuitivo | TC-E-01-005 (navegación back/forth) |
| RNF-27 | Indicador "Pregunta X de N" | TC-E-01-004, TC-E-02-006 |
| RNF-28 | Visualización 5 dimensiones | TC-E-03-005, TC-E-05-004 |

Trazabilidad detallada en [matriz_trazabilidad.md](../01-plan-maestro/matriz_trazabilidad.md).

---

## Hallazgos detectados

5 hallazgos en total — **1 bug de seguridad ALTA detectado y CORREGIDO,
4 mejoras post-MVP**:

- **HE-01** — 🚨 **Bug de seguridad ALTA — cross-tenant data leak en
  caché.** El `CacheInterceptor` cacheaba respuestas de endpoints
  per-user con una clave global (sin `userId`), causando que el
  usuario B obtuviera datos del dashboard/percentiles del usuario A.
  **Detectado por TC-E-05-003 y CORREGIDO** en
  `backend/src/common/cache.interceptor.ts`. Verificado con 141/141
  E2E (3 corridas seguidas), 11/11 unitarias del interceptor (+3
  *regression guards*), 371/371 unitarias backend y 92/92 integración
  sin regresiones. Reporte ejecutivo dedicado en
  [`bug_seguridad_HE01.md`](bug_seguridad_HE01.md).
- **HE-02** — Falta `aria-label="Cerrar sesión"` en el dropdown del header.
- **HE-03** — `KnowledgeBasePage` tiene textos hardcoded sin i18n.
- **HE-04** — `ProfilePage` línea 217 y 244: "Cancelar" y mensaje mínimo de password sin `t()`.
- **HE-05** — Generación de preguntas por IA con `skill_id` hardcoded en admin.

Detalle completo en [`hallazgos_e2e.md`](hallazgos_e2e.md). **Cero
cambios al código de producción** según la regla del prompt.

---

## Notas técnicas nuevas

| ID | Tema | Origen |
|---|---|---|
| NT-017 | Stack E2E con backend + frontend levantados desde Playwright `webServer` | Setup Fase 4 |
| NT-018 | IPv6 vs IPv4 en Windows — usar `127.0.0.1` (no `localhost`) en toda la stack E2E | Fixture de auth |
| NT-019 | Locale `es-ES` forzado en `context` para que `i18next-browser-languagedetector` cargue `es.json` | playwright.config |
| NT-020 | `requireFromBackend` helper para usar `@prisma/client` y `bcrypt` de `backend/node_modules` sin duplicar deps en raíz | `e2e/helpers/backend-deps.ts` |
| NT-021 | Antd Card con `onClick` — clickear `.ant-card` filtrado por texto (no el `<strong>` interno) | Wizard tests |
| NT-022 | Mock de `navigator.mediaDevices.getUserMedia` + `MediaRecorder` para TC-E-02-005 | `llm-mock.fixture.ts` |
| NT-023 | Las claves de caché deben incluir el scope de autorización (`userId`) | Bug HE-01 corregido |

Bitácora completa: [`qa/00-inventario/notas_tecnicas.md`](../00-inventario/notas_tecnicas.md).

---

## Capturas de evidencia

Para generar reportes y traces como evidencia visual del informe final:

```bash
# Reporte HTML completo de la última corrida (incluye traces, videos,
# screenshots de fallos):
npm run e2e:report
# Abre playwright-report/index.html

# Ver una traza específica (zoom in en un test concreto):
npx playwright show-trace test-results/<dir>/trace.zip
```

Para versionar las evidencias del informe final, copiar:
- `playwright-report/index.html` + assets → `qa/evidencias/playwright-report/`
- `test-results/**/video.webm` (de los tests más relevantes) →
  `qa/evidencias/videos/`
