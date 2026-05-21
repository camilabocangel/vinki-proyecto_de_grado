# Hallazgos detectados durante el proceso de pruebas — Fase 4 (E2E)

> Registro de defectos y oportunidades de mejora detectados por la suite
> end-to-end del proyecto Vinki. Evidencia objetiva de que el proceso de
> QA cumple su función de **detección temprana de defectos antes de
> producción**. Cada hallazgo incluye severidad, tipo, impacto observable,
> el caso de prueba que lo reveló y recomendación de remediación.

---

## Resumen ejecutivo

| ID | Tipo | Severidad | Estado | RF/RNF | Detectado por |
|---|---|---|---|---|---|
| **HE-01** | Seguridad — cross-tenant data leak en caché | **ALTA** | ✅ **RESUELTO** | RNF-07 | TC-E-05-003 |
| **HE-02** | Accesibilidad — sin `aria-label` en dropdown logout | Baja | Documentado | RNF-29 | TC-E-00-005 |
| **HE-03** | Internacionalización — textos hardcoded sin `t()` en Knowledge Base | Baja | Documentado | RNF-26 | TC-E-07 |
| **HE-04** | Internacionalización — "Cancelar" y mensaje password sin `t()` en Profile | Baja | Documentado | RNF-26 | TC-E-06-003 |
| **HE-05** | Lógica de negocio — `skill_id` fallback contamina preguntas IA del admin | **MEDIA-ALTA** ⚠ | **Diferido (D-13)** — backlog post-MVP | RF-12, RF-27, RF-42 | TC-E-08 + análisis de código |
| **HE-06** | Rendimiento (UX) — latencia >5 s en feedback inmediato de modo `practice` con LLM real | **Baja-Media** | **Acotado por D-17** — no afecta flujo principal | RNF-01 (sub-umbral `practice`) | Escenario 4 JMeter (`04-rnf01-real.jmx`) + análisis de flujo |
| **HE-07** | Seguridad — BOLA/IDOR en `GET /templates/:id` y `POST /templates/:id/start` (templates privados ajenos) | **MEDIA** | ✅ **RESUELTO** (D-18) | RNF-07 | Revisión manual Fase 5-B |

**2 bugs de seguridad detectados y corregidos durante el proceso de
QA (HE-01 ALTA en Fase 4, HE-07 MEDIA en Fase 5-B). 1 bug de lógica
de negocio MEDIA-ALTA diferido por Decisión D-13** (registrada en
`qa/01-plan-maestro/decisiones_qa.md` § D-13; backlog post-MVP
consolidado en [`plan_mejoras_futuras.md`](plan_mejoras_futuras.md)).
**1 observación de rendimiento (HE-06)** detectada en Fase 5-A,
acotada al modo `practice` (feedback inmediato opcional) y
formalizada en la Decisión D-17 con propuesta de sub-umbrales para
el RNF-01. Los tres hallazgos restantes (HE-02, HE-03, HE-04) son
mejoras post-MVP no bloqueantes para el cumplimiento de requerimientos.

---

## Distinción metodológica

Es importante diferenciar los hallazgos según su naturaleza:

- **HE-01 es un bug REAL DEL SISTEMA bajo prueba (SUT)** que la suite
  E2E detectó correctamente. NO era un flake del test ni un problema
  del proceso de pruebas. La autoridad de los tests E2E quedó
  demostrada empíricamente.
- **HE-05 es un bug REAL DEL SISTEMA bajo prueba** detectado por
  inspección del código a raíz del comentario inicial del reporte del
  Explore agent; su severidad fue revaluada tras análisis del flujo
  completo del feature "Generar con IA" en el admin.
- **HE-02, HE-03 y HE-04** son defectos del SUT relacionados con
  accesibilidad e internacionalización; se documentan para
  remediación futura.
- **Ninguno de los 5 hallazgos es un problema de la suite de pruebas
  en sí.** La suite E2E está estable a 47/47 verde y verificada con
  3 corridas consecutivas (141/141).

---

## Clasificación por tipo

### Seguridad (1) — HE-01 ✅ RESUELTO

Bug de severidad ALTA: cross-tenant data leak en el `CacheInterceptor`
del backend que violaba RNF-07. Detectado por TC-E-05-003 y corregido
en `backend/src/common/cache.interceptor.ts`. Verificado a 4 niveles
(unitario, regression guards, integración, E2E ×3). **Reporte ejecutivo
dedicado en [`bug_seguridad_HE01.md`](bug_seguridad_HE01.md)** — pieza
central recomendada para el informe final del proyecto de grado.

