# Research: Vinki — Plataforma de Simulación de Entrevistas Técnicas

**Branch**: `001-build-new-project` | **Date**: 2026-03-19

---

## R1 — pgvector: Embedding Model & Semantic Search

### R1.1 Embedding Model

**Decision**: `text-embedding-3-small` de OpenAI → dimensión **1536**. Schema: cambiar `embedding vector(3)` → `embedding vector(1536)`.

**Rationale**: 1536 dims ofrece calidad suficiente para recuperación de preguntas técnicas; 13× más económico que `text-embedding-3-large` (3072 dims) sin ganancia de relevancia apreciable para Q&A corto. Ventana de 8K tokens cubre cualquier texto de pregunta.

**Alternatives considered**: `text-embedding-3-large` descartado por costo; modelos self-hosted (Ollama) descartados por latencia y complejidad operativa en Render/Fly.io.

---

### R1.2 Índice pgvector

**Decision**: HNSW con parámetros conservadores para banco de 100–2000 preguntas:

```sql
CREATE INDEX CONCURRENTLY idx_questions_embedding_hnsw
ON questions USING hnsw (embedding vector_cosine_ops)
WITH (m = 8, ef_construction = 128);
```

Configuración en startup de NestJS: `SET hnsw.ef_search = 80;`

**Rationale**: Para <10K filas, HNSW supera a IVFFlat en latencia de consulta (~50ms p95 para top-10). `m=8` reduce memoria a la mitad vs el default `m=16` con mínima pérdida de recall (~95%). `CONCURRENTLY` no bloquea inserciones durante reindexado.

**Alternatives considered**: IVFFlat descartado (break-even ~100K filas); sin índice descartado (exact-scan ~500ms por query).

---

### R1.3 Query de búsqueda semántica con filtros

**Decision**: `$queryRaw` de Prisma con operador de distancia coseno `<=>`:

```typescript
async findCandidateQuestions(
  embedding: number[],
  filters: { languageId: number; frameworkId?: number; levelId: number }
): Promise<QuestionCandidate[]> {
  return this.prisma.$queryRaw<QuestionCandidate[]>`
    SELECT id, skill_id,
           1 - (embedding <=> ${embedding}::vector) AS similarity
    FROM questions
    WHERE language_id   = ${filters.languageId}
      AND level_id      = ${filters.levelId}
      AND (${filters.frameworkId ?? null}::int IS NULL
           OR framework_id = ${filters.frameworkId})
    ORDER BY embedding <=> ${embedding}::vector
    LIMIT 25
  `;
}
```

**Rationale**: Prisma ORM no sopota operadores pgvector nativamente; `$queryRaw` con parámetros posicionales evita SQL injection. El filtro por `languageId` + `levelId` limita el espacio de búsqueda (20–200 filas típicas) antes de que HNSW ordene por similitud. Se recuperan 25 candidatos para el algoritmo de diversidad.

**Alternatives considered**: typeorm con raw query — misma limitación. Extensión `prisma-pgvector` (experimental) descartada por inestabilidad.

---

### R1.4 Algoritmo de diversidad (selección de 5 preguntas)

**Decision**: Two-phase skill-bucketing:

```
1. Agrupar los 25 candidatos por skill_id.
2. Primera pasada: tomar la pregunta de mayor similitud de cada skill → hasta 5.
3. Segunda pasada: completar slots restantes con mayor similitud global (cualquier skill).
```

**Rationale**: Garantiza cobertura de habilidades distintas (async, error handling, OOP, etc.) evitando sesgos hacia un único skill. O(n log n), determinista y auditable en logs.

**Alternatives considered**: MMR (Maximal Marginal Relevance) — O(n²), innecesario para n≤25. Selección aleatoria de top-K — pérdida de relevancia.

---

## R2 — JWT en cookies httpOnly (NestJS + Passport)

### R2.1 Configuración de tokens

**Decision**:

- Access token: expiry **15 minutos**, firmado con `RS256` (par de claves asimétricas en env)
- Refresh token: expiry **7 días**, almacenado en Redis con TTL=7d para soporte de invalidación explícita

