# Backend Development Plan

## Objetivos
- Implementar API segura para simulaciones de entrevistas técnicas orientadas a egresados UPB.
- Integrar servicios de IA (RAG + LLM) para generación y evaluación automática.
- Persistir métricas detalladas en PostgreSQL con pgvector y exponer reportes accionables.

## Arquitectura Base
- **Framework**: NestJS (Node.js 20) + TypeScript.
- **Base de datos**: PostgreSQL 15 + extensión `vector`. ORM recomendado: Prisma o TypeORM.
- **Mensajería**: Redis + BullMQ para trabajos asincrónicos de evaluación.
- **Observabilidad**: Winston/Pino para logs estructurados, métricas Prometheus, tracing OpenTelemetry opcional.
- **Integraciones**: Servicio de embeddings/vector search (pgvector o proveedor externo), API LLM (OpenAI/Azure), almacenamiento de audio (S3 compatible).

## Módulos Principales
1. **Auth & Usuarios**
   - Registro/login con JWT (access + refresh) y soporte SSO UPB futuro.
   - Gestión de roles (`student`, `recruiter`, `admin`).
   - Endpoints de perfil con métricas resumidas.
2. **Catálogos Técnicos**
   - CRUD para `languages`, `frameworks`, `levels`, `skills`, `questions`.
   - Carga masiva (CSV/JSON) y búsqueda semántica combinada con filtros tradicionales.
3. **Motor de Entrevistas**
   - Creación de entrevistas, selección dinámica de preguntas, versionado de snapshots.
   - Registro de respuestas (texto + URL audio) y tiempos.
4. **Evaluación IA (RAG)**
   - Pipeline de retrieval (vector store) -> prompt builder -> invocación LLM -> parser de resultados.
   - Persistencia en `answer_evaluations` con métricas 0–5 y feedback natural.
   - Jobs asincrónicos con reintentos, DLQ y monitoreo.
5. **Reportes y Analytics**
   - Endpoints agregados por usuario, cohorte y skill.
   - Exportaciones CSV/PDF bajo demanda.

## Backlog Prioritario
1. **Infra inicial**: configurar NestJS, lint, pruebas e2e, CI, docker compose con Postgres+pgvector.
2. **Modelo de datos**: sincronizar ORM con `docs/db.sql`, seeds básicos.
3. **Autenticación**: endpoints auth + políticas de autorización (Guards, interceptors).
4. **Catálogos**: endpoints CRUD con validaciones y paginación.
5. **Entrevistas**: casos de uso para iniciar/finalizar, asignar preguntas y almacenar respuestas.
6. **Integración IA**: servicios de retrieval (embeddings, vector search) y orquestación LLM con colas Redis.
7. **Reportes**: endpoints agregados + caché ligero.
8. **Observabilidad**: métricas, logs, alertas básicas.
9. **Despliegue**: pipeline CI/CD (GitHub Actions) hacia Render/Fly.io + gestión de secretos.

## Entregables de Cada Iteración
- API documentada (OpenAPI/Swagger) y colección Postman.
- Scripts de migración/seed actualizados.
- Pruebas unitarias/e2e con cobertura mínima 70% en módulos críticos.
- Dashboards básicos de métricas (Grafana o similar).

## Riesgos y Mitigaciones
- **Costo LLM**: agregar modo sandbox con respuestas simuladas; cachear prompts frecuentes.
- **Latencia IA**: ejecutar evaluación asincrónica y notificar al frontend vía WebSocket/Webhook.
- **Calidad Datos**: validar embeddings y normalizar preguntas; pipelines de moderación.
- **Seguridad**: sanitizar inputs, rate limiting, almacenamiento de secretos en vault.
