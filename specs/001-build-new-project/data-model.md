# Data Model: Vinki — Plataforma de Simulación de Entrevistas Técnicas

**Branch**: `001-build-new-project` | **Date**: 2026-03-19  
**Source**: `docs/db.sql` + `docs/dbDiagram.txt` + clarificaciones de spec

---

## Entities

### User

Persona registrada en la plataforma. Tiene un único rol.

| Field          | Type        | Constraints                 | Notes                               |
| -------------- | ----------- | --------------------------- | ----------------------------------- |
| `id`           | `Int`       | PK, autoincrement           |                                     |
| `name`         | `String`    | NOT NULL, max 255           |                                     |
| `email`        | `String`    | NOT NULL, UNIQUE            | Validado como email RFC             |
| `passwordHash` | `String`    | NOT NULL                    | bcrypt, nunca expuesto en API       |
| `role`         | `Role` enum | NOT NULL, default `student` | `student` \| `recruiter` \| `admin` |
| `createdAt`    | `DateTime`  | NOT NULL, default now       |                                     |

**Relations**: has many `Interview`, has many `UserSkillScore`, has many `RecruiterNote`

**Validation rules**:

- `email` único en la plataforma
- `password` mínimo 8 caracteres en capa de aplicación (hash almacenado)
- `role` asignado al registrarse; no modificable self-service en v1

---

### Role (enum)

```
student | recruiter | admin
```

Almacenado como `String` en Prisma (enum nativo de PG o TypeScript enum).

---

### Language

Catálogo de lenguajes de programación disponibles para entrevistas.

| Field  | Type     | Constraints               |
| ------ | -------- | ------------------------- |
| `id`   | `Int`    | PK, autoincrement         |
| `name` | `String` | NOT NULL, UNIQUE, max 120 |

**Relations**: has many `Framework`, has many `Question`, has many `Interview`

---

### Framework

Framework asociado a un lenguaje.

| Field        | Type     | Constraints             |
| ------------ | -------- | ----------------------- |
| `id`         | `Int`    | PK, autoincrement       |
| `name`       | `String` | NOT NULL, max 120       |
| `languageId` | `Int`    | FK → Language, NOT NULL |

**Index**: `(languageId)`

---

### Level

Nivel de experiencia del candidato.

| Field  | Type     | Constraints               |
| ------ | -------- | ------------------------- |
| `id`   | `Int`    | PK, autoincrement         |
| `name` | `String` | NOT NULL, UNIQUE, max 120 |

Seeds: `Junior`, `Mid`, `Senior`

---

### Skill

Habilidad técnica evaluada en las preguntas.

| Field  | Type     | Constraints               |
| ------ | -------- | ------------------------- |
| `id`   | `Int`    | PK, autoincrement         |
| `name` | `String` | NOT NULL, UNIQUE, max 150 |

---

### Question

Pregunta del banco técnico. Incluye embedding para búsqueda semántica.

| Field          | Type                          | Constraints              | Notes                                    |
| -------------- | ----------------------------- | ------------------------ | ---------------------------------------- |
| `id`           | `Int`                         | PK, autoincrement        |                                          |
| `questionText` | `String`                      | NOT NULL                 | Texto completo de la pregunta            |
| `type`         | `String`                      | NOT NULL, max 80         | e.g. `conceptual`, `practical`, `design` |
| `source`       | `String?`                     | nullable, max 120        | Origen o referencia                      |
| `languageId`   | `Int`                         | FK → Language, NOT NULL  |                                          |
| `frameworkId`  | `Int?`                        | FK → Framework, nullable | Preguntas generales no tienen framework  |
| `levelId`      | `Int`                         | FK → Level, NOT NULL     |                                          |
| `skillId`      | `Int`                         | FK → Skill, NOT NULL     |                                          |
| `embedding`    | `Unsupported("vector(1536)")` | nullable                 | text-embedding-3-small                   |
| `createdAt`    | `DateTime`                    | NOT NULL, default now    |                                          |

**Indexes**: `(languageId)`, `(frameworkId)`, `(levelId)`, `(skillId)`, HNSW en `embedding`