**Rationale**: 15m de access token limita ventana de explotación de tokens robados. 7d de refresh equilibra UX académica (no fuerza re-login cada sesión de práctica) con seguridad. RS256 permite verificación del token sin exponer la clave privada en microservicios futuros.

**Alternatives considered**: HS256 — válido para un solo servicio pero descartado por extensibilidad. Refresh de 30d — riesgo de sesión persistente post-incidente.

---

### R2.2 Configuración de cookies

**Decision**:

```typescript
// Access token cookie
res.cookie("access_token", token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: 15 * 60 * 1000, // 15 min
  path: "/",
});

// Refresh token cookie — path restringido al endpoint de refresh
res.cookie("refresh_token", refreshToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
  path: "/auth/refresh",
});
```

**Rationale**: `httpOnly` previene acceso desde JS (XSS). `sameSite: 'lax'` protege contra CSRF manteniendo compatibilidad con navegación normal. `path: '/auth/refresh'` para el refresh token evita enviar el token de larga vida en todas las requests.

---

### R2.3 Estrategia Passport de extracción desde cookie

**Decision**: Custom `JwtFromCookieStrategy` extendiendo `PassportStrategy(Strategy, 'jwt-cookie')`:

```typescript
@Injectable()
export class JwtCookieStrategy extends PassportStrategy(
  Strategy,
  "jwt-cookie",
) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.access_token ?? null,
      ]),
      secretOrKey: configService.get("JWT_PUBLIC_KEY"),
      algorithms: ["RS256"],
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    return { userId: payload.sub, email: payload.email, role: payload.role };
  }
}
```

**Rationale**: El extractor lee exclusivamente de cookies; el header `Authorization` queda deshabilitado cumpliendo el principio VI de la constitución.

---

### R2.4 Logout e invalidación

**Decision**: Al logout: limpiar ambas cookies (`res.clearCookie`) + almacenar el `jti` (JWT ID) en Redis con TTL hasta expiración del access token. El guard verifica que el `jti` no esté en la lista de revocados.

**Rationale**: Sin blocklist, un access token de 15m robado puede usarse hasta su expiración natural. Redis con TTL igual al access token evita crecimiento indefinido de la blocklist.

**Alternatives considered**: Invalidación solo por cookie-clear — no revoca tokens que podrían haber sido capturados. Base de datos para blocklist — latencia extra innecesaria dado Redis ya presente.

---

## R3 — BullMQ: Job de Evaluación IA

### R3.1 Configuración del job

**Decision**:

```typescript
await this.evaluationQueue.add(
  "evaluate-interview",
  { interviewId },
  {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 }, // 5s, 10s, 20s
    removeOnComplete: { count: 100 },
    removeOnFail: false, // Conservar para DLQ manual + monitoreo
    jobId: `eval-${interviewId}`, // Idempotencia: evita doble encolamiento
  },
);
```

**Rationale**: Backoff exponencial evita saturar el proveedor LLM durante degradación parcial. `removeOnFail: false` permite inspección post-falla y reintento manual. `jobId` idempotente previene múltiples evaluaciones de la misma entrevista.

**Alternatives considered**: Backoff lineal — no retrocede suficientemente rápido bajo carga del LLM. `removeOnFail: true` — pierde trazabilidad.

---

### R3.2 Modo sandbox (LLM_SANDBOX)

**Decision**: Factory pattern en el módulo de evaluación:

```typescript
// evaluation.module.ts
providers: [
  {
    provide: EVALUATOR_SERVICE,
    useFactory: (cfg: ConfigService) =>
      cfg.get("LLM_SANDBOX") === "true"
        ? new MockEvaluatorService()
        : new OpenAIEvaluatorService(cfg),
    inject: [ConfigService],
  },
];
```

`MockEvaluatorService` devuelve puntuaciones aleatorias (3.0–5.0) con feedback genérico para cada métrica, respetando la misma interfaz `IEvaluatorService`.

**Rationale**: Permite desarrollo y pruebas sin costos de la API de OpenAI. La interfaz única garantiza que el mock no diverge del contrato real.

---

### R3.3 DLQ (Dead Letter Queue)

