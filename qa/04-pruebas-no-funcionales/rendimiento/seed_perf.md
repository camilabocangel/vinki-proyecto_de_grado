# Seed dedicado para pruebas de rendimiento (Fase 5)

> Documento operativo del seed `backend/test/perf/seed-perf.ts`,
> introducido por **Decisión D-16** en
> `qa/01-plan-maestro/decisiones_qa.md`.

---

## Propósito

Poblar la DB de test (puerto **5434**, esquema `vinki_test`) con un
dataset representativo para las corridas de JMeter de Fase 5 (D-9).
Es **independiente del seed E2E** para evitar romper la suite
Playwright (47/47 estable verificada con `--repeat-each=3`).

## Qué crea

| Recurso | Cantidad | Notas |
|---|---|---|
| Catálogos | Roles (2), Languages (2), Frameworks (3), Levels (3), Skills (3) | Estructura mínima diversa para cycle de preguntas |
| Usuarios | 3 fijos + 50 "bulk" | `perf-student`, `perf-recruiter`, `perf-admin` (passwords fijos, ver § Credenciales) + `perf-student-001..050` con password compartida `PerfBulk-2026!` para alimentar el CSV de RNF-03 (50 concurrentes). |
| Preguntas con embedding | **default 10 000** (configurable) | Embeddings deterministas vía raw SQL pgvector, dimensión 1536. Batch insert (500/req). |
| Documento knowledge base | 1 | `title='Documento perf — NestJS / Node.js'`, **`status='ready'`** (literal exigido por el query del RNF-02). |
| Knowledge chunks | default 50 | Cada uno con embedding determinista, batch insert (100/req). |
| Entrevista activa | 1 | Para `perf-student`, modo `practice`, con 1 `interview_question` y 1 `answer` ya sembradas. Apta para `POST /api/interviews/:id/questions/:qid/evaluate-now` (RNF-01). |

## Cómo ejecutarlo

### Pre-requisito

Contenedores de test arrancados y migraciones aplicadas:

```pwsh
docker compose -f docker-compose.test.yml up -d
# Esperar a que vinki-postgres-test y vinki-redis-test estén (healthy).

# Las migraciones ya están aplicadas desde Fase 3; si no:
cd backend
$env:DATABASE_URL = "postgresql://vinki:vinki_test@localhost:5434/vinki_test?schema=public"
npx -y prisma@6.19.2 migrate deploy
```

### Volumen oficial (10 000 preguntas)

```pwsh
cd backend
npm run seed:perf
```

Tiempo observado en máquina de referencia (Windows 11, Node 22,
SSD): **~15 segundos**.

### Volumen reducido (iteración rápida durante desarrollo)

Las variables `PERF_QUESTIONS`, `PERF_CHUNKS` y `PERF_BULK_STUDENTS`
controlan los volúmenes sin tocar el código:

```pwsh
$env:PERF_QUESTIONS = "100"
$env:PERF_CHUNKS = "5"
$env:PERF_BULK_STUDENTS = "5"   # CSV RNF-03 reducido a 5 filas
npm run seed:perf
Remove-Item Env:PERF_QUESTIONS, Env:PERF_CHUNKS, Env:PERF_BULK_STUDENTS
```

Tiempo observado con 100 preguntas: < 5 segundos.

### Volúmenes alternativos para mediciones escaladas de RNF-02

RNF-02 exige medir con "hasta 10 000 preguntas". Para la curva de
escalado se recomienda ejecutar el seed varias veces con valores
distintos y registrar latencias en cada punto:

```pwsh
$env:PERF_QUESTIONS = "1000"  ; npm run seed:perf   # baseline
$env:PERF_QUESTIONS = "5000"  ; npm run seed:perf   # medio
$env:PERF_QUESTIONS = "10000" ; npm run seed:perf   # umbral oficial
```

## Guardrail de seguridad

El script aborta si `DATABASE_URL` apunta a la base de
**DESARROLLO** (puerto 5433 o esquema `vinki?schema=public`).
Mensaje:

```
[seed-perf] DATABASE_URL apunta a la base de DESARROLLO (...).
El seed de perf SOLO debe correr contra la DB de test (puerto 5434,
"vinki_test"). Aborto por seguridad.
```

Adicionalmente, el script SIEMPRE carga `backend/.env.test` y
**sobrescribe** las variables relevantes en `process.env` ANTES de
importar `@prisma/client`. Esto neutraliza el autoload de Prisma que
por defecto leería `backend/.env` (dev).

## Credenciales sembradas