### Accesibilidad (1) — HE-02

Falta de `aria-label` explícito en el ítem "Cerrar sesión" dentro del
dropdown del header. No bloquea la funcionalidad pero degrada la
experiencia con lectores de pantalla.

### Internacionalización (2) — HE-03 y HE-04

Strings de UI hardcoded en español sin pasar por `t()` en dos páginas:
KnowledgeBasePage ("Buscar", "Agregar documento", título del modal) y
ProfilePage ("Cancelar", mensaje "Mínimo 6 caracteres"). Rompen la
promesa i18n del resto del sistema.

### Lógica de negocio (1) — HE-05 ⚠ MEDIA-ALTA

Las preguntas generadas por el admin vía "Generar con IA" se persisten
con un `skill_id` por defecto incorrecto (el primer skill que devuelve
`prisma.skill.findFirst()`) porque el frontend NO envía el `skillId` en
el payload. Esto contamina la metadata de las preguntas y afecta
RF-12 (selección inteligente por skill) y RF-27 (cálculo de
UserSkillScore por habilidad).

### Rendimiento (1) — HE-06 ⚠ Baja-Media (acotada por D-17)

Latencia P95 = 7 418 ms en el endpoint `POST /evaluate-now` cuando se
mide con LLM real (`gpt-4o-mini`), por encima del umbral RNF-01
(5 s). El análisis del flujo de evaluación posterior a la corrida
([`qa/04-pruebas-no-funcionales/rendimiento/analisis_flujo_evaluacion.md`](../04-pruebas-no-funcionales/rendimiento/analisis_flujo_evaluacion.md))
demostró que **este endpoint solo se invoca en modo `practice`**
(feedback inmediato opcional) y que **el flujo principal del
estudiante** (modo `evaluation`) usa el path asíncrono
`POST /finish` → BullMQ, donde el usuario nunca se bloquea por la
latencia del LLM. Reclasificado a observación acotada vía Decisión
D-17 (sub-umbrales propuestos para el RNF-01).

---

## HE-01 — Bug de seguridad: cross-tenant data leak en caché

| Campo | Valor |
|---|---|
| Tipo | Seguridad — fuga de datos entre usuarios autenticados |
| Severidad | **ALTA** |
| Estado | ✅ **RESUELTO** (2026-05-20) |
| RF/RNF | RNF-07 (Autorización por propiedad de los datos) |
| Detectado por | TC-E-05-003 (DashboardPage empty state) en suite E2E completa |
| Corrección | 1 archivo: `backend/src/common/cache.interceptor.ts` + 3 *regression guards* unitarios |
| Verificación | 4 capas: 11/11 spec interceptor + 371/371 backend + 92/92 integración + 141/141 E2E ×3 |

El detalle completo del diagnóstico empírico, la causa raíz, los 5
endpoints afectados, el fix aplicado y la verificación están en
[`bug_seguridad_HE01.md`](bug_seguridad_HE01.md). Se mantiene
también la entrada legacy de diagnóstico en este documento (sección
"Detalle de HE-01" abajo) para preservar la trazabilidad histórica.

---

## HE-02 — Accesibilidad: falta `aria-label` en dropdown "Cerrar sesión"

| Campo | Valor |
|---|---|
| Tipo | Accesibilidad |
| Severidad | **Baja** — no bloquea uso visual; degrada experiencia con lectores de pantalla |
| Estado | Documentado para remediación futura |
| RF/RNF | RNF-29 (Diseño accesible — implícito en RNF-26 sobre flujo intuitivo) |
| Detectado por | Diseño del TC-E-00-005 (logout). El test tuvo que invocar `POST /api/auth/logout` directamente porque no había selector accesible fiable para el ítem del dropdown |

### Descripción

El botón/menuitem de cierre de sesión vive dentro del dropdown del
avatar en el header de `AppLayout`. No tiene `aria-label` explícito
asociado al trigger del dropdown ni al ítem específico, lo cual lo
hace difícil de seleccionar de forma fiable con tecnologías
asistivas (lectores de pantalla, navegación por teclado guiada).

### Impacto

- Usuario con lector de pantalla: el control aparece como genérico
  ("button", sin etiqueta), forzándolo a inferir su función por el
  texto visible (que puede no estar bien posicionado en el árbol
  de accesibilidad).
