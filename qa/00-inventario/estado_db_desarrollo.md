# Estado de la base de datos de desarrollo

> **Contexto:** verificación previa a la aplicación de la migración
> `20260519120000_add_check_constraints` (Decisión QA D-1).
> **Fecha de inspección:** 2026-05-19.
> **Rol:** DBA — inspección de solo lectura.
> **Base inspeccionada:** desarrollo local (contenedor `proyectodegrado-postgres-1`,
> servicio `postgres` de `docker-compose.yml`, base `vinki`, usuario `vinki`,
> puerto host `5433`). **No** se accedió a bases de pruebas ni de producción.

---

## Resumen

- **DB corriendo:** Sí — el servicio no estaba activo; se levantó con
  `docker compose up -d postgres` y quedó en estado *healthy* antes de inspeccionar.
- **Migración CHECK ya aplicada:** No — la consulta sobre `_prisma_migrations` con
  patrón `%check_constraints%` devolvió 0 filas.
- **Filas totales en tablas afectadas:**

  | Tabla | Filas |
  |---|---|
  | `answer_evaluations` | 2 |
  | `user_skill_scores` | 2 |
  | `interview_questions` | 16 |

- **Filas en violación de los futuros CHECK:**

  | Verificación | Restricción futura | Filas en violación |
  |---|---|---|
  | `answer_evaluations` — 5 dimensiones (RNF-18) | valor ∈ [0, 5] | **0** |
  | `user_skill_scores.score` (RNF-19) | valor ∈ [0, 100] | **0** |
  | `interview_questions.order_number` (RNF-20) | valor > 0 | **0** |

**Conclusión:** la base de desarrollo no contiene ningún dato que viole las
restricciones CHECK que introduce la migración. El riesgo de fallo por
`ALTER TABLE ... ADD CONSTRAINT` sobre datos existentes es **nulo**.

---

## Recomendación

### → Opción A — APLICAR LA MIGRACIÓN DIRECTAMENTE *(recomendada)*

**Fundamento:** existen **0 filas en violación** en las tres tablas, por lo que la
migración se aplicará sin error. Es una operación **no destructiva**: agrega
restricciones sin alterar ni eliminar datos. No hay motivo para resetear la base.

**Acción propuesta (pendiente de tu ejecución; no ejecutada por el DBA):**

```bash
cd backend
npx prisma migrate deploy
```

Verificación posterior sugerida (confirmar que las constraints quedaron registradas):

```sql
SELECT conname FROM pg_constraint WHERE conname LIKE 'chk_%';
```

### Nota sobre la Opción B (resetear la DB)

El volumen de datos es pequeño y de apariencia de *seed*/demo (2, 2 y 16 filas), lo
que técnicamente también permitiría la Opción B (`prisma migrate reset --force`). No
obstante, **B se descarta** por ser una operación **destructiva e innecesaria**: dado
que la migración aplica limpiamente, no aporta beneficio borrar y regenerar los datos.
B solo sería preferible si la migración fuese a fallar, lo que aquí no ocurre.

### Opción C (limpiar datos fuera de rango)

**No aplica:** no se encontraron filas fuera de rango.

---

## Detalle de violaciones encontradas

No se encontraron violaciones. Las consultas de muestra (primeros 10 registros fuera
de rango) devolvieron **0 filas** en las tres tablas:

| Consulta de muestra | Resultado |
|---|---|
| `answer_evaluations` con dimensión fuera de [0, 5] | 0 filas |
| `user_skill_scores` con `score` fuera de [0, 100] | 0 filas |
| `interview_questions` con `order_number` ≤ 0 | 0 filas |

---

## Apéndice — Evidencia de las consultas ejecutadas

Todas las consultas se ejecutaron vía `docker exec` contra el contenedor
`proyectodegrado-postgres-1` (base `vinki`). Inspección de **solo lectura**: no se
ejecutó ningún `UPDATE`, `DELETE`, `RESET` ni la propia migración.

| # | Consulta | Resultado |
|---|---|---|
| a | Conteo de filas en tablas afectadas | `answer_evaluations`=2, `user_skill_scores`=2, `interview_questions`=16 |
| b | Filas fuera de rango en `answer_evaluations` | 0 |
| c | Filas fuera de rango en `user_skill_scores` | 0 |
| d | Filas fuera de rango en `interview_questions` | 0 |
| e | Muestra de hasta 10 registros en violación | 0 filas en las tres tablas |
| 4 | `_prisma_migrations` con patrón `%check_constraints%` | 0 filas (migración no aplicada) |
