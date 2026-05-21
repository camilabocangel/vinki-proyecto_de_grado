# Plan de mejoras futuras — Hallazgos diferidos

> Backlog de mejoras identificadas durante el proceso de QA del proyecto
> Vinki, diferidas del alcance del MVP académico con justificación
> profesional. Cada entrada está lista para implementación en una
> versión posterior del sistema: incluye descripción, fix recomendado,
> esfuerzo estimado y referencia al hallazgo origen.
>
> **Apto para anexo del informe final del proyecto de grado.**

---

## Resumen del backlog

| ID | Hallazgo (1 línea) | Severidad | Esfuerzo | RF/RNF | Fix especificado |
|---|---|---|---|---|---|
| **HE-05** | `skill_id` por defecto incorrecto en "Generar con IA" del admin (diferido por D-13) | **MEDIA-ALTA** | Bajo | RF-12, RF-27, RF-42 | ✅ Sí — Opción A (selector de skill obligatorio) |
| HE-02 | Falta `aria-label` en ítem "Cerrar sesión" del dropdown del header | Baja | Trivial | RNF-29 | ✅ Sí |
| HE-03 | Strings hardcoded sin `t()` en `KnowledgeBasePage` | Baja | Bajo | RNF-26 | ✅ Sí |
| HE-04 | "Cancelar" y validación de password sin `t()` en `ProfilePage` | Baja | Trivial | RNF-26 | ✅ Sí |

**Criterio de priorización para la post-iteración:**

1. HE-05 — porque afecta calidad de datos en un feature visible (RF-42)
   y degrada parcialmente dos RF del estudiante (RF-12, RF-27).
2. HE-03 + HE-04 — internacionalización; puede agruparse en una sola
   iteración de "barrido i18n" para coherencia.
3. HE-02 — combinable con un audit general de accesibilidad con
   `axe-core` en una iteración dedicada de WCAG/AA.

Origen completo de cada hallazgo:
[`hallazgos_e2e.md`](hallazgos_e2e.md).

---

## HE-05 — `skill_id` por defecto incorrecto en "Generar con IA" del admin

| Campo | Valor |
|---|---|
| Severidad | **MEDIA-ALTA** ⚠ |
| Tipo | Lógica de negocio / calidad de datos |
| RF/RNF afectados | RF-12 (selección inteligente), RF-27 (UserSkillScore), RF-42 (gestión banco) |
| Decisión de diferimiento | **D-13** (`qa/01-plan-maestro/decisiones_qa.md`) |
| Estado del sistema | Operacional; los flujos centrales del estudiante funcionan correctamente. El feature "Generar con IA" del admin produce metadata contaminada. |
| Mitigación temporal | El admin puede editar manualmente cada pregunta generada para corregir el skill (operación 1-a-1 vía el modal de edición). |

### Descripción

El flujo "Generar con IA" del `AdminQuestionsPage` invoca
`POST /api/admin/questions` sin enviar el campo `skillId`. El backend
aplica el fallback
`body.skillId ?? (await prisma.skill.findFirst())?.id ?? 1` y persiste
todas las preguntas generadas con el primer skill del catálogo (típicamente
"APIs REST" en el seed de Vinki), sin importar el tema real del que
trataba la generación. Diagnóstico técnico completo y verificación
empírica en
[`hallazgos_e2e.md` § HE-05](hallazgos_e2e.md).

### Fix recomendado — Opción A

Agregar un `Form.Item` con Select de "Habilidad" obligatorio al modal
"Generar con IA" de
`frontend/app/src/pages/admin/AdminQuestionsPage.tsx`. El backend ya
acepta `skillId` opcional en el body; solo es necesario completarlo
desde el frontend.

```tsx
// En el form del modal "Generar con IA":
<Form.Item
  name="skillId"
  label={t('feedback.skill')}
  rules={[{ required: true }]}
>
  <Select
    options={skills.map((s) => ({ value: s.id, label: s.name }))}
    placeholder={t('common.selectSkill')}
  />
</Form.Item>
```

Y en `addQuestionsMutation`:

```ts
api.post('/admin/questions', {
  questionText: q,
  type: 'open',
  levelId: levels?.find((l) => l.name === level)?.id,
  languageId: languages?.find((l) => l.name === language)?.id,
  skillId: form.getFieldValue('skillId'),   // ← nuevo
})
```

### Esfuerzo estimado

**Bajo** — ~30 líneas TSX + 1 línea en la mutation + (opcional) 1
test unitario adicional en `admin-questions.controller.spec.ts` para
asertar que `skillId` se respeta cuando viene explícito (parcialmente
ya cubierto en líneas 166-181 del spec actual).

### Archivos a modificar

1. `frontend/app/src/pages/admin/AdminQuestionsPage.tsx` (modal generación).
2. `frontend/app/src/i18n/locales/es.json` y `en.json` — agregar
   `common.selectSkill` si no existe.
