# Notas Técnicas del proceso de QA — Vinki

> Registro de hallazgos, decisiones técnicas y buenas prácticas
> establecidas durante el proceso de pruebas. Cada entrada tiene un
> ID NT-XXX y se ordena cronológicamente.

## NT-001 — Pineado de versión en comandos npx

**Fecha:** 2026-05-19

Durante la aplicación de la migración CHECK constraints se detectó
que `npx prisma migrate deploy` (sin pin de versión) descargó la
última versión del registro (Prisma 7.8.0), incompatible con el
schema 6.x del proyecto, generando error P1012.

**Acción correctiva aplicada:** usar siempre
`npx -y prisma@<versión pineada>` o invocar el binario local
(`node_modules/.bin/prisma`).

**Buenas prácticas establecidas:**
- Todos los comandos npx en scripts y CI deben pinear versión o
  usar el binario local del proyecto.
- Los workflows de CI/CD usan `npm ci` (no `npm install`) para
  garantizar versiones exactas del package-lock.
- La documentación de comandos incluye la versión usada.

## NT-002 — Patrón de mocking para módulos con RAG/Embeddings

**Fecha:** 2026-05-19

Tras reparar interviews.service.spec.ts se estableció el patrón
estándar para mockear servicios que dependen del módulo RAG:

- Mock de `RagQuestionGeneratorService` con métodos que retornan
  arrays vacíos o fixtures deterministas.
- Provider del token `EMBEDDING_PROVIDER` con implementación mock
  que retorna arrays de floats de longitud fija (verificar
  dimensión real en el código de IEmbeddingProvider).
- Cualquier nuevo spec que toque servicios con dependencias de RAG
  debe reutilizar este patrón.

## NT-003 — Mock de `uuid` v13 (ESM) en specs de NestJS

**Fecha:** 2026-05-19

Durante la Sub-corrida 3A se detectó que `uuid` v13 publica únicamente ESM
(`export { default as MAX } from './max.js'`) y Jest no lo transforma por
defecto. Cualquier spec que cargue —directa o transitivamente—
`AuthService` falla al arrancar con `SyntaxError: Unexpected token 'export'`.

**Acción correctiva aplicada:** en cada spec afectado se añade, antes de
los imports, el siguiente mock:

```ts
jest.mock('uuid', () => ({ v4: () => 'mock-uuid' }));
```

Archivos donde ya se aplicó (núcleo 3A): `auth.service.spec.ts`,
`auth.controller.spec.ts`, `strategies/local.strategy.spec.ts`. Se debe
replicar en cualquier spec futuro que cargue módulos que importen `uuid`.

## NT-004 — Tipado de `jest.fn(() => ...)` con `mock.calls`

**Fecha:** 2026-05-19

TypeScript en modo estricto infiere `jest.fn(() => X)` como una función sin
argumentos, lo que tipa `mock.calls` como tupla vacía `[]` y produce
`TS2493: Tuple type '[]' of length '0' has no element at index '0'` al
acceder a `mock.calls[0][0]`.

**Acción correctiva aplicada:** tipar explícitamente el mock como
`jest.fn<any, any[]>(() => ...)` para que `mock.calls` sea un array abierto.

Aplicado en los specs de los providers de Gemini
(`gemini-llm.service.spec.ts`, `gemini-embedding.service.spec.ts`). Reusar
el patrón en cualquier spec que necesite inspeccionar argumentos de un
mock construido con una *factory* sin parámetros.

## NT-005 — Mock fiel de `ConfigService.get(key, default)`

**Fecha:** 2026-05-19

`ConfigService.get(KEY, default)` devuelve el `default` cuando el valor no
está configurado. El mock genérico `jest.fn().mockReturnValue(value)`
ignora el segundo argumento del *call site*, lo que rompe los servicios
que dependen del default (p. ej. `MockEmbeddingService` parseando
`EMBEDDING_DIMENSIONS`).

**Acción correctiva aplicada:** usar `mockImplementation` que respete el
contrato real:

```ts
{ get: jest.fn().mockImplementation((_key, def) => value === undefined ? def : value) }
```

Reusar en cualquier spec que mockee `ConfigService` y dependa de defaults.

## NT-006 — `reflect-metadata` requerido en specs de class-validator directos

**Fecha:** 2026-05-19 (Sub-corrida 3B)

