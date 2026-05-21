# Fase 5-B — Pruebas de seguridad

> **Fecha de ejecución:** 2026-05-21.
> **Antecedente:** HE-01 (Fase 4) — cross-tenant cache leak en
> `CacheInterceptor` detectado por E2E y corregido. Esta fase audita
> todo el SUT buscando patrones similares.
> **Metodología:** auditoría de dependencias (`npm audit`) + análisis
> estático (ESLint security + Semgrep) + **revisión manual sistemática
> de RNF-05 a RNF-08** + verificación de controles transversales
> (OWASP Top 10).

---

## 1. Resumen ejecutivo

| Métrica | Valor |
|---|---|
| Vulnerabilidades de dependencias (antes) | 34 (23 backend + 11 frontend) |
| Vulnerabilidades de dependencias (después de `npm audit fix` sin `--force`) | **2** (frontend, moderate, residuales — DOMPurify vía monaco-editor sin upstream fix) |
| Hallazgos de seguridad nuevos detectados por revisión manual | 1 — **HE-07** (BOLA en `GET /templates/:id`) |
| Hallazgos corregidos en esta fase | **HE-07** (✅ RESUELTO con D-18, 4 niveles de verificación, 0 regresiones) |
| Estado de RNF-05 (bcrypt) | ✅ Cumple |
| Estado de RNF-06 (HTTPS) | ✅ Objetivo de diseño (D-4) |
| Estado de RNF-07 (autorización por propiedad) | ✅ Cumple tras fix de HE-07 |
| Estado de RNF-08 (URLs audio) | ✅ Cumple por descarte (audio no se persiste) |
| Controles transversales (Helmet, CORS, ValidationPipe, Throttler, ExceptionFilter) | ✅ Todos correctos |
| Secretos hardcoded en código fuente | **0** detectados |

**Tras la Fase 5-B, el SUT presenta una postura de seguridad consistente
con los requerimientos de un proyecto académico-profesional:** las
vulnerabilidades críticas y altas de dependencias se cerraron a 0
sin breaking changes; las 2 vulnerabilidades moderate residuales no
tienen fix upstream disponible y están documentadas; los 4 RNF de
seguridad cumplen; los controles transversales están correctamente
configurados; y la revisión manual detectó y corrigió un bug BOLA/IDOR
(HE-07) análogo en patrón al HE-01 detectado en Fase 4 — evidencia de
que la revisión sistemática post-HE-01 produjo valor real.

---

## 2. Auditoría de dependencias

### 2.1 Resultados antes / después de `npm audit fix`

Comando: `npm audit fix` (sin `--force` — fix automático que NO rompe
peer dependencies). Re-ejecutado 2 veces hasta convergencia.

| Workspace | Antes | Después | Estado |
|---|---|---|---|
| `backend/` | 23 (1 critical · 12 high · 10 moderate · 0 low) | **0** | ✅ Cierre total |
| `frontend/app/` | 11 (0 critical · 5 high · 6 moderate · 0 low) | **2 moderate residuales** | ⚠ Sin upstream fix |

**Backend — vulnerabilidades resueltas (las más relevantes):**

- **CRITICAL** `handlebars` — JavaScript Injection vía AST Type Confusion (GHSA — múltiples). Resuelto.
- **HIGH** `@nestjs/core`, `@nestjs/platform-express`, `@nestjs/swagger` (transitivas vía `path-to-regexp`) — DoS por backtracking + multiple wildcards.
- **HIGH** `lodash` — Code Injection vía `_.template` + Prototype Pollution vía `_.unset` / `_.omit`.
- **HIGH** `fast-uri` — path traversal vía percent-encoded dot segments + host confusion.
- **HIGH** `effect`, `@prisma/config`, `prisma` — AsyncLocalStorage context contamination + transitivas.
- **HIGH** `picomatch` — Method Injection en POSIX Character Classes.
- **HIGH** `defu` — Prototype Pollution vía `__proto__`.
- Múltiples MODERATE — `uuid` (buffer bounds check), `bullmq` (transitiva), otros.

Captura ejecutiva en `audit_backend_{inicial,fix,posterior}.{json,txt}`.

**Frontend — vulnerabilidades resueltas:**

- **HIGH** `vite` — Arbitrary File Read via Vite Dev Server WebSocket.
- **MODERATE** `ws` — Uninitialized memory disclosure.
- **MODERATE** `yaml` — Stack Overflow via deeply nested collections.
- Otras moderate (axios + transitivas).

