# HE-07 — Bug de autorización: Broken Object Level Authorization en templates

> **Tipo:** Broken Object Level Authorization (BOLA / IDOR) — OWASP API Security Top 10 (API1:2023) y OWASP Web Top 10 (A01:2021 — Broken Access Control).
> **Severidad:** **MEDIA**.
> **Estado:** ✅ **RESUELTO** (2026-05-21).
> **Detectado por:** Revisión manual sistemática de RNF-07 en Fase 5-B, motivada por el antecedente HE-01.
> **RF/RNF afectados:** RNF-07 (Autorización por propiedad).
> **Corrección:** 1 archivo de SUT (`templates.service.ts`) + 1 archivo de wiring (`templates.controller.ts`).

---

## 1. Resumen ejecutivo

Durante la revisión manual de RNF-07 de Fase 5-B se detectó que **dos endpoints del controlador `interviews/templates`** no verificaban la propiedad del recurso ni la marca `isPublic`. Como consecuencia, **cualquier usuario autenticado** (student, recruiter, admin) podía:

- **Leer cualquier template privado** vía `GET /api/interviews/templates/:id` enumerando IDs.
- **Iniciar una entrevista** basada en cualquier template privado ajeno vía `POST /api/interviews/templates/:id/start`, con el efecto colateral de **crear una entrevista en la cuenta del invocador** usando trabajo curado del recruiter dueño del template.

El bug es funcionalmente análogo a **HE-01** (cross-tenant cache leak), pero con menor severidad porque:

1. No expone **datos personales** del estudiante (HE-01 sí lo hacía: dashboard, percentiles, predicción de carrera).
2. Expone **propiedad intelectual de los recruiters** (preguntas curadas + estructura del template), no PII.

La corrección replica la lógica de autorización que **`listTemplates` ya implementaba correctamente** desde antes — es decir, la inconsistencia era únicamente entre el listado y el detalle/start del mismo recurso.

---

## 2. Detección

### Antecedente

HE-01 (Fase 4) demostró que el SUT tenía un patrón de autorización por propiedad incompleto: el `CacheInterceptor` no diferenciaba por `userId`. Tras el fix se estableció **NT-023** ("las claves de caché DEBEN incluir el scope de autorización").

La Fase 5-B (revisión manual de RNF-07) auditó **todos los endpoints que devuelven o modifican datos de un usuario específico**, buscando explícitamente patrones similares.

### Hallazgo

En el controller [`backend/src/interviews/templates.controller.ts`](../../../backend/src/interviews/templates.controller.ts) (versión pre-fix):

```ts
@Get(':id')
findOne(@Param('id', ParseIntPipe) id: number) {
  return this.templatesService.getTemplate(id);   // ← solo id, sin userId/role
}

@Post(':id/start')
start(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
  const user = req.user;
  return this.templatesService.startFromTemplate(id, user.userId); // ← sin role
}
```

En el service [`templates.service.ts`](../../../backend/src/interviews/templates.service.ts) (versión pre-fix):

```ts
async getTemplate(id: number) {
  const template = await this.prisma.interviewTemplate.findUnique({ where: { id }, include: { ... } });
  if (!template) throw new NotFoundException('Template not found');
  return template;  // ← NO verifica isPublic ni createdById
}

async startFromTemplate(templateId: number, userId: number) {
  // ... busca template ...
  if (!template) throw new NotFoundException('Template not found');
  if (template.questions.length === 0) throw new BadRequestException(...);
  // ← NO verifica isPublic ni createdById, sigue creando la entrevista
  const interview = await this.prisma.$transaction(...);
  return interview;
}
```

**Contraste interno** — el mismo servicio implementa la lógica correcta en `listTemplates`:

```ts
async listTemplates(userId: number, role: string) {
  const where = role === 'admin'
    ? {}                                                              // admin ve todo
    : { OR: [{ isPublic: true }, { createdById: userId }] };           // resto: solo público u propio
  return this.prisma.interviewTemplate.findMany({ where, include: { ... } });
}
```

