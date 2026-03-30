import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Enable pgvector extension
  await prisma.$executeRawUnsafe(
    'CREATE EXTENSION IF NOT EXISTS vector',
  );

  // ──────────────────────────────────────────────
  // Roles (interview roles, not user roles)
  // ──────────────────────────────────────────────
  const roleNames = [
    'Backend Engineer',
    'Frontend Engineer',
    'Full Stack Engineer',
    'DevOps Engineer',
    'Data Engineer',
  ];
  const roles: Record<string, { id: number; name: string }> = {};
  for (const name of roleNames) {
    roles[name] = await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // ──────────────────────────────────────────────
  // Languages
  // ──────────────────────────────────────────────
  const languageNames = [
    'JavaScript',
    'TypeScript',
    'Python',
    'Java',
    'Go',
    'Rust',
    'SQL',
    'HTML',
    'CSS',
  ];
  const languages: Record<string, { id: number; name: string }> = {};
  for (const name of languageNames) {
    languages[name] = await prisma.language.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // ──────────────────────────────────────────────
  // Frameworks (per language)
  // ──────────────────────────────────────────────
  const frameworkDefs: { name: string; language: string }[] = [
    { name: 'React', language: 'JavaScript' },
    { name: 'Node.js', language: 'JavaScript' },
    { name: 'Express', language: 'JavaScript' },
    { name: 'Next.js', language: 'JavaScript' },
    { name: 'NestJS', language: 'TypeScript' },
    { name: 'Angular', language: 'TypeScript' },
    { name: 'Django', language: 'Python' },
    { name: 'FastAPI', language: 'Python' },
    { name: 'Flask', language: 'Python' },
    { name: 'Spring Boot', language: 'Java' },
    { name: 'Gin', language: 'Go' },
    { name: 'PostgreSQL', language: 'SQL' },
  ];

  const frameworks: Record<string, { id: number; name: string; languageId: number }> = {};
  for (const fw of frameworkDefs) {
    const languageId = languages[fw.language].id;
    // Framework has no unique on name, so find-or-create
    let existing = await prisma.framework.findFirst({
      where: { name: fw.name, languageId },
    });
    if (!existing) {
      existing = await prisma.framework.create({
        data: { name: fw.name, languageId },
      });
    }
    frameworks[fw.name] = existing;
  }

  // ──────────────────────────────────────────────
  // Levels
  // ──────────────────────────────────────────────
  const levelNames = ['Junior', 'Mid', 'Senior'];
  const levels: Record<string, { id: number; name: string }> = {};
  for (const name of levelNames) {
    levels[name] = await prisma.level.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // ──────────────────────────────────────────────
  // Skills
  // ──────────────────────────────────────────────
  const skillNames = [
    'async-patterns',
    'rest-api-design',
    'database-optimization',
    'testing',
    'security',
    'system-design',
    'algorithms',
    'data-structures',
    'design-patterns',
    'error-handling',
    'performance',
    'deployment',
  ];
  const skills: Record<string, { id: number; name: string }> = {};
  for (const name of skillNames) {
    skills[name] = await prisma.skill.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // ──────────────────────────────────────────────
  // Role ↔ Language mappings
  // ──────────────────────────────────────────────
  const roleLangMap: Record<string, string[]> = {
    'Backend Engineer':    ['JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'Rust', 'SQL'],
    'Frontend Engineer':   ['JavaScript', 'TypeScript', 'HTML', 'CSS'],
    'Full Stack Engineer': ['JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'Rust', 'SQL', 'HTML', 'CSS'],
    'DevOps Engineer':     ['Python', 'Go', 'Rust', 'SQL', 'JavaScript'],
    'Data Engineer':       ['Python', 'SQL', 'Java', 'Go'],
  };

  for (const [roleName, langNames] of Object.entries(roleLangMap)) {
    const role = roles[roleName];
    if (!role) continue;
    for (const langName of langNames) {
      const language = languages[langName];
      if (!language) continue;
      await prisma.roleLanguage.upsert({
        where: { roleId_languageId: { roleId: role.id, languageId: language.id } },
        update: {},
        create: { roleId: role.id, languageId: language.id },
      });
    }
  }

  // ──────────────────────────────────────────────
  // Users (5 total: 3 students, 1 recruiter, 1 admin)
  // ──────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('password123', 10);

  const userDefs: { name: string; email: string; role: 'student' | 'recruiter' | 'admin' }[] = [
    { name: 'Ana García', email: 'student@vinki.dev', role: 'student' },
    { name: 'Luis Fernández', email: 'luis.fernandez@vinki.dev', role: 'student' },
    { name: 'Sofía Ramírez', email: 'sofia.ramirez@vinki.dev', role: 'student' },
    { name: 'Carlos Méndez', email: 'recruiter@vinki.dev', role: 'recruiter' },
    { name: 'María Torres', email: 'admin@vinki.dev', role: 'admin' },
  ];

  for (const u of userDefs) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        name: u.name,
        email: u.email,
        passwordHash,
        role: u.role,
      },
    });
  }

  // ──────────────────────────────────────────────
  // Questions (50+) with dummy embeddings
  // ──────────────────────────────────────────────
  const dummyEmbedding = `[${new Array(1536).fill('0.0').join(',')}]`;

  interface QuestionSeed {
    questionText: string;
    type: string;
    source: string;
    languageId: number;
    frameworkId: number | null;
    levelId: number;
    skillId: number;
  }

  const questionData: QuestionSeed[] = [
    // ─── JUNIOR ────────────────────────────────
    // JavaScript / Junior
    {
      questionText: '¿Qué es una API REST y cuáles son sus principios básicos?',
      type: 'conceptual',
      source: 'curated',
      languageId: languages['JavaScript'].id,
      frameworkId: null,
      levelId: levels['Junior'].id,
      skillId: skills['rest-api-design'].id,
    },
    {
      questionText: 'Explica la diferencia entre let, const y var en JavaScript.',
      type: 'conceptual',
      source: 'curated',
      languageId: languages['JavaScript'].id,
      frameworkId: null,
      levelId: levels['Junior'].id,
      skillId: skills['error-handling'].id,
    },
    {
      questionText: '¿Qué es un array y cuándo usarías uno?',
      type: 'conceptual',
      source: 'curated',
      languageId: languages['JavaScript'].id,
      frameworkId: null,
      levelId: levels['Junior'].id,
      skillId: skills['data-structures'].id,
    },
    {
      questionText: '¿Qué es una función callback en JavaScript?',
      type: 'conceptual',
      source: 'curated',
      languageId: languages['JavaScript'].id,
      frameworkId: null,
      levelId: levels['Junior'].id,
      skillId: skills['async-patterns'].id,
    },
    {
      questionText: '¿Qué es SQL y para qué sirve?',
      type: 'conceptual',
      source: 'curated',
      languageId: languages['SQL'].id,
      frameworkId: null,
      levelId: levels['Junior'].id,
      skillId: skills['database-optimization'].id,
    },
    // TypeScript / Junior
    {
      questionText: '¿Cuál es la diferencia entre una interfaz y un tipo en TypeScript?',
      type: 'conceptual',
      source: 'curated',
      languageId: languages['TypeScript'].id,
      frameworkId: null,
      levelId: levels['Junior'].id,
      skillId: skills['design-patterns'].id,
    },
    {
      questionText: '¿Para qué sirven los decoradores en Angular y cómo se usan?',
      type: 'conceptual',
      source: 'curated',
      languageId: languages['TypeScript'].id,
      frameworkId: frameworks['Angular'].id,
      levelId: levels['Junior'].id,
      skillId: skills['design-patterns'].id,
    },
    // Python / Junior
    {
      questionText: '¿Qué es una lista por comprensión en Python y cuándo la usarías?',
      type: 'conceptual',
      source: 'curated',
      languageId: languages['Python'].id,
      frameworkId: null,
      levelId: levels['Junior'].id,
      skillId: skills['data-structures'].id,
    },
    {
      questionText: '¿Cómo manejas excepciones en Python con try/except?',
      type: 'practical',
      source: 'curated',
      languageId: languages['Python'].id,
      frameworkId: null,
      levelId: levels['Junior'].id,
      skillId: skills['error-handling'].id,
    },
    {
      questionText: 'Explica cómo implementarías manejo de excepciones personalizado en Django.',
      type: 'practical',
      source: 'curated',
      languageId: languages['Python'].id,
      frameworkId: frameworks['Django'].id,
      levelId: levels['Junior'].id,
      skillId: skills['error-handling'].id,
    },
    // Java / Junior
    {
      questionText: '¿Qué es la herencia en Java y cómo se implementa?',
      type: 'conceptual',
      source: 'curated',
      languageId: languages['Java'].id,
      frameworkId: null,
      levelId: levels['Junior'].id,
      skillId: skills['design-patterns'].id,
    },
    {
      questionText: '¿Qué diferencia hay entre ArrayList y LinkedList en Java?',
      type: 'conceptual',
      source: 'curated',
      languageId: languages['Java'].id,
      frameworkId: null,
      levelId: levels['Junior'].id,
      skillId: skills['data-structures'].id,
    },
    // Go / Junior
    {
      questionText: '¿Qué es una goroutine en Go y cómo se diferencia de un thread?',
      type: 'conceptual',
      source: 'curated',
      languageId: languages['Go'].id,
      frameworkId: null,
      levelId: levels['Junior'].id,
      skillId: skills['async-patterns'].id,
    },
    // Rust / Junior
    {
      questionText: '¿Qué es el ownership en Rust y por qué es importante?',
      type: 'conceptual',
      source: 'curated',
      languageId: languages['Rust'].id,
      frameworkId: null,
      levelId: levels['Junior'].id,
      skillId: skills['error-handling'].id,
    },
    // Testing / Junior
    {
      questionText: '¿Qué es un test unitario y por qué es importante escribirlos?',
      type: 'conceptual',
      source: 'curated',
      languageId: languages['JavaScript'].id,
      frameworkId: null,
      levelId: levels['Junior'].id,
      skillId: skills['testing'].id,
    },
    // Security / Junior
    {
      questionText: '¿Qué es SQL injection y cómo se previene?',
      type: 'conceptual',
      source: 'curated',
      languageId: languages['SQL'].id,
      frameworkId: null,
      levelId: levels['Junior'].id,
      skillId: skills['security'].id,
    },
    // Deployment / Junior
    {
      questionText: '¿Qué es Docker y por qué es útil para el desarrollo de software?',
      type: 'conceptual',
      source: 'curated',
      languageId: languages['JavaScript'].id,
      frameworkId: null,
      levelId: levels['Junior'].id,
      skillId: skills['deployment'].id,
    },

    // ─── MID ───────────────────────────────────
    // JavaScript / Mid
    {
      questionText: 'Diseña una API REST para un sistema de gestión de tareas. ¿Qué endpoints crearías?',
      type: 'design',
      source: 'curated',
      languageId: languages['JavaScript'].id,
      frameworkId: frameworks['Node.js'].id,
      levelId: levels['Mid'].id,
      skillId: skills['rest-api-design'].id,
    },
    {
      questionText: '¿Cómo manejas errores en una aplicación Express con middleware?',
      type: 'practical',
      source: 'curated',
      languageId: languages['JavaScript'].id,
      frameworkId: frameworks['Express'].id,
      levelId: levels['Mid'].id,
      skillId: skills['error-handling'].id,
    },
    {
      questionText: 'Explica el event loop de Node.js y cómo afecta al rendimiento.',
      type: 'conceptual',
      source: 'curated',
      languageId: languages['JavaScript'].id,
      frameworkId: frameworks['Node.js'].id,
      levelId: levels['Mid'].id,
      skillId: skills['async-patterns'].id,
    },
    {
      questionText: '¿Qué son los índices en bases de datos y cuándo los usarías?',
      type: 'conceptual',
      source: 'curated',
      languageId: languages['SQL'].id,
      frameworkId: frameworks['PostgreSQL'].id,
      levelId: levels['Mid'].id,
      skillId: skills['database-optimization'].id,
    },
    {
      questionText: 'Describe el patrón Observer y da un ejemplo práctico.',
      type: 'conceptual',
      source: 'curated',
      languageId: languages['JavaScript'].id,
      frameworkId: null,
      levelId: levels['Mid'].id,
      skillId: skills['design-patterns'].id,
    },
    {
      questionText: '¿Cómo implementarías autenticación JWT en una API con Express?',
      type: 'practical',
      source: 'curated',
      languageId: languages['JavaScript'].id,
      frameworkId: frameworks['Express'].id,
      levelId: levels['Mid'].id,
      skillId: skills['security'].id,
    },
    {
      questionText: '¿Cómo funciona el rendering del lado del servidor en Next.js y cuándo lo usarías?',
      type: 'conceptual',
      source: 'curated',
      languageId: languages['JavaScript'].id,
      frameworkId: frameworks['Next.js'].id,
      levelId: levels['Mid'].id,
      skillId: skills['performance'].id,
    },
    {
      questionText: '¿Qué estrategias usarías para manejar el estado global en React?',
      type: 'design',
      source: 'curated',
      languageId: languages['JavaScript'].id,
      frameworkId: frameworks['React'].id,
      levelId: levels['Mid'].id,
      skillId: skills['design-patterns'].id,
    },
    // TypeScript / Mid
    {
      questionText: '¿Cómo implementarías inyección de dependencias en NestJS?',
      type: 'practical',
      source: 'curated',
      languageId: languages['TypeScript'].id,
      frameworkId: frameworks['NestJS'].id,
      levelId: levels['Mid'].id,
      skillId: skills['design-patterns'].id,
    },
    {
      questionText: '¿Cómo escribirías tests de integración para un módulo NestJS?',
      type: 'practical',
      source: 'curated',
      languageId: languages['TypeScript'].id,
      frameworkId: frameworks['NestJS'].id,
      levelId: levels['Mid'].id,
      skillId: skills['testing'].id,
    },
    // Python / Mid
    {
      questionText: '¿Cómo funciona el GIL en Python y cómo afecta a la concurrencia?',
      type: 'conceptual',
      source: 'curated',
      languageId: languages['Python'].id,
      frameworkId: null,
      levelId: levels['Mid'].id,
      skillId: skills['async-patterns'].id,
    },
    {
      questionText: '¿Cómo diseñarías un sistema de herencia de modelos en Django?',
      type: 'design',
      source: 'curated',
      languageId: languages['Python'].id,
      frameworkId: frameworks['Django'].id,
      levelId: levels['Mid'].id,
      skillId: skills['design-patterns'].id,
    },
    {
      questionText: '¿Cómo implementarías validación de datos con Pydantic en FastAPI?',
      type: 'practical',
      source: 'curated',
      languageId: languages['Python'].id,
      frameworkId: frameworks['FastAPI'].id,
      levelId: levels['Mid'].id,
      skillId: skills['error-handling'].id,
    },
    {
      questionText: '¿Cómo configurarías un pipeline CI/CD para una aplicación Flask?',
      type: 'practical',
      source: 'curated',
      languageId: languages['Python'].id,
      frameworkId: frameworks['Flask'].id,
      levelId: levels['Mid'].id,
      skillId: skills['deployment'].id,
    },
    // Java / Mid
    {
      questionText: '¿Cómo funciona la inyección de dependencias en Spring Boot?',
      type: 'conceptual',
      source: 'curated',
      languageId: languages['Java'].id,
      frameworkId: frameworks['Spring Boot'].id,
      levelId: levels['Mid'].id,
      skillId: skills['design-patterns'].id,
    },
    {
      questionText: '¿Qué son los streams en Java y cómo mejoran el manejo de colecciones?',
      type: 'conceptual',
      source: 'curated',
      languageId: languages['Java'].id,
      frameworkId: null,
      levelId: levels['Mid'].id,
      skillId: skills['performance'].id,
    },
    // Go / Mid
    {
      questionText: '¿Cómo implementarías middleware de logging y autenticación en Gin?',
      type: 'practical',
      source: 'curated',
      languageId: languages['Go'].id,
      frameworkId: frameworks['Gin'].id,
      levelId: levels['Mid'].id,
      skillId: skills['rest-api-design'].id,
    },
    {
      questionText: '¿Cómo manejas la concurrencia con channels en Go?',
      type: 'conceptual',
      source: 'curated',
      languageId: languages['Go'].id,
      frameworkId: null,
      levelId: levels['Mid'].id,
      skillId: skills['async-patterns'].id,
    },
    // Rust / Mid
    {
      questionText: '¿Cómo funciona el sistema de lifetimes en Rust y cuándo es necesario anotarlos?',
      type: 'conceptual',
      source: 'curated',
      languageId: languages['Rust'].id,
      frameworkId: null,
      levelId: levels['Mid'].id,
      skillId: skills['error-handling'].id,
    },
    // SQL / Mid
    {
      questionText: '¿Cuál es la diferencia entre INNER JOIN, LEFT JOIN y FULL OUTER JOIN?',
      type: 'conceptual',
      source: 'curated',
      languageId: languages['SQL'].id,
      frameworkId: null,
      levelId: levels['Mid'].id,
      skillId: skills['database-optimization'].id,
    },
    // Algorithms / Mid
    {
      questionText: '¿Qué estructura de datos usarías para implementar un cache LRU?',
      type: 'conceptual',
      source: 'curated',
      languageId: languages['JavaScript'].id,
      frameworkId: null,
      levelId: levels['Mid'].id,
      skillId: skills['data-structures'].id,
    },

    // ─── SENIOR ────────────────────────────────
    // System design / Senior
    {
      questionText: '¿Cómo diseñarías un sistema de notificaciones en tiempo real escalable?',
      type: 'design',
      source: 'curated',
      languageId: languages['JavaScript'].id,
      frameworkId: null,
      levelId: levels['Senior'].id,
      skillId: skills['system-design'].id,
    },
    {
      questionText: 'Explica las estrategias de sharding en bases de datos distribuidas.',
      type: 'conceptual',
      source: 'curated',
      languageId: languages['SQL'].id,
      frameworkId: frameworks['PostgreSQL'].id,
      levelId: levels['Senior'].id,
      skillId: skills['database-optimization'].id,
    },
    {
      questionText: '¿Cómo implementarías un rate limiter distribuido?',
      type: 'design',
      source: 'curated',
      languageId: languages['JavaScript'].id,
      frameworkId: null,
      levelId: levels['Senior'].id,
      skillId: skills['system-design'].id,
    },
    {
      questionText: 'Describe tu enfoque para migrar un monolito a microservicios.',
      type: 'design',
      source: 'curated',
      languageId: languages['JavaScript'].id,
      frameworkId: null,
      levelId: levels['Senior'].id,
      skillId: skills['system-design'].id,
    },
    {
      questionText: '¿Cómo optimizarías una query SQL que tarda 30 segundos?',
      type: 'practical',
      source: 'curated',
      languageId: languages['SQL'].id,
      frameworkId: frameworks['PostgreSQL'].id,
      levelId: levels['Senior'].id,
      skillId: skills['database-optimization'].id,
    },
    // JavaScript / Senior
    {
      questionText: 'Describe los principios SOLID y cómo los aplicarías en un proyecto Node.js.',
      type: 'conceptual',
      source: 'curated',
      languageId: languages['JavaScript'].id,
      frameworkId: frameworks['Node.js'].id,
      levelId: levels['Senior'].id,
      skillId: skills['design-patterns'].id,
    },
    {
      questionText: '¿Cómo diseñarías una arquitectura de micro-frontends con React y Module Federation?',
      type: 'design',
      source: 'curated',
      languageId: languages['JavaScript'].id,
      frameworkId: frameworks['React'].id,
      levelId: levels['Senior'].id,
      skillId: skills['system-design'].id,
    },
    {
      questionText: '¿Cómo implementarías una estrategia de caching multi-nivel en una aplicación Next.js?',
      type: 'design',
      source: 'curated',
      languageId: languages['JavaScript'].id,
      frameworkId: frameworks['Next.js'].id,
      levelId: levels['Senior'].id,
      skillId: skills['performance'].id,
    },
    // TypeScript / Senior
    {
      questionText: '¿Cómo diseñarías una arquitectura CQRS con event sourcing en NestJS?',
      type: 'design',
      source: 'curated',
      languageId: languages['TypeScript'].id,
      frameworkId: frameworks['NestJS'].id,
      levelId: levels['Senior'].id,
      skillId: skills['system-design'].id,
    },
    // Python / Senior
    {
      questionText: '¿Cómo escalarías una API REST construida con Django REST Framework?',
      type: 'design',
      source: 'curated',
      languageId: languages['Python'].id,
      frameworkId: frameworks['Django'].id,
      levelId: levels['Senior'].id,
      skillId: skills['rest-api-design'].id,
    },
    {
      questionText: 'Implementa una función que determine si un grafo tiene ciclos. ¿Qué complejidad tiene?',
      type: 'practical',
      source: 'curated',
      languageId: languages['Python'].id,
      frameworkId: null,
      levelId: levels['Senior'].id,
      skillId: skills['algorithms'].id,
    },
    {
      questionText: '¿Cómo implementarías un sistema de tareas asíncronas con Celery y FastAPI?',
      type: 'practical',
      source: 'curated',
      languageId: languages['Python'].id,
      frameworkId: frameworks['FastAPI'].id,
      levelId: levels['Senior'].id,
      skillId: skills['async-patterns'].id,
    },
    // Java / Senior
    {
      questionText: '¿Cómo implementarías un circuit breaker pattern en Spring Boot?',
      type: 'design',
      source: 'curated',
      languageId: languages['Java'].id,
      frameworkId: frameworks['Spring Boot'].id,
      levelId: levels['Senior'].id,
      skillId: skills['design-patterns'].id,
    },
    {
      questionText: '¿Cómo optimizarías el garbage collector de la JVM para una aplicación de alto rendimiento?',
      type: 'practical',
      source: 'curated',
      languageId: languages['Java'].id,
      frameworkId: null,
      levelId: levels['Senior'].id,
      skillId: skills['performance'].id,
    },
    // Go / Senior
    {
      questionText: '¿Cómo diseñarías un servicio de procesamiento de eventos con Go que maneje millones de mensajes por segundo?',
      type: 'design',
      source: 'curated',
      languageId: languages['Go'].id,
      frameworkId: null,
      levelId: levels['Senior'].id,
      skillId: skills['system-design'].id,
    },
    {
      questionText: '¿Cómo implementarías graceful shutdown en un servicio Go con múltiples workers?',
      type: 'practical',
      source: 'curated',
      languageId: languages['Go'].id,
      frameworkId: frameworks['Gin'].id,
      levelId: levels['Senior'].id,
      skillId: skills['deployment'].id,
    },
    // Rust / Senior
    {
      questionText: '¿Cuándo usarías Arc<Mutex<T>> vs channels para compartir estado entre threads en Rust?',
      type: 'conceptual',
      source: 'curated',
      languageId: languages['Rust'].id,
      frameworkId: null,
      levelId: levels['Senior'].id,
      skillId: skills['async-patterns'].id,
    },
    // Security / Senior
    {
      questionText: '¿Cómo diseñarías un sistema de autenticación y autorización basado en OAuth 2.0 y OpenID Connect?',
      type: 'design',
      source: 'curated',
      languageId: languages['JavaScript'].id,
      frameworkId: null,
      levelId: levels['Senior'].id,
      skillId: skills['security'].id,
    },
    // Testing / Senior
    {
      questionText: '¿Cómo diseñarías una estrategia de testing completa para una aplicación de microservicios (unit, integration, e2e, contract)?',
      type: 'design',
      source: 'curated',
      languageId: languages['TypeScript'].id,
      frameworkId: null,
      levelId: levels['Senior'].id,
      skillId: skills['testing'].id,
    },
    // Deployment / Senior
    {
      questionText: '¿Cómo implementarías una estrategia de despliegue blue-green con rollback automático?',
      type: 'design',
      source: 'curated',
      languageId: languages['JavaScript'].id,
      frameworkId: null,
      levelId: levels['Senior'].id,
      skillId: skills['deployment'].id,
    },
    // Algorithms / Senior
    {
      questionText: '¿Cómo implementarías un algoritmo de búsqueda distribuida sobre un dataset que no cabe en memoria?',
      type: 'design',
      source: 'curated',
      languageId: languages['Python'].id,
      frameworkId: null,
      levelId: levels['Senior'].id,
      skillId: skills['algorithms'].id,
    },
    // SQL / Senior
    {
      questionText: '¿Cómo diseñarías un esquema de base de datos para un sistema multi-tenant con aislamiento de datos?',
      type: 'design',
      source: 'curated',
      languageId: languages['SQL'].id,
      frameworkId: frameworks['PostgreSQL'].id,
      levelId: levels['Senior'].id,
      skillId: skills['database-optimization'].id,
    },
    // Performance / Senior
    {
      questionText: '¿Cómo identificarías y resolverías memory leaks en una aplicación Node.js en producción?',
      type: 'practical',
      source: 'curated',
      languageId: languages['JavaScript'].id,
      frameworkId: frameworks['Node.js'].id,
      levelId: levels['Senior'].id,
      skillId: skills['performance'].id,
    },
  ];

  // ─── BEHAVIORAL QUESTIONS ────────────────────
  // Junior behavioral (5)
  const behavioralQuestions: QuestionSeed[] = [
    {
      questionText: 'Cuéntame sobre una vez que tuviste que resolver un conflicto en tu equipo de desarrollo.',
      type: 'behavioral',
      source: 'curated',
      languageId: languages['JavaScript'].id,
      frameworkId: null,
      levelId: levels['Junior'].id,
      skillId: skills['error-handling'].id,
    },
    {
      questionText: 'Describe una situación donde tuviste que aprender una tecnología nueva rápidamente.',
      type: 'behavioral',
      source: 'curated',
      languageId: languages['JavaScript'].id,
      frameworkId: null,
      levelId: levels['Junior'].id,
      skillId: skills['design-patterns'].id,
    },
    {
      questionText: '¿Cómo manejaste una situación donde no entendías un requerimiento del proyecto?',
      type: 'behavioral',
      source: 'curated',
      languageId: languages['JavaScript'].id,
      frameworkId: null,
      levelId: levels['Junior'].id,
      skillId: skills['error-handling'].id,
    },
    {
      questionText: 'Cuéntame sobre un error que cometiste en código y cómo lo solucionaste.',
      type: 'behavioral',
      source: 'curated',
      languageId: languages['JavaScript'].id,
      frameworkId: null,
      levelId: levels['Junior'].id,
      skillId: skills['testing'].id,
    },
    {
      questionText: 'Describe una vez que recibiste feedback negativo sobre tu código. ¿Cómo reaccionaste?',
      type: 'behavioral',
      source: 'curated',
      languageId: languages['JavaScript'].id,
      frameworkId: null,
      levelId: levels['Junior'].id,
      skillId: skills['design-patterns'].id,
    },
    // Mid behavioral (5)
    {
      questionText: '¿Cómo manejaste una situación donde no estuviste de acuerdo con una decisión técnica de tu equipo?',
      type: 'behavioral',
      source: 'curated',
      languageId: languages['JavaScript'].id,
      frameworkId: null,
      levelId: levels['Mid'].id,
      skillId: skills['design-patterns'].id,
    },
    {
      questionText: 'Cuéntame sobre un proyecto donde las cosas no salieron según lo planeado. ¿Qué hiciste?',
      type: 'behavioral',
      source: 'curated',
      languageId: languages['JavaScript'].id,
      frameworkId: null,
      levelId: levels['Mid'].id,
      skillId: skills['error-handling'].id,
    },
    {
      questionText: 'Describe cómo priorizas cuando tienes múltiples tareas urgentes.',
      type: 'behavioral',
      source: 'curated',
      languageId: languages['JavaScript'].id,
      frameworkId: null,
      levelId: levels['Mid'].id,
      skillId: skills['design-patterns'].id,
    },
    {
      questionText: 'Cuéntame sobre una vez que tuviste que convencer a tu equipo de adoptar una nueva herramienta o práctica.',
      type: 'behavioral',
      source: 'curated',
      languageId: languages['JavaScript'].id,
      frameworkId: null,
      levelId: levels['Mid'].id,
      skillId: skills['testing'].id,
    },
    {
      questionText: 'Describe una situación donde tuviste que colaborar con un compañero difícil. ¿Cómo lo manejaste?',
      type: 'behavioral',
      source: 'curated',
      languageId: languages['JavaScript'].id,
      frameworkId: null,
      levelId: levels['Mid'].id,
      skillId: skills['error-handling'].id,
    },
    // Senior behavioral (5)
    {
      questionText: 'Cuéntame sobre una decisión arquitectónica importante que tomaste y que tuvo un impacto significativo en el proyecto.',
      type: 'behavioral',
      source: 'curated',
      languageId: languages['JavaScript'].id,
      frameworkId: null,
      levelId: levels['Senior'].id,
      skillId: skills['system-design'].id,
    },
    {
      questionText: 'Describe una situación donde tuviste que liderar un equipo a través de una crisis técnica en producción.',
      type: 'behavioral',
      source: 'curated',
      languageId: languages['JavaScript'].id,
      frameworkId: null,
      levelId: levels['Senior'].id,
      skillId: skills['error-handling'].id,
    },
    {
      questionText: '¿Cómo has mentoreado a desarrolladores junior? Dame un ejemplo concreto de cómo ayudaste a alguien a crecer.',
      type: 'behavioral',
      source: 'curated',
      languageId: languages['JavaScript'].id,
      frameworkId: null,
      levelId: levels['Senior'].id,
      skillId: skills['design-patterns'].id,
    },
    {
      questionText: 'Cuéntame sobre una vez que tuviste que hacer un trade-off técnico difícil entre velocidad de entrega y calidad del código.',
      type: 'behavioral',
      source: 'curated',
      languageId: languages['JavaScript'].id,
      frameworkId: null,
      levelId: levels['Senior'].id,
      skillId: skills['testing'].id,
    },
    {
      questionText: 'Describe cómo manejaste una situación donde debiste migrar un sistema legacy crítico sin interrumpir el servicio.',
      type: 'behavioral',
      source: 'curated',
      languageId: languages['JavaScript'].id,
      frameworkId: null,
      levelId: levels['Senior'].id,
      skillId: skills['system-design'].id,
    },
  ];

  questionData.push(...behavioralQuestions);

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

  console.log(`Seed completed successfully: ${questionData.length} questions seeded`);

  // ──────────────────────────────────────────────
  // Knowledge Documents (RAG content for backend interviews)
  // ──────────────────────────────────────────────
  const knowledgeDocs = [
    {
      title: 'Node.js Event Loop y Arquitectura Asíncrona',
      languageId: languages['JavaScript'].id,
      frameworkId: frameworks['Node.js'].id,
      content: `El Event Loop de Node.js

Node.js utiliza un modelo de I/O no bloqueante basado en eventos. El event loop es el mecanismo central que permite a Node.js realizar operaciones de I/O no bloqueantes a pesar de que JavaScript es single-threaded.

Fases del Event Loop:
1. Timers: Ejecuta callbacks programados por setTimeout() y setInterval().
2. Pending callbacks: Ejecuta callbacks de I/O diferidos al siguiente ciclo.
3. Idle/Prepare: Usado internamente por Node.js.
4. Poll: Recupera nuevos eventos de I/O. Node.js se bloqueará aquí cuando sea apropiado.
5. Check: Los callbacks de setImmediate() se invocan aquí.
6. Close callbacks: Callbacks de cierre como socket.on('close').

Patrones de concurrencia en Node.js:
- Worker Threads: Para operaciones CPU-intensivas, Node.js ofrece worker_threads que permiten ejecutar JavaScript en paralelo.
- Cluster Module: Permite crear procesos hijos que comparten el mismo puerto del servidor.
- Child Process: Para ejecutar comandos del sistema o scripts externos.

Manejo de backpressure en streams:
Cuando un stream writable no puede consumir datos tan rápido como se producen, se genera backpressure. Se debe implementar el método pipe() correctamente y respetar el valor de retorno de write(). Si write() retorna false, se debe esperar al evento 'drain' antes de continuar escribiendo.

Patrones de error handling asíncrono:
- try/catch con async/await para promesas
- .catch() en cadenas de promesas
- process.on('unhandledRejection') como safety net global
- EventEmitter error events para streams y sockets
- Domain module (deprecado) vs async_hooks para tracking de contexto`,
    },
    {
      title: 'Diseño de APIs RESTful - Mejores Prácticas',
      languageId: languages['JavaScript'].id,
      frameworkId: frameworks['Express'].id,
      content: `Diseño de APIs RESTful - Guía Completa

Principios fundamentales de REST:
REST (Representational State Transfer) define restricciones arquitectónicas para sistemas distribuidos. Los principios clave son: cliente-servidor, sin estado (stateless), cacheable, sistema de capas, interfaz uniforme y código bajo demanda (opcional).

Diseño de URLs y recursos:
- Usar sustantivos en plural: /api/users, /api/orders
- Jerarquía para relaciones: /api/users/:id/orders
- Evitar verbos en URLs: usar métodos HTTP (GET, POST, PUT, PATCH, DELETE)
- Filtrado con query params: /api/users?role=admin&active=true
- Paginación: /api/users?page=2&limit=20

Versionado de APIs:
- URL path: /api/v1/users (más común y visible)
- Header: Accept: application/vnd.api.v1+json
- Query param: /api/users?version=1

Códigos de respuesta HTTP:
- 200 OK: Éxito general
- 201 Created: Recurso creado exitosamente
- 204 No Content: Éxito sin cuerpo de respuesta (DELETE)
- 400 Bad Request: Error de validación del cliente
- 401 Unauthorized: No autenticado
- 403 Forbidden: Autenticado pero sin permisos
- 404 Not Found: Recurso no existe
- 409 Conflict: Conflicto con estado actual (duplicados)
- 429 Too Many Requests: Rate limiting
- 500 Internal Server Error: Error del servidor

Patrones de autenticación:
- JWT (JSON Web Tokens): Stateless, escalable. Access token corto + refresh token largo.
- OAuth 2.0: Para autorización delegada con terceros.
- API Keys: Para comunicación servidor-a-servidor.
- Session cookies: HttpOnly + Secure + SameSite para SPAs.

Rate Limiting:
Implementar con token bucket o sliding window. Headers estándar: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset. Usar Redis para estado distribuido.

HATEOAS (Hypertext As The Engine Of Application State):
Incluir links de navegación en las respuestas: { "data": {...}, "links": { "self": "/api/users/1", "orders": "/api/users/1/orders" } }`,
    },
    {
      title: 'PostgreSQL - Optimización y Patrones Avanzados',
      languageId: languages['SQL'].id,
      frameworkId: frameworks['PostgreSQL'].id,
      content: `PostgreSQL - Optimización de Consultas y Patrones Avanzados

Índices y su impacto en el rendimiento:
PostgreSQL soporta varios tipos de índices: B-tree (default, para comparaciones de igualdad y rango), Hash (solo igualdad), GiST (datos geométricos, full-text search), GIN (arrays, JSONB, full-text search), BRIN (datos ordenados naturalmente como timestamps).

Estrategias de indexación:
- Índices parciales: CREATE INDEX idx ON orders (status) WHERE status = 'pending' — reduce tamaño del índice.
- Índices compuestos: El orden de las columnas importa. La columna más selectiva primero.
- Índices de cobertura (INCLUDE): Evitan acceso a la tabla (index-only scans).
- Expresiones: CREATE INDEX idx ON users (LOWER(email)) para búsquedas case-insensitive.

EXPLAIN ANALYZE:
Herramienta fundamental para entender el plan de ejecución. Seq Scan indica escaneo completo de tabla (potencial problema en tablas grandes). Index Scan usa un índice. Nested Loop vs Hash Join vs Merge Join tienen diferentes perfiles de rendimiento.

Transacciones y niveles de aislamiento:
- READ COMMITTED (default): Ve datos confirmados al inicio de cada sentencia.
- REPEATABLE READ: Ve una snapshot consistente de la BD al inicio de la transacción.
- SERIALIZABLE: Máximo aislamiento, detecta anomalías de serialización.

Connection Pooling:
PgBouncer es el estándar para pooling de conexiones. Modos: session (una conexión por sesión), transaction (reasigna después de cada transacción — más eficiente), statement (cada query puede usar diferente conexión).

Particionamiento de tablas:
- Range partitioning: Por rangos de fechas o IDs.
- List partitioning: Por valores discretos (país, categoría).
- Hash partitioning: Distribución uniforme.
Mejora el rendimiento de queries que filtran por la clave de partición y facilita el mantenimiento (DROP PARTITION vs DELETE masivo).

Vacuuming y mantenimiento:
VACUUM recupera espacio de filas eliminadas. ANALYZE actualiza estadísticas para el query planner. autovacuum debería estar configurado correctamente — monitorear dead tuples con pg_stat_user_tables.`,
    },
    {
      title: 'Arquitectura de Microservicios con NestJS',
      languageId: languages['TypeScript'].id,
      frameworkId: frameworks['NestJS'].id,
      content: `Arquitectura de Microservicios con NestJS

NestJS proporciona soporte nativo para microservicios a través de diferentes transporters: TCP, Redis, NATS, MQTT, gRPC, RabbitMQ y Kafka.

Patrones de comunicación:
1. Request-Response: El cliente envía un mensaje y espera una respuesta. Ideal para queries y comandos que necesitan confirmación.
2. Event-based: El emisor publica un evento sin esperar respuesta. Ideal para notificaciones y procesos asíncronos.

Implementación con NestJS:
- @MessagePattern('pattern') para request-response
- @EventPattern('event') para eventos
- ClientProxy para enviar mensajes desde el cliente

CQRS (Command Query Responsibility Segregation):
Separar las operaciones de lectura (queries) de las de escritura (commands). NestJS ofrece @nestjs/cqrs con CommandBus y QueryBus. Los Commands modifican estado, los Queries solo leen. Permite optimizar cada lado independientemente.

Event Sourcing:
En lugar de almacenar el estado actual, se almacenan todos los eventos que llevaron a ese estado. Ventajas: auditoría completa, capacidad de reconstruir estado, event replay. Desventajas: complejidad, eventual consistency.

Saga Pattern:
Para transacciones distribuidas entre microservicios. Cada paso tiene una acción compensatoria en caso de fallo. NestJS soporta sagas a través del módulo CQRS.

Circuit Breaker Pattern:
Previene llamadas a servicios que están fallando. Estados: Closed (normal), Open (rechaza llamadas), Half-Open (prueba si el servicio se recuperó). Implementable con librerías como opossum o cockatiel.

Health Checks y Service Discovery:
@nestjs/terminus para health checks. Implementar liveness (¿el proceso está vivo?) y readiness (¿puede recibir tráfico?) probes. Service discovery con Consul, etcd, o el DNS de Kubernetes.

API Gateway Pattern:
Un punto de entrada único para todos los microservicios. Maneja routing, autenticación, rate limiting, y agregación de respuestas. NestJS puede actuar como API gateway usando HTTP proxy o GraphQL federation.`,
    },
    {
      title: 'Seguridad en Aplicaciones Backend',
      languageId: languages['JavaScript'].id,
      frameworkId: null,
      content: `Seguridad en Aplicaciones Backend - Guía Práctica

OWASP Top 10 y cómo prevenirlos:

1. Injection (SQL, NoSQL, OS Command):
Prevención: Usar queries parametrizadas (prepared statements), ORMs con escape automático, validación de input con whitelist. Nunca concatenar input del usuario directamente en queries.

2. Broken Authentication:
Prevención: Implementar rate limiting en login, usar bcrypt/argon2 para hashing de passwords con salt, implementar MFA, tokens JWT con expiración corta + refresh tokens rotativos.

3. Cross-Site Scripting (XSS):
Prevención: Escapar output HTML, usar Content-Security-Policy headers, HttpOnly cookies para tokens, sanitización de input con librerías como DOMPurify.

4. Insecure Direct Object References (IDOR):
Prevención: Verificar autorización en cada endpoint, no exponer IDs internos, usar UUIDs, implementar row-level security.

JWT Security Best Practices:
- Usar algoritmos asimétricos (RS256) en lugar de simétricos (HS256) para entornos distribuidos
- Access token: vida corta (15 min), en memoria del cliente
- Refresh token: vida larga (7 días), en HttpOnly cookie
- Implementar token blacklisting para logout
- Incluir jti (JWT ID) para tracking individual de tokens
- Validar issuer (iss) y audience (aud) claims

CORS (Cross-Origin Resource Sharing):
Configurar origins permitidos explícitamente, nunca usar wildcard (*) con credentials. Configurar métodos y headers permitidos. Implementar preflight caching con Access-Control-Max-Age.

Helmet.js para Express/NestJS:
Configura headers de seguridad: X-Content-Type-Options, Strict-Transport-Security, X-Frame-Options, X-XSS-Protection, Content-Security-Policy.

Secrets Management:
Nunca hardcodear secretos en código. Usar variables de entorno, vault (HashiCorp Vault), o servicios de cloud (AWS Secrets Manager, GCP Secret Manager). Rotar secretos periódicamente.`,
    },
  ];

  const adminUser = await prisma.user.findFirst({ where: { role: 'admin' } });
  const adminId = adminUser!.id;

  for (const doc of knowledgeDocs) {
    const existing = await prisma.knowledgeDocument.findFirst({
      where: { title: doc.title },
    });
    if (existing) continue;

    await prisma.knowledgeDocument.create({
      data: {
        title: doc.title,
        rawContent: doc.content,
        languageId: doc.languageId,
        frameworkId: doc.frameworkId,
        uploadedById: adminId,
        status: 'ready',
      },
    });

    // Create chunks with dummy embeddings for the knowledge documents
    const paragraphs = doc.content.split(/\n\n+/).filter((p: string) => p.trim().length > 0);
    let chunkIndex = 0;
    let currentChunk = '';

    for (const paragraph of paragraphs) {
      if (currentChunk.length + paragraph.length > 1500 && currentChunk.trim()) {
        const docRecord = await prisma.knowledgeDocument.findFirst({
          where: { title: doc.title },
        });
        if (docRecord) {
          await prisma.$executeRawUnsafe(
            `INSERT INTO knowledge_chunks (document_id, chunk_index, content, token_count, embedding, created_at)
             VALUES ($1, $2, $3, $4, $5::vector, NOW())`,
            docRecord.id,
            chunkIndex++,
            currentChunk.trim(),
            Math.ceil(currentChunk.split(/\s+/).length * 1.3),
            dummyEmbedding,
          );
        }
        currentChunk = '';
      }
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    }

    // Insert remaining chunk
    if (currentChunk.trim()) {
      const docRecord = await prisma.knowledgeDocument.findFirst({
        where: { title: doc.title },
      });
      if (docRecord) {
        await prisma.$executeRawUnsafe(
          `INSERT INTO knowledge_chunks (document_id, chunk_index, content, token_count, embedding, created_at)
           VALUES ($1, $2, $3, $4, $5::vector, NOW())`,
          docRecord.id,
          chunkIndex,
          currentChunk.trim(),
          Math.ceil(currentChunk.split(/\s+/).length * 1.3),
          dummyEmbedding,
        );
      }
    }
  }

  console.log(`Knowledge base seeded: ${knowledgeDocs.length} documents`);

  // ──────────────────────────────────────────────
  // Achievements
  // ──────────────────────────────────────────────
  const achievementDefs = [
    {
      key: 'first_interview',
      title: 'Primera entrevista',
      titleEn: 'First Interview',
      description: 'Completaste tu primera entrevista',
      descriptionEn: 'You completed your first interview',
      icon: 'rocket',
      category: 'interview',
      threshold: 1,
    },
    {
      key: 'five_interviews',
      title: 'Cinco entrevistas',
      titleEn: 'Five Interviews',
      description: 'Completaste 5 entrevistas',
      descriptionEn: 'You completed 5 interviews',
      icon: 'fire',
      category: 'interview',
      threshold: 5,
    },
    {
      key: 'ten_interviews',
      title: 'Diez entrevistas',
      titleEn: 'Ten Interviews',
      description: 'Completaste 10 entrevistas',
      descriptionEn: 'You completed 10 interviews',
      icon: 'crown',
      category: 'interview',
      threshold: 10,
    },
    {
      key: 'perfect_score',
      title: 'Puntaje perfecto',
      titleEn: 'Perfect Score',
      description: 'Obtuviste 5.0 en alguna métrica',
      descriptionEn: 'You scored 5.0 on any metric',
      icon: 'star',
      category: 'skill',
      threshold: 1,
    },
    {
      key: 'skill_master',
      title: 'Maestro de habilidades',
      titleEn: 'Skill Master',
      description: 'Alcanzaste un puntaje de habilidad superior a 80',
      descriptionEn: 'You reached a skill score above 80',
      icon: 'trophy',
      category: 'skill',
      threshold: 1,
    },
    {
      key: 'all_rounder',
      title: 'Todoterreno',
      titleEn: 'All-Rounder',
      description: 'Tienes puntajes en todas las habilidades',
      descriptionEn: 'You have scores in all skills',
      icon: 'thunderbolt',
      category: 'skill',
      threshold: 1,
    },
    {
      key: 'level_up',
      title: 'Nivel superado',
      titleEn: 'Level Up',
      description: 'La IA detectó un nivel superior al que elegiste',
      descriptionEn: 'AI detected a level higher than you chose',
      icon: 'rise',
      category: 'streak',
      threshold: 1,
    },
    {
      key: 'practice_champion',
      title: 'Campeón de práctica',
      titleEn: 'Practice Champion',
      description: 'Completaste 5 entrevistas en modo práctica',
      descriptionEn: 'You completed 5 practice mode interviews',
      icon: 'fire',
      category: 'streak',
      threshold: 5,
    },
    {
      key: 'speed_demon',
      title: 'Rayo veloz',
      titleEn: 'Speed Demon',
      description: 'Respondiste todas las preguntas de una entrevista',
      descriptionEn: 'You answered all questions in an interview',
      icon: 'thunderbolt',
      category: 'streak',
      threshold: 1,
    },
    {
      key: 'knowledge_contributor',
      title: 'Colaborador de conocimiento',
      titleEn: 'Knowledge Contributor',
      description: 'Subiste un documento a la base de conocimiento',
      descriptionEn: 'You uploaded a knowledge document',
      icon: 'book',
      category: 'knowledge',
      threshold: 1,
    },
  ];

  for (const def of achievementDefs) {
    await prisma.achievement.upsert({
      where: { key: def.key },
      update: {
        title: def.title,
        titleEn: def.titleEn,
        description: def.description,
        descriptionEn: def.descriptionEn,
        icon: def.icon,
        category: def.category,
        threshold: def.threshold,
      },
      create: def,
    });
  }
  console.log(`Achievements seeded: ${achievementDefs.length} definitions`);

  // ──────────────────────────────────────────────
  // Interview Templates
  // ──────────────────────────────────────────────
  const recruiterUser = await prisma.user.findFirst({ where: { role: 'recruiter' } });
  const recruiterId = recruiterUser!.id;

  // Helper: find question IDs by skill, level, and optionally language
  async function findQuestionIds(
    skillName: string,
    levelName: string,
    languageName?: string,
    limit = 2,
  ): Promise<number[]> {
    const where: any = {
      skill: { name: skillName },
      level: { name: levelName },
    };
    if (languageName) {
      where.language = { name: languageName };
    }
    const qs = await prisma.question.findMany({
      where,
      select: { id: true },
      take: limit,
    });
    return qs.map((q) => q.id);
  }

  // Template 1: Google Phone Screen - Backend (Senior, JavaScript)
  const t1Questions = [
    ...(await findQuestionIds('system-design', 'Senior', 'JavaScript', 2)),
    ...(await findQuestionIds('algorithms', 'Senior', undefined, 1)),
    ...(await findQuestionIds('async-patterns', 'Senior', 'JavaScript', 1)),
    ...(await findQuestionIds('performance', 'Senior', 'JavaScript', 1)),
  ];

  // Template 2: Amazon SDE - Full Stack (Mid, TypeScript)
  const t2Questions = [
    ...(await findQuestionIds('rest-api-design', 'Mid', undefined, 2)),
    ...(await findQuestionIds('design-patterns', 'Mid', 'TypeScript', 1)),
    ...(await findQuestionIds('testing', 'Mid', 'TypeScript', 1)),
    ...(await findQuestionIds('design-patterns', 'Mid', 'JavaScript', 1)),
  ];

  // Template 3: Startup Fast Track (Junior, JavaScript)
  const t3Questions = [
    ...(await findQuestionIds('error-handling', 'Junior', 'JavaScript', 2)),
    ...(await findQuestionIds('data-structures', 'Junior', 'JavaScript', 1)),
    ...(await findQuestionIds('rest-api-design', 'Junior', 'JavaScript', 1)),
    ...(await findQuestionIds('async-patterns', 'Junior', 'JavaScript', 1)),
  ];

  // Template 4: Fintech Security Deep Dive (Senior, SQL)
  const t4Questions = [
    ...(await findQuestionIds('security', 'Senior', undefined, 2)),
    ...(await findQuestionIds('database-optimization', 'Senior', 'SQL', 2)),
    ...(await findQuestionIds('performance', 'Senior', undefined, 1)),
  ];

  const templateDefs = [
    {
      name: 'Google Phone Screen - Backend',
      description: 'Simulates a Google phone screen for backend engineers. Covers system design, algorithms, and async patterns.',
      companyType: 'Big Tech (FAANG)',
      roleId: roles['Backend Engineer'].id,
      levelId: levels['Senior'].id,
      languageId: languages['JavaScript'].id,
      frameworkId: null,
      isPublic: true,
      createdById: recruiterId,
      questionIds: t1Questions.slice(0, 5),
    },
    {
      name: 'Amazon SDE - Full Stack',
      description: 'Amazon-style interview for full stack developers. Focuses on REST API design, design patterns, and testing.',
      companyType: 'Big Tech (FAANG)',
      roleId: roles['Full Stack Engineer'].id,
      levelId: levels['Mid'].id,
      languageId: languages['TypeScript'].id,
      frameworkId: null,
      isPublic: true,
      createdById: recruiterId,
      questionIds: t2Questions.slice(0, 5),
    },
    {
      name: 'Startup Fast Track',
      description: 'Quick interview format for startups looking for junior developers with solid JavaScript fundamentals.',
      companyType: 'Startup',
      roleId: roles['Frontend Engineer'].id,
      levelId: levels['Junior'].id,
      languageId: languages['JavaScript'].id,
      frameworkId: null,
      isPublic: true,
      createdById: recruiterId,
      questionIds: t3Questions.slice(0, 5),
    },
    {
      name: 'Fintech Security Deep Dive',
      description: 'In-depth interview focused on security best practices and database optimization for fintech companies.',
      companyType: 'Fintech',
      roleId: roles['Backend Engineer'].id,
      levelId: levels['Senior'].id,
      languageId: languages['SQL'].id,
      frameworkId: null,
      isPublic: true,
      createdById: recruiterId,
      questionIds: t4Questions.slice(0, 5),
    },
  ];

  for (const tDef of templateDefs) {
    const { questionIds, ...templateData } = tDef;
    // Check if template already exists
    const existing = await prisma.interviewTemplate.findFirst({
      where: { name: tDef.name },
    });
    if (existing) continue;

    const template = await prisma.interviewTemplate.create({
      data: templateData,
    });

    for (let i = 0; i < questionIds.length; i++) {
      await prisma.templateQuestion.create({
        data: {
          templateId: template.id,
          questionId: questionIds[i],
          orderNumber: i + 1,
        },
      });
    }
  }

  console.log(`Templates seeded: ${templateDefs.length} interview templates`);

  // ──────────────────────────────────────────────
  // Seasonal Challenges
  // ──────────────────────────────────────────────
  const challengeDefs = [
    {
      title: 'Speedrunner de Marzo',
      titleEn: 'March Speedrunner',
      description: 'Completa 10 entrevistas antes de fin de mes',
      descriptionEn: 'Complete 10 interviews before month end',
      type: 'volume',
      target: 10,
      metric: 'interviews_completed',
      icon: 'thunderbolt',
      startDate: new Date('2026-03-01'),
      endDate: new Date('2026-03-31'),
    },
    {
      title: 'Maestro de Skills',
      titleEn: 'Skill Master',
      description: 'Alcanza un promedio de 4.0 o más en cualquier entrevista',
      descriptionEn: 'Reach an average of 4.0 or higher in any interview',
      type: 'skill',
      target: 4,
      metric: 'avg_score_above',
      icon: 'star',
      startDate: new Date('2026-03-01'),
      endDate: new Date('2026-04-30'),
    },
    {
      title: 'Responde Todo',
      titleEn: 'Answer Everything',
      description: 'Responde 30 preguntas de entrevista',
      descriptionEn: 'Answer 30 interview questions',
      type: 'volume',
      target: 30,
      metric: 'questions_answered',
      icon: 'fire',
      startDate: new Date('2026-03-01'),
      endDate: new Date('2026-04-15'),
    },
    {
      title: 'Racha Imparable',
      titleEn: 'Unstoppable Streak',
      description: 'Practica 5 días consecutivos',
      descriptionEn: 'Practice 5 consecutive days',
      type: 'streak',
      target: 5,
      metric: 'consecutive_days',
      icon: 'fire',
      startDate: new Date('2026-03-01'),
      endDate: new Date('2026-06-30'),
    },
  ];

  for (const def of challengeDefs) {
    // Use title + startDate as a pseudo-unique key to avoid duplicates
    const existing = await prisma.challenge.findFirst({
      where: { title: def.title, startDate: def.startDate },
    });
    if (!existing) {
      await prisma.challenge.create({ data: def });
    }
  }
  console.log(`Challenges seeded: ${challengeDefs.length} seasonal challenges`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