- Para la suite de pruebas: el TC-E-00-005 (`should logout and clear
  session cookie`) tuvo que abandonarse a un patrón distinto —
  invocación directa de `POST /api/auth/logout` vía la `APIRequestContext`
  de Playwright. La verificación de la API es correcta, pero NO
  prueba el camino del usuario humano por la UI.

### Recomendación

En el componente `AppLayout` (`frontend/app/src/layouts/AppLayout.tsx`
o similar — confirmar con la implementación actual) añadir
`aria-label={t('common.logout')}` al ítem del menú y/o al
`<DropdownMenu>` trigger del avatar.

```tsx
<Menu.Item key="logout" aria-label={t('common.logout')} onClick={...}>
  {t('common.logout')}
</Menu.Item>
```

### Esfuerzo estimado

**Trivial** — añadir un atributo en 1-2 líneas de JSX, sin
modificaciones lógicas. Se puede combinar con una mejora general de
audit con `axe-core` en una iteración futura.

### Decisión

**Documentado para remediación futura.** No corregido en el alcance
del proyecto de grado por las siguientes razones:

1. La regla del prompt para Fase 4 prohíbe modificar código de
   producción salvo bugs reales (HE-01 fue la excepción autorizada).
2. La accesibilidad como práctica integral requiere un barrido
   sistemático con `axe-core` y revisión manual, no parches puntuales.
3. La cobertura de RNF-26 (flujo intuitivo) se mantiene verde en
   TC-E-01-005 por la verificación con teclado-equivalente (botones
   "Anterior" / "Siguiente").

---

## HE-03 — i18n: textos hardcoded en KnowledgeBasePage

| Campo | Valor |
|---|---|
| Tipo | Internacionalización |
| Severidad | **Baja** — afecta UX en idiomas distintos al español |
| Estado | Documentado para remediación futura |
| RF/RNF | RNF-26 (flujo intuitivo — implícitamente i18n consistente) |
| Detectado por | Diseño del Page Object `KnowledgeBasePage` (e2e/pages/knowledgeBase.page.ts) durante TC-E-07. El reporte del Explore agent marcó los strings explícitamente |

### Descripción

`frontend/app/src/pages/knowledge/KnowledgeBasePage.tsx` contiene
strings de UI hardcoded en español sin pasar por `t()` del hook
`react-i18next`. Los strings identificados incluyen al menos:

- Botón "Buscar" del header
- Botón "Agregar documento"
- Título del modal "Agregar documento al knowledge base"
- Título del modal "Búsqueda semántica en knowledge base"

El resto de la aplicación sí usa `t()` consistentemente con claves
en `es.json` / `en.json`.

### Impacto

- Si el usuario cambia el idioma de la interfaz a `en` (vía el
  `LanguageDetector` que lee `localStorage`), estos strings seguirán
  en español, rompiendo la coherencia visual.
- Para la suite de pruebas: los Page Objects asumen los strings
  literales en español (consistente con la decisión D-A de forzar
  `locale: 'es-ES'`). Si en una iteración futura se mueve a `t()`,
  los tests siguen funcionando porque el locale es `es-ES`, pero
  si alguien cambia el locale en CI, romperían silenciosamente.

### Recomendación

Extraer los strings a `frontend/app/src/i18n/locales/es.json` y
`en.json` bajo una nueva subsección `knowledge`:

```json
{
  "knowledge": {
    "search": "Buscar",
    "addDocument": "Agregar documento",
    "addModalTitle": "Agregar documento al knowledge base",
    "searchModalTitle": "Búsqueda semántica en knowledge base"
  }
}
```

Y reemplazar el JSX hardcoded por `{t('knowledge.search')}`, etc.

### Esfuerzo estimado

**Bajo** — extracción mecánica de ~6 strings, sin lógica nueva.

### Decisión

**Documentado para remediación futura.** Mismo argumento que HE-02
(barrido sistemático de i18n, no parches puntuales). El feature
KnowledgeBase está disponible solo para roles `recruiter` y `admin`;
estos roles típicamente operan en español en el contexto del proyecto.

---

## HE-04 — i18n: "Cancelar" y "Mínimo 6 caracteres" hardcoded en ProfilePage

| Campo | Valor |
|---|---|
| Tipo | Internacionalización |
| Severidad | **Baja** — afecta UX en idiomas distintos al español |
| Estado | Documentado para remediación futura |
| RF/RNF | RNF-26 |
| Detectado por | Diseño del Page Object `ProfilePage` (e2e/pages/profile.page.ts) durante TC-E-06-003 |