La inconsistencia (listado filtrado, detalle no) confirma que es **omisión**, no diseño deliberado.

### Vector práctico explotable

1. Un usuario se autentica con cualquier rol (incluido `student` que normalmente no tiene UI para templates).
2. Ejecuta `GET /api/interviews/templates/1`, `…/2`, `…/3` enumerando IDs (autoincrementales).
3. Por cada ID que devuelve 200, obtiene el template completo: nombre, descripción, lista de preguntas curadas (texto completo), nivel/lenguaje/framework, autor.
4. Adicionalmente, si encuentra un template interesante, ejecuta `POST /api/interviews/templates/:id/start` y obtiene una entrevista pre-armada con las preguntas del recruiter.

---

## 3. Severidad — MEDIA con justificación

| Criterio | HE-01 (referencia) | HE-07 |
|---|---|---|
| Tipo | Seguridad / privacidad | Seguridad / propiedad intelectual de terceros |
| Datos expuestos | PII del estudiante (dashboard, percentiles, predicción de carrera) | Trabajo curado del recruiter (preguntas + estructura) |
| ¿Compromete RNF-07? | Sí, gravemente | Sí, parcialmente |
| ¿Compromete privacidad? | Sí | No directamente |
| Alcance del fix | 1 línea (cache key + userId) | ~7 líneas (replicar el patrón de `listTemplates`) |
| ¿Cambio de UX? | No | No |
| Severidad | **ALTA** | **MEDIA** |

**Criterio aplicado (D-18):** los bugs de **autorización con fix viable y sin cambio de UX se corrigen**, consistente con HE-01 y distinto de HE-05 (donde el fix requería UX).

---

## 4. Causa raíz

Inconsistencia entre `listTemplates` (sí filtra) y `getTemplate` / `startFromTemplate` (no filtran) sobre el **mismo recurso**. La lógica correcta ya existía en el código; faltaba replicarla en los otros métodos de acceso.

Esto es un patrón frecuente cuando el desarrollo del feature avanza endpoint por endpoint sin un checklist transversal de "verificar ownership en TODOS los métodos de acceso". Lección incorporada en **NT-027**.

---

## 5. Fix aplicado

### 5.1 `templates.service.ts`

Antes (versión vulnerable):

```ts
async getTemplate(id: number) {
  const template = await this.prisma.interviewTemplate.findUnique({ where: { id }, include: { ... } });
  if (!template) throw new NotFoundException('Template not found');
  return template;
}
```

Después (versión corregida):

```ts
async getTemplate(id: number, userId: number, role: string) {
  const template = await this.prisma.interviewTemplate.findUnique({ where: { id }, include: { ... } });
  if (!template) throw new NotFoundException('Template not found');
  if (
    role !== 'admin' &&
    !template.isPublic &&
    template.createdById !== userId
  ) {
    throw new ForbiddenException();
  }
  return template;
}
```

Análogo para `startFromTemplate`:

```ts
async startFromTemplate(templateId: number, userId: number, role: string) {
  // ... (verifica entrevista activa, busca template) ...
  if (!template) throw new NotFoundException('Template not found');
  if (
    role !== 'admin' &&
    !template.isPublic &&
    template.createdById !== userId
  ) {
    throw new ForbiddenException();
  }
  if (template.questions.length === 0) throw new BadRequestException(...);
  // ... (sigue con la creación de la entrevista) ...
}
```

`createTemplate(userId, dto)` también se actualizó a `createTemplate(userId, userRole, dto)` porque internamente llama a `this.getTemplate(template.id, userId, userRole)` para devolver el detalle del template recién creado. El parámetro se renombró a `userRole` para evitar el shadowing con la variable local `const role = await this.prisma.role.findUnique(...)` (verificación de rol del catálogo).

### 5.2 `templates.controller.ts`

Antes:

```ts
@Get(':id')
findOne(@Param('id', ParseIntPipe) id: number) {
  return this.templatesService.getTemplate(id);
}
```

