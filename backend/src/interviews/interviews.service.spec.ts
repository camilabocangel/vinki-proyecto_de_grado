import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { InterviewsService } from './interviews.service';
import { PrismaService } from '../common/prisma.service';
import { QuestionSelectorService } from './services/question-selector.service';

describe('InterviewsService', () => {
  let service: InterviewsService;
  let prisma: Record<string, any>;
  let questionSelector: { selectQuestions: jest.Mock };
  let evaluationQueue: { add: jest.Mock };

  beforeEach(async () => {
    prisma = {
      interview: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      role: { findUnique: jest.fn() },
      language: { findUnique: jest.fn() },
      framework: { findUnique: jest.fn() },
      level: { findUnique: jest.fn() },
      question: { findMany: jest.fn() },
      interviewQuestion: { create: jest.fn() },
      $transaction: jest.fn(),
    };

    questionSelector = { selectQuestions: jest.fn() };
    evaluationQueue = { add: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InterviewsService,
        { provide: PrismaService, useValue: prisma },
        { provide: QuestionSelectorService, useValue: questionSelector },
        { provide: getQueueToken('evaluation'), useValue: evaluationQueue },
      ],
    }).compile();

    service = module.get<InterviewsService>(InterviewsService);
  });

  describe('create()', () => {
    const userId = 1;
    const dto = { roleId: 1, chosenLevelId: 1 };

    it('should throw ConflictException if an active interview exists', async () => {
      prisma.interview.findFirst.mockResolvedValue({ id: 99, finishedAt: null });

      await expect(service.create(userId, dto as any)).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if role not found', async () => {
      prisma.interview.findFirst.mockResolvedValue(null);
      prisma.role.findUnique.mockResolvedValue(null);

      await expect(service.create(userId, dto as any)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if no questions found', async () => {
      prisma.interview.findFirst.mockResolvedValue(null);
      prisma.role.findUnique.mockResolvedValue({ id: 1, name: 'Backend' });
      prisma.level.findUnique.mockResolvedValue({ id: 1, name: 'Junior' });
      questionSelector.selectQuestions.mockResolvedValue([]);

      await expect(service.create(userId, dto as any)).rejects.toThrow(NotFoundException);
    });

    it('should create an interview with questions and return it', async () => {
      prisma.interview.findFirst.mockResolvedValue(null);
      prisma.role.findUnique.mockResolvedValue({ id: 1, name: 'Backend' });
      prisma.level.findUnique.mockResolvedValue({ id: 1, name: 'Junior' });
      questionSelector.selectQuestions.mockResolvedValue([10, 20]);

      const createdInterview = { id: 5, userId };
      prisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          interview: { create: jest.fn().mockResolvedValue(createdInterview) },
          question: {
            findMany: jest.fn().mockResolvedValue([
              { id: 10, questionText: 'Q1' },
              { id: 20, questionText: 'Q2' },
            ]),
          },
          interviewQuestion: { create: jest.fn().mockResolvedValue({}) },
        };
        return fn(tx);
      });

      const fullInterview = {
        id: 5,
        userId,
        questions: [
          { id: 1, orderNumber: 1, questionTextSnapshot: 'Q1', answers: [] },
          { id: 2, orderNumber: 2, questionTextSnapshot: 'Q2', answers: [] },
        ],
      };
      prisma.interview.findUnique.mockResolvedValue(fullInterview);

      const result = await service.create(userId, dto as any);

      expect(result).toEqual(fullInterview);
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(questionSelector.selectQuestions).toHaveBeenCalled();
    });

    it('should handle optional languageId and frameworkId', async () => {
      const dtoWithOptionals = { roleId: 1, chosenLevelId: 1, languageId: 2, frameworkId: 3 };

      prisma.interview.findFirst.mockResolvedValue(null);
      prisma.role.findUnique.mockResolvedValue({ id: 1, name: 'Backend' });
      prisma.language.findUnique.mockResolvedValue({ id: 2, name: 'TypeScript' });
      prisma.framework.findUnique.mockResolvedValue({ id: 3, name: 'NestJS' });
      prisma.level.findUnique.mockResolvedValue({ id: 1, name: 'Junior' });
      questionSelector.selectQuestions.mockResolvedValue([10]);

      prisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          interview: { create: jest.fn().mockResolvedValue({ id: 7, userId }) },
          question: {
            findMany: jest.fn().mockResolvedValue([{ id: 10, questionText: 'Q1' }]),
          },
          interviewQuestion: { create: jest.fn().mockResolvedValue({}) },
        };
        return fn(tx);
      });

      prisma.interview.findUnique.mockResolvedValue({ id: 7, userId, questions: [] });

      await service.create(userId, dtoWithOptionals as any);

      expect(prisma.language.findUnique).toHaveBeenCalledWith({ where: { id: 2 } });
      expect(prisma.framework.findUnique).toHaveBeenCalledWith({ where: { id: 3 } });
    });
  });

  describe('findOne()', () => {
    it('should return the interview with questions', async () => {
      const interview = { id: 1, userId: 1, questions: [{ orderNumber: 1, answers: [] }] };
      prisma.interview.findUnique.mockResolvedValue(interview);

      const result = await service.findOne(1, 1);
      expect(result).toEqual(interview);
    });

    it('should throw NotFoundException if interview does not exist', async () => {
      prisma.interview.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999, 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user does not own the interview', async () => {
      prisma.interview.findUnique.mockResolvedValue({ id: 1, userId: 2 });

      await expect(service.findOne(1, 1)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('finish()', () => {
    it('should mark interview as finished and enqueue evaluation job', async () => {
      prisma.interview.findUnique.mockResolvedValue({ id: 1, userId: 1, finishedAt: null });
      prisma.interview.update.mockResolvedValue({});
      evaluationQueue.add.mockResolvedValue({});

      const result = await service.finish(1, 1);

      expect(result).toEqual({ interviewId: 1, evaluationStatus: 'processing' });
      expect(prisma.interview.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { finishedAt: expect.any(Date), evaluationStatus: 'processing' },
      });
      expect(evaluationQueue.add).toHaveBeenCalledWith(
        'evaluate',
        { interviewId: 1 },
        { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
      );
    });

    it('should throw NotFoundException if interview not found', async () => {
      prisma.interview.findUnique.mockResolvedValue(null);

      await expect(service.finish(999, 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user does not own the interview', async () => {
      prisma.interview.findUnique.mockResolvedValue({ id: 1, userId: 2, finishedAt: null });

      await expect(service.finish(1, 1)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException if interview is already finished', async () => {
      prisma.interview.findUnique.mockResolvedValue({
        id: 1,
        userId: 1,
        finishedAt: new Date(),
      });

      await expect(service.finish(1, 1)).rejects.toThrow(ConflictException);
    });
  });
});
