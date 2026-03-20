import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Enable pgvector extension
  await prisma.$executeRawUnsafe(
    'CREATE EXTENSION IF NOT EXISTS vector',
  );

  // Seed roles (interview roles, not user roles)
  const roles = await Promise.all(
    ['Backend Engineer', 'Fullstack Engineer'].map((name) =>
      prisma.role.upsert({
        where: { name },
        update: {},
        create: { name },
      }),
    ),
  );

  // Seed languages
  const languages = await Promise.all(
    ['JavaScript', 'Python'].map((name) =>
      prisma.language.upsert({
        where: { name },
        update: {},
        create: { name },
      }),
    ),
  );

  const [javascript, python] = languages;

  // Seed frameworks
  const frameworkData = [
    { name: 'Node.js', languageId: javascript.id },
    { name: 'React', languageId: javascript.id },
    { name: 'Django', languageId: python.id },
  ];
  const frameworks: { id: number; name: string; languageId: number }[] = [];
  for (const fw of frameworkData) {
    const framework = await prisma.framework.upsert({
      where: { id: frameworks.length + 1 },
      update: {},
      create: fw,
    });
    frameworks.push(framework);
  }

  // Seed levels
  const levels = await Promise.all(
    ['Junior', 'Mid', 'Senior'].map((name) =>
      prisma.level.upsert({
        where: { name },
        update: {},
        create: { name },
      }),
    ),
  );

  // Seed skills
  const skillNames = [
    'async-patterns',
    'error-handling',
    'oop-design',
    'rest-api-design',
    'data-structures',
  ];
  const skills = await Promise.all(
    skillNames.map((name) =>
      prisma.skill.upsert({
        where: { name },
        update: {},
        create: { name },
      }),
    ),
  );

  // Seed demo users
  const passwordHash = await bcrypt.hash('password123', 10);

  await prisma.user.upsert({
    where: { email: 'student@vinki.dev' },
    update: {},
    create: {
      name: 'Ana García',
      email: 'student@vinki.dev',
      passwordHash,
      role: 'student',
    },
  });

  await prisma.user.upsert({
    where: { email: 'recruiter@vinki.dev' },
    update: {},
    create: {
      name: 'Carlos Méndez',
      email: 'recruiter@vinki.dev',
      passwordHash,
      role: 'recruiter',
    },
  });

  await prisma.user.upsert({
    where: { email: 'admin@vinki.dev' },
    update: {},
    create: {
      name: 'María Torres',
      email: 'admin@vinki.dev',
      passwordHash,
      role: 'admin',
    },
  });

  // Seed questions with dummy embeddings (1536 dims)
  const dummyEmbedding = `[${new Array(1536).fill('0.0').join(',')}]`;

  const questionData = [
    {
      questionText: 'Explica cómo funciona el event loop en Node.js.',
      type: 'conceptual',
      source: 'curated',
      languageId: javascript.id,
      frameworkId: frameworks[0].id,
      levelId: levels[1].id,
      skillId: skills[0].id,
    },
    {
      questionText: '¿Cómo manejas errores en una aplicación Express con middleware?',
      type: 'practical',
      source: 'curated',
      languageId: javascript.id,
      frameworkId: frameworks[0].id,
      levelId: levels[0].id,
      skillId: skills[1].id,
    },
    {
      questionText: 'Describe los principios SOLID y cómo los aplicarías en un proyecto Node.js.',
      type: 'conceptual',
      source: 'curated',
      languageId: javascript.id,
      frameworkId: frameworks[0].id,
      levelId: levels[2].id,
      skillId: skills[2].id,
    },
    {
      questionText: 'Diseña una API REST para un sistema de gestión de tareas. ¿Qué endpoints crearías?',
      type: 'design',
      source: 'curated',
      languageId: javascript.id,
      frameworkId: frameworks[0].id,
      levelId: levels[1].id,
      skillId: skills[3].id,
    },
    {
      questionText: '¿Qué estructura de datos usarías para implementar un cache LRU?',
      type: 'conceptual',
      source: 'curated',
      languageId: javascript.id,
      frameworkId: null,
      levelId: levels[1].id,
      skillId: skills[4].id,
    },
    {
      questionText: '¿Cómo funciona el GIL en Python y cómo afecta a la concurrencia?',
      type: 'conceptual',
      source: 'curated',
      languageId: python.id,
      frameworkId: null,
      levelId: levels[1].id,
      skillId: skills[0].id,
    },
    {
      questionText: 'Explica cómo implementarías manejo de excepciones personalizado en Django.',
      type: 'practical',
      source: 'curated',
      languageId: python.id,
      frameworkId: frameworks[2].id,
      levelId: levels[0].id,
      skillId: skills[1].id,
    },
    {
      questionText: '¿Cómo diseñarías un sistema de herencia de modelos en Django?',
      type: 'design',
      source: 'curated',
      languageId: python.id,
      frameworkId: frameworks[2].id,
      levelId: levels[1].id,
      skillId: skills[2].id,
    },
    {
      questionText: '¿Cómo escalarías una API REST construida con Django REST Framework?',
      type: 'design',
      source: 'curated',
      languageId: python.id,
      frameworkId: frameworks[2].id,
      levelId: levels[2].id,
      skillId: skills[3].id,
    },
    {
      questionText: 'Implementa una función que determine si un grafo tiene ciclos. ¿Qué complejidad tiene?',
      type: 'practical',
      source: 'curated',
      languageId: python.id,
      frameworkId: null,
      levelId: levels[2].id,
      skillId: skills[4].id,
    },
  ];

  for (const q of questionData) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO questions (question_text, type, source, language_id, framework_id, level_id, skill_id, embedding)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::vector)
       ON CONFLICT DO NOTHING`,
      q.questionText,
      q.type,
      q.source,
      q.languageId,
      q.frameworkId,
      q.levelId,
      q.skillId,
      dummyEmbedding,
    );
  }

  console.log('Seed completed successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