### Descripción

`frontend/app/src/pages/profile/ProfilePage.tsx`:

- Línea 217: `<Button>Cancelar</Button>` — debería ser
  `{t('common.cancel')}`. La clave `common.cancel` ya existe en
  `es.json` y se usa en otros formularios del proyecto.
- Línea 244: mensaje de validación "Mínimo 6 caracteres" hardcoded en
  el `Rule` del `Form.Item` de cambio de contraseña. Debería ser
  `{t('auth.passwordMinLength', { count: 6 })}` o similar.

### Impacto

Idéntico a HE-03: ruptura de la coherencia de idioma si el usuario
cambia el locale. Adicionalmente, el mensaje de validación de
contraseña no se internacionaliza, lo que es más visible al usuario
porque ocurre en el momento de error.

### Recomendación

Reemplazar ambos strings por sus equivalentes `t()`. Verificar que
`common.cancel` y `auth.passwordMinLength` existen en ambos locales;
si no, añadirlos.

### Esfuerzo estimado

**Trivial** — 2 strings en un archivo.

### Decisión

**Documentado para remediación futura.** Misma justificación que
HE-02 y HE-03.

---

## HE-05 — Lógica de negocio: `skill_id` fallback contamina preguntas IA del admin ⚠

| Campo | Valor |
|---|---|
| Tipo | Lógica de negocio — calidad de datos |
| Severidad | **MEDIA-ALTA** ⚠ |
| Estado | **Diferido por Decisión D-13** — registrado en backlog post-MVP ([`plan_mejoras_futuras.md`](plan_mejoras_futuras.md)) |
| RF/RNF | **RF-12** (selección inteligente de preguntas), **RF-27** (cálculo de UserSkillScore), **RF-42** (gestión del banco de preguntas) |
| Detectado por | Inspección del flujo "Generar con IA" en TC-E-08 + análisis cruzado del backend (`admin-questions.controller.ts:96, 129`) |

### Descripción

El feature "Generar con IA" del `AdminQuestionsPage` permite al
administrador generar preguntas usando un LLM y persistirlas en el
banco. El flujo es:

1. Admin abre el modal "Generar con IA", elige *topic*, *level*,
   *language*, *count*.
2. Frontend hace `POST /api/catalogs/questions/generate` → recibe
   array de strings con los textos generados.
3. Admin selecciona cuáles persistir → frontend hace por cada uno
   un `POST /api/admin/questions`.

El problema está en el paso 3:
`frontend/app/src/pages/admin/AdminQuestionsPage.tsx:165-176`

```ts
const addQuestionsMutation = useMutation({
  mutationFn: (questions: string[]) =>
    Promise.all(
      questions.map((q) =>
        api.post('/admin/questions', {
          questionText: q,
          type: 'open',
          levelId: levels?.find((l) => l.name === level)?.id,
          languageId: languages?.find((l) => l.name === language)?.id,
          // ⚠ NO se envía `skillId` — pero el form de "Generar con IA"
          //    tampoco lo pide al usuario admin.
        }),
      ),
    ),
})
```

Y en `backend/src/catalogs/admin-questions.controller.ts:127-129`:

```ts
async create(@Body() body: { ... skillId?: number; ... }) {
  // Default to first available if not provided
  const languageId = body.languageId ?? (await this.prisma.language.findFirst())?.id ?? 1;
  const levelId    = body.levelId    ?? (await this.prisma.level.findFirst())?.id    ?? 1;
  const skillId    = body.skillId    ?? (await this.prisma.skill.findFirst())?.id    ?? 1;
  return this.prisma.question.create({ data: { ..., skillId } });
}
```

**Consecuencia funcional:** TODAS las preguntas generadas por el admin
via "Generar con IA" quedan persistidas con `skill_id = <id del primer
skill en orden de inserción de la tabla skills>` (típicamente el ID
más bajo). El admin generó 10 preguntas sobre "React Hooks" → quedan
todas etiquetadas con la habilidad "APIs REST" (o lo que sea el primer
skill del seed). No hay forma de que el admin las corrija en bulk; cada
una debe editarse manualmente.

### Por qué no es un edge case (a diferencia de los otros fallback `?? 1`)

