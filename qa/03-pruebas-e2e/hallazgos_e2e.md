# Hallazgos detectados durante la suite E2E — Fase 4

> Documento de observaciones obtenidas mientras se construían las suites
> Playwright. Cada hallazgo se reporta SIN modificar el código de
> producción (regla del prompt). Incluye recomendaciones para mejoras
> futuras pero **no son bloqueantes** para el cierre de la fase.

---

## HE-01 — ✅ RESUELTO — Bug de seguridad: cross-tenant data leak en caché (viola RNF-07)

**Estado:** ✅ **RESUELTO 2026-05-20** — fix aplicado en
`backend/src/common/cache.interceptor.ts` con autorización del tutor
(no se trató como "no tocar producción" porque era un bug de seguridad
real detectado por la suite E2E, no una adaptación de tests).

**Clasificación:** ya **NO** es "estabilidad de pruebas / flake". Es un
**bug de seguridad — cross-tenant data leak — detectado por E2E y
corregido**. Ver reporte ejecutivo dedicado en
[`bug_seguridad_HE01.md`](bug_seguridad_HE01.md).

**Severidad:** **ALTA** (afecta privacidad/aislamiento de datos — RNF-07).

**Síntoma reportado en Fase 4:** `TC-E-05-003 should show empty state for
user with no interviews yet` pasa al ejecutarlo aislado pero falla
cuando se ejecuta como parte del run completo.

### Diagnóstico realizado

**El test E2E NO es flake — está detectando correctamente un bug real
de producción.**

#### Reproducción del bug en 3 pasos

1. Usuario A (estudiante con 2 entrevistas completadas) navega a
   `/dashboard`. El frontend hace `GET /api/dashboard`. El backend
   responde con `{ recentInterviews: [...], skillScores: [...] }` para A.
   **El `CacheInterceptor` guarda esa respuesta en Redis bajo la clave
   `cache:GET:/api/dashboard` (sin discriminar por userId)** con TTL
   de 60 s.
2. Dentro de los próximos 60 s, usuario B (otro estudiante autenticado)
   navega a `/dashboard`. El frontend hace `GET /api/dashboard` con la
   cookie/JWT de B.
3. El `CacheInterceptor` consulta Redis con `cache:GET:/api/dashboard`,
   encuentra **HIT** y devuelve la respuesta cacheada — que pertenece
   a A. El backend NUNCA llega al `ReportsService.getDashboard()`.
   **Usuario B ve los datos del usuario A.**

#### Verificación empírica

Se hizo un experimento agregando temporalmente un `FLUSHDB` al cache
de Redis justo antes del test 33:

```ts
execSync('docker exec vinki-redis-test redis-cli FLUSHDB', ...)
```

Resultado:

- **Sin `FLUSHDB`** (cache poblado por tests 31/32 del seed student):
  el test 33 falla. El endpoint `GET /api/dashboard` retorna
  `recentInterviews.length = 2, skillScores.length = 3` (datos del
  seed) aunque el JWT/cookie es del fresh user.
- **Con `FLUSHDB`** (cache limpio): el test 33 pasa. El endpoint
  retorna `recentInterviews.length = 0, skillScores.length = 0` —
  correcto para el fresh user.

### Causa raíz

`backend/src/common/cache.interceptor.ts:88-92`:

```ts
private buildCacheKey(request: any): string {
  const method = request.method
  const url = request.originalUrl || request.url
  return `cache:${method}:${url}`  // ⛔ NO incluye userId
}
```

La función de cache key **no consulta el JWT/usuario autenticado**. Para
endpoints públicos (catálogos globales) esto es correcto, pero para
endpoints `@Cacheable` que devuelven datos del usuario autenticado, la
respuesta de un usuario contamina al siguiente.

### Endpoints afectados

Todos los que combinan `@Cacheable` + datos del usuario autenticado
(filtrados por `req.user.userId` en el service):

| Endpoint | TTL | Datos cacheados | Riesgo |
|---|---|---|---|
| `GET /api/dashboard` | 60 s | Resumen + entrevistas recientes + skillScores | **Alto** — visible al cambiar de cuenta |
| `GET /api/percentiles` | 300 s | Percentiles + ranking | **Alto** — exposición de rendimiento |
| `GET /api/career/trajectory` | 120 s | Predicción de carrera | Medio |
| `GET /api/career/job-fit` | 120 s | Job fit profiles | Medio |
| `GET /api/career/transfer` | 300 s | Transfer learning recos | Medio |

