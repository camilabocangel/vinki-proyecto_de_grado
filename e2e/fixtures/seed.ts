// Seed determinista para la suite E2E — Fase 4 (Decisión D-12).
//
// Pobla la DB de TEST (puerto 5434, vinki_test) con:
//   - 3 usuarios con contraseñas conocidas (student, recruiter, admin)
//   - Catálogos completos (roles, languages, frameworks, levels, skills)
//   - 20+ preguntas con embeddings (raw SQL pgvector — NT-016)
//   - 2 entrevistas históricas completas + 1 en progreso para el student
//   - 1 documento de knowledge base con 1 chunk
//
// Se ejecuta UNA vez antes de toda la suite E2E vía `globalSetup` de
// Playwright. La limpieza ocurre en `globalTeardown`.
//
// Guardrail: aborta si DATABASE_URL apunta a la DB de DESARROLLO (5433
// o /vinki?schema=public). NUNCA debe correr contra la DB de dev.

import { PrismaClient, bcrypt, type PrismaClientInstance } from '../helpers/backend-deps'

type PrismaClient = PrismaClientInstance

export interface SeededIds {
  users: {
    studentId: number
    recruiterId: number
    adminId: number
  }
  catalogs: {
    backendRoleId: number
    frontendRoleId: number
    typescriptLanguageId: number
    pythonLanguageId: number
    nestjsFrameworkId: number
    levelJuniorId: number
    levelMidId: number
    levelSeniorId: number
    apisSkillId: number
    dbSkillId: number
  }
  questions: number[]
  interviews: {
    completedAId: number
    completedBId: number
    inProgressId: number
  }
  knowledge: {
    documentId: number
  }
}

export const SEED_CREDENTIALS = {
  student: { email: 'e2e-student@vinki.dev', password: 'Student-E2E-123', name: 'Estudiante E2E' },
  recruiter: { email: 'e2e-recruiter@vinki.dev', password: 'Recruiter-E2E-123', name: 'Reclutador E2E' },
  admin: { email: 'e2e-admin@vinki.dev', password: 'Admin-E2E-123', name: 'Administrador E2E' },
} as const

// Tablas a truncar entre runs — mismo orden inverso que la suite de integración.
const TRUNCATE_TABLES = [
  'answer_evaluations',
  'answers',
  'interview_questions',
  'template_questions',
  'interviews',
  'interview_templates',
  'knowledge_chunks',
  'knowledge_documents',
  'user_achievements',
  'challenge_participations',
  'recruiter_notes',
  'user_skill_scores',
  'audit_logs',
  'questions',
  'role_languages',
  'frameworks',
  'languages',
  'levels',
  'skills',
  'roles',
  'achievements',
  'challenges',
  'users',
]

function assertTestDatabase(prisma: PrismaClient): void {
  const url = process.env.DATABASE_URL ?? ''
  if (url.includes(':5433/') || url.endsWith('/vinki?schema=public')) {
    throw new Error(
      `[e2e seed] DATABASE_URL apunta a la base de DESARROLLO (${url}). ` +
        `El seed E2E SOLO debe correr contra la DB de test (puerto 5434, ` +
        `DB "vinki_test"). Aborto por seguridad.`,
    )
  }
  void prisma
}