El patrón `body.x ?? prisma.x.findFirst() ?? 1` aparece en 3 endpoints
del admin (`POST /admin/questions`, `POST /admin/questions/import`,
y dentro de `InterviewsService.create` para preguntas RAG). En los
otros dos contextos el fallback tiene sentido:

- **POST `/admin/questions` con form manual**: el admin sí ve el
  Select de "Habilidad" y normalmente lo llena. El fallback protege
  solo el caso edge en que el admin omite el campo.
- **InterviewsService RAG**: hereda `questions[0]?.skillId` —el skill
  de la primera pregunta CURADA del bundle—, lo que es una heurística
  válida (el RAG se generó EN EL CONTEXTO de esa habilidad). Solo cae
  al `?? 1` literal si no hay ninguna curada, lo cual es muy raro.
- **POST `/admin/questions/import`**: si el admin no pone `skillId` en
  el JSON, asume responsabilidad del formato.

**Pero en "Generar con IA"** el admin NUNCA tiene oportunidad de
proveer el skillId, porque el modal no lo pide. Cada uso del feature
genera el sesgo. Es el flujo principal del feature, no un edge.

### Impacto sobre los RF

#### RF-12 — Selección inteligente de preguntas (filtros)

`QuestionSelectorService.selectQuestions()` filtra el banco por
`languageId / frameworkId / levelId` y luego diversifica por
`skill_id` (toma una pregunta por skill distinto hasta llenar el
slot). Si las preguntas generadas por IA quedan con el skill
incorrecto:

- Cuando un estudiante pide entrevista filtrada por skill X, las
  preguntas IA mal-etiquetadas no aparecen aunque sean realmente
  sobre X.
- La diversificación de skills se distorsiona: la "diversidad" usa
  buckets falsos.

#### RF-27 — Cálculo de scores por habilidad (0–100)

En `EvaluationProcessor.process()`, después de cada respuesta el
sistema actualiza `UserSkillScore` por el `skill_id` de la pregunta
respondida (EMA con alpha 0.3). Si una pregunta sobre "React Hooks"
está mal etiquetada como "APIs REST":

- El score del usuario en "APIs REST" sube/baja por el desempeño en
  una pregunta que no era de APIs REST.
- El dashboard del estudiante muestra fortalezas/debilidades
  derivadas de datos contaminados.

#### RF-42 — Gestión del banco de preguntas

El banco queda con metadata contaminada que no refleja la realidad
de las preguntas. La operación "exportar a CSV" del admin produce
datos engañosos para análisis externo.

### Verificación empírica del bug

Reproducción manual (asumiendo backend test levantado y un admin
logueado):

```bash
# 1. Listar skills en orden de inserción:
curl http://127.0.0.1:3002/api/catalogs/skills -b cookies-admin.txt
# Supongamos devuelve: [{"id":7,"name":"APIs REST"}, {"id":8,"name":"Bases de datos"}, ...]
# El primero (id=7) será el "ganador" del fallback.

# 2. Generar pregunta IA SIN skillId:
curl -X POST http://127.0.0.1:3002/api/admin/questions \
  -H 'content-type: application/json' \
  -b cookies-admin.txt \
  -d '{"questionText":"¿Qué es JSX en React?","type":"open","languageId":1,"levelId":3}'

# Respuesta: { ..., skillId: 7, ... }   ⚠ Pero la pregunta es de React, NO de "APIs REST".
```

La suite E2E TC-E-08 NO detectó este bug por una mezcla de causas:

1. El test TC-E-08-002 (`open modal to create new question`) usa el
   form manual, donde el admin SÍ provee skill — y el mock fixture
   intercepta `POST /catalogs/questions/generate` con respuestas
   deterministas, por lo que el flujo IA completo no se ejerce con
   profundidad de verificación de skill_id correcto.
2. TC-E-08 valida la mecánica del UI (modal abre, submit enabled,
   etc.) pero no la corrección semántica del skill_id resultante.

**El bug se descubrió por análisis de código** durante la consolidación
del informe, no por una aserción del E2E. Esto es coherente con el
caso HE-01 (también requirió análisis adicional al diagnóstico inicial).

### Por qué severidad MEDIA-ALTA y no ALTA ni Media-Baja

- **No es ALTA como HE-01** porque NO compromete privacidad ni
  seguridad. Los datos contaminados son visibles para el dueño
  (admin/estudiante) y no se cruzan entre usuarios.
- **No es MEDIA-Baja** porque afecta el flujo principal de un feature
  declarado (RF-42 + RF-12 + RF-27) en condiciones normales, no en
  edge cases.
