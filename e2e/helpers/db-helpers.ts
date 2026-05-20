// Helpers de DB para suites E2E.
//
// Permiten que los tests preparen/limpien escenarios sin tocar la UI,
// hablando directamente con la DB de test (puerto 5434) vía Prisma.
//
// Cargan `backend/.env.test` si DATABASE_URL aún no está definido.

import * as fs from 'node:fs'
import * as path from 'node:path'
import { PrismaClient, type PrismaClientInstance } from './backend-deps'

let cached: PrismaClientInstance | null = null

function loadEnvTestIfNeeded(): void {
  if (process.env.DATABASE_URL) return
  const envPath = path.resolve(process.cwd(), 'backend', '.env.test')
  if (!fs.existsSync(envPath)) return
  const content = fs.readFileSync(envPath, 'utf-8')
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq === -1) continue
    const key = line.slice(0, eq).trim()
    const value = line.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
    if (!process.env[key]) process.env[key] = value
  }
}

function getPrisma(): PrismaClientInstance {
  if (!cached) {
    loadEnvTestIfNeeded()
    const url = process.env.DATABASE_URL ?? ''
    if (url.includes(':5433/') || url.endsWith('/vinki?schema=public')) {
      throw new Error(
        `[e2e db-helpers] DATABASE_URL apunta a la DB de DESARROLLO (${url}). Abort.`,
      )
    }
    cached = new PrismaClient()
  }
  return cached
}

/** Devuelve el id del usuario con el email indicado (creado por el seed). */
export async function findUserIdByEmail(email: string): Promise<number> {
  const prisma = getPrisma()
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) throw new Error(`[e2e] usuario "${email}" no existe en la DB de test.`)
  return user.id
}

/**
 * Marca como finished todas las entrevistas activas del usuario indicado.
 * Idempotente; útil en afterEach para que el siguiente test pueda crear
 * una nueva entrevista sin chocar con el ConflictException del backend.
 */
export async function finishActiveInterviewsForUser(userId: number): Promise<void> {
  const prisma = getPrisma()
  await prisma.interview.updateMany({
    where: { userId, finishedAt: null },
    data: { finishedAt: new Date(), evaluationStatus: 'completed' },
  })
}

/**
 * Crea una entrevista en progreso para `userId` con 3 preguntas reales del
 * banco. Devuelve el id de la interview. Usado por TC-E-02 para tener un
 * escenario reproducible sin depender de seed global.
 */
export async function createFreshInterviewForUser(userId: number): Promise<{
  interviewId: number
  questionIds: number[]
}> {
  const prisma = getPrisma()
  // Primero finalizamos cualquier activa para no romper la regla de negocio.
  await finishActiveInterviewsForUser(userId)

  // Tomamos los catálogos base y 3 preguntas TS/NestJS/Junior.
  const role = await prisma.role.findFirstOrThrow({ where: { name: 'Backend Engineer' } })
  const language = await prisma.language.findFirstOrThrow({ where: { name: 'TypeScript' } })
  const framework = await prisma.framework.findFirstOrThrow({ where: { name: 'NestJS' } })
  const level = await prisma.level.findFirstOrThrow({ where: { name: 'Junior' } })
  const questions = await prisma.question.findMany({
    where: { languageId: language.id, levelId: level.id },
    take: 3,
    orderBy: { id: 'asc' },
  })

  const interview = await prisma.interview.create({
    data: {
      userId,
      roleId: role.id,
      languageId: language.id,
      frameworkId: framework.id,
      chosenLevelId: level.id,
      evaluationStatus: 'pending',
      mode: 'evaluation',
    },
  })

  for (let i = 0; i < questions.length; i++) {
    await prisma.interviewQuestion.create({
      data: {
        interviewId: interview.id,
        questionId: questions[i].id,
        questionTextSnapshot: `[E2E TC-E-02 #${i + 1}] ${questions[i].questionText}`,
        orderNumber: i + 1,
        generatedByAi: i === 1, // una pregunta marcada como AI para TC-E-02-004
      },
    })
  }

  return { interviewId: interview.id, questionIds: questions.map((q) => q.id) }
}

/** Cierra el cliente Prisma compartido. Llamado al finalizar la run. */
export async function disconnectE2EPrisma(): Promise<void> {
  if (cached) {
    await cached.$disconnect()
    cached = null
  }
}