async function resetDatabase(prisma: PrismaClient): Promise<void> {
  const list = TRUNCATE_TABLES.map((t) => `"${t}"`).join(', ')
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE;`,
  )
}

async function seedCatalogs(prisma: PrismaClient) {
  // Roles (textos coinciden con los que renderiza el wizard).
  const backendRole = await prisma.role.create({ data: { name: 'Backend Engineer' } })
  const frontendRole = await prisma.role.create({ data: { name: 'Frontend Engineer' } })

  // Languages.
  const typescript = await prisma.language.create({ data: { name: 'TypeScript' } })
  const python = await prisma.language.create({ data: { name: 'Python' } })

  // Frameworks (vinculados a languages).
  const nestjs = await prisma.framework.create({
    data: { name: 'NestJS', languageId: typescript.id },
  })
  await prisma.framework.create({
    data: { name: 'React', languageId: typescript.id },
  })
  await prisma.framework.create({
    data: { name: 'Django', languageId: python.id },
  })

  // Levels (RF-08).
  const junior = await prisma.level.create({ data: { name: 'Junior' } })
  const mid = await prisma.level.create({ data: { name: 'Mid' } })
  const senior = await prisma.level.create({ data: { name: 'Senior' } })

  // Skills.
  const apis = await prisma.skill.create({ data: { name: 'APIs REST' } })
  const db = await prisma.skill.create({ data: { name: 'Bases de datos' } })
  const algo = await prisma.skill.create({ data: { name: 'Algoritmos' } })

  // Role ↔ Language pivot (necesario para que el wizard liste lenguajes por rol).
  await prisma.roleLanguage.createMany({
    data: [
      { roleId: backendRole.id, languageId: typescript.id },
      { roleId: backendRole.id, languageId: python.id },
      { roleId: frontendRole.id, languageId: typescript.id },
    ],
  })

  return {
    backendRoleId: backendRole.id,
    frontendRoleId: frontendRole.id,
    typescriptLanguageId: typescript.id,
    pythonLanguageId: python.id,
    nestjsFrameworkId: nestjs.id,
    levelJuniorId: junior.id,
    levelMidId: mid.id,
    levelSeniorId: senior.id,
    apisSkillId: apis.id,
    dbSkillId: db.id,
    algoSkillId: algo.id,
  }
}

async function seedUsers(prisma: PrismaClient) {
  async function makeUser(
    email: string,
    name: string,
    password: string,
    role: 'student' | 'recruiter' | 'admin',
  ) {
    const passwordHash = await bcrypt.hash(password, 10)
    return prisma.user.create({
      data: { email, name, passwordHash, role },
    })
  }

  const student = await makeUser(
    SEED_CREDENTIALS.student.email,
    SEED_CREDENTIALS.student.name,
    SEED_CREDENTIALS.student.password,
    'student',
  )
  const recruiter = await makeUser(
    SEED_CREDENTIALS.recruiter.email,
    SEED_CREDENTIALS.recruiter.name,
    SEED_CREDENTIALS.recruiter.password,
    'recruiter',
  )
  const admin = await makeUser(
    SEED_CREDENTIALS.admin.email,
    SEED_CREDENTIALS.admin.name,
    SEED_CREDENTIALS.admin.password,
    'admin',
  )

  return { studentId: student.id, recruiterId: recruiter.id, adminId: admin.id }
}

async function seedQuestions(
  prisma: PrismaClient,
  c: Awaited<ReturnType<typeof seedCatalogs>>,
): Promise<number[]> {
  // Vector de embedding all-zeros (1536 dim) — coincide con MockEmbeddingService.
  const embedding = `[${new Array(1536).fill(0).join(',')}]`
  const ids: number[] = []

  // 20 preguntas distribuidas entre TypeScript/NestJS y Python, distintos niveles
  // y skills, todas con embedding válido para que el QuestionSelectorService las
  // elija (filtra por embedding IS NOT NULL).
  const specs: Array<{
    text: string
    langId: number
    fwId: number | null
    levelId: number
    skillId: number
    type: string
  }> = []

  // 10 preguntas TS / NestJS / Junior — set base para el flujo del wizard.
  for (let i = 1; i <= 10; i++) {
    specs.push({
      text: `Pregunta E2E TS-NestJS-Junior #${i} — explica un concepto técnico relevante.`,
      langId: c.typescriptLanguageId,
      fwId: c.nestjsFrameworkId,
      levelId: c.levelJuniorId,
      skillId: i % 2 === 0 ? c.apisSkillId : c.dbSkillId,
      type: 'open',
    })
  }

  // 5 preguntas TS / Mid (sin framework).
  for (let i = 1; i <= 5; i++) {
    specs.push({
      text: `Pregunta E2E TS-Mid #${i} — diseño y trade-offs.`,
      langId: c.typescriptLanguageId,
      fwId: null,
      levelId: c.levelMidId,
      skillId: c.algoSkillId,
      type: 'open',
    })
  }

  // 5 preguntas Python / Junior.
  for (let i = 1; i <= 5; i++) {
    specs.push({
      text: `Pregunta E2E Python-Junior #${i} — fundamentos del lenguaje.`,
      langId: c.pythonLanguageId,
      fwId: null,
      levelId: c.levelJuniorId,
      skillId: c.apisSkillId,
      type: 'open',
    })
  }

  for (const s of specs) {
    const rows = await prisma.$queryRawUnsafe<Array<{ id: number }>>(
      `INSERT INTO questions (question_text, type, source, language_id, framework_id, level_id, skill_id, embedding, created_at)
       VALUES ($1, $2, 'curated', $3, $4, $5, $6, $7::vector, NOW())
       RETURNING id`,
      s.text,
      s.type,
      s.langId,
      s.fwId,
      s.levelId,
      s.skillId,
      embedding,
    )
    ids.push(rows[0].id)
  }

  return ids
}