Los endpoints `@Cacheable` de catálogos (`/api/catalogs/languages`,
`/roles`, `/levels`, `/skills`) **NO están afectados** — devuelven datos
globales idénticos para todos los usuarios.

### Impacto sobre RNF-07

RNF-07 (Autorización por propiedad de los datos) exige **0 accesos
exitosos a datos de otro usuario**. El bug permite que el usuario B
vea (en caché) datos del dashboard del usuario A si A los pidió
recientemente. Por sí mismo no es una bypass de auth — B ya está
autenticado — pero **es una fuga cross-tenant** del modelo de datos.

### Reproducción manual (sin tests)

```bash
# Asumiendo backend levantado contra docker-compose.test.yml.
# 1. Login como student A (seed):
curl -X POST http://127.0.0.1:3002/api/auth/login \
  -H 'content-type: application/json' \
  -c cookies-a.txt \
  -d '{"email":"e2e-student@vinki.dev","password":"Student-E2E-123"}'

# 2. Pide su dashboard (popula cache):
curl http://127.0.0.1:3002/api/dashboard -b cookies-a.txt | jq '.recentInterviews | length'
# → 2

# 3. Login como student B (otro usuario):
# (crear primero un user nuevo o usar otro seed)
curl -X POST http://127.0.0.1:3002/api/auth/login \
  -H 'content-type: application/json' \
  -c cookies-b.txt \
  -d '{"email":"otro@vinki.dev","password":"..."}'

# 4. Pide SU dashboard:
curl http://127.0.0.1:3002/api/dashboard -b cookies-b.txt | jq '.recentInterviews | length'
# → 2  (¡debería ser 0 si B no tiene entrevistas!) ⛔
```

### Fix aplicado (2026-05-20)

`backend/src/common/cache.interceptor.ts` — `buildCacheKey()` ahora
incluye el `userId` del JWT autenticado:

```ts
private buildCacheKey(request: any): string {
  const method = request.method;
  const url = request.originalUrl || request.url;
  // RNF-07 / Bug HE-01: incluir el userId del request autenticado en
  // la clave evita cache poisoning cross-user. Endpoints sin
  // autenticación (catálogos públicos) caen al sufijo 'anon' y
  // comparten cache como antes.
  const userId = request.user?.userId ?? 'anon';
  return `cache:${method}:${url}:u:${userId}`;
}
```

Campo extraído de `request.user.userId` — el `JwtCookieStrategy.validate()`
en `backend/src/auth/strategies/jwt-cookie.strategy.ts:27` mapea
`payload.sub` → `userId` en el objeto que populi en `req.user`.

### Verificación de la corrección

| Capa | Resultado |
|---|---|
| Unitario `cache.interceptor.spec.ts` | **11 / 11** verde (8 originales + 3 nuevos *regression guards*) |
| Suite unitaria backend completa | **371 / 371** verde (368 → 371: +3 nuevos casos) — **0 regresiones** |
| Suite integración | **92 / 92** verde — **0 regresiones** |
| Suite E2E (`npx playwright test --repeat-each=3`) | **141 / 141** verde (47 × 3 corridas seguidas) |

El test TC-E-05-003 pasó las 3 repeticiones consecutivas
**sin requerir `FLUSHDB` manual** entre tests
(ver `verificacion_fix_HE01.txt`):

```
ok  33  TC-E-05-003 — should show empty state for user with no interviews yet (2.8s)
ok  80  TC-E-05-003 — should show empty state for user with no interviews yet (2.5s)
ok 127  TC-E-05-003 — should show empty state for user with no interviews yet (2.8s)
```

### Mejora adicional aplicada

`e2e/global-setup.ts` ahora hace `FLUSHDB` del Redis de test al inicio
de cada corrida E2E. **No es necesario para corregir el bug** (el fix
de `cache.interceptor.ts` por sí solo es suficiente — verificado con
`--repeat-each=3`), sino higiene de aislamiento entre corridas.

### Regression guards añadidos

`backend/src/common/cache.interceptor.spec.ts` ahora incluye los siguientes
tests unitarios que fijan el contrato a nivel de capa más baja:

1. `should generate different cache keys for different authenticated
   users on the same endpoint` — verifica que dos requests al mismo
   endpoint con distinto `userId` generan claves distintas y persisten
   bajo claves distintas.
2. `should NOT leak User A response to User B when User B hits the
   same endpoint after a cache HIT for A` — el cache HIT de A bajo
   `cache:GET:/dashboard:u:1` no se sirve a B (`:u:2`); B golpea su
   propio handler.