- **Es MEDIA-ALTA** porque:
  - Contamina datos persistidos (no auto-corrigible al recargar la app).
  - Afecta 3 RF declarados a la vez.
  - El feature "Generar con IA" es visible y promocionado en la UI
    del admin (botón principal del header).
  - Compromete la utilidad del sistema de scores adaptativos del
    estudiante (RF-27/RF-28), que es uno de los diferenciadores
    centrales de Vinki.

### Recomendaciones de fix (NO aplicadas — pendientes de decisión)

Hay varias estrategias posibles, ordenadas por preferencia técnica:

#### Opción A — Pedir skillId al admin en el modal "Generar con IA" (recomendado)

Modificar el modal en `AdminQuestionsPage.tsx` para incluir un Select
de "Habilidad" obligatorio antes de generar:

```tsx
<Form.Item name="skill" label={t('feedback.skill')} rules={[{ required: true }]}>
  <Select options={skills.map(s => ({ value: s.id, label: s.name }))} />
</Form.Item>
```

Y en `addQuestionsMutation` enviar el `skillId` seleccionado. **Es la
opción más correcta** porque el admin sabe qué habilidad piensa cubrir
al generar.

- **Esfuerzo:** Bajo (UI + 1 línea en la mutation).
- **Riesgo:** Mínimo — el backend ya acepta el campo.

#### Opción B — Inferir skillId desde el `topic` con un LLM call adicional

Hacer que el backend, antes de persistir las preguntas generadas, le
pida al LLM clasificarlas en una de las habilidades del catálogo. Más
sofisticado pero más costoso y propenso a errores de LLM.

- **Esfuerzo:** Medio (1 LLM call extra por generación).
- **Riesgo:** Medio (mala clasificación si la habilidad real no
  está en el catálogo).

#### Opción C — Mantener fallback pero hacerlo explícito en la UI

Mostrar al admin un Tag tipo "Habilidad asignada automáticamente —
edite si es necesario" tras cada generación. Esto NO arregla el bug
de fondo pero hace visible al admin que debe revisar.

- **Esfuerzo:** Trivial.
- **Riesgo:** El admin puede ignorar el aviso; el bug persiste.

### Esfuerzo estimado para Opción A (recomendado)

**Bajo** — ~30 líneas de TSX + 1 línea en la mutation +
posiblemente 1-2 tests unitarios del controller.

Archivos afectados (si se autoriza):

1. `frontend/app/src/pages/admin/AdminQuestionsPage.tsx` (modal generación)
2. (Opcional) `backend/src/catalogs/admin-questions.controller.spec.ts`
   para añadir aserción de que `skillId` se respeta cuando viene
   explícito (el test ya existe parcialmente en línea 166-181).

### Decisión

**Diferida por Decisión D-13** (2026-05-20) — registrada en
`qa/01-plan-maestro/decisiones_qa.md` § D-13. La justificación
profesional resumida:

1. **No compromete seguridad ni privacidad** (a diferencia de HE-01),
   por lo que la urgencia es menor.
2. **Afecta una funcionalidad administrativa** (RF-42 — prioridad
   Baja en `docs/requerimientos.md`), no el recorrido crítico del
   MVP del estudiante.
3. **La corrección implica un cambio de UX** (selector de skill
   obligatorio en el modal "Generar con IA") que excede el alcance
   de corrección de defectos y entra en desarrollo de features.

La asimetría con HE-01 es deliberada y refleja la práctica estándar
de gestión profesional de defectos: severidad ALTA + fix sin cambio
de UX → corregir inmediatamente; severidad MEDIA-ALTA + fix con
cambio de UX en feature de prioridad Baja → diferir al backlog
priorizado.

**Plan de remediación:** fix técnicamente especificado (Opción A) en
[`plan_mejoras_futuras.md`](plan_mejoras_futuras.md). Reversibilidad
total: el backend ya acepta el campo `skillId`, sólo es necesario
añadirlo en el frontend cuando se amplíe el alcance post-MVP.

---

## Detalle histórico de HE-01 (preservado para trazabilidad)

> Esta sección preserva el diagnóstico empírico original del bug
> HE-01 antes de que se decidiera moverlo al reporte dedicado. Se
> mantiene aquí como evidencia del proceso de investigación.

### Diagnóstico realizado

**El test E2E NO era flake — estaba detectando correctamente un bug
real de producción.**

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

