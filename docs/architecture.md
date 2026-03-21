# Arquitectura de Vinki

## 1. Diagrama de Contexto (C4 Level 1)

```mermaid
graph TB
    Student[Estudiante<br/>Practica entrevistas]
    Recruiter[Reclutador<br/>Evalúa candidatos]
    Admin[Admin<br/>Gestiona contenido]

    Student -->|HTTPS| Vinki[Vinki Platform<br/>React + NestJS]
    Recruiter -->|HTTPS| Vinki
    Admin -->|HTTPS| Vinki

    Vinki -->|API| OpenAI[OpenAI API<br/>gpt-4o-mini + Whisper]
    Vinki -->|SQL| PostgreSQL[(PostgreSQL 15<br/>+ pgvector)]
    Vinki -->|Queue| Redis[(Redis 7<br/>BullMQ)]
    Vinki -->|S3| MinIO[(MinIO<br/>Audio storage)]
    Vinki -->|SMTP| EmailService[Email Service<br/>Nodemailer]
```

## 2. Diagrama de Contenedores (C4 Level 2)

```mermaid
graph TB
    subgraph Frontend
        SPA[React SPA<br/>Vite + Ant Design]
    end

    subgraph Backend
        API[NestJS API<br/>REST + SSE]
        Worker[BullMQ Worker<br/>Evaluation Processor]
    end

    subgraph Data
        PG[(PostgreSQL<br/>pgvector)]
        RD[(Redis)]
        S3[(MinIO)]
    end

    subgraph External
        AI[OpenAI API]
        SMTP[SMTP Server]
    end

    SPA -->|HTTP/SSE| API
    API -->|Prisma ORM| PG
    API -->|Enqueue Jobs| RD
    API -->|Upload Audio| S3
    Worker -->|Process Jobs| RD
    Worker -->|Read/Write| PG
    Worker -->|Evaluate| AI
    Worker -->|Notify| SMTP
    API -->|Transcribe| AI
```

## 3. Flujo de Entrevista

```mermaid
sequenceDiagram
    participant S as Estudiante
    participant F as Frontend
    participant A as API
    participant Q as BullMQ
    participant W as Worker
    participant AI as OpenAI

    S->>F: Configura entrevista (rol, nivel, modo)
    F->>A: POST /interviews
    A->>A: Selecciona preguntas (pgvector)
    A-->>F: Interview + questions

    loop Por cada pregunta
        S->>F: Escribe/graba respuesta
        F->>A: POST /questions/:id/answer
        A-->>F: Answer saved

        alt Modo Práctica
            F->>A: POST /evaluate-now
            A->>AI: Evaluar respuesta
            AI-->>A: Scores + feedback
            A-->>F: Evaluación inline
        end

        opt Follow-up
            F->>A: POST /followup
            A->>AI: Generar pregunta
            AI-->>A: Follow-up question
            A-->>F: Mostrar follow-up
        end
    end

    S->>F: Finalizar entrevista
    F->>A: POST /interviews/:id/finish
    A->>Q: Encolar evaluación
    A-->>F: Status: processing

    W->>Q: Tomar job
    W->>AI: Evaluar todas las respuestas
    AI-->>W: Evaluaciones completas
    W->>W: Persistir + actualizar skills
    W-->>A: SSE: evaluation.completed
    A-->>F: Notificación en tiempo real
    W-->>S: Email: reporte listo
```

## 4. Pipeline de Evaluación IA

```mermaid
flowchart TD
    A[Interview Finished] -->|BullMQ| B[EvaluationProcessor]
    B --> C[Load Answers from DB]
    C --> D{LLM_SANDBOX?}
    D -->|true| E[MockEvaluatorService<br/>Random scores 3.0-5.0]
    D -->|false| F[OpenAI gpt-4o-mini<br/>+ Rubrics prompt]

    E --> G[Results]
    F --> G

    G --> H[Per Answer]
    H --> I[5 Metrics 0-5<br/>technicalCorrectness<br/>clarityOfExplanation<br/>communication<br/>confidence<br/>problemSolving]
    H --> J[Detected Level<br/>Junior / Mid / Senior]
    H --> K[Feedback Text]
    H --> L[Level Recommendations<br/>Junior / Mid / Senior answers]

    I --> M[Upsert AnswerEvaluation]
    J --> M
    K --> M
    L --> M

    M --> N[Update UserSkillScore<br/>EMA alpha=0.3]
    N --> O[Emit SSE Event]
    O --> P[Send Email]

    subgraph Retry Logic
        B -->|Failure| R{Attempts < 3?}
        R -->|Yes| B
        R -->|No| S[Mark as Failed]
    end
```

## 5. Modelo de Datos

```mermaid
erDiagram
    User ||--o{ Interview : has
    User ||--o{ UserSkillScore : has
    User ||--o{ RecruiterNote : writes
    User ||--o{ AuditLog : generates

    Interview ||--o{ InterviewQuestion : contains
    Interview }o--|| Role : references
    Interview }o--|| Level : references
    Interview }o--o| Language : references
    Interview }o--o| Framework : references

    InterviewQuestion ||--o{ Answer : has
    InterviewQuestion }o--|| Question : snapshots

    Answer ||--o| AnswerEvaluation : evaluated_by
    AnswerEvaluation }o--o| Level : detected_level

    Question }o--|| Language : categorized_by
    Question }o--o| Framework : optional
    Question }o--|| Level : difficulty
    Question }o--|| Skill : tests

    Skill ||--o{ UserSkillScore : tracked_in

    User {
        int id PK
        string name
        string email UK
        string passwordHash
        enum role "student|recruiter|admin"
        datetime createdAt
    }

    Interview {
        int id PK
        int userId FK
        int roleId FK
        int chosenLevelId FK
        string mode "practice|evaluation"
        enum evaluationStatus "pending|processing|completed|failed"
        datetime startedAt
        datetime finishedAt
    }

    Question {
        int id PK
        string questionText
        string type
        int languageId FK
        int levelId FK
        int skillId FK
        vector embedding "1536 dim"
    }

    AnswerEvaluation {
        int id PK
        int answerId FK UK
        float technicalCorrectness
        float clarityOfExplanation
        float communication
        float confidence
        float problemSolving
        int detectedLevelId FK
        string feedbackText
        string juniorAnswer
        string midAnswer
        string seniorAnswer
    }

    UserSkillScore {
        int id PK
        int userId FK
        int skillId FK
        float score "0-100 EMA"
    }
```

## 6. Flujo de Autenticación

```mermaid
sequenceDiagram
    participant C as Cliente
    participant A as API
    participant DB as PostgreSQL

    C->>A: POST /auth/login {email, password}
    A->>DB: Find user by email
    A->>A: bcrypt.compare(password, hash)
    A->>A: Sign JWT (RS256)
    A-->>C: Set-Cookie: access_token (15min)
    A-->>C: Set-Cookie: refresh_token (7days)

    C->>A: GET /api/* (with cookies)
    A->>A: Verify access_token
    A-->>C: 200 OK

    Note over C,A: Token expired
    C->>A: GET /api/*
    A-->>C: 401 Unauthorized
    C->>A: POST /auth/refresh (refresh_token cookie)
    A->>A: Verify refresh_token
    A->>A: Sign new tokens
    A-->>C: New cookies
```
