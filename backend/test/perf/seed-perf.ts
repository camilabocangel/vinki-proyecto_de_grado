// Seed dedicado para pruebas de rendimiento (Fase 5 — D-16).
//
// Pobla la DB de TEST (puerto 5434, vinki_test por defecto) con:
//   - Catálogos completos (roles, languages, frameworks, levels, skills)
//   - 3 usuarios con credenciales fijas (perf-student/recruiter/admin)
//   - N preguntas con embeddings deterministas (default 10 000)
//   - 1 documento knowledge base con `status='ready'` (literal exigido por
//     el query de búsqueda — RNF-02) y M chunks asociados
//   - 1 entrevista activa para `perf-student` con respuesta lista para
//     usar en `evaluate-now` (RNF-01)
//
// Independiente del seed E2E (`e2e/fixtures/seed.ts`) para no romper la
// suite Playwright (D-16).
//
// Ejecutar:  npm run seed:perf
// Con volumen reducido (iteración rápida):  PERF_QUESTIONS=1000 npm run seed:perf
//
// Guardrail: aborta si DATABASE_URL apunta a la DB de DESARROLLO (5433
// o /vinki?schema=public).

import * as fs from 'node:fs';
import * as path from 'node:path';

// Cargar .env.test ANTES de importar PrismaClient: Prisma hace su propio
// autoload de `backend/.env` (dev URL), por lo que necesitamos sobrescribir
// las variables relevantes en este proceso ANTES de que Prisma se inicialice.
loadEnvTestForcing();

// eslint-disable-next-line @typescript-eslint/no-var-requires, import/order
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

export const PERF_CREDENTIALS = {
  student: {
    email: 'perf-student@test.local',
    password: 'PerfStudent-2026!',
    name: 'Perf Student',
  },
  recruiter: {
    email: 'perf-recruiter@test.local',
    password: 'PerfRecruiter-2026!',
    name: 'Perf Recruiter',
  },
  admin: {
    email: 'perf-admin@test.local',
    password: 'PerfAdmin-2026!',
    name: 'Perf Admin',
  },
} as const;

const EMBEDDING_DIMENSIONS = 1536;
const QUESTION_BATCH_SIZE = 500;
const CHUNK_BATCH_SIZE = 100;

// Tablas a truncar entre runs — mismo orden inverso de FK que las suites
// de integración y E2E.
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
];

/**
 * Carga `backend/.env.test` SIEMPRE y SOBRESCRIBE las variables relevantes
 * en `process.env`. A diferencia del setup de integración (que respeta
 * variables ya seteadas), aquí queremos garantizar que el seed-perf use
 * la DB de test incluso si Prisma o el shell apuntan a otra DB. Esto evita
 * accidentes de seedear contra la DB de desarrollo.
 *
 * Función con declaración de `function` (no `const` arrow) para
 * aprovechar el hoisting y ser llamable desde la zona superior del
 * archivo, antes de importar `@prisma/client`.
 */
function loadEnvTestForcing(): void {
  const envPath = path.resolve(__dirname, '..', '..', '.env.test');
  if (!fs.existsSync(envPath)) {
    throw new Error(
      `[seed-perf] No existe backend/.env.test en ${envPath}. Asegúrate ` +
        `de tener configurada la DB de test (Fase 3).`,
    );
  }
  const content = fs.readFileSync(envPath, 'utf-8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    // SOBRESCRIBE — diferente del comportamiento del setup de integración,
    // que respeta vars ya seteadas. Aquí .env.test ES la fuente de verdad.
    process.env[key] = value;
  }
}

function assertTestDatabase(): void {
  const url = process.env.DATABASE_URL ?? '';
  if (url.includes(':5433/') || url.endsWith('/vinki?schema=public')) {
    throw new Error(
      `[seed-perf] DATABASE_URL apunta a la base de DESARROLLO (${url}). ` +
        `El seed de perf SOLO debe correr contra la DB de test (puerto ` +
        `5434, "vinki_test"). Aborto por seguridad.`,
    );
  }
}