**Note**: `vector(1536)` requiere `$queryRaw` para operaciones de similitud (Prisma no soporta el tipo nativo). El campo se declara como `Unsupported` en el schema Prisma y se manipula con SQL directo.

---

### Interview

Sesión de simulación de entrevista técnica.

| Field                        | Type        | Constraints                 | Notes                                                |
| ---------------------------- | ----------- | --------------------------- | ---------------------------------------------------- |
| `id`                         | `Int`       | PK, autoincrement           |                                                      |
| `userId`                     | `Int`       | FK → User, NOT NULL         | Estudiante que realiza la entrevista                 |
| `roleId`                     | `Int`       | FK → Role catalog, NOT NULL | Rol elegido (Backend Engineer, etc.)                 |
| `languageId`                 | `Int?`      | FK → Language, nullable     |                                                      |
| `frameworkId`                | `Int?`      | FK → Framework, nullable    |                                                      |
| `chosenLevelId`              | `Int`       | FK → Level, NOT NULL        | Nivel seleccionado por el estudiante                 |
| `startedAt`                  | `DateTime`  | NOT NULL, default now       |                                                      |
| `finishedAt`                 | `DateTime?` | nullable                    | NULL = sesión en curso; NOT NULL = cerrada           |
| `evaluationStatus`           | `String`    | NOT NULL, default `pending` | `pending` \| `processing` \| `completed` \| `failed` |
| `evaluationNotificationSeen` | `Boolean`   | NOT NULL, default false     | Para fallback offline de SSE                         |

**Relations**: has many `InterviewQuestion`

**State transitions**:

```
(sin finishedAt) → finishedAt SET + evaluationStatus=processing
                → evaluationStatus=completed (job éxito)
                → evaluationStatus=failed (job agotó reintentos)
```

---

### InterviewQuestion

Snapshot de la pregunta dentro de una entrevista concreta.

| Field                  | Type      | Constraints                       | Notes                                       |
| ---------------------- | --------- | --------------------------------- | ------------------------------------------- |
| `id`                   | `Int`     | PK, autoincrement                 |                                             |
| `interviewId`          | `Int`     | FK → Interview, ON DELETE CASCADE |                                             |
| `questionId`           | `Int`     | FK → Question                     |                                             |
| `questionTextSnapshot` | `String`  | NOT NULL                          | Copia del texto al momento de la entrevista |
| `orderNumber`          | `Int`     | NOT NULL, CHECK > 0               | Posición (1–5)                              |
| `generatedByAi`        | `Boolean` | NOT NULL, default true            |                                             |

**Index**: `(interviewId)`

**Note**: `questionTextSnapshot` garantiza inmutabilidad del historial si la pregunta original se edita.

---

### Answer

Respuesta del estudiante a una pregunta de entrevista.

| Field                 | Type       | Constraints                               | Notes                                                 |
| --------------------- | ---------- | ----------------------------------------- | ----------------------------------------------------- |
| `id`                  | `Int`      | PK, autoincrement                         |                                                       |
| `interviewQuestionId` | `Int`      | FK → InterviewQuestion, ON DELETE CASCADE |                                                       |
| `answerText`          | `String?`  | nullable                                  | Respuesta escrita                                     |
| `audioUrl`            | `String?`  | nullable, max 500                         | URL S3 del archivo de audio (registro complementario) |
| `answeredAt`          | `DateTime` | NOT NULL, default now                     |                                                       |

**Validation**: Al menos uno de `answerText` o `audioUrl` debe estar presente (validado en application layer).  
**Note**: El pipeline de evaluación IA opera únicamente sobre `answerText`. El audio es registro complementario sin transcripción en v1.

---

### AnswerEvaluation

Resultado de la evaluación IA de una respuesta.