### Causa raíz original

`backend/src/common/cache.interceptor.ts:88-92` (versión previa al fix):

```ts
private buildCacheKey(request: any): string {
  const method = request.method
  const url = request.originalUrl || request.url
  return `cache:${method}:${url}`  // ⛔ NO incluye userId
}
```

### Endpoints afectados

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

### Fix aplicado (2026-05-20)

`backend/src/common/cache.interceptor.ts` — `buildCacheKey()` ahora
incluye el `userId` del JWT autenticado:

```ts
private buildCacheKey(request: any): string {
  const method = request.method;
  const url = request.originalUrl || request.url;
  // RNF-07 / Bug HE-01: incluir el userId del request autenticado en
  // la clave evita cache poisoning cross-user.
  const userId = request.user?.userId ?? 'anon';
  return `cache:${method}:${url}:u:${userId}`;
}
```

### Verificación de la corrección

| Capa | Resultado |
|---|---|
| Unitario `cache.interceptor.spec.ts` | **11 / 11** verde (8 originales + 3 nuevos *regression guards*) |
| Suite unitaria backend completa | **371 / 371** verde (368 → 371) — **0 regresiones** |
| Suite integración | **92 / 92** verde — **0 regresiones** |
| Suite E2E (`--repeat-each=3`) | **141 / 141** verde (47 × 3 corridas seguidas) |

### Mejora adicional aplicada

`e2e/global-setup.ts` ahora hace `FLUSHDB` del Redis de test al inicio
de cada corrida E2E. **No es necesario para corregir el bug** (el fix
de `cache.interceptor.ts` por sí solo es suficiente — verificado con
`--repeat-each=3`), sino higiene de aislamiento entre corridas.

### Regression guards añadidos

`backend/src/common/cache.interceptor.spec.ts` ahora incluye los siguientes
tests unitarios que fijan el contrato a nivel de capa más baja:

1. `should generate different cache keys for different authenticated
   users on the same endpoint`.
2. `should NOT leak User A response to User B when User B hits the
   same endpoint after a cache HIT for A`.
3. `should use 'anon' in cache key for unauthenticated requests
   (public catalog endpoints)`.

Estos tests son el **regression-guard a nivel unitario** del bug. Si
alguien regresiona `buildCacheKey()` quitando el userId, **rompen
estos 3 tests antes de que el bug llegue a producción**.

---

## HE-06 — Rendimiento (UX): latencia >5 s en feedback inmediato del modo `practice`

| Campo | Valor |
|---|---|
| Tipo | Rendimiento / UX — latencia del LLM en feature de feedback inmediato |
| Severidad | **Baja-Media** (no afecta el flujo crítico del estudiante) |
| Estado | **Documentado y acotado por D-17** — pendiente de validación del tutor sobre recalibración del RNF-01 |
| RF/RNF | RNF-01 (sub-umbral propuesto `practice`) |
| Detectado por | Escenario 4 de JMeter (`04-rnf01-real.jmx`) en Fase 5-A |
| Verificado en | [`reporte_rendimiento.md`](../04-pruebas-no-funcionales/rendimiento/reporte_rendimiento.md) §§ 2.4 / 5 / 6 + [`analisis_flujo_evaluacion.md`](../04-pruebas-no-funcionales/rendimiento/analisis_flujo_evaluacion.md) |

### Síntoma medido

Sample aislado `POST /api/interviews/1/questions/1/evaluate-now` con
LLM real (`gpt-4o-mini`), 20 muestras a baja concurrencia:

| Métrica | Valor |
|---|---|
| Min | 3 344 ms |
| P50 | 4 415 ms |
| **P95** | **7 418 ms** (> umbral 5 000 ms) |
| P99 | 7 454 ms |
| Error % | 0.00 % |

### Por qué NO es un incumplimiento del RNF-01 en su flujo principal

El análisis del flujo de evaluación (referencia textual a líneas
específicas del SUT) demostró que el sistema implementa **dos rutas**:

1. **`evaluation` mode (formal, flujo principal del estudiante):**
   el frontend invoca `POST /interviews/:id/finish` que **encola** la
   evaluación en BullMQ y retorna inmediatamente
   (`evaluationStatus: 'processing'`). El usuario aterriza en
   `InterviewConfirmationPage`, ve el tag *"processing"* y un copy
   explícito: *"Your evaluation is being processed by our AI. You'll
   receive a notification when it's ready"*. **No hay bloqueo.** El
   `EvaluationProcessor` (BullMQ worker) consume el mismo
   `EVALUATOR_SERVICE` y emite `evaluation.completed` al terminar.