async function resetDatabase(prisma: PrismaClient): Promise<void> {
  const list = TRUNCATE_TABLES.map((t) => `"${t}"`).join(', ');
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE;`,
  );
}

interface SeededCatalogs {
  backendRoleId: number;
  frontendRoleId: number;
  typescriptLanguageId: number;
  pythonLanguageId: number;
  nestjsFrameworkId: number;
  reactFrameworkId: number;
  djangoFrameworkId: number;
  levelJuniorId: number;
  levelMidId: number;
  levelSeniorId: number;
  apisSkillId: number;
  dbSkillId: number;
  algoSkillId: number;
}

async function seedCatalogs(prisma: PrismaClient): Promise<SeededCatalogs> {
  const backendRole = await prisma.role.create({ data: { name: 'Backend Engineer' } });
  const frontendRole = await prisma.role.create({ data: { name: 'Frontend Engineer' } });

  const typescript = await prisma.language.create({ data: { name: 'TypeScript' } });
  const python = await prisma.language.create({ data: { name: 'Python' } });

  const nestjs = await prisma.framework.create({
    data: { name: 'NestJS', languageId: typescript.id },
  });
  const react = await prisma.framework.create({
    data: { name: 'React', languageId: typescript.id },
  });
  const django = await prisma.framework.create({
    data: { name: 'Django', languageId: python.id },
  });

  const junior = await prisma.level.create({ data: { name: 'Junior' } });
  const mid = await prisma.level.create({ data: { name: 'Mid' } });
  const senior = await prisma.level.create({ data: { name: 'Senior' } });

  const apis = await prisma.skill.create({ data: { name: 'APIs REST' } });
  const db = await prisma.skill.create({ data: { name: 'Bases de datos' } });
  const algo = await prisma.skill.create({ data: { name: 'Algoritmos' } });

  await prisma.roleLanguage.createMany({
    data: [
      { roleId: backendRole.id, languageId: typescript.id },
      { roleId: backendRole.id, languageId: python.id },
      { roleId: frontendRole.id, languageId: typescript.id },
    ],
  });

  return {
    backendRoleId: backendRole.id,
    frontendRoleId: frontendRole.id,
    typescriptLanguageId: typescript.id,
    pythonLanguageId: python.id,
    nestjsFrameworkId: nestjs.id,
    reactFrameworkId: react.id,
    djangoFrameworkId: django.id,
    levelJuniorId: junior.id,
    levelMidId: mid.id,
    levelSeniorId: senior.id,
    apisSkillId: apis.id,
    dbSkillId: db.id,
    algoSkillId: algo.id,
  };
}

interface SeededUsers {
  studentId: number;
  recruiterId: number;
  adminId: number;
  bulkStudentCount: number;
  bulkStudentPassword: string;
  bulkStudentEmailPattern: string;
}

// Password compartida para los estudiantes "bulk" usados por RNF-03 (50
// usuarios concurrentes). NO replicar en producción.
const BULK_STUDENT_PASSWORD = 'PerfBulk-2026!';
// Patrón de email: perf-student-001@test.local ... perf-student-050@test.local
const BULK_STUDENT_EMAIL_PATTERN = 'perf-student-{NNN}@test.local';

async function seedUsers(
  prisma: PrismaClient,
  bulkStudentCount: number,
): Promise<SeededUsers> {
  async function makeUser(
    email: string,
    name: string,
    password: string,
    role: 'student' | 'recruiter' | 'admin',
  ) {
    const passwordHash = await bcrypt.hash(password, 10);
    return prisma.user.create({
      data: { email, name, passwordHash, role },
    });
  }

  const student = await makeUser(
    PERF_CREDENTIALS.student.email,
    PERF_CREDENTIALS.student.name,
    PERF_CREDENTIALS.student.password,
    'student',
  );
  const recruiter = await makeUser(
    PERF_CREDENTIALS.recruiter.email,
    PERF_CREDENTIALS.recruiter.name,
    PERF_CREDENTIALS.recruiter.password,
    'recruiter',
  );
  const admin = await makeUser(
    PERF_CREDENTIALS.admin.email,
    PERF_CREDENTIALS.admin.name,
    PERF_CREDENTIALS.admin.password,
    'admin',
  );

  // Estudiantes bulk para RNF-03 (50 usuarios concurrentes con flujo
  // completo login → create-interview → answer → finish). Cada thread de
  // JMeter consume una fila distinta del CSV `data/perf-students.csv`,
  // evitando el `ConflictException('You already have an active interview')`
  // que dispararía si todos compartieran al `perf-student` base.
  if (bulkStudentCount > 0) {
    // bcrypt es la operación más cara del seed (~100 ms × 50 = 5 s). Lo
    // hacemos UNA SOLA VEZ porque la password es la misma para todos.
    const bulkPasswordHash = await bcrypt.hash(BULK_STUDENT_PASSWORD, 10);
    const bulkUsersData = Array.from({ length: bulkStudentCount }, (_, i) => {
      const seq = String(i + 1).padStart(3, '0');
      return {
        email: BULK_STUDENT_EMAIL_PATTERN.replace('{NNN}', seq),
        name: `Perf Bulk Student ${seq}`,
        passwordHash: bulkPasswordHash,
        role: 'student' as const,
      };
    });
    await prisma.user.createMany({ data: bulkUsersData });
  }

  return {
    studentId: student.id,
    recruiterId: recruiter.id,
    adminId: admin.id,
    bulkStudentCount,
    bulkStudentPassword: BULK_STUDENT_PASSWORD,
    bulkStudentEmailPattern: BULK_STUDENT_EMAIL_PATTERN,
  };
}

/**
 * Devuelve un literal pgvector con `EMBEDDING_DIMENSIONS` dimensiones.
 * Determinista: deriva los valores de la `seed` numérica para variar
 * ligeramente entre preguntas (útil si la búsqueda quiere distinguir).
 * NO usa Math.random para que el seed sea reproducible.
 */
function buildEmbeddingLiteral(seed: number): string {
  const values = new Array<number>(EMBEDDING_DIMENSIONS);
  // Genera un patrón pseudo-determinista barato: variaciones sobre 0
  // basadas en `seed` y el índice. Los valores son MUY pequeños para
  // que las distancias de coseno entre vectores distintos sean también
  // pequeñas — apto para validar el flujo de pgvector sin sesgar la
  // medición de latencia.
  for (let i = 0; i < EMBEDDING_DIMENSIONS; i++) {
    values[i] = ((seed + i) % 7) * 0.0001;
  }
  return `[${values.join(',')}]`;
}

async function seedQuestions(
  prisma: PrismaClient,
  c: SeededCatalogs,
  totalQuestions: number,
): Promise<number> {
  // Distribución determinista: cycla por combinaciones de
  // (language, framework, level, skill) para tener un banco diverso.
  const variants: Array<{
    langId: number;
    fwId: number | null;
    levelId: number;
    skillId: number;
  }> = [
    { langId: c.typescriptLanguageId, fwId: c.nestjsFrameworkId, levelId: c.levelJuniorId, skillId: c.apisSkillId },
    { langId: c.typescriptLanguageId, fwId: c.nestjsFrameworkId, levelId: c.levelJuniorId, skillId: c.dbSkillId },
    { langId: c.typescriptLanguageId, fwId: c.reactFrameworkId, levelId: c.levelJuniorId, skillId: c.apisSkillId },
    { langId: c.typescriptLanguageId, fwId: null, levelId: c.levelMidId, skillId: c.algoSkillId },
    { langId: c.typescriptLanguageId, fwId: c.nestjsFrameworkId, levelId: c.levelMidId, skillId: c.dbSkillId },
    { langId: c.typescriptLanguageId, fwId: null, levelId: c.levelSeniorId, skillId: c.algoSkillId },
    { langId: c.pythonLanguageId, fwId: null, levelId: c.levelJuniorId, skillId: c.apisSkillId },
    { langId: c.pythonLanguageId, fwId: c.djangoFrameworkId, levelId: c.levelMidId, skillId: c.dbSkillId },
  ];

  let inserted = 0;
  for (let batchStart = 0; batchStart < totalQuestions; batchStart += QUESTION_BATCH_SIZE) {
    const batchEnd = Math.min(batchStart + QUESTION_BATCH_SIZE, totalQuestions);
    const placeholders: string[] = [];
    const params: unknown[] = [];

    for (let i = batchStart; i < batchEnd; i++) {
      const v = variants[i % variants.length];
      const offset = params.length;
      placeholders.push(
        `($${offset + 1}, 'open', 'curated', $${offset + 2}, $${offset + 3}, ` +
          `$${offset + 4}, $${offset + 5}, $${offset + 6}::vector, NOW())`,
      );
      params.push(
        `Pregunta perf #${i + 1} — ejercita la búsqueda semántica y el banco de preguntas para JMeter.`,
        v.langId,
        v.fwId,
        v.levelId,
        v.skillId,
        buildEmbeddingLiteral(i + 1),
      );
    }

    await prisma.$executeRawUnsafe(
      `INSERT INTO questions (question_text, type, source, language_id, framework_id, level_id, skill_id, embedding, created_at)
       VALUES ${placeholders.join(', ')}`,
      ...params,
    );

    inserted += batchEnd - batchStart;
    if (batchEnd % 1000 === 0 || batchEnd === totalQuestions) {
      // eslint-disable-next-line no-console
      console.log(`[seed-perf]   preguntas insertadas: ${inserted} / ${totalQuestions}`);
    }
  }

  return inserted;
}

