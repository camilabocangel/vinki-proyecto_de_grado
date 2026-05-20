// Suite de integración A.1 — CHECK constraints (RNF-18, RNF-19, RNF-20)
// Valida que las 7 restricciones `chk_*` instaladas por la migración
// 20260519120000_add_check_constraints rechazan a nivel de PostgreSQL
// los valores fuera de rango. Los inserts deliberadamente inválidos
// deben fallar con un error que mencione el constraint violado.
//
// Mapeo:
//   - RNF-18: chk_answer_evaluations_*_range (5 constraints, dimensiones 0–5).
//   - RNF-19: chk_user_skill_scores_score_range (score 0–100).
//   - RNF-20: chk_interview_questions_order_number_positive (order > 0).

import {
  prisma,
  resetDatabase,
  seedCatalogs,
  createUser,
  createQuestion,
  SeededCatalogs,
  TestUser,
} from '../db-helpers';

describe('Integridad — CHECK constraints (RNF-18 / RNF-19 / RNF-20)', () => {
  let catalogs: SeededCatalogs;
  let student: TestUser;

  beforeAll(async () => {
    // Conexión perezosa; no abrir/cerrar en cada test.
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await resetDatabase();
    catalogs = await seedCatalogs();
    student = await createUser({ role: 'student' });
  });

  // ---------- Helpers locales ----------

  /** Crea la jerarquía mínima para insertar un answer_evaluation. */
  async function createAnswerEvaluationStack() {
    const question = await createQuestion(catalogs);
    const interview = await prisma.interview.create({
      data: {
        userId: student.id,
        roleId: catalogs.roleId,
        languageId: catalogs.languageId,
        chosenLevelId: catalogs.levelJuniorId,
      },
    });
    const iq = await prisma.interviewQuestion.create({
      data: {
        interviewId: interview.id,
        questionId: question.id,
        questionTextSnapshot: question.questionText,
        orderNumber: 1,
      },
    });
    const answer = await prisma.answer.create({
      data: { interviewQuestionId: iq.id, answerText: 'una respuesta' },
    });
    return { answerId: answer.id };
  }

  /** Crea un answer_evaluation con una dimensión sobreescrita; retorna la promesa. */
  function insertEvaluation(
    answerId: number,
    overrides: Partial<{
      technicalCorrectness: number;
      clarityOfExplanation: number;
      communication: number;
      confidence: number;
      problemSolving: number;
    }>,
  ) {
    return prisma.answerEvaluation.create({
      data: {
        answerId,
        technicalCorrectness: overrides.technicalCorrectness ?? 4,
        clarityOfExplanation: overrides.clarityOfExplanation ?? 4,
        communication: overrides.communication ?? 4,
        confidence: overrides.confidence ?? 4,
        problemSolving: overrides.problemSolving ?? 4,
      },
    });
  }

  // ===========================================================
  // RNF-18 — Rango [0, 5] en las 5 dimensiones de evaluación
  // ===========================================================

  describe('RNF-18 — answer_evaluations dimensiones ∈ [0, 5]', () => {
    it('should reject answer_evaluation with technical_correctness < 0', async () => {
      const { answerId } = await createAnswerEvaluationStack();
      await expect(insertEvaluation(answerId, { technicalCorrectness: -0.1 }))
        .rejects.toThrow(/chk_answer_evaluations_technical_correctness_range/);
    });

    it('should reject answer_evaluation with technical_correctness > 5', async () => {
      const { answerId } = await createAnswerEvaluationStack();
      await expect(insertEvaluation(answerId, { technicalCorrectness: 5.01 }))
        .rejects.toThrow(/chk_answer_evaluations_technical_correctness_range/);
    });

    it('should reject answer_evaluation with clarity_of_explanation out of [0, 5]', async () => {
      const { answerId } = await createAnswerEvaluationStack();
      await expect(insertEvaluation(answerId, { clarityOfExplanation: 7 }))
        .rejects.toThrow(/chk_answer_evaluations_clarity_of_explanation_range/);
    });

    it('should reject answer_evaluation with communication < 0', async () => {
      const { answerId } = await createAnswerEvaluationStack();
      await expect(insertEvaluation(answerId, { communication: -1 }))
        .rejects.toThrow(/chk_answer_evaluations_communication_range/);
    });

    it('should reject answer_evaluation with confidence > 5', async () => {
      const { answerId } = await createAnswerEvaluationStack();
      await expect(insertEvaluation(answerId, { confidence: 100 }))
        .rejects.toThrow(/chk_answer_evaluations_confidence_range/);
    });

    it('should reject answer_evaluation with problem_solving out of [0, 5]', async () => {
      const { answerId } = await createAnswerEvaluationStack();
      await expect(insertEvaluation(answerId, { problemSolving: -5 }))
        .rejects.toThrow(/chk_answer_evaluations_problem_solving_range/);
    });

    it('should accept answer_evaluation with all dimensions in [0, 5]', async () => {
      const { answerId } = await createAnswerEvaluationStack();
      const evaluation = await insertEvaluation(answerId, {
        technicalCorrectness: 0,
        clarityOfExplanation: 5,
        communication: 2.5,
        confidence: 3.7,
        problemSolving: 4.999,
      });
      expect(evaluation.id).toBeGreaterThan(0);
    });
  });

  // ===========================================================
  // RNF-19 — Rango [0, 100] en user_skill_scores.score
  // ===========================================================

  describe('RNF-19 — user_skill_scores.score ∈ [0, 100]', () => {
    it('should reject user_skill_score with score < 0', async () => {
      await expect(
        prisma.userSkillScore.create({
          data: { userId: student.id, skillId: catalogs.skillId, score: -0.5 },
        }),
      ).rejects.toThrow(/chk_user_skill_scores_score_range/);
    });

    it('should reject user_skill_score with score > 100', async () => {
      await expect(
        prisma.userSkillScore.create({
          data: { userId: student.id, skillId: catalogs.skillId, score: 100.01 },
        }),
      ).rejects.toThrow(/chk_user_skill_scores_score_range/);
    });

    it('should accept user_skill_score with score = 0 (boundary)', async () => {
      const created = await prisma.userSkillScore.create({
        data: { userId: student.id, skillId: catalogs.skillId, score: 0 },
      });
      expect(created.score).toBe(0);
    });

    it('should accept user_skill_score with score = 100 (boundary)', async () => {
      const created = await prisma.userSkillScore.create({
        data: { userId: student.id, skillId: catalogs.skillId, score: 100 },
      });
      expect(created.score).toBe(100);
    });

    it('should accept user_skill_score with score in [0, 100] (intermediate)', async () => {
      const created = await prisma.userSkillScore.create({
        data: { userId: student.id, skillId: catalogs.skillId, score: 73.5 },
      });
      expect(created.score).toBe(73.5);
    });
  });

  // ===========================================================
  // RNF-20 — interview_questions.order_number > 0
  // ===========================================================

  describe('RNF-20 — interview_questions.order_number > 0', () => {
    async function makeInterviewAndQuestion() {
      const question = await createQuestion(catalogs);
      const interview = await prisma.interview.create({
        data: {
          userId: student.id,
          roleId: catalogs.roleId,
          chosenLevelId: catalogs.levelJuniorId,
        },
      });
      return { interviewId: interview.id, questionId: question.id, snapshot: question.questionText };
    }

    it('should reject interview_question with order_number = 0', async () => {
      const { interviewId, questionId, snapshot } = await makeInterviewAndQuestion();
      await expect(
        prisma.interviewQuestion.create({
          data: {
            interviewId,
            questionId,
            questionTextSnapshot: snapshot,
            orderNumber: 0,
          },
        }),
      ).rejects.toThrow(/chk_interview_questions_order_number_positive/);
    });

    it('should reject interview_question with order_number < 0', async () => {
      const { interviewId, questionId, snapshot } = await makeInterviewAndQuestion();
      await expect(
        prisma.interviewQuestion.create({
          data: {
            interviewId,
            questionId,
            questionTextSnapshot: snapshot,
            orderNumber: -3,
          },
        }),
      ).rejects.toThrow(/chk_interview_questions_order_number_positive/);
    });

    it('should accept interview_question with order_number = 1 (smallest valid)', async () => {
      const { interviewId, questionId, snapshot } = await makeInterviewAndQuestion();
      const iq = await prisma.interviewQuestion.create({
        data: {
          interviewId,
          questionId,
          questionTextSnapshot: snapshot,
          orderNumber: 1,
        },
      });
      expect(iq.orderNumber).toBe(1);
    });

    it('should accept interview_question with large positive order_number', async () => {
      const { interviewId, questionId, snapshot } = await makeInterviewAndQuestion();
      const iq = await prisma.interviewQuestion.create({
        data: {
          interviewId,
          questionId,
          questionTextSnapshot: snapshot,
          orderNumber: 999,
        },
      });
      expect(iq.orderNumber).toBe(999);
    });
  });
});