Los specs que invocan `validate()` de `class-validator` directamente
(sin pasar por NestJS) fallan con `TypeError: Reflect.getMetadata is not
a function`. La causa: `class-validator` y `class-transformer` dependen
del polyfill `reflect-metadata` para leer las decoraciones de la clase;
otros specs lo cargan transitivamente vía NestJS, pero los aislados no.

**Acción correctiva aplicada:** importar `reflect-metadata` como primer
import en el spec afectado.

Detectado y aplicado en `backend/src/common/env.validation.spec.ts`.

## NT-008 — `userEvent.setup()` v14 instala stub de `navigator.clipboard`

**Fecha:** 2026-05-20 (Sub-corrida 3C)

`@testing-library/user-event` v14 reemplaza `navigator.clipboard` por su
propio stub al llamar `userEvent.setup()`, sobrescribiendo cualquier
mock previo (incluso si fue puesto con `Object.defineProperty`). Esto
rompe tests que validan llamadas a `navigator.clipboard.writeText(...)`
disparadas por código de aplicación (no por el usuario).

**Acción correctiva:** usar `fireEvent.click(...)` (no toca el clipboard
del user-event) o definir el mock **después** de `userEvent.setup()`.

Detectado y aplicado en `frontend/app/src/components/CodeEditor.test.tsx`.

## NT-009 — Mocks dummy para hooks que requieren APIs no presentes en jsdom

**Fecha:** 2026-05-20 (Sub-corrida 3C)

Algunos hooks (p. ej. `useSSE`) dependen de APIs del navegador que jsdom
no implementa (`EventSource`). Cuando un page que importa esos hooks se
testea, el render explota con `ReferenceError`. Solución: mockear el
hook completo en el spec del page que lo consume:

```ts
vi.mock('../../hooks/useSSE', () => ({
  useSSE: () => undefined,
  default: () => undefined,
}))
```

Aplicable cuando el hook en cuestión está diferido por D-7 (no se va a
testear directamente) y es solo un detalle de implementación del page.

## NT-010 — Patrón "smoke focal" para archivos > 500 LOC en frontend

**Fecha:** 2026-05-20 (Sub-corrida 3C)

Para páginas React de gran tamaño (700+ líneas, multi-step wizards,
estado complejo, múltiples queries), los tests unitarios cubren tres
caminos críticos:

1. Render inicial sin crash (con queries pendientes).
2. Disparo de las queries iniciales esperadas.
3. Render del shape básico cuando los datos llegan (vacío y con data).

Los flujos completos (submit multi-step, expand collapse, download
report, drag & drop upload, audio recording end-to-end) se cubren en
**Playwright E2E (Fase 5)**, NO en unitarias. Razón: jsdom + RTL son
frágiles para interacciones complejas y duplican esfuerzo con E2E.

Aplicado en: `InterviewWizardPage`, `InterviewSessionPage`,
`FeedbackPage`, `FeedbackHistoryPage`, `DashboardPage`, `ProfilePage`,
`KnowledgeBasePage`, `AdminQuestionsPage`.

## NT-007 — Pasa-through interceptor en tests de controladores

**Fecha:** 2026-05-19 (Sub-corrida 3B)

Cuando un controlador declara `@UseInterceptors(CacheInterceptor)` a
nivel de clase (p. ej. `CatalogsController`), el interceptor real
necesita Redis para funcionar. En tests unitarios eso introduce una
dependencia que no queremos: el objetivo es probar el controller, no el
interceptor.

**Acción correctiva aplicada:** usar
`Test.createTestingModule(...).overrideInterceptor(CacheInterceptor)
.useValue(passThroughInterceptor)` con:

```ts
const passThroughInterceptor: NestInterceptor = {
  intercept(_: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle();
  },
};
```

Reusable en cualquier spec de controller que tenga interceptores
sensibles a infraestructura externa.

## NT-011 — Test DB aislada por docker-compose dedicado

**Fecha:** 2026-05-20 (Fase 3 — setup)

Para la suite de integración se usa
`docker-compose.test.yml` independiente del de desarrollo, con:

- `vinki-postgres-test` en puerto **5434** (dev usa 5433), volumen
  `pgdata_test` y DB `vinki_test`.
- `vinki-redis-test` en puerto **6381** (dev usa 6380).