async function seedKnowledgeBase(
  prisma: PrismaClient,
  uploadedById: number,
  languageId: number,
  chunkCount: number,
): Promise<{ documentId: number; chunkCount: number }> {
  const rawContent =
    'Documento técnico de prueba de rendimiento. Contiene fragmentos sobre ' +
    'Node.js event loop, NestJS modularización, pgvector indexación, ' +
    'BullMQ workers asíncronos, autenticación JWT y diseño de APIs REST.';

  const doc = await prisma.knowledgeDocument.create({
    data: {
      title: 'Documento perf — NestJS / Node.js',
      rawContent,
      languageId,
      uploadedById,
      status: 'ready', // ⚠ literal exigido por `knowledge-retrieval.service.ts:36`
    },
  });

  // Insertar chunks en batches con embeddings deterministas.
  let inserted = 0;
  for (let batchStart = 0; batchStart < chunkCount; batchStart += CHUNK_BATCH_SIZE) {
    const batchEnd = Math.min(batchStart + CHUNK_BATCH_SIZE, chunkCount);
    const placeholders: string[] = [];
    const params: unknown[] = [];

    for (let i = batchStart; i < batchEnd; i++) {
      const offset = params.length;
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}::vector, NOW())`,
      );
      const content = `${rawContent} [chunk ${i + 1}/${chunkCount}]`;
      params.push(
        doc.id,
        i,
        content,
        Math.ceil(content.length / 4),
        buildEmbeddingLiteral(i + 1),
      );
    }

    await prisma.$executeRawUnsafe(
      `INSERT INTO knowledge_chunks (document_id, chunk_index, content, token_count, embedding, created_at)
       VALUES ${placeholders.join(', ')}`,
      ...params,
    );

    inserted += batchEnd - batchStart;
  }

  return { documentId: doc.id, chunkCount: inserted };
}

async function seedActiveInterview(
  prisma: PrismaClient,
  studentId: number,
  c: SeededCatalogs,
): Promise<{ interviewId: number; interviewQuestionId: number; answerId: number }> {
  // Necesitamos una pregunta REAL del banco. Tomamos la primera.
  const firstQuestion = await prisma.question.findFirst({
    where: { languageId: c.typescriptLanguageId, levelId: c.levelJuniorId },
    orderBy: { id: 'asc' },
  });
  if (!firstQuestion) {
    throw new Error('[seed-perf] no se encontró pregunta para sembrar la entrevista.');
  }

  const interview = await prisma.interview.create({
    data: {
      userId: studentId,
      roleId: c.backendRoleId,
      languageId: c.typescriptLanguageId,
      frameworkId: c.nestjsFrameworkId,
      chosenLevelId: c.levelJuniorId,
      evaluationStatus: 'pending',
      mode: 'practice', // requerido por `evaluate-now`
    },
  });

  const iq = await prisma.interviewQuestion.create({
    data: {
      interviewId: interview.id,
      questionId: firstQuestion.id,
      questionTextSnapshot: firstQuestion.questionText,
      orderNumber: 1,
    },
  });

  // Respuesta lista — `evaluate-now` la consume.
  const answer = await prisma.answer.create({
    data: {
      interviewQuestionId: iq.id,
      answerText:
        'Respuesta seedeada para perf — texto suficientemente largo como ' +
        'para que el evaluador (mock o real) genere todas las dimensiones.',
    },
  });

  return {
    interviewId: interview.id,
    interviewQuestionId: iq.id,
    answerId: answer.id,
  };
}

export interface PerfSeedResult {
  users: SeededUsers;
  catalogs: SeededCatalogs;
  questionCount: number;
  knowledge: { documentId: number; chunkCount: number };
  interview: { interviewId: number; interviewQuestionId: number; answerId: number };
}

export async function runPerfSeed(options?: {
  questionCount?: number;
  chunkCount?: number;
  bulkStudentCount?: number;
}): Promise<PerfSeedResult> {
  // `loadEnvTestForcing()` ya se ejecutó al top del módulo, antes de
  // importar PrismaClient. Aquí solo confirmamos el guardrail.
  assertTestDatabase();

  const totalQuestions = options?.questionCount ??
    parseInt(process.env.PERF_QUESTIONS ?? '10000', 10);
  const totalChunks = options?.chunkCount ??
    parseInt(process.env.PERF_CHUNKS ?? '50', 10);
  const bulkStudentCount = options?.bulkStudentCount ??
    parseInt(process.env.PERF_BULK_STUDENTS ?? '50', 10);

  // eslint-disable-next-line no-console
  console.log(
    `[seed-perf] arranque · DATABASE_URL=${process.env.DATABASE_URL?.replace(/:[^@:]+@/, ':***@')} · ` +
      `objetivo: ${totalQuestions} preguntas, ${totalChunks} chunks knowledge.`,
  );

  const prisma = new PrismaClient();
  try {
    const t0 = Date.now();
    await resetDatabase(prisma);
    // eslint-disable-next-line no-console
    console.log('[seed-perf] DB truncada.');

    const catalogs = await seedCatalogs(prisma);
    // eslint-disable-next-line no-console
    console.log('[seed-perf] catálogos sembrados.');

    const users = await seedUsers(prisma, bulkStudentCount);
    // eslint-disable-next-line no-console
    console.log(
      `[seed-perf] 3 usuarios fijos + ${bulkStudentCount} estudiantes bulk sembrados ` +
        `(perf-student-001 .. perf-student-${String(bulkStudentCount).padStart(3, '0')}).`,
    );

    const questionCount = await seedQuestions(prisma, catalogs, totalQuestions);
    // eslint-disable-next-line no-console
    console.log(`[seed-perf] ${questionCount} preguntas sembradas con embeddings.`);

    const knowledge = await seedKnowledgeBase(
      prisma,
      users.recruiterId,
      catalogs.typescriptLanguageId,
      totalChunks,
    );
    // eslint-disable-next-line no-console
    console.log(
      `[seed-perf] knowledge: 1 documento (status='ready') con ` +
        `${knowledge.chunkCount} chunks.`,
    );

    const interview = await seedActiveInterview(prisma, users.studentId, catalogs);
    // eslint-disable-next-line no-console
    console.log(
      `[seed-perf] entrevista activa #${interview.interviewId} para perf-student ` +
        `(modo practice, 1 pregunta con respuesta lista para /evaluate-now).`,
    );

    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    // eslint-disable-next-line no-console
    console.log(`[seed-perf] OK en ${elapsed}s.`);

    return { users, catalogs, questionCount, knowledge, interview };
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecución directa: `npm run seed:perf` (o `ts-node test/perf/seed-perf.ts`).
if (require.main === module) {
  runPerfSeed()
    .then((result) => {
      // eslint-disable-next-line no-console
      console.log('[seed-perf] resultado:', JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error('[seed-perf] FALLÓ:', err);
      process.exit(1);
    });
}
