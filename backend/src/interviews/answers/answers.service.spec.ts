import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  ConflictException,
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
      interviewQuestion: { findFirst: jest.fn() },
      answer: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      level: { findMany: jest.fn() },
      answerEvaluation: { upsert: jest.fn() },
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
});