**Decision**: BullMQ no tiene DLQ nativa; usar event listener `failed` con `job.attemptsMade >= job.opts.attempts`:

```typescript
this.evaluationWorker.on("failed", async (job, err) => {
  if (job && job.attemptsMade >= (job.opts.attempts ?? 1)) {
    await this.deadLetterQueue.add("dlq-evaluation", {
      interviewId: job.data.interviewId,
      error: err.message,
      failedAt: new Date().toISOString(),
    });
    // Marcar interview.evaluation_status = 'failed' en DB
  }
});
```

**Rationale**: Patrón DLQ explícito da visibilidad total de fallos sin perder datos del job. Un worker separado puede procesar el DLQ para reintentos manuales o alertas.

---

### R3.4 Bridge BullMQ → SSE (EventEmitter2)

**Decision**: `EventEmitter2` (intra-proceso, single-node) para v1:

```typescript
// En el worker, tras completar la evaluación:
this.eventEmitter.emit('evaluation.completed', {
  userId,
  interviewId,
  evaluationId,
});

// En el SSE controller, Observable suscrito al evento:
@Sse('notifications')
streamNotifications(@Req() req: Request): Observable<MessageEvent> {
  const userId = req.user.userId;
  return fromEvent(this.eventEmitter, 'evaluation.completed').pipe(
    filter((event: any) => event.userId === userId),
    map((event) => ({ data: event })),
    takeUntil(fromEvent(req, 'close')),
  );
}
```

**Rationale**: Para v1 (single-node en Render/Fly.io) EventEmitter2 es suficiente y elimina una dependencia de Redis pub/sub. La migración a Redis pub/sub es trivial si en el futuro se escala a múltiples instancias.

**Alternatives considered**: Redis pub/sub — necesario solo con multi-instancia; overhead innecesario en v1. WebSocket — bidireccional; el overhead de gestión de conexión no aporta para notificaciones unidireccionales.

---

## R4 — SSE: Ciclo de vida y fallback offline

### R4.1 Payload del evento SSE

**Decision**:

```typescript
interface EvaluationCompletedEvent {
  type: "evaluation.completed" | "evaluation.failed";
  interviewId: number;
  evaluationId?: number; // presente si type = completed
  message: string; // texto para el usuario
}
```

**Rationale**: El frontend puede identificar la entrevista y navegar directamente al reporte con `interviewId`. Un `type` discriminado permite manejo diferenciado de éxito/fallo en la UI.

---

### R4.2 Auth en la conexión SSE

**Decision**: El SSE endpoint usa el mismo `JwtCookieGuard` que el resto de la API. La cookie `access_token` se envía automáticamente con la solicitud SSE (`withCredentials: true` en el cliente). Si el token expira durante una conexión SSE abierta, el cliente recibe un error 401 al siguiente intento de reconexión y debe refrescar el token.

---

### R4.3 Fallback offline

**Decision**: Si el usuario no estaba conectado via SSE cuando se completó la evaluación, la UI detecta evaluaciones no revisadas en la carga del dashboard:

- La tabla `interviews` incluye un campo `evaluation_notification_seen BOOLEAN DEFAULT FALSE`.
- Al completarse el job de evaluación, el worker actualiza `evaluation_notification_seen = FALSE`.
- El endpoint `GET /dashboard` incluye `pendingNotifications: number` en su respuesta.
- Al frontend cargar el dashboard, muestra un badge sobre el historial de entrevistas con las evaluaciones pendientes de revisar.
- Al abrir el reporte, el frontend llama `POST /interviews/:id/mark-seen`.

**Rationale**: Garantiza que ninguna notificación se pierda independientemente del estado de conexión, sin necesidad de persistencia de mensajes SSE.

---

## R5 — Rúbricas de Evaluación IA (diseño inicial)

### R5.1 Estructura de la rúbrica

**Decision**: Definir rúbricas como constante TypeScript versionada en `backend/src/evaluation/rubrics.ts`, incluida en el prompt como bloque de instrucciones:

