// Suite de integración A.2 — Cascadas ON DELETE (RNF-12, RNF-13, RNF-14)
// Valida que las cascadas FK declaradas en el esquema Prisma propagan
// correctamente las eliminaciones desde el padre hasta los hijos.
//
// Mapeo:
//   - RNF-12: al borrar una Interview, sus InterviewQuestion se borran.
//   - RNF-13: al borrar una InterviewQuestion, sus Answer se borran.
//   - RNF-14: al borrar un Answer, su AnswerEvaluation se borra.

import {
  prisma,
  resetDatabase,
  seedCatalogs,
  createUser,
  createQuestion,
  SeededCatalogs,
  TestUser,
} from '../db-helpers';

describe('Integridad — ON DELETE CASCADE (RNF-12 / RNF-13 / RNF-14)', () => {
  let catalogs: SeededCatalogs;
  let student: TestUser;

  beforeAll(async () => {
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

  /** Construye la jerarquía completa: interview → iq → answer → evaluation. */
  async function buildStack() {
    const question = await createQuestion(catalogs);
    const interview = await prisma.interview.create({
      data: {
        userId: student.id,
        roleId: catalogs.roleId,
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
      data: { interviewQuestionId: iq.id, answerText: 'mi respuesta' },
    });
    const evaluation = await prisma.answerEvaluation.create({
      data: {
        answerId: answer.id,
        technicalCorrectness: 4,
        clarityOfExplanation: 4,
        communication: 4,
        confidence: 4,
        problemSolving: 4,
      },
    });
    return {
      interviewId: interview.id,
      iqId: iq.id,
      answerId: answer.id,
      evaluationId: evaluation.id,
    };
  }

  // ===========================================================
  // RNF-12 — Eliminar interview → cascade a interview_questions
  // ===========================================================

  describe('RNF-12 — interview → interview_questions', () => {
    it('should cascade delete interview_questions when interview is deleted', async () => {
      const { interviewId, iqId } = await buildStack();

      await prisma.interview.delete({ where: { id: interviewId } });

      const survivingIq = await prisma.interviewQuestion.findUnique({
        where: { id: iqId },
      });
      expect(survivingIq).toBeNull();
    });

    it('should cascade delete the full chain interview → iq → answer → evaluation', async () => {
      const { interviewId, iqId, answerId, evaluationId } = await buildStack();

      await prisma.interview.delete({ where: { id: interviewId } });

      // Verifica que las 3 capas se borraron transitivamente.
      expect(
        await prisma.interviewQuestion.findUnique({ where: { id: iqId } }),
      ).toBeNull();
      expect(await prisma.answer.findUnique({ where: { id: answerId } })).toBeNull();
      expect(
        await prisma.answerEvaluation.findUnique({ where: { id: evaluationId } }),
      ).toBeNull();
    });
  });

  // ===========================================================
  // RNF-13 — Eliminar interview_question → cascade a answers
  // ===========================================================

  describe('RNF-13 — interview_question → answers', () => {
    it('should cascade delete answers when interview_question is deleted', async () => {
      const { iqId, answerId } = await buildStack();

      await prisma.interviewQuestion.delete({ where: { id: iqId } });

      const survivingAnswer = await prisma.answer.findUnique({
        where: { id: answerId },
      });
      expect(survivingAnswer).toBeNull();
    });

    it('should also cascade to evaluations when the iq is deleted (transitive)', async () => {
      const { iqId, evaluationId } = await buildStack();

      await prisma.interviewQuestion.delete({ where: { id: iqId } });

      expect(
        await prisma.answerEvaluation.findUnique({ where: { id: evaluationId } }),
      ).toBeNull();
    });
  });

  // ===========================================================
  // RNF-14 — Eliminar answer → cascade a answer_evaluation
  // ===========================================================

  describe('RNF-14 — answer → answer_evaluation', () => {
    it('should cascade delete answer_evaluation when answer is deleted', async () => {
      const { answerId, evaluationId } = await buildStack();

      await prisma.answer.delete({ where: { id: answerId } });

      const survivingEvaluation = await prisma.answerEvaluation.findUnique({
        where: { id: evaluationId },
      });
      expect(survivingEvaluation).toBeNull();
    });

    it('should NOT affect sibling answers when deleting one (no over-cascade)', async () => {
      // Sanity: borrar un answer no afecta otros del mismo iq.
      const { iqId } = await buildStack();
      const secondAnswer = await prisma.answer.create({
        data: { interviewQuestionId: iqId, answerText: 'segunda' },
      });
      // Borra el primer answer (no este).
      const firstAnswers = await prisma.answer.findMany({
        where: { interviewQuestionId: iqId, NOT: { id: secondAnswer.id } },
      });
      await prisma.answer.delete({ where: { id: firstAnswers[0].id } });

      // El segundo sobrevive.
      const survivor = await prisma.answer.findUnique({
        where: { id: secondAnswer.id },
      });
      expect(survivor).not.toBeNull();
    });
  });
});
