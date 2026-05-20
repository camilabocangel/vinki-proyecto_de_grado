// Helpers compartidos por las suites de integración.
//
// Provee:
//   - `prisma`: singleton del PrismaClient apuntando a la DB de test.
//   - `resetDatabase()`: TRUNCATE CASCADE de todas las tablas de dominio,
//     ejecutado en orden inverso a las FK para satisfacer las cascadas.
//   - `seedCatalogs()`: pobla catálogos mínimos (roles, languages,
//     frameworks, levels, skills) que muchos tests necesitan como
//     pre-condición. Idempotente.
//   - `createUser()`: helper para crear usuarios de prueba con hash
//     bcrypt real (usa el mismo algoritmo que AuthService).

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

// Singleton del cliente: una sola conexión por proceso de Jest.
export const prisma = new PrismaClient();

// Tablas a truncar entre tests, en orden inverso a las dependencias.
// Si se añaden tablas, agregarlas aquí en el orden correcto.
const TRUNCATE_TABLES = [
  // Dependientes finales.
  'answer_evaluations',
  'answers',
  'interview_questions',
  'template_questions',
  'interviews',
  'interview_templates',
  // Knowledge.
  'knowledge_chunks',
  'knowledge_documents',
  // Gamificación (diferida pero limpiamos por si quedó data residual).
  'user_achievements',
  'challenge_participations',
  // User-related.
  'recruiter_notes',
  'user_skill_scores',
  'audit_logs',
  // Question bank.
  'questions',
  // Catalogs.
  'role_languages',
  'frameworks',
  'languages',
  'levels',
  'skills',
  'roles',
  'achievements',
  'challenges',
  // Usuarios al final (FK desde casi todo).
  'users',
];

/**
 * TRUNCATE CASCADE de todas las tablas de dominio, reinicia las
 * secuencias de id. Se llama en `beforeEach` para garantizar idempotencia.
 *
 * NOTA: NO se ejecuta `_prisma_migrations` — esa tabla queda intacta para
 * conservar el historial de migraciones aplicadas a la DB de test.
 */
export async function resetDatabase(): Promise<void> {
  const list = TRUNCATE_TABLES.map((t) => `"${t}"`).join(', ');
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE;`,
  );
}

export interface SeededCatalogs {
  roleId: number;
  languageId: number;
  frameworkId: number;
  levelJuniorId: number;
  levelMidId: number;
  levelSeniorId: number;
  skillId: number;
}

/**
 * Pobla un set mínimo de catálogos para que los tests puedan crear
 * preguntas, entrevistas, etc. Devuelve los IDs generados para que el
 * test los use sin tener que volver a consultarlos.
 *
 * Idempotente entre tests cuando se usa `resetDatabase()` antes.
 */
export async function seedCatalogs(): Promise<SeededCatalogs> {
  const role = await prisma.role.create({ data: { name: 'Backend Engineer' } });
  const language = await prisma.language.create({ data: { name: 'TypeScript' } });
  const framework = await prisma.framework.create({
    data: { name: 'NestJS', languageId: language.id },
  });
  const levelJunior = await prisma.level.create({ data: { name: 'Junior' } });
  const levelMid = await prisma.level.create({ data: { name: 'Mid' } });
  const levelSenior = await prisma.level.create({ data: { name: 'Senior' } });
  const skill = await prisma.skill.create({ data: { name: 'APIs REST' } });

  // Relación role-language para los catálogos filtrados.
  await prisma.roleLanguage.create({
    data: { roleId: role.id, languageId: language.id },
  });

  return {
    roleId: role.id,
    languageId: language.id,
    frameworkId: framework.id,
    levelJuniorId: levelJunior.id,
    levelMidId: levelMid.id,
    levelSeniorId: levelSenior.id,
    skillId: skill.id,
  };
}

export interface TestUser {
  id: number;
  name: string;
  email: string;
  passwordHash: string;
  rawPassword: string;
  role: 'student' | 'recruiter' | 'admin';
}

/**
 * Crea un usuario con hash bcrypt real (replica el comportamiento de
 * AuthService). Devuelve también la contraseña en claro para tests que
 * necesitan hacer login.
 */
export async function createUser(
  overrides: Partial<{
    email: string;
    name: string;
    password: string;
    role: 'student' | 'recruiter' | 'admin';
  }> = {},
): Promise<TestUser> {
  const email = overrides.email ?? `test-${Date.now()}-${Math.random()}@vinki.dev`;
  const name = overrides.name ?? 'Test User';
  const password = overrides.password ?? 'password123';
  const role = overrides.role ?? 'student';
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { email, name, passwordHash, role },
  });

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    passwordHash: user.passwordHash,
    rawPassword: password,
    role,
  };
}

/**
 * Inserta una pregunta mínima vinculada a los catálogos sembrados.
 * NO incluye el embedding (sería costoso). Se omite con `embedding NULL`.
 */
export async function createQuestion(
  catalogs: SeededCatalogs,
  overrides: Partial<{ questionText: string; type: string; levelId: number }> = {},
): Promise<{ id: number; questionText: string }> {
  const q = await prisma.question.create({
    data: {
      questionText: overrides.questionText ?? '¿Qué es REST?',
      type: overrides.type ?? 'open',
      languageId: catalogs.languageId,
      frameworkId: catalogs.frameworkId,
      levelId: overrides.levelId ?? catalogs.levelJuniorId,
      skillId: catalogs.skillId,
    },
  });
  return { id: q.id, questionText: q.questionText };
}

/**
 * Inserta una pregunta CON embedding (vector pgvector de 1536 dim por
 * defecto). Necesario para que `QuestionSelectorService` la elija
 * (filtra por `embedding IS NOT NULL`). Se usa raw SQL porque Prisma no
 * soporta nativamente el tipo `vector`.
 */
export async function createQuestionWithEmbedding(
  catalogs: SeededCatalogs,
  overrides: Partial<{
    questionText: string;
    type: string;
    levelId: number;
    dims: number;
  }> = {},
): Promise<{ id: number; questionText: string }> {
  const text = overrides.questionText ?? '¿Qué es REST?';
  const type = overrides.type ?? 'open';
  const levelId = overrides.levelId ?? catalogs.levelJuniorId;
  const dims = overrides.dims ?? 1536;
  const embedding = `[${new Array(dims).fill(0).join(',')}]`;

  const rows = await prisma.$queryRawUnsafe<Array<{ id: number; question_text: string }>>(
    `INSERT INTO questions (question_text, type, source, language_id, framework_id, level_id, skill_id, embedding, created_at)
     VALUES ($1, $2, 'curated', $3, $4, $5, $6, $7::vector, NOW())
     RETURNING id, question_text`,
    text,
    type,
    catalogs.languageId,
    catalogs.frameworkId,
    levelId,
    catalogs.skillId,
    embedding,
  );

  return { id: rows[0].id, questionText: rows[0].question_text };
}