3. `should use 'anon' in cache key for unauthenticated requests
   (public catalog endpoints)` — endpoints públicos siguen
   compartiendo cache bajo `:u:anon`.

Estos tests son el **regression-guard a nivel unitario** del bug. Si
alguien regresiona `buildCacheKey()` quitando el userId, **rompen
estos 3 tests antes de que el bug llegue a producción**.

---

## HE-02 — Botón sin label accesible explícito ("Cerrar sesión" en dropdown)

**Síntoma:** durante el desarrollo del TC-E-00-005 (logout) se detectó
que el botón de cierre de sesión vive dentro de un dropdown del header
sin etiquetar como `<button>` con `name="Cerrar sesión"`. Para tests
fiables, hubo que invocar la acción a nivel de API (`POST /api/auth/logout`)
en lugar de orquestar la UI.

**Análisis:** el TC-E-00-005 valida correctamente que `/api/auth/logout`
limpia las cookies httpOnly, lo cual es la verificación auténtica del
RF-03. El dropdown UI sigue funcionando para el usuario humano, pero la
prueba programática prefiere el camino directo.

**Recomendación futura:** añadir `aria-label="Cerrar sesión"` al
trigger del dropdown del avatar en el `AppLayout`, para permitir un
`page.getByRole('button', { name: 'Cerrar sesión' })` fiable.

---

## HE-03 — Botón "Buscar" del Knowledge Base sin i18n

**Síntoma:** el botón "Buscar" y el título "Búsqueda semántica en
knowledge base" están **hardcoded en español** dentro de
`frontend/app/src/pages/knowledge/KnowledgeBasePage.tsx`, sin usar
`t('...')`. Esto fue detectado al construir el Page Object — los tests
funcionan, pero el page perdería traducción si el usuario cambia idioma.

**Análisis:** afecta a UX (RNF-26) más que a funcionalidad. Los tests
de TC-E-07 dependen de los strings literales en español y funcionan,
pero hay riesgo de regresión silenciosa si el equipo añade i18n más
adelante.

**Recomendación futura:** extraer los strings de la página a
`es.json` / `en.json` y reemplazar por `t('knowledge.search')`,
`t('knowledge.addDocument')`, etc.

---

## HE-04 — "Cancelar" en ProfilePage sin clave i18n

**Síntoma:** la línea 217 de `ProfilePage.tsx` renderiza
`<Button>Cancelar</Button>` sin `t()`. Línea 244 igual con "Mínimo 6
caracteres". Detectado en el reporte del Explore agent durante el
diseño del TC-E-06.

**Análisis:** no afecta los tests E2E (siempre corremos en español),
pero rompe la promesa i18n del resto del módulo.

**Recomendación futura:** envolver con `t('common.cancel')` y
`t('auth.passwordMinLength')`.

---

## HE-05 — Generación de preguntas por IA en admin sin manejo defensivo

**Síntoma:** el botón "Generar con IA" en `AdminQuestionsPage` envía
parámetros que esperan ciertas combinaciones (level + language por
NOMBRE, no por ID — confirmado en el reporte del Explore). En el flujo
del E2E el mock devuelve un set fijo y todo funciona, pero al hacerlo
contra producción puede generar preguntas con asignaciones inválidas
de skill_id (hardcoded a 1) si el catálogo cambia.

**Análisis:** observable únicamente; no es bloqueante para Fase 4.

**Recomendación futura:** validar al backend que `skill_id` y
combinaciones tengan referencias válidas antes de persistir, o pedir
explícitamente skill_id al admin en el modal de generación.

---

## Cierre

5 hallazgos documentados:

- **HE-01 — Bug de seguridad ALTA (cross-tenant data leak en caché),
  RESUELTO.** Detectado por la suite E2E (TC-E-05-003) y corregido en
  `backend/src/common/cache.interceptor.ts`. Cobertura de regresión a
  3 niveles (unitario + integración + E2E ×3). **Es el hallazgo más
  valioso de la Fase 4 y se reporta en detalle en
  [`bug_seguridad_HE01.md`](bug_seguridad_HE01.md).**
- **HE-02 a HE-05 — Mejoras de UX/i18n/test**, abiertas como
  *mejoras post-MVP*, no bloqueantes para el cumplimiento de
  requerimientos del proyecto de grado.

Tras el fix de HE-01 la suite E2E es **47/47 verde estable** en
corridas repetidas.