async function seedInterviews(
  prisma: PrismaClient,
  studentId: number,
  c: Awaited<ReturnType<typeof seedCatalogs>>,
  questionIds: number[],
) {
  // 2 entrevistas históricas COMPLETADAS (para historial + dashboard agregado).
  // Cada una con 3 preguntas, 3 respuestas con evaluación full.
  async function completedInterview(label: string) {
    const interview = await prisma.interview.create({
      data: {
        userId: studentId,
        roleId: c.backendRoleId,
        languageId: c.typescriptLanguageId,
        frameworkId: c.nestjsFrameworkId,
        chosenLevelId: c.levelJuniorId,
        finishedAt: new Date(),
        evaluationStatus: 'completed',
        mode: 'evaluation',
      },
    })

    const picks = questionIds.slice(0, 3)
    for (let i = 0; i < picks.length; i++) {
      const q = await prisma.question.findUnique({ where: { id: picks[i] } })
      if (!q) continue
      const iq = await prisma.interviewQuestion.create({
        data: {
          interviewId: interview.id,
          questionId: picks[i],
          questionTextSnapshot: `[${label}] ${q.questionText}`,
          orderNumber: i + 1,
        },
      })
      const a = await prisma.answer.create({
        data: {
          interviewQuestionId: iq.id,
          answerText: `Respuesta seedeada ${label} #${i + 1}.`,
        },
      })
      await prisma.answerEvaluation.create({
        data: {
          answerId: a.id,
          technicalCorrectness: 4 + i * 0.1,
          clarityOfExplanation: 4 + i * 0.05,
          communication: 4,
          confidence: 4,
          problemSolving: 4,
          detectedLevelId: c.levelJuniorId,
          feedbackText: `Feedback IA seedeado para la respuesta ${label} #${i + 1}.`,
          juniorAnswer: 'Respuesta ejemplo de nivel Junior.',
          midAnswer: 'Respuesta ejemplo de nivel Mid.',
          seniorAnswer: 'Respuesta ejemplo de nivel Senior.',
        },
      })
    }

    // UserSkillScore: una entrada por skill que tocó la entrevista.
    return interview
  }

  const completedA = await completedInterview('A')
  const completedB = await completedInterview('B')

  // UserSkillScore agregado por skill, en [0, 100].
  await prisma.userSkillScore.createMany({
    data: [
      { userId: studentId, skillId: c.apisSkillId, score: 75 },
      { userId: studentId, skillId: c.dbSkillId, score: 60 },
      { userId: studentId, skillId: c.algoSkillId, score: 50 },
    ],
  })

  // No seedeamos una entrevista en progreso: el backend permite UNA SOLA
  // activa por usuario y eso choca con la creación de entrevistas en
  // distintos tests del wizard (TC-E-01) y de la sesión (TC-E-02). Cada
  // test que necesita una activa la crea vía `createFreshInterviewForUser`
  // (e2e/helpers/db-helpers.ts) o vía la UI del wizard.
  return {
    completedAId: completedA.id,
    completedBId: completedB.id,
    inProgressId: -1,
  }
}

