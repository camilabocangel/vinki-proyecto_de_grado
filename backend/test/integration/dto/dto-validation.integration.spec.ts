// Suite de integración C.1 — Validación de DTOs vía ValidationPipe global
//
// El ValidationPipe global en main.ts tiene:
//   - whitelist: true       → ignora propiedades no declaradas
//   - forbidNonWhitelisted: true → rechaza propiedades no declaradas
//   - transform: true       → convierte tipos primitivos
//
// Validamos que requests con DTOs malformados son rechazados con 400
// ANTES de tocar la capa de servicio. Esto cubre RNF-08 (validación
// estricta en el borde HTTP) y previene inyección de campos arbitrarios.

import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { createTestApp, extractCookies } from '../app-helpers';
import {
  prisma,
  resetDatabase,
  seedCatalogs,
  createUser,
  type SeededCatalogs,
} from '../db-helpers';

describe('API — Validación de DTOs (RNF-08)', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;
  let catalogs: SeededCatalogs;
  let studentCookie: string;

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
    const student = await createUser({
      email: 'dto@vinki.dev',
      password: 'dto-pass-1',
      role: 'student',
    });
    const res = await request(server)
      .post('/api/auth/login')
      .send({ email: student.email, password: student.rawPassword })
      .expect(200);
    studentCookie = extractCookies(res.headers['set-cookie']);
  });

  // -----------------------------------------------------------------
  // RegisterDto: name, email, password (≥ 8)
  // -----------------------------------------------------------------

  describe('RegisterDto', () => {
    it('should reject empty body with 400', async () => {
      await request(server).post('/api/auth/register').send({}).expect(400);
    });

    it('should reject missing email with 400', async () => {
      await request(server)
        .post('/api/auth/register')
        .send({ name: 'X', password: 'password-123' })
        .expect(400);
    });

    it('should reject missing password with 400', async () => {
      await request(server)
        .post('/api/auth/register')
        .send({ name: 'X', email: 'x@vinki.dev' })
        .expect(400);
    });

    it('should reject extra non-whitelisted property (role injection) with 400', async () => {
      // Sin forbidNonWhitelisted la propiedad se ignoraría silenciosamente.
      // Con él, debe rechazarse explícitamente (defensa anti-privilege-escalation).
      await request(server)
        .post('/api/auth/register')
        .send({
          name: 'X',
          email: 'extra@vinki.dev',
          password: 'password-123',
          role: 'admin',
        })
        .expect(400);
    });

    it('should reject name > 255 chars with 400', async () => {
      await request(server)
        .post('/api/auth/register')
        .send({
          name: 'a'.repeat(256),
          email: 'long@vinki.dev',
          password: 'password-123',
        })
        .expect(400);
    });
  });

  // -----------------------------------------------------------------
  // CreateInterviewDto: roleId, chosenLevelId obligatorios; mode ∈ enum
  // -----------------------------------------------------------------

  describe('CreateInterviewDto', () => {
    it('should reject missing chosenLevelId with 400', async () => {
      await request(server)
        .post('/api/interviews')
        .set('Cookie', studentCookie)
        .send({ roleId: catalogs.roleId })
        .expect(400);
    });

    it('should reject missing roleId with 400', async () => {
      await request(server)
        .post('/api/interviews')
        .set('Cookie', studentCookie)
        .send({ chosenLevelId: catalogs.levelJuniorId })
        .expect(400);
    });

    it('should reject string roleId (type-coercion strict) with 400', async () => {
      // transform:true convertiría algunos string→number, pero IsInt
      // rechaza valores que no son enteros válidos.
      await request(server)
        .post('/api/interviews')
        .set('Cookie', studentCookie)
        .send({ roleId: 'no-es-numero', chosenLevelId: catalogs.levelJuniorId })
        .expect(400);
    });

    it('should reject mode outside enum [practice|evaluation|behavioral] with 400', async () => {
      await request(server)
        .post('/api/interviews')
        .set('Cookie', studentCookie)
        .send({
          roleId: catalogs.roleId,
          chosenLevelId: catalogs.levelJuniorId,
          mode: 'invalido',
        })
        .expect(400);
    });

    it('should reject non-whitelisted property with 400', async () => {
      await request(server)
        .post('/api/interviews')
        .set('Cookie', studentCookie)
        .send({
          roleId: catalogs.roleId,
          chosenLevelId: catalogs.levelJuniorId,
          extraField: 'sql-injection-attempt',
        })
        .expect(400);
    });
  });

  // -----------------------------------------------------------------
  // SubmitAnswerDto: audioUrl ≤ 500 chars
  // -----------------------------------------------------------------

  describe('SubmitAnswerDto', () => {
    it('should reject audioUrl > 500 chars with 400', async () => {
      // Crear interview real para tener iq ID válido.
      const interview = await prisma.interview.create({
        data: {
          userId: (await prisma.user.findFirst({ where: { email: 'dto@vinki.dev' } }))!.id,
          roleId: catalogs.roleId,
          chosenLevelId: catalogs.levelJuniorId,
        },
      });
      const question = await prisma.question.create({
        data: {
          questionText: 'q',
          type: 'open',
          languageId: catalogs.languageId,
          frameworkId: catalogs.frameworkId,
          levelId: catalogs.levelJuniorId,
          skillId: catalogs.skillId,
        },
      });
      const iq = await prisma.interviewQuestion.create({
        data: {
          interviewId: interview.id,
          questionId: question.id,
          questionTextSnapshot: 'q',
          orderNumber: 1,
        },
      });

      await request(server)
        .post(`/api/interviews/${interview.id}/questions/${iq.id}/answer`)
        .set('Cookie', studentCookie)
        .send({
          answerText: 'ok',
          audioUrl: 'x'.repeat(501),
        })
        .expect(400);
    });
  });
});