2. **`practice` mode (feature opcional de feedback inmediato):** el
   frontend, tras `submitAnswer.mutate(...)`, auto-encadena
   `evaluateNow.mutate(question.id)` que llama a `evaluate-now`
   **síncronamente** y muestra un `<Spin />` con la etiqueta
   `interview.evaluatingAnswer` mientras `evaluateNow.isPending`.

HE-06 documenta la latencia del camino 2. El camino 1 (principal)
cumple el RNF-01 con holgura masiva (ack ~12 ms).

### Causa raíz

~95 % del tiempo del request es trabajo del proveedor externo
`gpt-4o-mini`. El overhead arquitectónico medido en mock es 361 ms a
50 u concurrentes; el resto (>7 s) corresponde a la respuesta del LLM.
Es un factor **ajeno al control de diseño del sistema**: el frontend
y el backend hacen su parte óptimamente.

### Recomendaciones (propuestas en D-17, NO aplicadas)

1. **Diferenciar el RNF-01 en sub-umbrales:**
   - **RNF-01-a (acuse de envío):** P95 < 500 ms — cumplido con
     holgura masiva (~12 ms del `/finish`).
   - **RNF-01-b (feedback inmediato en `practice`):** P95 < 8 s —
     compatible con LLMs económicos modernos (mediana medida 4.4 s,
     umbral propuesto deja margen al P95).
2. **Streaming de la respuesta LLM** (`stream: true` en OpenAI) para
   que el TTFB percibido sea < 1 s incluso si el TTLR completo es
   similar. Mayor palanca de UX sin cambiar modelo.
3. **Modelo más rápido** (p. ej. `gpt-4o`) — costo ~10× mayor.
4. **Caché de pares pregunta+respuesta repetidos** — caso edge para
   demos.

Detalle técnico completo en
[`reporte_rendimiento.md` § 6](../04-pruebas-no-funcionales/rendimiento/reporte_rendimiento.md).

---

## Cierre

6 hallazgos documentados con resolución consistente:

- **HE-01 — Bug de seguridad ALTA, RESUELTO.** Detectado por la
  suite E2E (TC-E-05-003) y corregido en
  `backend/src/common/cache.interceptor.ts`. Cobertura de regresión a
  4 niveles (unitario + regression guards + integración + E2E ×3).
  **Es el hallazgo más valioso de la Fase 4 y se reporta en detalle
  en [`bug_seguridad_HE01.md`](bug_seguridad_HE01.md).**
- **HE-05 — Bug de lógica MEDIA-ALTA, DIFERIDO por D-13.** Contamina
  metadata de preguntas generadas por IA del admin (afecta RF-12,
  RF-27, RF-42). La decisión D-13 lo difiere al backlog post-MVP con
  fix técnico ya especificado en
  [`plan_mejoras_futuras.md`](plan_mejoras_futuras.md). La asimetría
  con HE-01 (corregido vs. diferido) es deliberada y refleja la
  gestión profesional de defectos por severidad, alcance y tipo de fix.
- **HE-02, HE-03, HE-04 — Mejoras de UX/accesibilidad/i18n.**
  Documentadas como mejoras post-MVP en
  [`plan_mejoras_futuras.md`](plan_mejoras_futuras.md), no
  bloqueantes para el cumplimiento de requerimientos del proyecto
  de grado.
- **HE-06 — Observación de rendimiento Baja-Media, ACOTADA por D-17.**
  Latencia >5 s del feedback inmediato del modo `practice` con LLM
  real. **No incumple el RNF-01 en el flujo principal** (modo
  `evaluation`, asíncrono, ack ~12 ms). Decisión D-17 propone
  sub-umbrales para el RNF-01 (RNF-01-a / RNF-01-b) pendiente de
  validación con el tutor. Detalle técnico y recomendaciones en
  [`qa/04-pruebas-no-funcionales/rendimiento/reporte_rendimiento.md`](../04-pruebas-no-funcionales/rendimiento/reporte_rendimiento.md).

Tras el fix de HE-01 la suite E2E es **47/47 verde estable** en
corridas repetidas (verificado con `--repeat-each=3` → 141/141). La
Fase 4 queda formalmente cerrada con todos los hallazgos gestionados.