async function seedKnowledgeBase(
  prisma: PrismaClient,
  uploaderId: number,
  languageId: number,
) {
  const embedding = `[${new Array(1536).fill(0).join(',')}]`
  const rawContent =
    'NestJS es un framework progresivo de Node.js para construir aplicaciones server-side eficientes y escalables. ' +
    'Combina TypeScript, programación orientada a objetos, funcional y reactiva, y se inspira en Angular para su arquitectura modular.'

  const doc = await prisma.knowledgeDocument.create({
    data: {
      title: 'Documento E2E sobre NestJS',
      rawContent,
      languageId,
      uploadedById: uploaderId,
      status: 'completed',
    },
  })

  // 1 chunk con embedding, para que la búsqueda semántica devuelva al menos un
  // resultado en TC-E-07-002 / 003.
  await prisma.$executeRawUnsafe(
    `INSERT INTO knowledge_chunks (document_id, chunk_index, content, token_count, embedding, created_at)
     VALUES ($1, 0, $2, $3, $4::vector, NOW())`,
    doc.id,
    rawContent,
    rawContent.length / 4, // estimación grosera de tokens
    embedding,
  )

  return { documentId: doc.id }
}

/** Carga `.env.test` del backend si DATABASE_URL no está ya seteado. */
function loadEnvTestIfNeeded() {
  if (process.env.DATABASE_URL) return
  const fs = require('fs') as typeof import('fs')
  const path = require('path') as typeof import('path')
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

export async function runSeed(): Promise<SeededIds> {
  loadEnvTestIfNeeded()

  const prisma = new PrismaClient()
  try {
    assertTestDatabase(prisma)
    await resetDatabase(prisma)
    const catalogs = await seedCatalogs(prisma)
    const users = await seedUsers(prisma)
    const questionIds = await seedQuestions(prisma, catalogs)
    const interviews = await seedInterviews(prisma, users.studentId, catalogs, questionIds)
    const knowledge = await seedKnowledgeBase(prisma, users.recruiterId, catalogs.typescriptLanguageId)

    return {
      users,
      catalogs: {
        backendRoleId: catalogs.backendRoleId,
        frontendRoleId: catalogs.frontendRoleId,
        typescriptLanguageId: catalogs.typescriptLanguageId,
        pythonLanguageId: catalogs.pythonLanguageId,
        nestjsFrameworkId: catalogs.nestjsFrameworkId,
        levelJuniorId: catalogs.levelJuniorId,
        levelMidId: catalogs.levelMidId,
        levelSeniorId: catalogs.levelSeniorId,
        apisSkillId: catalogs.apisSkillId,
        dbSkillId: catalogs.dbSkillId,
      },
      questions: questionIds,
      interviews,
      knowledge,
    }
  } finally {
    await prisma.$disconnect()
  }
}

export async function clearSeed(): Promise<void> {
  loadEnvTestIfNeeded()
  const prisma = new PrismaClient()
  try {
    assertTestDatabase(prisma)
    await resetDatabase(prisma)
  } finally {
    await prisma.$disconnect()
  }
}

// Ejecución directa: `node e2e/fixtures/seed.ts` (vía ts-node / tsx).
if (require.main === module) {
  runSeed()
    .then((ids) => {
      // eslint-disable-next-line no-console
      console.log('[e2e seed] OK', JSON.stringify(ids, null, 2))
      process.exit(0)
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error('[e2e seed] FAILED', err)
      process.exit(1)
    })
}