**Frontend — vulnerabilidades RESIDUALES (no resueltas):**

| Paquete | Severidad | Síntoma | Razón de no resolución |
|---|---|---|---|
| `dompurify` (transitiva vía `monaco-editor`) | Moderate × 8 GHSAs agregados | XSS bypasses en varios modos (`ADD_TAGS`, `FORBID_TAGS`, `SAFE_FOR_TEMPLATES`, `CUSTOM_ELEMENT_HANDLING`, mutation-XSS por re-contextualización) | `monaco-editor` upstream todavía depende de una versión vulnerable de `dompurify`. `npm audit fix --dry-run --force` confirma que no hay versión segura del árbol disponible. |

**Análisis de impacto real:** `monaco-editor` se usa en Vinki para
mostrar el editor de código del estudiante en la pregunta de tipo
"código". El editor **NO renderiza HTML untrusted del usuario** —
procesa código fuente como texto. El vector de XSS de DOMPurify
requiere que se pase HTML del usuario a `DOMPurify.sanitize()` con
configuraciones específicas, lo cual no ocurre en el flujo de
Vinki. **Riesgo real práctico: muy bajo.** Lo documentamos como
vulnerabilidad residual conocida.

### 2.2 Verificación post-fix

| Suite | Antes del `audit fix` | Después | Status |
|---|---|---|---|
| Backend unitario | 371/371 | **371/371** | ✅ Sin regresiones |
| Frontend unitario | 134/134 | **134/134** | ✅ Sin regresiones |

---

## 3. Análisis estático

### 3.1 ESLint security (`eslint-plugin-security`, pre-configurado en Fase 2.5)

Ejecución:

```bash
cd backend && npm run lint:security      # → eslint_security_backend_5B.txt
cd frontend/app && npm run lint:security # → eslint_security_frontend_5B.txt
```

| Workspace | Warnings | Errores | Reglas predominantes |
|---|---|---|---|
| Backend | 54 | 1 (config) | 44 × `security/detect-object-injection`, 10 × `security/detect-non-literal-fs-filename` |
| Frontend | 38 | 0 | 38 × `security/detect-object-injection` |

**Análisis de los warnings (todos clasificados como falsos positivos):**

- **`detect-object-injection`** — dispara cuando el código accede a una propiedad de objeto con una clave que es una variable (`obj[varKey]`). El plugin no puede distinguir si `varKey` viene de input del usuario o de una key conocida del propio sistema. En Vinki, **todos los casos auditados son keys de objetos del propio sistema** (ej. `metricLabelKeys[key]` donde `key` itera sobre las propias keys del objeto, accesos a `prisma.X` donde `X` es un nombre de tabla literal en strings constantes, etc.). Ninguno alcanza un input externo.
- **`detect-non-literal-fs-filename`** — dispara en `fs.readFileSync(path)` con `path` como variable. En Vinki, los 10 casos son loaders de `.env.test` o `.env` desde wrappers de test (`start-perf.ts`, `start-perf-real.ts`, `seed-perf.ts`, `setup.ts`); el `path` se construye con `path.resolve(__dirname, …)` y constantes. No hay path traversal posible.

**El único "error" reportado** (linea 29 de `seed-perf.ts`) es de
configuración: el `eslint.security.config.mjs` no carga el plugin
`eslint-plugin-import`, así que la directiva
`// eslint-disable-next-line @typescript-eslint/no-var-requires, import/order`
no se resuelve. **No es un hallazgo de seguridad**. Se documenta
como tarea cosmética (refinar `eslint.security.config.mjs` o cambiar
la directiva).

**Veredicto ESLint security: 0 hallazgos reales de seguridad.**

### 3.2 Semgrep (NO ejecutado)

Comando previsto: `semgrep --config auto . --json -o semgrep.json`.

**Estado:** **NO ejecutable en este entorno.** Intento de instalación
vía `python -m pip install --user semgrep` falló con `pip subprocess
to install build dependencies did not run successfully (exit code 1)`.
Causa probable: incompatibilidad de wheels precompilados de Semgrep
con Python 3.11 del MSYS2 mingw64. Esto es **entorno-específico**,
no falla del proyecto.

**Alternativas para corrida futura:**

