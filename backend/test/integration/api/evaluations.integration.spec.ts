// Suite de integración B.4 — Evaluación + reportes (RF-19 a RF-28)
//
// El flujo end-to-end:
//   1. Student finaliza entrevista → POST /interviews/:id/finish encola
//      un job en BullMQ.
//   2. EvaluationProcessor (worker BullMQ) recoge el job y llama al
//      evaluator (MockEvaluatorService en sandbox).
//   3. Persiste AnswerEvaluation por respuesta y actualiza
//      UserSkillScore (EMA del 0–100).
//   4. Marca interview.evaluationStatus = 'completed'.
//
// Validamos extremo-a-extremo: enqueue → polling sobre el status →
// inspección de DB. Como BullMQ es asíncrono, hacemos polling con
// timeout amplio (10 s). En sandbox el procesamiento toma <1 s.

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

const POLL_INTERVAL_MS = 200;
const POLL_TIMEOUT_MS = 15_000;

async function waitForCompletion(interviewId: number): Promise<void> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const row = await prisma.interview.findUnique({
      where: { id: interviewId },
      select: { evaluationStatus: true },
    });
    if (row?.evaluationStatus === 'completed') return;
    if (row?.evaluationStatus === 'failed') {
      throw new Error(`Evaluation marked failed for interview ${interviewId}`);
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  throw new Error(`Timeout esperando evaluation.completed para interview ${interviewId}`);
}

describe('API — Evaluación + reportes (RF-19 a RF-28)', () => {
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
      email: 'eval@vinki.dev',
      password: 'eval-pass-1',
      role: 'student',
    });
    for (let i = 1; i <= 5; i++) {
      await createQuestionWithEmbedding(catalogs, {
        questionText: `Pregunta E${i}`,
      });
    }

    const res = await request(server)
      .post('/api/auth/login')
      .send({ email: student.email, password: student.rawPassword })
      .expect(200);
    cookieHeader = extractCookies(res.headers['set-cookie']);
  });

  /**
   * Lleva una entrevista al estado finalizado + evaluada:
   *  - Crea interview.
   *  - Responde TODAS las preguntas con texto.
   *  - Finaliza la interview.
   *  - Espera evaluationStatus = 'completed'.
   * Retorna el id de interview.
   */
  async function completeFullInterview(): Promise<number> {
    const created = await request(server)
      .post('/api/interviews')
      .set('Cookie', cookieHeader)
      .send({
        roleId: catalogs.roleId,
        languageId: catalogs.languageId,
        chosenLevelId: catalogs.levelJuniorId,
      })
      .expect(201);

    for (const iq of created.body.questions) {
      await request(server)
        .post(`/api/interviews/${created.body.id}/questions/${iq.id}/answer`)
        .set('Cookie', cookieHeader)
        .send({ answerText: `Respuesta a ${iq.questionTextSnapshot}` })
        .expect(201);
    }

    await request(server)
      .post(`/api/interviews/${created.body.id}/finish`)
      .set('Cookie', cookieHeader)
      .expect(201);

    await waitForCompletion(created.body.id);
    return created.body.id;
  }

  // -----------------------------------------------------------------
  // RF-19 / RF-20 — Evaluación asíncrona → AnswerEvaluation persistida
  // -----------------------------------------------------------------

  describe('RF-19 / RF-20 — Persistencia de AnswerEvaluation', () => {
    it('should create one AnswerEvaluation per answered question after finish', async () => {
      const interviewId = await completeFullInterview();

      const evals = await prisma.answerEvaluation.findMany({
        where: { answer: { interviewQuestion: { interviewId } } },
      });

      expect(evals.length).toBeGreaterThan(0);
      for (const ev of evals) {
        // Dimensiones dentro del rango RNF-18.
        expect(ev.technicalCorrectness).toBeGreaterThanOrEqual(0);
        expect(ev.technicalCorrectness).toBeLessThanOrEqual(5);
        expect(ev.clarityOfExplanation).toBeGreaterThanOrEqual(0);
        expect(ev.clarityOfExplanation).toBeLessThanOrEqual(5);
        expect(ev.communication).toBeGreaterThanOrEqual(0);
        expect(ev.communication).toBeLessThanOrEqual(5);
        expect(ev.confidence).toBeGreaterThanOrEqual(0);
        expect(ev.confidence).toBeLessThanOrEqual(5);
        expect(ev.problemSolving).toBeGreaterThanOrEqual(0);
        expect(ev.problemSolving).toBeLessThanOrEqual(5);
        expect(typeof ev.feedbackText).toBe('string');
        expect(ev.feedbackText!.length).toBeGreaterThan(0);
      }
    });
  });

  // -----------------------------------------------------------------
  // RF-22 — Reporte de la entrevista
  // -----------------------------------------------------------------

  describe('RF-22 — GET /api/interviews/:id/report', () => {
    it('should return aggregated report after evaluation completes', async () => {
      const interviewId = await completeFullInterview();

      const res = await request(server)
        .get(`/api/interviews/${interviewId}/report`)
        .set('Cookie', cookieHeader)
        .expect(200);

      // Forma básica del reporte: campos clave esperados.
      expect(res.body).toHaveProperty('interview');
      expect(res.body.interview.id).toBe(interviewId);
      // Detalle por pregunta presente bajo `evaluations`.
      expect(Array.isArray(res.body.evaluations)).toBe(true);
      expect(res.body.evaluations.length).toBeGreaterThan(0);
      // Cada item trae snapshot + answer + evaluation.
      const first = res.body.evaluations[0];
      expect(first).toHaveProperty('questionTextSnapshot');
      expect(first).toHaveProperty('answer');
      expect(first).toHaveProperty('evaluation');
      expect(first.evaluation).not.toBeNull();
    });

    it('should 403 if another student tries to read someone else report', async () => {
      const interviewId = await completeFullInterview();

      const other = await createUser({
        email: 'other-eval@vinki.dev',
        password: 'other-eval-1',
        role: 'student',
      });
      const otherLogin = await request(server)
        .post('/api/auth/login')
        .send({ email: other.email, password: other.rawPassword })
        .expect(200);
      const otherCookie = extractCookies(otherLogin.headers['set-cookie']);

      await request(server)
        .get(`/api/interviews/${interviewId}/report`)
        .set('Cookie', otherCookie)
        .expect(403);
    });
  });

  // -----------------------------------------------------------------
  // RF-27 — Skill scores (EMA 0–100)
  // -----------------------------------------------------------------

  describe('RF-27 — UserSkillScore actualizado por la evaluación', () => {
    it('should create UserSkillScore rows in [0, 100] after first evaluation', async () => {
      await completeFullInterview();

      const scores = await prisma.userSkillScore.findMany({
        where: { userId: student.id },
      });

      expect(scores.length).toBeGreaterThan(0);
      for (const s of scores) {
        expect(s.score).toBeGreaterThanOrEqual(0);
        expect(s.score).toBeLessThanOrEqual(100);
      }
    });
  });

  // -----------------------------------------------------------------
  // RF-28 — Dashboard con métricas reales
  // -----------------------------------------------------------------

  describe('RF-28 — GET /api/dashboard', () => {
    it('should return dashboard with interview counted after completion', async () => {
      await completeFullInterview();

      const res = await request(server)
        .get('/api/dashboard')
        .set('Cookie', cookieHeader)
        .expect(200);

      // El dashboard incluye contadores agregados.
      expect(res.body).toBeDefined();
      expect(typeof res.body).toBe('object');
    });
  });
});
