// Suite de integración B.2 — Autorización end-to-end (RNF-07)
//
// RNF-07: cada estudiante solo puede acceder a SU propia información
// (entrevistas, respuestas, evaluaciones). Un student NO puede leer la
// entrevista de otro student, ni un usuario sin sesión puede acceder a
// endpoints protegidos por JwtCookieGuard.
//
// También valida la separación de roles (`@Roles('student' | 'admin')`):
// - Un student NO puede tocar endpoints `@Roles('admin')`.
// - Un endpoint sin guard sigue siendo público.

import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { createTestApp, extractCookies } from '../app-helpers';
import {
  prisma,
  resetDatabase,
  seedCatalogs,
  createUser,
  createQuestion,
  type SeededCatalogs,
} from '../db-helpers';

describe('API — Autorización (RNF-07, roles)', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;
  let catalogs: SeededCatalogs;

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
  });

  /**
   * Hace login del usuario indicado vía /api/auth/login y devuelve el
   * header Cookie listo para los requests subsiguientes.
   */
  async function loginAs(email: string, password: string): Promise<string> {
    const res = await request(server)
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200);
    return extractCookies(res.headers['set-cookie']);
  }

  // -----------------------------------------------------------------
  // RNF-07 — Cross-user isolation
  // -----------------------------------------------------------------

  describe('RNF-07 — Aislamiento por propietario en /interviews/:id', () => {
    it('student A NO debe poder leer la entrevista de student B (403 Forbidden)', async () => {
      // Crear dos estudiantes con contraseñas conocidas.
      const studentA = await createUser({
        email: 'a@vinki.dev',
        password: 'pass-a-123',
        role: 'student',
      });
      const studentB = await createUser({
        email: 'b@vinki.dev',
        password: 'pass-b-123',
        role: 'student',
      });

      // Crear entrevista directamente en DB para B.
      const interviewB = await prisma.interview.create({
        data: {
          userId: studentB.id,
          roleId: catalogs.roleId,
          languageId: catalogs.languageId,
          chosenLevelId: catalogs.levelJuniorId,
        },
      });

      // A intenta acceder → 403.
      const cookieA = await loginAs(studentA.email, studentA.rawPassword);
      await request(server)
        .get(`/api/interviews/${interviewB.id}`)
        .set('Cookie', cookieA)
        .expect(403);
    });

    it('student B SÍ debe poder leer su propia entrevista (200 OK)', async () => {
      const studentB = await createUser({
        email: 'owner@vinki.dev',
        password: 'pass-owner-1',
        role: 'student',
      });
      const interviewB = await prisma.interview.create({
        data: {
          userId: studentB.id,
          roleId: catalogs.roleId,
          languageId: catalogs.languageId,
          chosenLevelId: catalogs.levelJuniorId,
        },
      });

      const cookieB = await loginAs(studentB.email, studentB.rawPassword);
      const res = await request(server)
        .get(`/api/interviews/${interviewB.id}`)
        .set('Cookie', cookieB)
        .expect(200);

      expect(res.body.id).toBe(interviewB.id);
      expect(res.body.userId).toBe(studentB.id);
    });

    it('student A NO debe poder cerrar (finish) la entrevista de student B (403)', async () => {
      const studentA = await createUser({
        email: 'attacker@vinki.dev',
        password: 'attacker-1',
        role: 'student',
      });
      const studentB = await createUser({
        email: 'victim@vinki.dev',
        password: 'victim-1',
        role: 'student',
      });
      const interviewB = await prisma.interview.create({
        data: {
          userId: studentB.id,
          roleId: catalogs.roleId,
          languageId: catalogs.languageId,
          chosenLevelId: catalogs.levelJuniorId,
        },
      });

      const cookieA = await loginAs(studentA.email, studentA.rawPassword);
      await request(server)
        .post(`/api/interviews/${interviewB.id}/finish`)
        .set('Cookie', cookieA)
        .expect(403);

      // Verificar que en DB sigue sin `finishedAt`.
      const refreshed = await prisma.interview.findUnique({
        where: { id: interviewB.id },
      });
      expect(refreshed?.finishedAt).toBeNull();
    });

    it('student A NO debe poder enviar respuesta a la pregunta de student B (403)', async () => {
      const studentA = await createUser({
        email: 'a2@vinki.dev',
        password: 'pass-a2',
        role: 'student',
      });
      const studentB = await createUser({
        email: 'b2@vinki.dev',
        password: 'pass-b2',
        role: 'student',
      });
      const question = await createQuestion(catalogs);
      const interviewB = await prisma.interview.create({
        data: {
          userId: studentB.id,
          roleId: catalogs.roleId,
          languageId: catalogs.languageId,
          chosenLevelId: catalogs.levelJuniorId,
        },
      });
      const iqB = await prisma.interviewQuestion.create({
        data: {
          interviewId: interviewB.id,
          questionId: question.id,
          questionTextSnapshot: question.questionText,
          orderNumber: 1,
        },
      });

      const cookieA = await loginAs(studentA.email, studentA.rawPassword);
      await request(server)
        .post(`/api/interviews/${interviewB.id}/questions/${iqB.id}/answer`)
        .set('Cookie', cookieA)
        .send({ answerText: 'intento robar la entrevista' })
        .expect(403);
    });
  });

  // -----------------------------------------------------------------
  // Endpoints protegidos sin cookies → 401
  // -----------------------------------------------------------------

  describe('JwtCookieGuard — Acceso sin cookies', () => {
    it('GET /api/auth/me sin cookies → 401', async () => {
      await request(server).get('/api/auth/me').expect(401);
    });

    it('GET /api/interviews/1 sin cookies → 401', async () => {
      await request(server).get('/api/interviews/1').expect(401);
    });

    it('POST /api/interviews sin cookies → 401', async () => {
      await request(server)
        .post('/api/interviews')
        .send({ roleId: catalogs.roleId, chosenLevelId: catalogs.levelJuniorId })
        .expect(401);
    });
  });

  // -----------------------------------------------------------------
  // RolesGuard — separación student / admin
  // -----------------------------------------------------------------

  describe('RolesGuard — Endpoints `@Roles(...)`', () => {
    it('student NO debe poder llamar POST /api/catalogs/questions/generate (admin-only) → 403', async () => {
      const student = await createUser({
        email: 'student@vinki.dev',
        password: 'student-1',
        role: 'student',
      });
      const cookie = await loginAs(student.email, student.rawPassword);

      await request(server)
        .post('/api/catalogs/questions/generate')
        .set('Cookie', cookie)
        .send({
          languageId: catalogs.languageId,
          levelId: catalogs.levelJuniorId,
          skillId: catalogs.skillId,
          count: 1,
        })
        .expect(403);
    });

    it('GET /api/catalogs/roles es público (sin guards): 200 sin cookies', async () => {
      const res = await request(server)
        .get('/api/catalogs/roles')
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });
  });
});
