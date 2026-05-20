// Suite de integración B.3 — Flujo completo de entrevista (RF-09 a RF-18)
//
// Sube la app NestJS real y ejerce los endpoints del módulo de
// entrevistas con Supertest contra la DB de test.
//
// Cubre:
//   - RF-09 / RF-10: POST /api/interviews crea entrevista + preguntas
//   - RF-11:         GET  /api/interviews/:id devuelve preguntas
//   - RF-15:         POST /interviews/:id/questions/:qid/answer (texto)
//   - RF-17:         POST /interviews/:id/finish encola evaluación
//   - RF-18:         conflict si ya hay entrevista activa
//
// `LLM_SANDBOX=true` en `.env.test` fuerza MockEmbeddingService (devuelve
// un vector all-zeros). El RAG retorna [] porque no hay knowledge chunks
// sembrados, por lo que se usan las 5 preguntas curadas que insertamos
// con embedding vía raw SQL (createQuestionWithEmbedding).

import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { createTestApp, extractCookies } from '../app-helpers';
import {
  prisma,
  resetDatabase,
  seedCatalogs,
  createUser,
  createQuestionWithEmbedding,
  type SeededCatalogs,
  type TestUser,
} from '../db-helpers';

describe('API — Flujo de entrevista (RF-09 a RF-18)', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;
  let catalogs: SeededCatalogs;
  let student: TestUser;
  let cookieHeader: string;

  beforeAll(async () => {
    app = await createTestApp();
    server = app.getHttpServer();
  }, 60_000);

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await resetDatabase();
    catalogs = await seedCatalogs();
    student = await createUser({
      email: 'flow@vinki.dev',
      password: 'flow-pass-1',
      role: 'student',
    });

    // Sembrar 5 preguntas con embedding para que QuestionSelectorService
    // las elija (filtra por embedding IS NOT NULL).
    for (let i = 1; i <= 5; i++) {
      await createQuestionWithEmbedding(catalogs, {
        questionText: `¿Pregunta curada #${i}?`,
      });
    }

    const res = await request(server)
      .post('/api/auth/login')
      .send({ email: student.email, password: student.rawPassword })
      .expect(200);
    cookieHeader = extractCookies(res.headers['set-cookie']);
  });

  // -----------------------------------------------------------------
  // RF-09 / RF-10 — Crear entrevista
  // -----------------------------------------------------------------

  describe('RF-09 / RF-10 — POST /api/interviews', () => {
    it('should create an interview with selected questions and persist it', async () => {
      const res = await request(server)
        .post('/api/interviews')
        .set('Cookie', cookieHeader)
        .send({
          roleId: catalogs.roleId,
          languageId: catalogs.languageId,
          frameworkId: catalogs.frameworkId,
          chosenLevelId: catalogs.levelJuniorId,
        })
        .expect(201);

      expect(res.body.id).toBeGreaterThan(0);
      expect(res.body.userId).toBe(student.id);
      expect(Array.isArray(res.body.questions)).toBe(true);
      expect(res.body.questions.length).toBeGreaterThan(0);
      expect(res.body.questions[0]).toHaveProperty('orderNumber');
      expect(res.body.questions[0]).toHaveProperty('questionTextSnapshot');

      // Persistencia real en DB.
      const dbInterview = await prisma.interview.findUnique({
        where: { id: res.body.id },
        include: { questions: true },
      });
      expect(dbInterview).not.toBeNull();
      expect(dbInterview!.questions.length).toBe(res.body.questions.length);
    });

    it('RF-18: should reject second active interview with 409 Conflict', async () => {
      await request(server)
        .post('/api/interviews')
        .set('Cookie', cookieHeader)
        .send({ roleId: catalogs.roleId, chosenLevelId: catalogs.levelJuniorId })
        .expect(201);

      // Segunda llamada sin haber finalizado la primera.
      await request(server)
        .post('/api/interviews')
        .set('Cookie', cookieHeader)
        .send({ roleId: catalogs.roleId, chosenLevelId: catalogs.levelJuniorId })
        .expect(409);
    });

    it('should reject with 404 when roleId does not exist', async () => {
      await request(server)
        .post('/api/interviews')
        .set('Cookie', cookieHeader)
        .send({ roleId: 999_999, chosenLevelId: catalogs.levelJuniorId })
        .expect(404);
    });

    it('should reject malformed DTO (missing chosenLevelId) with 400', async () => {
      await request(server)
        .post('/api/interviews')
        .set('Cookie', cookieHeader)
        .send({ roleId: catalogs.roleId })
        .expect(400);
    });
  });

  // -----------------------------------------------------------------
  // RF-11 — Leer entrevista
  // -----------------------------------------------------------------

  describe('RF-11 — GET /api/interviews/:id', () => {
    it('should return interview with its questions ordered', async () => {
      const created = await request(server)
        .post('/api/interviews')
        .set('Cookie', cookieHeader)
        .send({ roleId: catalogs.roleId, chosenLevelId: catalogs.levelJuniorId })
        .expect(201);

      const res = await request(server)
        .get(`/api/interviews/${created.body.id}`)
        .set('Cookie', cookieHeader)
        .expect(200);

      expect(res.body.id).toBe(created.body.id);
      const orderNumbers = res.body.questions.map((q: any) => q.orderNumber);
      const sorted = [...orderNumbers].sort((a, b) => a - b);
      expect(orderNumbers).toEqual(sorted);
    });

    it('should return 404 for non-existent interview id', async () => {
      await request(server)
        .get('/api/interviews/999999')
        .set('Cookie', cookieHeader)
        .expect(404);
    });
  });

  // -----------------------------------------------------------------
  // RF-15 — Enviar respuesta
  // -----------------------------------------------------------------

  describe('RF-15 — POST /api/interviews/:id/questions/:qid/answer', () => {
    it('should persist a new answer and link it to the interview question', async () => {
      const created = await request(server)
        .post('/api/interviews')
        .set('Cookie', cookieHeader)
        .send({ roleId: catalogs.roleId, chosenLevelId: catalogs.levelJuniorId })
        .expect(201);

      const iq = created.body.questions[0];

      const ans = await request(server)
        .post(`/api/interviews/${created.body.id}/questions/${iq.id}/answer`)
        .set('Cookie', cookieHeader)
        .send({ answerText: 'Mi respuesta detallada', answeredInSeconds: 42 })
        .expect(201);

      expect(ans.body.answerText).toBe('Mi respuesta detallada');
      expect(ans.body.interviewQuestionId).toBe(iq.id);

      const dbAnswer = await prisma.answer.findUnique({ where: { id: ans.body.id } });
      expect(dbAnswer).not.toBeNull();
      expect(dbAnswer!.answerText).toBe('Mi respuesta detallada');
    });

    it('should UPDATE existing answer on second submission (idempotencia)', async () => {
      const created = await request(server)
        .post('/api/interviews')
        .set('Cookie', cookieHeader)
        .send({ roleId: catalogs.roleId, chosenLevelId: catalogs.levelJuniorId })
        .expect(201);
      const iq = created.body.questions[0];

      const first = await request(server)
        .post(`/api/interviews/${created.body.id}/questions/${iq.id}/answer`)
        .set('Cookie', cookieHeader)
        .send({ answerText: 'primera versión' })
        .expect(201);

      const second = await request(server)
        .post(`/api/interviews/${created.body.id}/questions/${iq.id}/answer`)
        .set('Cookie', cookieHeader)
        .send({ answerText: 'versión corregida' })
        .expect(201);

      expect(second.body.id).toBe(first.body.id);
      expect(second.body.answerText).toBe('versión corregida');

      // Solo debe existir una answer para esa interview_question.
      const count = await prisma.answer.count({
        where: { interviewQuestionId: iq.id },
      });
      expect(count).toBe(1);
    });

    it('should return 404 when interview question does not belong to the interview', async () => {
      const created = await request(server)
        .post('/api/interviews')
        .set('Cookie', cookieHeader)
        .send({ roleId: catalogs.roleId, chosenLevelId: catalogs.levelJuniorId })
        .expect(201);

      await request(server)
        .post(`/api/interviews/${created.body.id}/questions/999999/answer`)
        .set('Cookie', cookieHeader)
        .send({ answerText: 'no debería pegar' })
        .expect(404);
    });
  });

  // -----------------------------------------------------------------
  // RF-17 — Finalizar entrevista
  // -----------------------------------------------------------------

  describe('RF-17 — POST /api/interviews/:id/finish', () => {
    it('should mark interview as processing and enqueue the evaluation', async () => {
      const created = await request(server)
        .post('/api/interviews')
        .set('Cookie', cookieHeader)
        .send({ roleId: catalogs.roleId, chosenLevelId: catalogs.levelJuniorId })
        .expect(201);

      const res = await request(server)
        .post(`/api/interviews/${created.body.id}/finish`)
        .set('Cookie', cookieHeader)
        .expect(201);

      expect(res.body).toMatchObject({
        interviewId: created.body.id,
        evaluationStatus: 'processing',
      });

      // Persistencia: finishedAt fijado, status actualizado.
      const dbInterview = await prisma.interview.findUnique({
        where: { id: created.body.id },
      });
      expect(dbInterview!.finishedAt).not.toBeNull();
      expect(dbInterview!.evaluationStatus).toBe('processing');
    });

    it('should reject finishing twice with 409 Conflict', async () => {
      const created = await request(server)
        .post('/api/interviews')
        .set('Cookie', cookieHeader)
        .send({ roleId: catalogs.roleId, chosenLevelId: catalogs.levelJuniorId })
        .expect(201);

      await request(server)
        .post(`/api/interviews/${created.body.id}/finish`)
        .set('Cookie', cookieHeader)
        .expect(201);

      await request(server)
        .post(`/api/interviews/${created.body.id}/finish`)
        .set('Cookie', cookieHeader)
        .expect(409);
    });
  });
});