**Buena práctica establecida:** todos los recursos de test llevan
sufijo `-test` y puertos distintos para que sea físicamente imposible
correr la suite contra la DB de desarrollo. Adicionalmente,
`test/integration/setup.ts` aborta el proceso si detecta que
`DATABASE_URL` apunta a `:5433` o a `/vinki?schema=public`.

## NT-012 — `transformIgnorePatterns` para `uuid` v13 ESM en integración

**Fecha:** 2026-05-20 (Fase 3 — B.1 bootstrap)

En las unitarias usamos `jest.mock('uuid', () => ({ v4: () => 'mock-uuid' }))`
(NT-003) porque queremos UUIDs deterministas. En la suite de
**integración**, sin embargo, queremos UUIDs reales para los claims
`jti` de los JWT que se persisten en la DB. El problema persistente:
`uuid` v13 publica solo ESM y Jest ignora `node_modules` por defecto
para transformaciones.

**Acción correctiva aplicada:** en
`backend/test/integration/jest-integration.config.ts`:

```ts
transformIgnorePatterns: ['node_modules[\\\\/](?!uuid)'],
```

(Patrón Windows-friendly: acepta `\\` o `/`.) ts-jest ahora transforma
`uuid` y los específicos imports `from 'uuid'` funcionan en runtime
sin mock.

## NT-013 — JWT RS256 requiere par RSA real (PEM) en `.env.test`

**Fecha:** 2026-05-20 (Fase 3 — B.1 bootstrap)

`backend/src/auth/auth.module.ts` configura `JwtModule` con
`algorithm: 'RS256'`. Esto exige claves asimétricas en formato PEM —
strings arbitrarias rompen el bootstrap con
`Error: secretOrPrivateKey must be an asymmetric key`.

**Acción correctiva:** generar un par RSA-2048 *de prueba* y
almacenarlo en `backend/.env.test` con saltos de línea escapados como
`\n` literal. Tanto `auth.module.ts` como `jwt-cookie.strategy.ts`
hacen `.replace(/\\n/g, '\n')` al cargar la variable, convirtiéndolo
en PEM válido en runtime.

Snippet para regenerar el par:

```pwsh
node -e "const c = require('crypto'); const {privateKey, publicKey} = c.generateKeyPairSync('rsa', {modulusLength: 2048, publicKeyEncoding: {type: 'spki', format: 'pem'}, privateKeyEncoding: {type: 'pkcs8', format: 'pem'}}); console.log(privateKey); console.log(publicKey);"
```

Importante: las claves en `.env.test` son **DE PRUEBA**, no rotables
en producción. NO usar este par en ningún ambiente productivo.

## NT-014 — Orden Guards → Pipes en NestJS afecta la respuesta de `/login`

**Fecha:** 2026-05-20 (Fase 3 — B.1 RF-02)

NestJS ejecuta los Guards **antes** que los Pipes (incluído
`ValidationPipe`). En el endpoint `POST /api/auth/login`, el orden
real es:

1. `@UseGuards(AuthGuard('local'))` corre `LocalStrategy.validate()`
   con el `email`/`password` del body crudo.
2. Si el usuario no existe → 401 Unauthorized.
3. Solo si el guard pasa, el `ValidationPipe` global validaría el DTO.

Consecuencia: un `POST /api/auth/login` con `email: 'no-es-email'`
devuelve **401** (no encuentra usuario) en vez de 400 (validación de
formato). Es comportamiento real del sistema, no un bug. La
validación estricta de email se garantiza en `/register`, que NO
tiene guard de autenticación delante.

Test correspondiente: `auth.integration.spec.ts › RF-02 › should
reject malformed email with 401 (guard runs before pipe)`.

## NT-015 — Polling sobre `evaluationStatus` para worker BullMQ asíncrono

**Fecha:** 2026-05-20 (Fase 3 — B.4)

`POST /api/interviews/:id/finish` solo encola un job en BullMQ; el
procesamiento real ocurre en `EvaluationProcessor` (WorkerHost) que
corre en background. Para verificar end-to-end que la evaluación se
ejecutó, necesitamos esperar hasta que `interview.evaluationStatus`
pase a `'completed'`.

**Patrón aplicado** en `evaluations.integration.spec.ts`:

