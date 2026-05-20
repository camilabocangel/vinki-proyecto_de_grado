import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { AnswersService } from './answers.service';
import { PrismaService } from '../../common/prisma.service';
import { EVALUATOR_SERVICE } from '../../evaluation/interfaces/evaluator.interface';

describe('AnswersService', () => {
  let service: AnswersService;
  let prisma: Record<string, any>;
  let evaluator: { evaluate: jest.Mock };

  beforeEach(async () => {
    prisma = {
      interview: { findUnique: jest.fn() },
      interviewQuestion: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      answer: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      level: { findMany: jest.fn() },
      answerEvaluation: { upsert: jest.fn() },
      question: { findFirst: jest.fn() },
    };

    evaluator = { evaluate: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnswersService,
        { provide: PrismaService, useValue: prisma },
        { provide: EVALUATOR_SERVICE, useValue: evaluator },
      ],
    }).compile();

    service = module.get<AnswersService>(AnswersService);
  });

  describe('submit()', () => {
    const interviewId = 1;
    const questionId = 10;
    const userId = 1;
    const dto = { answerText: 'My answer', audioUrl: undefined };

    it('should throw NotFoundException if interview not found', async () => {
      prisma.interview.findUnique.mockResolvedValue(null);

      await expect(service.submit(interviewId, questionId, userId, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if user does not own the interview', async () => {
      prisma.interview.findUnique.mockResolvedValue({ id: 1, userId: 99, finishedAt: null });

      await expect(service.submit(interviewId, questionId, userId, dto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ConflictException if interview is already finished', async () => {
      prisma.interview.findUnique.mockResolvedValue({
        id: 1,
        userId: 1,
        finishedAt: new Date(),
      });

      await expect(service.submit(interviewId, questionId, userId, dto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw NotFoundException if question not in interview', async () => {
      prisma.interview.findUnique.mockResolvedValue({ id: 1, userId: 1, finishedAt: null });
      prisma.interviewQuestion.findFirst.mockResolvedValue(null);

      await expect(service.submit(interviewId, questionId, userId, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should create a new answer when none exists', async () => {
      prisma.interview.findUnique.mockResolvedValue({ id: 1, userId: 1, finishedAt: null });
      prisma.interviewQuestion.findFirst.mockResolvedValue({ id: 10, interviewId: 1 });
      prisma.answer.findFirst.mockResolvedValue(null);
      const created = { id: 100, interviewQuestionId: 10, answerText: 'My answer' };
      prisma.answer.create.mockResolvedValue(created);

      const result = await service.submit(interviewId, questionId, userId, dto);

      expect(result).toEqual(created);
      expect(prisma.answer.create).toHaveBeenCalledWith({
        data: {
          interviewQuestionId: 10,
          answerText: 'My answer',
          audioUrl: undefined,
        },
      });
    });

    it('should update an existing answer', async () => {
      prisma.interview.findUnique.mockResolvedValue({ id: 1, userId: 1, finishedAt: null });
      prisma.interviewQuestion.findFirst.mockResolvedValue({ id: 10, interviewId: 1 });
      prisma.answer.findFirst.mockResolvedValue({ id: 50, interviewQuestionId: 10 });
      const updated = { id: 50, answerText: 'My answer' };
      prisma.answer.update.mockResolvedValue(updated);

      const result = await service.submit(interviewId, questionId, userId, dto);

      expect(result).toEqual(updated);
      expect(prisma.answer.update).toHaveBeenCalledWith({
        where: { id: 50 },
        data: {
          answerText: 'My answer',
          audioUrl: undefined,
          answeredAt: expect.any(Date),
        },
      });
    });
  });

  describe('getQuestionText()', () => {
    it('should return the question text snapshot', async () => {
      prisma.interview.findUnique.mockResolvedValue({ id: 1, userId: 1 });
      prisma.interviewQuestion.findFirst.mockResolvedValue({
        id: 10,
        interviewId: 1,
        questionTextSnapshot: 'What is dependency injection?',
      });

      const result = await service.getQuestionText(1, 10, 1);

      expect(result).toBe('What is dependency injection?');
    });

    it('should throw NotFoundException if interview not found', async () => {
      prisma.interview.findUnique.mockResolvedValue(null);

      await expect(service.getQuestionText(999, 10, 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user does not own interview', async () => {
      prisma.interview.findUnique.mockResolvedValue({ id: 1, userId: 99 });

      await expect(service.getQuestionText(1, 10, 1)).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if question not in interview', async () => {
      prisma.interview.findUnique.mockResolvedValue({ id: 1, userId: 1 });
      prisma.interviewQuestion.findFirst.mockResolvedValue(null);

      await expect(service.getQuestionText(1, 999, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('evaluateNow()', () => {
    const interviewId = 1;
    const questionId = 10;
    const userId = 1;

    function setupHappyPath() {
      prisma.interview.findUnique.mockResolvedValue({
        id: interviewId,
        userId,
        mode: 'practice',
        chosenLevelId: 1,
        languageId: 3,
        frameworkId: null,
      });
      prisma.interviewQuestion.findFirst.mockResolvedValue({
        id: questionId,
        interviewId,
        orderNumber: 1,
        questionTextSnapshot: 'What is REST?',
        answers: [{ id: 100, answerText: 'An architecture' }],
      });
      prisma.level.findMany.mockResolvedValue([
        { id: 1, name: 'Junior' },
        { id: 2, name: 'Mid' },
        { id: 3, name: 'Senior' },
      ]);
      prisma.answerEvaluation.upsert.mockResolvedValue({ id: 500 });
      evaluator.evaluate.mockResolvedValue([
        {
          answerId: 100,
          technicalCorrectness: 4,
          clarityOfExplanation: 4,
          communication: 4,
          confidence: 4,
          problemSolving: 4,
          detectedLevel: 'Mid',
          feedbackText: 'OK',
          juniorAnswer: '',
          midAnswer: '',
          seniorAnswer: '',
        },
      ]);
    }

    it('should call evaluator and upsert the evaluation when interview is in practice mode', async () => {
      setupHappyPath();
      // Sin upgrade adaptativo (detectedLevel Mid=2 > chosenLevel 1):
      prisma.interviewQuestion.findFirst.mockResolvedValueOnce({
        id: questionId,
        interviewId,
        orderNumber: 1,
        questionTextSnapshot: 'What is REST?',
        answers: [{ id: 100, answerText: 'An architecture' }],
      });
      // El segundo findFirst (en adaptNextQuestion) busca la siguiente
      // pregunta sin responder. Devolvemos null para corto-circuitar.
      prisma.interviewQuestion.findFirst.mockResolvedValueOnce(null);

      const result = await service.evaluateNow(interviewId, questionId, userId);

      expect(evaluator.evaluate).toHaveBeenCalledWith([
        {
          answerId: 100,
          questionText: 'What is REST?',
          answerText: 'An architecture',
        },
      ]);
      expect(prisma.answerEvaluation.upsert).toHaveBeenCalled();
      const upsertCall = prisma.answerEvaluation.upsert.mock.calls[0][0];
      expect(upsertCall.where).toEqual({ answerId: 100 });
      expect(upsertCall.create.detectedLevelId).toBe(2); // 'Mid' => id 2
      expect(result).toEqual({ id: 500 });
    });

    it('should throw NotFoundException when the interview does not exist', async () => {
      prisma.interview.findUnique.mockResolvedValue(null);

      await expect(service.evaluateNow(interviewId, questionId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when the user does not own the interview', async () => {
      prisma.interview.findUnique.mockResolvedValue({
        id: interviewId,
        userId: 999,
        mode: 'practice',
      });

      await expect(service.evaluateNow(interviewId, questionId, userId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException when interview mode is not "practice"', async () => {
      prisma.interview.findUnique.mockResolvedValue({
        id: interviewId,
        userId,
        mode: 'evaluation',
      });

      await expect(service.evaluateNow(interviewId, questionId, userId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when the question is not part of the interview', async () => {
      prisma.interview.findUnique.mockResolvedValue({
        id: interviewId,
        userId,
        mode: 'practice',
        chosenLevelId: 1,
      });
      prisma.interviewQuestion.findFirst.mockResolvedValue(null);

      await expect(service.evaluateNow(interviewId, questionId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when no answer exists for the question', async () => {
      prisma.interview.findUnique.mockResolvedValue({
        id: interviewId,
        userId,
        mode: 'practice',
        chosenLevelId: 1,
      });
      prisma.interviewQuestion.findFirst.mockResolvedValue({
        id: questionId,
        interviewId,
        orderNumber: 1,
        questionTextSnapshot: 'Q',
        answers: [], // sin respuestas
      });

      await expect(service.evaluateNow(interviewId, questionId, userId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when the answer exists but has no text', async () => {
      prisma.interview.findUnique.mockResolvedValue({
        id: interviewId,
        userId,
        mode: 'practice',
        chosenLevelId: 1,
      });
      prisma.interviewQuestion.findFirst.mockResolvedValue({
        id: questionId,
        interviewId,
        orderNumber: 1,
        questionTextSnapshot: 'Q',
        answers: [{ id: 100, answerText: null }],
      });

      await expect(service.evaluateNow(interviewId, questionId, userId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when the evaluator returns no results', async () => {
      prisma.interview.findUnique.mockResolvedValue({
        id: interviewId,
        userId,
        mode: 'practice',
        chosenLevelId: 1,
      });
      prisma.interviewQuestion.findFirst.mockResolvedValue({
        id: questionId,
        interviewId,
        orderNumber: 1,
        questionTextSnapshot: 'Q',
        answers: [{ id: 100, answerText: 'algo' }],
      });
      prisma.level.findMany.mockResolvedValue([]);
      evaluator.evaluate.mockResolvedValue([]);

      await expect(service.evaluateNow(interviewId, questionId, userId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should set detectedLevelId to null when detectedLevel name is unknown', async () => {
      prisma.interview.findUnique.mockResolvedValue({
        id: interviewId,
        userId,
        mode: 'practice',
        chosenLevelId: 1,
        languageId: null,
        frameworkId: null,
      });
      prisma.interviewQuestion.findFirst.mockResolvedValueOnce({
        id: questionId,
        interviewId,
        orderNumber: 1,
        questionTextSnapshot: 'Q',
        answers: [{ id: 100, answerText: 'a' }],
      });
      prisma.interviewQuestion.findFirst.mockResolvedValueOnce(null);
      prisma.level.findMany.mockResolvedValue([{ id: 2, name: 'Mid' }]);
      evaluator.evaluate.mockResolvedValue([
        {
          answerId: 100,
          technicalCorrectness: 3,
          clarityOfExplanation: 3,
          communication: 3,
          confidence: 3,
          problemSolving: 3,
          detectedLevel: 'Wizard', // no existe
          feedbackText: '',
          juniorAnswer: '',
          midAnswer: '',
          seniorAnswer: '',
        },
      ]);
      prisma.answerEvaluation.upsert.mockResolvedValue({ id: 1 });

      await service.evaluateNow(interviewId, questionId, userId);

      const upsertCall = prisma.answerEvaluation.upsert.mock.calls[0][0];
      expect(upsertCall.create.detectedLevelId).toBeNull();
    });
  });

  describe('adaptNextQuestion (indirectly via evaluateNow)', () => {
    it('should upgrade the next unanswered question when detected level exceeds chosen level', async () => {
      prisma.interview.findUnique.mockResolvedValue({
        id: 1,
        userId: 1,
        mode: 'practice',
        chosenLevelId: 1, // Junior
        languageId: 3,
        frameworkId: null,
      });
      // 1) Question actual (con answer)
      prisma.interviewQuestion.findFirst.mockResolvedValueOnce({
        id: 10,
        interviewId: 1,
        orderNumber: 1,
        questionTextSnapshot: 'Q1',
        answers: [{ id: 100, answerText: 'a' }],
      });
      // 2) Next unanswered question — encontrada
      prisma.interviewQuestion.findFirst.mockResolvedValueOnce({
        id: 11,
        interviewId: 1,
        orderNumber: 2,
      });
      // Harder question del banco
      prisma.question.findFirst.mockResolvedValue({
        id: 555,
        questionText: 'Pregunta Mid avanzada',
      });
      prisma.level.findMany.mockResolvedValue([
        { id: 1, name: 'Junior' },
        { id: 2, name: 'Mid' },
      ]);
      prisma.interviewQuestion.update.mockResolvedValue({});
      prisma.answerEvaluation.upsert.mockResolvedValue({ id: 500 });
      evaluator.evaluate.mockResolvedValue([
        {
          answerId: 100,
          technicalCorrectness: 5,
          clarityOfExplanation: 5,
          communication: 5,
          confidence: 5,
          problemSolving: 5,
          detectedLevel: 'Mid',
          feedbackText: '',
          juniorAnswer: '',
          midAnswer: '',
          seniorAnswer: '',
        },
      ]);

      await service.evaluateNow(1, 10, 1);

      // Se debe haber actualizado la pregunta 11 con la harderQuestion 555.
      expect(prisma.interviewQuestion.update).toHaveBeenCalledWith({
        where: { id: 11 },
        data: { questionId: 555, questionTextSnapshot: 'Pregunta Mid avanzada' },
      });
    });

    it('should NOT upgrade when detected level is not higher than chosen level', async () => {
      prisma.interview.findUnique.mockResolvedValue({
        id: 1,
        userId: 1,
        mode: 'practice',
        chosenLevelId: 2, // Mid
        languageId: 3,
        frameworkId: null,
      });
      prisma.interviewQuestion.findFirst.mockResolvedValueOnce({
        id: 10,
        interviewId: 1,
        orderNumber: 1,
        questionTextSnapshot: 'Q1',
        answers: [{ id: 100, answerText: 'a' }],
      });
      prisma.level.findMany.mockResolvedValue([
        { id: 1, name: 'Junior' },
        { id: 2, name: 'Mid' },
      ]);
      prisma.answerEvaluation.upsert.mockResolvedValue({ id: 500 });
      evaluator.evaluate.mockResolvedValue([
        {
          answerId: 100,
          technicalCorrectness: 3,
          clarityOfExplanation: 3,
          communication: 3,
          confidence: 3,
          problemSolving: 3,
          detectedLevel: 'Junior', // < chosenLevel (Mid)
          feedbackText: '',
          juniorAnswer: '',
          midAnswer: '',
          seniorAnswer: '',
        },
      ]);

      await service.evaluateNow(1, 10, 1);

      // No update — no se buscan harder questions ni se actualiza la siguiente.
      expect(prisma.question.findFirst).not.toHaveBeenCalled();
      expect(prisma.interviewQuestion.update).not.toHaveBeenCalled();
    });

    it('should skip the upgrade when there is no next unanswered question', async () => {
      prisma.interview.findUnique.mockResolvedValue({
        id: 1,
        userId: 1,
        mode: 'practice',
        chosenLevelId: 1,
        languageId: 3,
        frameworkId: null,
      });
      prisma.interviewQuestion.findFirst
        .mockResolvedValueOnce({
          id: 10,
          interviewId: 1,
          orderNumber: 1,
          questionTextSnapshot: 'Q1',
          answers: [{ id: 100, answerText: 'a' }],
        })
        .mockResolvedValueOnce(null); // no hay próxima sin responder
      prisma.level.findMany.mockResolvedValue([
        { id: 1, name: 'Junior' },
        { id: 2, name: 'Mid' },
      ]);
      prisma.answerEvaluation.upsert.mockResolvedValue({ id: 1 });
      evaluator.evaluate.mockResolvedValue([
        {
          answerId: 100,
          technicalCorrectness: 5,
          clarityOfExplanation: 5,
          communication: 5,
          confidence: 5,
          problemSolving: 5,
          detectedLevel: 'Mid',
          feedbackText: '',
          juniorAnswer: '',
          midAnswer: '',
          seniorAnswer: '',
        },
      ]);

      await service.evaluateNow(1, 10, 1);

      expect(prisma.question.findFirst).not.toHaveBeenCalled();
      expect(prisma.interviewQuestion.update).not.toHaveBeenCalled();
    });

    it('should skip the upgrade when no harder question is found in the bank', async () => {
      prisma.interview.findUnique.mockResolvedValue({
        id: 1,
        userId: 1,
        mode: 'practice',
        chosenLevelId: 1,
        languageId: 3,
        frameworkId: null,
      });
      prisma.interviewQuestion.findFirst
        .mockResolvedValueOnce({
          id: 10,
          interviewId: 1,
          orderNumber: 1,
          questionTextSnapshot: 'Q1',
          answers: [{ id: 100, answerText: 'a' }],
        })
        .mockResolvedValueOnce({ id: 11, interviewId: 1, orderNumber: 2 });
      prisma.question.findFirst.mockResolvedValue(null);
      prisma.level.findMany.mockResolvedValue([
        { id: 1, name: 'Junior' },
        { id: 2, name: 'Mid' },
      ]);
      prisma.answerEvaluation.upsert.mockResolvedValue({ id: 1 });
      evaluator.evaluate.mockResolvedValue([
        {
          answerId: 100,
          technicalCorrectness: 5,
          clarityOfExplanation: 5,
          communication: 5,
          confidence: 5,
          problemSolving: 5,
          detectedLevel: 'Mid',
          feedbackText: '',
          juniorAnswer: '',
          midAnswer: '',
          seniorAnswer: '',
        },
      ]);

      await service.evaluateNow(1, 10, 1);

      expect(prisma.interviewQuestion.update).not.toHaveBeenCalled();
    });
  });
});