Después:

```ts
@Get(':id')
findOne(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
  const user = req.user;
  return this.templatesService.getTemplate(id, user.userId, user.role);
}
```

Análogo para `create` (3er argumento `dto` se mueve después de `userRole`) y para `start`.

---

## 6. Decisión 404 vs. 403

Las buenas prácticas modernas recomiendan devolver **404 Not Found** para recursos que el usuario no tiene autorizado ver (en lugar de 403 Forbidden), para no revelar la existencia del recurso a un atacante que enumera IDs.

**Decisión adoptada (consistente con el patrón existente del SUT):** mantener **404 si no existe** + **403 si existe pero no es del invocador**.

**Justificación:**

1. Es el patrón usado por **TODO el resto del SUT**:
   - [`interviews.service.findOne:210-211`](../../../backend/src/interviews/interviews.service.ts): `if (!interview) throw new NotFoundException(); if (interview.userId !== userId) throw new ForbiddenException();`
   - [`interviews.service.finish:217-219`](../../../backend/src/interviews/interviews.service.ts): mismo.
   - [`templates.service.deleteTemplate:120-123`](../../../backend/src/interviews/templates.service.ts) (versión PRE-fix): mismo.
   - [`knowledge.controller.getDocument`](../../../backend/src/knowledge/knowledge.controller.ts): mismo.

2. Cambiar **solo en templates** a "404 universal" rompería consistencia y daría señal de detección menos clara en logs.

3. Los IDs son autoincrementales, por lo que la diferencia 403 vs 404 no añade información significativa (un atacante puede enumerar igualmente probando IDs cercanos al último creado).

4. Refactorizar todo el SUT a "404 universal" es un cambio de mayor alcance que se documenta como **mejora futura** en el plan de mejoras post-MVP, no como parte del fix de HE-07.

Esta decisión está alineada con el principio de "consistencia interna primero, mejora general después".

---

## 7. Verificación (4 niveles, patrón HE-01)

| Nivel | Suite | Antes del fix | Después del fix | Status |
|---|---|---|---|---|
| 1 | Unitario templates aislado (`jest src/interviews/templates`) | 25/25 | **29/29** (+4 regression guards HE-07) | ✅ |
| 2 | Backend unitario completo (`jest --silent`) | 371/371 | **375/375** (+4 nuevos: 5 guards − 1 spec viejo de `getTemplate` que se reemplazó) | ✅ |
| 3 | Integración (`npm run test:int`) | 92/92 | **97/97** (+5 cross-user E2E API en `authorization.integration.spec.ts`) | ✅ |
| 4 | Frontend unitario (`vitest run`) | 134/134 | **134/134** (sin cambios — el fix no toca código frontend) | ✅ |

**0 regresiones a ningún nivel.** Tiempo total de fix + tests + verificación: ~25 min.

### 7.1 Tests añadidos a nivel unitario (`templates.service.spec.ts`)

1. `should return the template with full relations when caller is the owner`.
2. `should throw NotFoundException when template does not exist`.
3. `should throw ForbiddenException when non-owner requests another user's private template (HE-07 guard)`.
4. `should return any template to admin role (HE-07 guard)`.
5. `should return public templates to any authenticated user (HE-07 guard)`.

Plus 1 guard adicional en `startFromTemplate()`:

6. `should throw ForbiddenException when starting another user's private template (HE-07 guard)`.

### 7.2 Tests añadidos a nivel de integración (`authorization.integration.spec.ts`)

Bloque `RNF-07 — HE-07 regression: templates ownership`:

1. `recruiter A NO debe poder leer template privado de recruiter B (403)`.
2. `student NO debe poder leer template privado de un recruiter (403)`.
3. `student NO debe poder INICIAR una entrevista basada en template privado ajeno (403)` — incluye verificación de **efecto colateral**: `prisma.interview.count({ where: { userId: student.id } }) === 0`.
4. `admin SÍ debe poder leer cualquier template privado (200)`.
5. `recruiter SÍ debe poder leer template PÚBLICO de otro recruiter (200)`.