| Field                  | Type       | Constraints                            | Notes                            |
| ---------------------- | ---------- | -------------------------------------- | -------------------------------- |
| `id`                   | `Int`      | PK, autoincrement                      |                                  |
| `answerId`             | `Int`      | FK → Answer, ON DELETE CASCADE, UNIQUE | 1:1 con Answer                   |
| `technicalCorrectness` | `Float?`   | CHECK 0–5                              | Rúbrica definida en `rubrics.ts` |
| `clarityOfExplanation` | `Float?`   | CHECK 0–5                              |                                  |
| `communication`        | `Float?`   | CHECK 0–5                              |                                  |
| `confidence`           | `Float?`   | CHECK 0–5                              |                                  |
| `problemSolving`       | `Float?`   | CHECK 0–5                              |                                  |
| `detectedLevelId`      | `Int?`     | FK → Level, nullable                   | Nivel inferido por el modelo     |
| `feedbackText`         | `String?`  | nullable                               | Mínimo 1 párrafo según FR-014    |
| `evaluatedAt`          | `DateTime` | NOT NULL, default now                  |                                  |

**Index**: `(answerId)`

---

### UserSkillScore

Puntaje acumulado de un estudiante por habilidad (0–100). Actualizado tras cada evaluación completada.

| Field         | Type       | Constraints                  | Notes                                                       |
| ------------- | ---------- | ---------------------------- | ----------------------------------------------------------- |
| `id`          | `Int`      | PK, autoincrement            |                                                             |
| `userId`      | `Int`      | FK → User, ON DELETE CASCADE |                                                             |
| `skillId`     | `Int`      | FK → Skill                   |                                                             |
| `score`       | `Float`    | NOT NULL, CHECK 0–100        | Media ponderada de `technicalCorrectness` normalizada a 100 |
| `lastUpdated` | `DateTime` | NOT NULL, default now        |                                                             |

**Unique**: `(userId, skillId)`

**Score formula**: promedio móvil exponencial de `technicalCorrectness` (0–5) × 20, con factor de decay α=0.3 para entrevistas más recientes con mayor peso.

---

### RecruiterNote _(nuevo — no estaba en db.sql)_

Notas internas privadas de un reclutador sobre un estudiante o entrevista.

| Field         | Type       | Constraints                          |
| ------------- | ---------- | ------------------------------------ |
| `id`          | `Int`      | PK, autoincrement                    |
| `recruiterId` | `Int`      | FK → User (role=recruiter), NOT NULL |
| `studentId`   | `Int`      | FK → User (role=student), NOT NULL   |
| `interviewId` | `Int?`     | FK → Interview, nullable             |
| `content`     | `String`   | NOT NULL                             |
| `createdAt`   | `DateTime` | NOT NULL, default now                |

**Note**: `interviewId` nullable permite notas a nivel de perfil de estudiante (no ligadas a una entrevista específica).

---

## Entity Relationship Summary

```
User ──< Interview ──< InterviewQuestion >── Question
           │                  │
           │                  └──< Answer ──< AnswerEvaluation
           │
           └──< UserSkillScore >── Skill

Language ──< Framework
Language ──< Question
Level    ──< Question
Skill    ──< Question
Level    ──< AnswerEvaluation (detectedLevel)

User (recruiter) ──< RecruiterNote >── User (student)
RecruiterNote ──? Interview
```

---

## Schema Changes vs docs/db.sql

| Change                                                    | Reason                                                                                                            |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `embedding vector(3)` → `vector(1536)`                    | text-embedding-3-small produce 1536 dims (ver R1 en research.md)                                                  |
| `interviews.evaluation_status VARCHAR(20)` añadido        | Tracking del estado del job BullMQ                                                                                |
| `interviews.evaluation_notification_seen BOOLEAN` añadido | Fallback offline para SSE (ver R3.4 en research.md)                                                               |
| `recruiter_notes` tabla añadida                           | FR-023: reclutadores pueden agregar notas internas                                                                |
| `users.role VARCHAR(20)` añadido                          | FR-003: roles en la tabla de usuarios (vs tabla `roles` separada que queda para catálogos de roles de entrevista) |

> La tabla `roles` original del schema se conserva para los roles de entrevista (Backend Engineer, Fullstack Engineer) — es un catálogo de perfiles, distinto del campo `role` del usuario.