```ts
const POLL_INTERVAL_MS = 200;
const POLL_TIMEOUT_MS = 15_000;

async function waitForCompletion(interviewId: number) {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const row = await prisma.interview.findUnique({
      where: { id: interviewId },
      select: { evaluationStatus: true },
    });
    if (row?.evaluationStatus === 'completed') return;
    if (row?.evaluationStatus === 'failed') throw new Error('failed');
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  throw new Error('Timeout');
}
```

En sandbox (`LLM_SANDBOX=true`) la evaluación tarda <1 s; el timeout
de 15 s da margen amplio. Reutilizable en cualquier futuro spec que
ejercite el queue.

## NT-016 — Insertar pregunta con embedding `vector` vía raw SQL

**Fecha:** 2026-05-20 (Fase 3 — B.3)

Prisma no soporta nativamente el tipo `vector` (pgvector). El selector
de preguntas (`QuestionSelectorService`) filtra por
`embedding IS NOT NULL` y ordena por `embedding <=> $1::vector`, así
que las preguntas sembradas en tests deben tener embedding válido.

**Patrón aplicado** en `db-helpers.ts` (`createQuestionWithEmbedding`):

```ts
const embedding = `[${new Array(1536).fill(0).join(',')}]`;
await prisma.$queryRawUnsafe(
  `INSERT INTO questions (..., embedding, created_at)
   VALUES ($1, ..., $7::vector, NOW()) RETURNING id, question_text`,
  text, ..., embedding,
);
```

El cast `$7::vector` es crítico — sin él Postgres trata el string
como texto y la inserción falla. El vector all-zeros es consistente
con `MockEmbeddingService.embed()` (NT-005), así que todas las
distancias son 0 y el orden de selección queda determinista por
`q.id`.

## NT-017 — Stack E2E con `webServer` orquestando backend + frontend

**Fecha:** 2026-05-20 (Fase 4 — setup)

El `playwright.config.ts` lanza DOS procesos via `webServer[]`:
1. `npm --prefix backend run start` con env `DATABASE_URL` apuntando a
   la DB de test (5434), `REDIS_URL` a redis-test (6381), claves RSA
   reales desde `.env.test`, `LLM_SANDBOX=true` y `FRONTEND_URL` con la
   URL de Playwright.
2. `npm --prefix frontend/app run dev -- --port 5400 --host 127.0.0.1`
   con `VITE_API_URL=http://127.0.0.1:3002/api`.

Playwright espera a que el endpoint `/api/health` y el puerto del
frontend respondan antes de arrancar la suite. `globalSetup` carga
`backend/.env.test` y propaga las vars al `process.env` del runner.

## NT-018 — IPv6 vs IPv4 en Windows — usar `127.0.0.1` end-to-end

**Fecha:** 2026-05-20 (Fase 4 — auth fixture bootstrap)

En Windows, Playwright resuelve `localhost` a IPv6 (`::1`) por defecto,
pero NestJS (Express) sólo escucha en IPv4 → `ECONNREFUSED ::1:3000`.
Adicionalmente, las cookies httpOnly emitidas por `127.0.0.1:3002` NO
se envían a un browser que navega a `localhost:5400` (mismo
nombre de host distinto en el modelo de cookies SameSite).

**Acción correctiva aplicada:** TODAS las URLs en la stack E2E usan
`127.0.0.1`:
- `playwright.config.webServer` levanta backend con `PORT=3002` y
  frontend con `--host 127.0.0.1 --port 5400`.
- `auth.fixture.ts` hace login contra `http://127.0.0.1:3002/api`.
- `baseURL` del browser es `http://127.0.0.1:5400`.
- Backend env `FRONTEND_URL=http://127.0.0.1:5400` (CORS).

## NT-019 — Forzar `locale: 'es-ES'` en el browser context para i18next

**Fecha:** 2026-05-20 (Fase 4)

El frontend usa `i18next-browser-languagedetector` con orden
`['localStorage', 'navigator']`. En Playwright headless, sin
`localStorage` previo, el detector cae al `navigator.language` que por
defecto es `'en-US'` → carga `en.json` en lugar del `es.json` que
asumen los tests.

**Acción correctiva aplicada:** `playwright.config.ts` setea
`locale: 'es-ES'` en `use` del proyecto chromium. Esto fuerza
`navigator.language = 'es-ES'`, el detector elige `es` y los strings
en español funcionan en los selectores `getByText('Configurar entrevista')`,
`getByRole('button', { name: 'Finalizar entrevista' })`, etc.

