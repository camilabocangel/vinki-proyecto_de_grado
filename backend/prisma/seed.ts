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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