```typescript
export const EVALUATION_RUBRICS = {
  technical_correctness: {
    0: "Respuesta incorrecta o ausente. Conceptos fundamentales erróneos.",
    1: "Comprensión muy limitada. Errores graves en conceptos básicos.",
    2: "Comprensión parcial. Algunos conceptos correctos pero con lagunas importantes.",
    3: "Comprensión adecuada. Conceptos principales correctos con imprecisiones menores.",
    4: "Buen dominio técnico. Respuesta correcta y bien fundamentada.",
    5: "Dominio experto. Respuesta precisa, completa y con detalles avanzados.",
  },
  clarity_of_explanation: {
    0: "Ininteligible o sin estructura.",
    1: "Muy difícil de entender. Sin hilo argumental claro.",
    2: "Parcialmente comprensible. Ideas desorganizadas.",
    3: "Comprensible pero con saltos lógicos o falta de ejemplos.",
    4: "Clara y bien estructurada. Secuencia lógica coherente.",
    5: "Excepcionalmente clara. Explicación didáctica con ejemplos pertinentes.",
  },
  communication: {
    0: "No comunica. Respuesta de una sola palabra o inapropiada.",
    1: "Comunicación muy limitada. Vocabulario técnico ausente.",
    2: "Comunicación básica. Vocabulario técnico escaso o mal utilizado.",
    3: "Comunicación funcional. Vocabulario técnico adecuado aunque limitado.",
    4: "Buena comunicación. Vocabulario técnico correcto y variado.",
    5: "Comunicación profesional. Precisa, concisa y técnicamente rica.",
  },
  confidence: {
    0: "No intenta responder o muestra total inseguridad.",
    1: "Muy inseguro. Constantemente duda o se contradice.",
    2: "Inseguro. Responde pero con muchas dudas y vacilaciones.",
    3: "Seguridad moderada. Responde con algunas dudas justificadas.",
    4: "Seguro. Mantiene postura con fundamentos claros.",
    5: "Muy seguro. Convicción bien fundamentada, defiende criterios sin rigidez.",
  },
  problem_solving: {
    0: "No aborda el problema o propone solución completamente inviable.",
    1: "Enfoque muy limitado. No identifica el problema correctamente.",
    2: "Identifica el problema pero la solución es incompleta o ineficiente.",
    3: "Solución correcta pero subóptima. Ignora casos borde o alternativas.",
    4: "Buena solución. Considera casos borde y alternativas razonables.",
    5: "Solución óptima. Análisis de complejidad, trade-offs y casos borde considerados.",
  },
} as const;
```

**Rationale**: Rúbricas como constante de código garantizan versionado con Git, revisión en PR y trazabilidad de cambios. Incluirlas en el prompt del LLM garantiza evaluaciones consistentes entre sesiones.

---

## R6 — Prisma ORM: Decisión vs TypeORM

**Decision**: **Prisma** como ORM para el proyecto.

**Rationale**:

- Prisma Client genera tipos TypeScript 100% derivados del schema → no divergencia entre modelo y tipos.
- `prisma migrate` produce SQL determinista y versionado, directamente compatible con `docs/db.sql`.
- Excelente integración con NestJS via `@prisma/client` y módulo inyectable.
- `$queryRaw` bien documentado para el caso de uso pgvector (escape hatch necesario).

**Alternatives considered**: TypeORM — decorators en entidades duplican definición (entity class + DB schema). MikroORM — curva de aprendizaje mayor, ecosistema más pequeño.

---

## R7 — Exportación PDF/CSV

**Decision**: Backend genera PDFs con `@nestjs/pdf` (wrapper de `puppeteer-core` + plantilla HTML) y CSVs con `fast-csv`. Las exportaciones se devuelven como stream para no almacenar archivos temporales en disco.

**Rationale**: Puppeteer renderiza plantillas HTML con los mismos tokens de diseño Vinki. `fast-csv` es liviano y bien mantenido. Streaming evita problemas de memoria con reportes grandes.

**Alternatives considered**: `pdfkit` — API de bajo nivel (más trabajo para diseño). `xlsx` para CSV — overhead innecesario; `fast-csv` suficiente. Pre-generación y almacenamiento en S3 — complejidad innecesaria para v1.
