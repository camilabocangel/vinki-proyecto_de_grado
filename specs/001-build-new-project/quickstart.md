# Quickstart: Vinki — Plataforma de Simulación de Entrevistas Técnicas

**Branch**: `001-build-new-project` | **Date**: 2026-03-19

---

## Prerequisitos

- Node.js 20+
- Docker Desktop (para PostgreSQL + Redis locales)
- Git con hooks configurados: `git config core.hooksPath .husky`

---

## 1. Clonar y configurar variables de entorno

```bash
git clone <repo-url> vinki
cd vinki

# Backend
cp backend/.env.example backend/.env
# Editar backend/.env:
#   DATABASE_URL="postgresql://vinki:password@localhost:5432/vinki_dev"
#   REDIS_URL="redis://localhost:6379"
#   JWT_PRIVATE_KEY="<RS256 private key PEM>"
#   JWT_PUBLIC_KEY="<RS256 public key PEM>"
#   OPENAI_API_KEY="sk-..."
#   LLM_SANDBOX="true"          # ← "true" para desarrollo (no gasta créditos OpenAI)
#   AWS_S3_BUCKET="vinki-audio-dev"
#   AWS_REGION="us-east-1"
#   NODE_ENV="development"

# Frontend
cp frontend/app/.env.example frontend/app/.env
# VITE_API_URL="http://localhost:3000/api"
```

---

## 2. Levantar servicios de infraestructura

```bash
# Desde la raíz del repositorio
docker compose up -d
# Levanta: postgres:15 (puerto 5432) + pgvector, redis:7 (puerto 6379), minio (puerto 9000)
```

Verificar:

```bash
docker compose ps  # todos deben estar "running"
```

---

## 3. Backend: instalar dependencias, migrar y sembrar

```bash
cd backend
npm install

# Sincronizar schema Prisma con la base de datos
npx prisma migrate dev --name init

# Cargar seed inicial (roles, lenguajes, frameworks, niveles, habilidades, preguntas básicas)
npx prisma db seed
# Equivale a ejecutar docs/db.sql + seeds adicionales de backend/prisma/seed.ts
```

---

## 4. Backend: generar par de claves RS256 (primera vez)

```bash
# Generar clave privada
openssl genrsa -out jwt_private.pem 2048
# Generar clave pública desde la privada
openssl rsa -in jwt_private.pem -pubout -out jwt_public.pem

# Copiar contenido (en una sola línea con \n) a backend/.env:
#   JWT_PRIVATE_KEY="$(awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' jwt_private.pem)"
#   JWT_PUBLIC_KEY="$(awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' jwt_public.pem)"

# Eliminar los archivos .pem del directorio (nunca hacer commit)
rm jwt_private.pem jwt_public.pem
```

---

## 5. Iniciar backend y frontend

```bash
# Terminal 1 — Backend (NestJS en localhost:3000)
cd backend
npm run start:dev

# Terminal 2 — Frontend (Vite en localhost:5173)
cd frontend/app
npm install
npm run dev
```

Backend Swagger disponible en: `http://localhost:3000/api/docs`

---

## 6. Verificar la instalación

```bash
# Registro de un estudiante de prueba
curl -s -c cookies.txt -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Student","email":"test@upb.edu.bo","password":"password123"}' | jq .

# Login
curl -s -c cookies.txt -b cookies.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@upb.edu.bo","password":"password123"}' | jq .

# Dashboard (verifica auth por cookie)
curl -s -b cookies.txt http://localhost:3000/api/dashboard | jq .

rm cookies.txt
```

---

## 7. Ejecutar las pruebas

```bash
# Backend — unitarias + cobertura
cd backend
npm run test
npm run test:cov   # Debe superar 70% en módulos críticos

# Backend — e2e (requiere DB de test levantada)
npm run test:e2e

# Frontend — unitarias (Vitest)
cd frontend/app
npm run test:unit

# Frontend — E2E Playwright (requiere backend + frontend corriendo)
npm run test:e2e

# Check completo de calidad frontend (lint + format + unit)
npm run check
```

---

## 8. Modo sandbox de IA

Con `LLM_SANDBOX=true` en `backend/.env`, el job de evaluación usa `MockEvaluatorService` que genera puntuaciones aleatorias (3.0–5.0) sin llamar a la API de OpenAI. Esto permite desarrollar y probar el flujo completo sin costos.

Para probar con OpenAI real, cambiar a `LLM_SANDBOX=false` y asegurarse de que `OPENAI_API_KEY` está configurado.

---

## 9. Estructura de carpetas relevante

```
vinki/
├── backend/
│   ├── src/
│   │   ├── auth/              # JWT, guards, passport strategies
│   │   ├── users/             # Perfil de usuario
│   │   ├── catalogs/          # Lenguajes, frameworks, niveles, skills, preguntas
│   │   ├── interviews/        # Motor de entrevistas
│   │   ├── evaluation/        # Pipeline IA (BullMQ + OpenAI + rúbricas)
│   │   ├── reports/           # Dashboard, historial, exportaciones
│   │   └── notifications/     # SSE gateway
│   ├── prisma/
│   │   ├── schema.prisma      # Fuente de verdad del modelo de datos
│   │   └── seed.ts            # Seeds iniciales
│   └── .env.example
├── frontend/app/
│   ├── src/
│   │   ├── api/               # Cliente OpenAPI generado (openapi-typescript)
│   │   ├── pages/             # Auth, Dashboard, Interview, Feedback, Recruiter
│   │   ├── components/        # Componentes reutilizables (Ant Design tokens)
│   │   └── hooks/             # useSSE, useAuth, useInterview
│   └── .env.example
├── docs/
│   ├── db.sql                 # Schema canónico + seeds de referencia
│   └── dbDiagram.txt          # Diagrama de entidades
└── docker-compose.yml         # PostgreSQL + pgvector + Redis + MinIO
```

---

## 10. Flujo de desarrollo recomendado

1. Crear rama de feature desde `001-build-new-project`.
2. **Backend primero**: definir endpoint en OpenAPI → implementar con TDD (test rojo → código → verde).
3. **Regenerar cliente frontend**: `cd frontend/app && npm run generate:api` (script que ejecuta `openapi-typescript`).
4. Implementar UI consumiendo el cliente tipado.
5. Ejecutar `npm run check` en frontend y suite de tests en backend antes del commit.
6. Pre-commit hooks (Husky) ejecutan lint + format automáticamente.

---

## Problemas comunes

| Problema                                  | Solución                                                                               |
| ----------------------------------------- | -------------------------------------------------------------------------------------- |
| `Error: Extension "vector" not available` | Verificar que Docker Compose usa imagen `pgvector/pgvector:pg15`, no `postgres:15`     |
| `JWT strategy fails: no cookie`           | Asegurarse de enviar `credentials: 'include'` en el cliente o `-b cookies.txt` en curl |
| `BullMQ worker not processing jobs`       | Verificar `REDIS_URL` en `.env` y que el contenedor de Redis está corriendo            |
| `husky hooks not running`                 | Ejecutar `git config core.hooksPath .husky` en la raíz del repo                        |
| `openapi-typescript client outdated`      | Ejecutar `npm run generate:api` en `frontend/app` tras cambios en el backend           |