3. (Opcional) `backend/src/catalogs/admin-questions.controller.spec.ts`
   — reforzar regression-guard.

### Tests E2E asociados (sin modificar)

TC-E-08-002 (`should open modal to create new question with valid fields`)
puede extenderse en el futuro para asertar que el modal de generación
IA requiere `skillId`. La extensión es bienvenida pero NO bloqueante
del fix.

---

## HE-02 — Falta `aria-label` en ítem "Cerrar sesión" del dropdown del header

| Campo | Valor |
|---|---|
| Severidad | Baja |
| Tipo | Accesibilidad |
| RF/RNF afectados | RNF-29 (diseño accesible) |
| Estado del sistema | Operacional; el botón funciona pero no es óptimo para tecnologías asistivas (lectores de pantalla, navegación por teclado guiada). |
| Mitigación temporal | Para los tests E2E, TC-E-00-005 invoca `POST /api/auth/logout` directamente vía `APIRequestContext`. El usuario humano sigue pudiendo cerrar sesión visualmente. |

### Fix recomendado

Localizar el dropdown del avatar en el layout (`AppLayout.tsx` o
componente equivalente del header) y añadir el atributo `aria-label`
al menú y al ítem específico:

```tsx
<Dropdown
  menu={{
    items: [
      {
        key: 'logout',
        label: t('common.logout'),
        'aria-label': t('common.logout'),
        onClick: handleLogout,
      },
    ],
    'aria-label': t('common.userMenu'),
  }}
>
  <Avatar ... />
</Dropdown>
```

### Esfuerzo estimado

**Trivial** — añadir 1-2 atributos en JSX, sin lógica nueva.

### Sugerencia adicional

Combinar este fix con un barrido general de accesibilidad usando
`axe-core` en una iteración dedicada de WCAG/AA. La librería ya está
instalada en el proyecto (`@axe-core/react` desde Fase 0) pero no se
ha integrado a un CI gate.

---

## HE-03 — Strings hardcoded sin `t()` en `KnowledgeBasePage`

| Campo | Valor |
|---|---|
| Severidad | Baja |
| Tipo | Internacionalización |
| RF/RNF afectados | RNF-26 (coherencia de idioma del sistema) |
| Estado del sistema | Operacional en español (el idioma por defecto del proyecto). Falla coherencia si el usuario cambia a `en` vía `LanguageDetector`. |
| Mitigación temporal | El feature `KnowledgeBase` está protegido por roles `recruiter`/`admin`; estos usuarios operan en español en el contexto académico. |

### Fix recomendado

Extraer los strings identificados a `es.json` / `en.json` bajo una
nueva subsección `knowledge`:

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

---

## HE-04 — "Cancelar" y validación password sin `t()` en `ProfilePage`

| Campo | Valor |
|---|---|
| Severidad | Baja |
| Tipo | Internacionalización |
| RF/RNF afectados | RNF-26 |
| Estado del sistema | Operacional en español. |
| Mitigación temporal | Ninguna requerida en español. |

### Fix recomendado

`frontend/app/src/pages/profile/ProfilePage.tsx`:

- Línea 217: reemplazar `<Button>Cancelar</Button>` por
  `<Button>{t('common.cancel')}</Button>`. La clave ya existe en
  `es.json`.
- Línea 244: reemplazar el mensaje hardcoded "Mínimo 6 caracteres" en
  el `Rule` del `Form.Item` por `t('auth.passwordMinLength', { count: 6 })`
  o equivalente. Añadir la clave en ambos locales si no existe.

### Esfuerzo estimado

**Trivial** — 2 strings en un archivo.

### Sugerencia adicional

Combinar HE-03 y HE-04 en una sola iteración de "barrido i18n":
revisar todo `frontend/app/src/pages/` y `frontend/app/src/components/`
buscando strings literales fuera de `t()`. Es una tarea de ~1 hora
que cierra ambas observaciones a la vez.

---

## Aplicación al cierre del proyecto de grado

Para el informe final, este documento puede incluirse como **anexo
"Plan de mejoras futuras del sistema"** o como sección del capítulo
de gestión de defectos. Demuestra:

1. **Rigor metodológico:** los hallazgos se gestionan
   profesionalmente (severidad, justificación de diferimiento,
   trazabilidad a RF/RNF, fix técnicamente especificado).
2. **Honestidad académica:** no se ocultan los defectos detectados;
   se documentan con la precisión técnica que permite su corrección
   posterior por cualquier desarrollador.
3. **Aplicación de la pirámide de testing:** los hallazgos vienen de
   E2E y de análisis de código, no de revisión manual ad-hoc;
   evidencia que la inversión en suites de prueba paga retorno
   detectando defectos reales (HE-01 corregido + HE-05 documentado).
4. **Gestión de alcance:** distinción clara entre lo que cae dentro
   del MVP (corrigible en el ciclo del proyecto) y lo que se difiere
   al backlog post-MVP (con fix listo para implementar).