| Rol | Email | Password |
|---|---|---|
| student | `perf-student@test.local` | `PerfStudent-2026!` |
| recruiter | `perf-recruiter@test.local` | `PerfRecruiter-2026!` |
| admin | `perf-admin@test.local` | `PerfAdmin-2026!` |
| student bulk (×50) | `perf-student-001@test.local` .. `perf-student-050@test.local` | `PerfBulk-2026!` |

Las credenciales bulk se materializan en
`qa/04-pruebas-no-funcionales/rendimiento/planes/perf-students.csv`,
que JMeter consume vía CSV Data Set Config en el plan RNF-03 (50
threads, cada uno toma una fila distinta para evitar el
`ConflictException('You already have an active interview')` que
dispararía si los 50 threads compartieran al `perf-student` base).

Estas credenciales se exportan también como
`PERF_CREDENTIALS` desde `backend/test/perf/seed-perf.ts` para uso
programático desde scripts (por ejemplo, si Fase 5-A genera planes
`.jmx` desde un helper TS).

> **Importante:** estas credenciales son **DE PRUEBA** y solo viven en
> la DB de test. NO se filtran a la DB de desarrollo ni a producción.
> No replicarlas en ningún otro entorno.

## Idempotencia

El seed comienza con un `TRUNCATE TABLE ... RESTART IDENTITY CASCADE`
sobre todas las tablas de dominio en orden inverso de FK. Cada ejecución
deja la DB en un estado limpio y conocido. **Los IDs siempre arrancan
en 1** (RESTART IDENTITY), lo que facilita escribir scripts JMeter
con IDs hardcoded del seed.

## Salida del script

```
[seed-perf] arranque · DATABASE_URL=postgresql://vinki:***@localhost:5434/vinki_test?schema=public · objetivo: 10000 preguntas, 50 chunks knowledge.
[seed-perf] DB truncada.
[seed-perf] catálogos sembrados.
[seed-perf] 3 usuarios sembrados (perf-student/recruiter/admin).
[seed-perf]   preguntas insertadas: 1000 / 10000
[seed-perf]   preguntas insertadas: 2000 / 10000
...
[seed-perf]   preguntas insertadas: 10000 / 10000
[seed-perf] 10000 preguntas sembradas con embeddings.
[seed-perf] knowledge: 1 documento (status='ready') con 50 chunks.
[seed-perf] entrevista activa #1 para perf-student (modo practice, 1 pregunta con respuesta lista para /evaluate-now).
[seed-perf] OK en 14.9s.
[seed-perf] resultado: { ... users, catalogs, questionCount, knowledge, interview ... }
```

## Verificación rápida tras el seed

```pwsh
# Confirmar conteo de preguntas:
docker exec vinki-postgres-test psql -U vinki -d vinki_test -tAc `
  "SELECT COUNT(*) FROM questions;"
# → 10000

# Confirmar documento knowledge con status correcto:
docker exec vinki-postgres-test psql -U vinki -d vinki_test -tAc `
  "SELECT id, title, status FROM knowledge_documents;"
# → 1 | Documento perf — NestJS / Node.js | ready

# Confirmar entrevista activa con respuesta:
docker exec vinki-postgres-test psql -U vinki -d vinki_test -tAc `
  "SELECT i.id, i.mode, COUNT(a.id) as answers FROM interviews i LEFT JOIN interview_questions iq ON iq.interview_id=i.id LEFT JOIN answers a ON a.interview_question_id=iq.id GROUP BY i.id, i.mode;"
# → 1 | practice | 1
```

## IDs estables expuestos por el seed

Por el `RESTART IDENTITY` los IDs son deterministas tras cada
ejecución limpia. Útil para hardcodear en planes JMeter:

| Recurso | ID |
|---|---|
| Backend Engineer role | 1 |
| Frontend Engineer role | 2 |
| TypeScript language | 1 |
| Python language | 2 |
| NestJS framework | 1 |
| React framework | 2 |
| Django framework | 3 |
| Junior level | 1 |
| Mid level | 2 |
| Senior level | 3 |
| APIs REST skill | 1 |
| Bases de datos skill | 2 |
| Algoritmos skill | 3 |
| perf-student user | 1 |
| perf-recruiter user | 2 |
| perf-admin user | 3 |
| Documento knowledge | 1 |
| Entrevista activa | 1 |
| InterviewQuestion #1 | 1 |
| Answer #1 | 1 |

## Próximo paso

Una vez aplicado el seed, el backend debe levantarse en modo perf
contra esta DB (puerto 3002, `LLM_SANDBOX=true`). Ver
[`setup_jmeter.md`](setup_jmeter.md) para los comandos exactos.