## NT-020 — `requireFromBackend` para usar deps del backend sin duplicar

**Fecha:** 2026-05-20 (Fase 4)

El seed E2E y los helpers de DB necesitan `@prisma/client` (generado)
y `bcrypt` (módulo nativo). Instalarlos en la raíz del repo
implicaría duplicar el cliente generado y rebuild del binding nativo
de bcrypt.

**Acción correctiva aplicada:** `e2e/helpers/backend-deps.ts` usa
`require.resolve('@prisma/client', { paths: [BACKEND_NODE_MODULES] })`
para resolver dinámicamente desde `backend/node_modules`. Mantiene
tipado mínimo (`PrismaLike` interface) para que TypeScript no se queje.

## NT-021 — Click en Antd `Card` con `onClick` — usar `.ant-card` filtrado

**Fecha:** 2026-05-20 (Fase 4 — wizard tests)

Los selectores de wizard (Backend Engineer / TypeScript / Junior /
etc.) son `Card` de Antd con `hoverable onClick={...}`. El texto
visible (e.g. "Backend Engineer") está dentro de un `<Text strong>`
hijo. Clickear sólo el `<strong>` puede no propagar al `onClick` del
Card en algunos casos por la abstracción de Antd.

**Acción correctiva aplicada:** clickear `.ant-card` filtrado por el
texto:

```ts
await page
  .locator('.ant-card')
  .filter({ hasText: new RegExp(`^\\s*${name}`, 'i') })
  .first()
  .click()
```

## NT-023 — Las claves de caché DEBEN incluir el scope de autorización

**Fecha:** 2026-05-20 (Fase 4 — bug HE-01 corregido)

Lección aprendida del bug **HE-01** (cross-tenant data leak en
`CacheInterceptor`, ver
[`qa/03-pruebas-e2e/bug_seguridad_HE01.md`](../03-pruebas-e2e/bug_seguridad_HE01.md)):

**Toda clave de caché que persista respuestas de endpoints autenticados
debe incluir el identificador del scope de autorización** —típicamente
`userId`, `tenantId`, `organizationId` o similar—. Omitirlo produce
**cache poisoning cross-user**: el primer usuario que consulta el
endpoint deja su respuesta cacheada bajo una clave global; los demás
usuarios obtienen sus datos.

**Patrón aplicado en Vinki (`backend/src/common/cache.interceptor.ts`):**

```ts
private buildCacheKey(request: any): string {
  const method = request.method;
  const url = request.originalUrl || request.url;
  const userId = request.user?.userId ?? 'anon';
  return `cache:${method}:${url}:u:${userId}`;
}
```

- Endpoints autenticados: la clave es per-`userId`. El JWT lo populi
  vía `JwtCookieStrategy.validate()`.
- Endpoints públicos (catálogos globales, healthchecks): caen al
  sufijo `'anon'` y comparten cache entre todos, que es exactamente
  el comportamiento deseado.

**Defensa en profundidad — regression guards a nivel unitario:** se
añadieron 3 tests en `cache.interceptor.spec.ts` que verifican el
contrato de la clave (claves distintas para `userId` distintos, no leak
en cache HIT, sufijo `'anon'` para requests sin auth). Si alguien
regresiona el código quitando el `userId`, **estos tests rompen antes
de que el bug llegue a producción**.

**Aplicación a otros caches del proyecto:** este patrón debe aplicarse
a cualquier mecanismo de caché futuro en Vinki (memo en memoria, HTTP
cache headers, etc.) y a cualquier proyecto similar. Frameworks como
NestJS, Rails y Django NO lo aplican por defecto — es responsabilidad
del desarrollador.

## NT-022 — Mock de `navigator.mediaDevices.getUserMedia` + `MediaRecorder`

**Fecha:** 2026-05-20 (Fase 4 — TC-E-02-005)

Para ejercitar la grabación de audio (RF-17) sin un micrófono real,
se stubea ambas APIs vía `page.addInitScript`. El stub:
- `getUserMedia()` devuelve un MediaStream mínimo con `.getTracks()`.
- `MediaRecorder` es una clase fake que al `.stop()` emite un evento
  `dataavailable` con un Blob sintético.

Adicionalmente el POST `/interviews/*/questions/*/audio` se intercepta
con `page.route` y responde con una transcripción mock determinista.

---

(El archivo se irá complementando con notas adicionales conforme
avancen las fases).