---

## 8. Lección — NT-027

> **La autorización por propiedad debe ser CONSISTENTE en TODOS los métodos que exponen un recurso, no solo en los listados.**
>
> Si un service tiene una función `listX(userId, role)` con filtrado correcto, **toda otra función del mismo service que acceda al mismo recurso** (`getX`, `updateX`, `deleteX`, `startFromX`, `cloneX`, etc.) debe replicar exactamente la misma lógica de autorización. Asimetrías como la de HE-07 (listado filtra, detalle no) son un patrón frecuente de BOLA y un *code smell* a buscar activamente en revisiones de seguridad.
>
> **Checklist sistemático para nuevos endpoints que toquen un recurso por ID:**
>
> 1. ¿El service recibe `userId` y `role`?
> 2. ¿Verifica que el recurso existe? (`NotFoundException`)
> 3. ¿Verifica ownership / `isPublic` / `role === 'admin'`? (`ForbiddenException`)
> 4. ¿Tiene un test unitario de regresión por cada rama (dueño, admin, público, ajeno)?
> 5. ¿Tiene un test de integración cross-user?

Registrada formalmente en [`qa/00-inventario/notas_tecnicas.md` § NT-027](../../00-inventario/notas_tecnicas.md).

---

## 9. Diferencia con HE-01 y HE-05 — gestión de defectos por tipo

| | HE-01 | HE-05 | HE-07 |
|---|---|---|---|
| Tipo | Seguridad (cache leak PII) | Lógica de negocio (skill contaminado) | Seguridad (BOLA/IDOR) |
| Severidad | ALTA | MEDIA-ALTA | MEDIA |
| ¿Datos personales expuestos? | Sí | No | No (propiedad intelectual de recruiters) |
| ¿Fix sin cambio de UX? | Sí (1 línea backend) | NO (requiere selector de skill en UI) | Sí (~7 líneas backend) |
| Decisión | **Corregir** | **Diferir** (D-13) | **Corregir** (D-18) |

El criterio aplicado para HE-07 (corregir) es consistente con HE-01 (también seguridad + fix sin UX) y distinto de HE-05 (que era lógica de negocio + fix con UX). Esta tabla materializa la gestión profesional de defectos por severidad e impacto.

---

## 10. Referencias

- **OWASP API Security Top 10:2023 — API1:2023 Broken Object Level Authorization.**
- **OWASP Top 10:2021 — A01:2021 Broken Access Control.**
- **Decisión D-18** ([`qa/01-plan-maestro/decisiones_qa.md`](../../01-plan-maestro/decisiones_qa.md)) — criterio de corregir vs diferir.
- **NT-027** ([`qa/00-inventario/notas_tecnicas.md`](../../00-inventario/notas_tecnicas.md)) — checklist de ownership.
- **HE-01** ([`qa/03-pruebas-e2e/bug_seguridad_HE01.md`](../../03-pruebas-e2e/bug_seguridad_HE01.md)) — bug antecedente, motivador de la revisión.
- **Archivos del SUT modificados:**
  - [`backend/src/interviews/templates.service.ts`](../../../backend/src/interviews/templates.service.ts) — `getTemplate`, `startFromTemplate`, `createTemplate` (firma).
  - [`backend/src/interviews/templates.controller.ts`](../../../backend/src/interviews/templates.controller.ts) — handlers `findOne`, `create`, `start`.
- **Tests de regresión:**
  - [`backend/src/interviews/templates.service.spec.ts`](../../../backend/src/interviews/templates.service.spec.ts) — 5 guards unitarios.
  - [`backend/src/interviews/templates.controller.spec.ts`](../../../backend/src/interviews/templates.controller.spec.ts) — 2 specs ajustados.
  - [`backend/test/integration/api/authorization.integration.spec.ts`](../../../backend/test/integration/api/authorization.integration.spec.ts) — 5 tests cross-user de integración.