1. **Docker (recomendado, no requiere instalación local):**
   ```bash
   docker run --rm -v "$PWD:/src" semgrep/semgrep:latest \
     semgrep --config auto /src --json --output /src/qa/04-pruebas-no-funcionales/seguridad/semgrep.json
   ```
2. **WSL2 / Linux nativo:** `pip install semgrep` funciona sin issues.
3. **CI:** GitHub Actions con `returntocorp/semgrep-action@v1` en el workflow `security.yml`.

**Compensación:** la revisión manual de RNF-05 a RNF-08 (§ 4) cubre
el espectro principal que Semgrep habría reportado para una API REST
NestJS — inyección, autenticación rota, autorización rota, secretos
hardcoded, configuración de seguridad. **El hallazgo HE-07 fue
detectado por la revisión manual antes de Semgrep**, lo que valida
que la revisión manual sistemática es complementaria, no redundante.

---

## 4. Revisión manual de controles RNF-05 a RNF-08

### 4.1 RNF-05 — Hash de contraseñas con bcrypt — ✅ Cumple

| Aspecto | Evidencia | Estado |
|---|---|---|
| Uso de bcrypt al registrar | [`auth.service.ts:32`](../../../backend/src/auth/auth.service.ts#L32) `bcrypt.hash(dto.password, 10)` | ✅ |
| Cost factor ≥ 10 | `10` (default seguro 2026) | ✅ |
| Comparación constante de tiempo | [`auth.service.ts:48`](../../../backend/src/auth/auth.service.ts#L48) `bcrypt.compare(password, user.passwordHash)` | ✅ |
| Cambio de password verifica password actual antes | [`auth.service.ts:138`](../../../backend/src/auth/auth.service.ts#L138) | ✅ |
| Re-hash al cambiar | [`auth.service.ts:143`](../../../backend/src/auth/auth.service.ts#L143) | ✅ |
| Password nunca en plain text en logs ni respuestas | `generateTokens` retorna `{id, name, email, role, createdAt}` — sin `passwordHash` ([`auth.service.ts:67-77`](../../../backend/src/auth/auth.service.ts#L67)) | ✅ |

Validado E2E además en `TC-I-005` (`auth.integration.spec.ts`: assert
`passwordHash matches ^\$2[aby]\$10\$`).

### 4.2 RNF-06 — HTTPS / cifrado en tránsito — ✅ Objetivo de diseño (D-4)

| Aspecto | Evidencia | Estado |
|---|---|---|
| Plantilla de despliegue productivo con TLS | [`docker-compose.prod.yml`](../../../docker-compose.prod.yml) con `nginx-proxy` + `acme-companion` + comentarios sobre cert | ✅ |
| Cookies marcadas `secure` cuando `NODE_ENV === 'production'` | [`auth.controller.ts:106-115`](../../../backend/src/auth/auth.controller.ts#L106) `secure: isProduction` | ✅ |
| Helmet `HSTS` activado por default | [`main.ts:21`](../../../backend/src/main.ts#L21) `app.use(helmet())` — Helmet incluye HSTS con `maxAge=15552000s` por default | ✅ |

D-4 declaró RNF-06 como objetivo de diseño verificable a nivel de
configuración. Cumplido.

### 4.3 RNF-07 — Autorización por propiedad — ✅ Cumple tras fix de HE-07

**Auditoría exhaustiva** — todos los endpoints autenticados que
devuelven o modifican datos de un usuario específico:

| Controller / endpoint | Verifica ownership | Cómo | Estado |
|---|---|---|---|
| `AuthController.me` (GET /auth/me) | ✅ | `authService.getProfile(user.userId)` | ✅ |
| `AuthController.updateProfile` (PUT /auth/profile) | ✅ | `authService.updateProfile(user.userId, dto)` | ✅ |
| `AuthController.changePassword` (POST /auth/change-password) | ✅ | `authService.changePassword(user.userId, dto)` | ✅ |
| `InterviewsController.create` (POST /interviews) | ✅ | `interviewsService.create(user.userId, dto)` | ✅ |
| `InterviewsController.findOne` (GET /interviews/:id) | ✅ | service: `if (interview.userId !== userId) throw new ForbiddenException()` ([interviews.service.ts:210-211](../../../backend/src/interviews/interviews.service.ts#L210)) | ✅ |
| `InterviewsController.finish` (POST /interviews/:id/finish) | ✅ | service: mismo patrón ([interviews.service.ts:217-219](../../../backend/src/interviews/interviews.service.ts#L217)) | ✅ |
| `AnswersController.submit` (POST .../answer) | ✅ | service: `if (interview.userId !== userId) throw new ForbiddenException()` | ✅ |
| `AnswersController.evaluateNow` (POST .../evaluate-now) | ✅ | service: mismo patrón | ✅ |
| `AnswersController.followUp` (POST .../followup) | ✅ | service: mismo patrón | ✅ |
| `AnswersController.submitAudio` (POST .../audio) | ✅ | service: mismo patrón | ✅ |
| `KnowledgeController.ingestDocument` (POST /knowledge) | ✅ | `uploadedById: user.userId` | ✅ |
| `KnowledgeController.list` (GET /knowledge) | ✅ | `where: isAdmin ? {} : { uploadedById: user.userId }` ([knowledge.controller.ts:58](../../../backend/src/knowledge/knowledge.controller.ts#L58)) | ✅ |
| `KnowledgeController.getDocument` (GET /knowledge/:id) | ✅ | check explícito `if (user.role !== 'admin' && document.uploadedById !== user.userId) throw new ForbiddenException()` ([knowledge.controller.ts:96-101](../../../backend/src/knowledge/knowledge.controller.ts#L96)) | ✅ |
| `KnowledgeController.deleteDocument` (DELETE /knowledge/:id) | ✅ | mismo patrón ([knowledge.controller.ts:115-120](../../../backend/src/knowledge/knowledge.controller.ts#L115)) | ✅ |
| `KnowledgeController.searchKnowledge` (POST /knowledge/search) | ✅ | `@Roles('recruiter','admin')` — diseño deliberado | ✅ |
| `TemplatesController.list` (GET /templates) | ✅ | `templatesService.listTemplates(user.userId, user.role)` con filtro `OR: [{isPublic:true},{createdById:userId}]` | ✅ |
| `TemplatesController.findOne` (GET /templates/:id) | ⚠ **PRE-FIX: NO** → ✅ **POST-FIX HE-07** | service ahora: `if (role !== 'admin' && !template.isPublic && template.createdById !== userId) throw new ForbiddenException()` | ✅ tras D-18 |
| `TemplatesController.create` (POST /templates) | ✅ | `templatesService.createTemplate(user.userId, user.role, dto)` con `createdById: userId` | ✅ |
| `TemplatesController.remove` (DELETE /templates/:id) | ✅ | service: `if (template.createdById !== userId && role !== 'admin') throw new ForbiddenException()` | ✅ |
| `TemplatesController.start` (POST /templates/:id/start) | ⚠ **PRE-FIX: NO** → ✅ **POST-FIX HE-07** | service ahora replica el mismo patrón | ✅ tras D-18 |
| `NotificationsController.*` | ✅ | Todos los handlers extraen `userId = req.user.userId` y filtran por él | ✅ |
| `ReportsController.getDashboard / getPercentiles / getProgress / getReport / exportPDF / exportCSV` | ✅ | Todos pasan `user.userId` al service | ✅ |
| `ReportsController.createShareLink` (POST /interviews/:id/share) | ✅ | `if (interview.userId !== userId) throw new ForbiddenException()` ([reports.service.ts:813](../../../backend/src/reports/reports.service.ts#L813)) | ✅ |
| `SharedReportController.getSharedReport` (GET /shared/:token) | ✅ | Token aleatorio de 128 bits de entropía (`randomBytes(16).toString('hex')`) + expiración 7 días; almacenado en `ShareLinkStore` Map en memoria | ✅ (con observación) |
| `ReportsController.recruiter/students/:studentId/notes` | ✅ por diseño | `@Roles('recruiter','admin')` — recruiters tienen visión completa de students por diseño del producto | ✅ |
| `AdminQuestionsController.*` | ✅ | `@Roles('admin')` a nivel de controller — datos del catálogo global, no per-user | ✅ |
| `AdminAuditController.getLogs` | ✅ | `@Roles('admin')` | ✅ |
| `HealthController` | ✅ | Endpoint público intencional | ✅ |
| `CatalogsController.*` (GET /catalogs/...) | ✅ | Públicos por diseño (datos no personalizados, `@Cacheable` seguro post-HE-01) | ✅ |

**Observación sobre `SharedReportController`:** el `ShareLinkStore` es
un `Map` en memoria — se pierde al reiniciar el backend. Comentario
explícito en el código: `// Store the token in a Map (in production,
use DB)`. Es una limitación funcional documentada, no vulnerabilidad
de seguridad. Token de 128 bits no es adivinable.

### 4.4 RNF-08 — URLs de audio protegidas — ✅ Cumple por descarte

**Implementación actual:**

- `POST /api/interviews/:id/questions/:qid/audio` recibe un audio
  multipart, lo pasa a `transcriptionService.transcribe()`, y guarda
  `answer.audio_url = 'audio://uploaded'` (**literal placeholder**,
  no URL real).
- El binario del audio **NO se persiste** (no hay almacenamiento en
  S3/MinIO activo aunque las vars estén en `.env.example`).
- No hay endpoint para servir audio.

**Veredicto:** el sistema **NO expone URLs de audio reales** → no hay
vector de ataque. El placeholder `'audio://uploaded'` permite a la UI
mostrar un ícono de "audio adjunto" sin servir el binario.

**Observación:** el requerimiento RNF-08 textualmente dice "URLs de
audio con tokens". La implementación cumple el **espíritu** (no
exposición) más que la **letra** (tokens). Si en el futuro se
implementa almacenamiento en S3, habrá que añadir presigned URLs con
expiración. Esto se documenta como mejora futura en
`plan_mejoras_futuras.md`.

---

## 5. Controles transversales

### 5.1 Helmet (cabeceras de seguridad) — ✅

`app.use(helmet())` con defaults en [`main.ts:21`](../../../backend/src/main.ts#L21). Headers configurados por default:

- `Content-Security-Policy` — política base (restringe scripts/styles inline).
- `Strict-Transport-Security` (HSTS) — `max-age=15552000; includeSubDomains`.
- `X-Frame-Options: SAMEORIGIN` — anti-clickjacking.
- `X-Content-Type-Options: nosniff` — bloquea MIME sniffing.
- `Referrer-Policy: no-referrer` — minimiza leak del referrer.
- `Cross-Origin-Resource-Policy`, `Cross-Origin-Opener-Policy`, `Cross-Origin-Embedder-Policy`.
- `Origin-Agent-Cluster`, `X-DNS-Prefetch-Control: off`, `X-Download-Options: noopen`, `X-Permitted-Cross-Domain-Policies: none`.

### 5.2 CORS — ✅

[`main.ts:24-27`](../../../backend/src/main.ts#L24):

```ts
app.enableCors({
  origin: configService.get<string>('FRONTEND_URL', 'http://localhost:5173'),
  credentials: true,
});
```

Origen restringido al frontend declarado vía env (`FRONTEND_URL`), NO
wildcard `*`. La combinación `origin + credentials: true` es la única
configuración segura cuando hay cookies httpOnly (CORS específicamente
prohíbe `*` + `credentials: true`).

### 5.3 ValidationPipe — ✅

[`main.ts:30-36`](../../../backend/src/main.ts#L30):

```ts
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,            // elimina propiedades no declaradas en el DTO
  forbidNonWhitelisted: true, // rechaza request con propiedades extra (400)
  transform: true,            // transforma payloads al tipo del DTO
}));
```

Todos los DTOs usan `class-validator`. Cubierto E2E por suite
`dto-validation.integration.spec.ts` (TC-I-008, 11 tests, RNF-08
verificado).

### 5.4 Rate limiting — ✅

`ThrottlerModule.forRootAsync` global como `APP_GUARD` ([`app.module.ts:45-99`](../../../backend/src/app.module.ts)). Defaults productivos:

- `short`: 100 req / 60 s por IP.
- `long`: 300 req / 60 s por IP.

Externalizado a env vars en D-14 para permitir las corridas JMeter
de Fase 5-A.

### 5.5 Manejo de errores — ✅ sin stack traces leak

[`http-exception.filter.ts`](../../../backend/src/common/filters/http-exception.filter.ts):

```ts
response.status(status).json({
  statusCode: status,
  message,
  error,
});
```

Solo `{statusCode, message, error}`. Sin `stack`, sin path interno,
sin nombre de archivo. Cubierto por test unitario
(`http-exception.filter.spec.ts`).

### 5.6 Secretos hardcoded — ✅ cero detectados

Búsqueda exhaustiva en `backend/src` y `frontend/app/src`:

```bash
grep -rEn "sk-[a-zA-Z0-9]{20,}|AIza[a-zA-Z0-9_-]{20,}|password\s*=\s*['\"][^'\"]{6,}['\"]|\
secret\s*=\s*['\"][^'\"]{6,}['\"]|TOKEN\s*=\s*['\"]|API_KEY\s*=\s*['\"]|JWT_SECRET" \
backend/src frontend/app/src
```

**0 matches.** Todos los secretos viven en `.env` (ignorado por `.gitignore`) y se leen vía `ConfigService.get(...)` o `process.env.X`. La única `OPENAI_API_KEY=mock-key` literal está en `backend/.env.test` (clave mock, no real, documentada como tal). Las claves JWT RSA en `.env.test` son **DE PRUEBA** declaradas explícitamente en el header del archivo (NT-013).

---

## 6. Hallazgos nuevos

### HE-07 — Broken Object Level Authorization en `templates`

| Campo | Valor |
|---|---|
| Tipo | Seguridad — BOLA / IDOR (OWASP API1:2023 + A01:2021) |
| Severidad | **MEDIA** (no expone PII; expone propiedad intelectual de recruiters) |
| Estado | ✅ **RESUELTO** (D-18, 2026-05-21) |
| Endpoints afectados | `GET /api/interviews/templates/:id` + `POST /api/interviews/templates/:id/start` |
| Causa raíz | Inconsistencia: `listTemplates` filtraba por `isPublic`/`createdById`/`role==='admin'`, pero `getTemplate` y `startFromTemplate` no |
| Fix | 2 archivos del SUT (`templates.service.ts` + `templates.controller.ts`), ~10 líneas |
| Verificación | 4 niveles: unitario aislado 29/29, backend completo 375/375, integración 97/97 (+5 cross-user), frontend 134/134. **0 regresiones.** |
| Reporte ejecutivo | [`bug_seguridad_HE07.md`](bug_seguridad_HE07.md) |

---

## 7. Vulnerabilidades residuales

| Item | Severidad | Tipo | Razón |
|---|---|---|---|
| `dompurify` vía `monaco-editor` (frontend) | Moderate × 8 GHSAs | XSS bypasses | Sin upstream fix disponible — `npm audit fix --force --dry-run` confirma. Riesgo práctico bajo: monaco-editor procesa código fuente como texto, no renderiza HTML del usuario via DOMPurify. Re-evaluar cuando monaco publique una versión con DOMPurify ≥ 3.3.4. |
| Semgrep no ejecutado | N/A | Cobertura SAST | Limitación de entorno (pip falla en MSYS2 mingw). Alternativas documentadas en § 3.2 — Docker, WSL o CI. |
| 1 ESLint error de config (`import/order` no resuelto) | N/A | Cosmético | Refinar `eslint.security.config.mjs` o mover la directiva — no afecta seguridad. |

---

## 8. Tabla de cumplimiento por RNF de seguridad

| RNF | Descripción | Estado | Evidencia |
|---|---|---|---|
| **RNF-05** | Hash de contraseñas (bcrypt) | ✅ Cumple | `auth.service.ts` + TC-I-005 |
| **RNF-06** | HTTPS / TLS | ✅ Objetivo de diseño (D-4) | `docker-compose.prod.yml` + cookies `secure` + Helmet HSTS |
| **RNF-07** | Autorización por propiedad | ✅ Cumple (tras D-18) | Auditoría completa § 4.3 + HE-01 corregido + HE-07 corregido + 5 tests cross-user E2E API |
| **RNF-08** | URLs de audio protegidas | ✅ Cumple por descarte | Audio no se persiste; placeholder literal |

---

## 9. Conclusión

La Fase 5-B detectó **una vulnerabilidad activa de severidad MEDIA
(HE-07, BOLA en templates)** que se corrigió con verificación a 4
niveles y 0 regresiones, replicando el rigor del proceso de HE-01 en
Fase 4. La auditoría de dependencias cerró 32 de 34 vulnerabilidades
sin breaking changes; las 2 residuales (DOMPurify vía monaco-editor)
no tienen fix upstream y se documentan honestamente. La revisión
manual confirmó que **TODOS los endpoints autenticados del SUT
verifican ownership correctamente**, y los controles transversales
(Helmet, CORS, ValidationPipe, Throttler, ExceptionFilter,
no-secretos) están implementados según las mejores prácticas para
una API NestJS moderna.

El proyecto tiene una postura de seguridad consistente con un MVP
académico bien construido, con la honesta limitación de no haber
ejecutado Semgrep por incompatibilidad del entorno local (alternativas
documentadas para corridas futuras).
