import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { InterviewsService } from './interviews.service';
import { PrismaService } from '../common/prisma.service';
import { QuestionSelectorService } from './services/question-selector.service';
import { RagQuestionGeneratorService } from '../rag/services/rag-question-generator.service';
import { EMBEDDING_PROVIDER } from '../llm/interfaces/embedding-provider.interface';

describe('InterviewsService', () => {
  let service: InterviewsService;
  let prisma: Record<string, any>;
  let questionSelector: { selectQuestions: jest.Mock };
  let ragGenerator: { generateQuestions: jest.Mock };
  let embeddingProvider: { embed: jest.Mock; embedBatch: jest.Mock; getDimensions: jest.Mock };
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
    // Mock determinista del generador RAG: por defecto devuelve [] para que
    // el flujo caiga al camino "curated only" — preserva las aserciones
    // existentes sin tocarlas.
    ragGenerator = { generateQuestions: jest.fn().mockResolvedValue([]) };
    // Mock del proveedor de embeddings: vector fijo de 1536 dimensiones
    // (compatible con la columna vector(1536) del esquema Prisma).
    embeddingProvider = {
      embed: jest.fn().mockResolvedValue(new Array(1536).fill(0)),
      embedBatch: jest.fn().mockResolvedValue([new Array(1536).fill(0)]),
      getDimensions: jest.fn().mockReturnValue(1536),
    };
    evaluationQueue = { add: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InterviewsService,
        { provide: PrismaService, useValue: prisma },
        { provide: QuestionSelectorService, useValue: questionSelector },
        { provide: RagQuestionGeneratorService, useValue: ragGenerator },
        { provide: EMBEDDING_PROVIDER, useValue: embeddingProvider },
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

    it('should create a behavioral interview using behavioral questions only when mode=behavioral', async () => {
      prisma.interview.findFirst.mockResolvedValue(null);
      prisma.role.findUnique.mockResolvedValue({ id: 1, name: 'Backend' });
      prisma.level.findUnique.mockResolvedValue({ id: 1, name: 'Junior' });
      // Behavioral questions del banco
      prisma.question.findMany.mockResolvedValue([
        { id: 100, questionText: 'Cuéntame de un conflicto en equipo' },
        { id: 101, questionText: 'Describe una falla y qué aprendiste' },
      ]);

      const createdInterview = { id: 50, userId };
      prisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          interview: { create: jest.fn().mockResolvedValue(createdInterview) },
          interviewQuestion: { create: jest.fn().mockResolvedValue({}) },
        };
        return fn(tx);
      });
      prisma.interview.findUnique.mockResolvedValue({ id: 50, userId, questions: [] });

      const result = await service.create(userId, { ...dto, mode: 'behavioral' } as any);

      // Se consultó el banco con type=behavioral y level=Junior
      expect(prisma.question.findMany).toHaveBeenCalledWith({
        where: { type: 'behavioral', levelId: 1 },
        take: 5,
      });
      // No se invoca al questionSelector ni a RAG en modo behavioral
      expect(questionSelector.selectQuestions).not.toHaveBeenCalled();
      expect(ragGenerator.generateQuestions).not.toHaveBeenCalled();
      expect(result.id).toBe(50);
    });

    it('should throw NotFoundException in behavioral mode when no behavioral questions are available', async () => {
      prisma.interview.findFirst.mockResolvedValue(null);
      prisma.role.findUnique.mockResolvedValue({ id: 1, name: 'Backend' });
      prisma.level.findUnique.mockResolvedValue({ id: 1, name: 'Junior' });
      prisma.question.findMany.mockResolvedValue([]); // sin behavioral

      await expect(
        service.create(userId, { ...dto, mode: 'behavioral' } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should mix curated + RAG-generated questions and embed each RAG question (RF-15/RF-29)', async () => {
      prisma.interview.findFirst.mockResolvedValue(null);
      prisma.role.findUnique.mockResolvedValue({ id: 1, name: 'Backend' });
      prisma.level.findUnique.mockResolvedValue({ id: 1, name: 'Junior' });
      questionSelector.selectQuestions.mockResolvedValue([10, 20, 30]);
      ragGenerator.generateQuestions.mockResolvedValue([
        'Pregunta RAG 1',
        'Pregunta RAG 2',
      ]);

      const createdInterview = { id: 8, userId };
      const txInterviewCreate = jest.fn().mockResolvedValue(createdInterview);
      const txQuestionFindMany = jest.fn().mockResolvedValue([
        { id: 10, questionText: 'Q10', languageId: 1, skillId: 5 },
        { id: 20, questionText: 'Q20', languageId: 1, skillId: 5 },
        { id: 30, questionText: 'Q30', languageId: 1, skillId: 5 },
      ]);
      const txIQCreate = jest.fn().mockResolvedValue({});
      const txQueryRawUnsafe = jest.fn().mockResolvedValue([{ id: 555 }]);
      prisma.$transaction.mockImplementation(async (fn: any) =>
        fn({
          interview: { create: txInterviewCreate },
          question: { findMany: txQuestionFindMany },
          interviewQuestion: { create: txIQCreate },
          $queryRawUnsafe: txQueryRawUnsafe,
        }),
      );
      prisma.interview.findUnique.mockResolvedValue({ id: 8, userId, questions: [] });

      await service.create(userId, dto as any);

      // El embedding provider se invoca por cada pregunta RAG (2 veces).
      expect(embeddingProvider.embed).toHaveBeenCalledTimes(2);
      expect(embeddingProvider.embed).toHaveBeenNthCalledWith(1, 'Pregunta RAG 1');
      expect(embeddingProvider.embed).toHaveBeenNthCalledWith(2, 'Pregunta RAG 2');
      // Cada pregunta RAG genera un INSERT raw a `questions` con su vector.
      expect(txQueryRawUnsafe).toHaveBeenCalledTimes(2);
      // El total de interviewQuestion.create debe ser 3 curated + 2 RAG = 5.
      expect(txIQCreate).toHaveBeenCalledTimes(5);
      // Las 2 últimas son generadas por IA.
      expect(txIQCreate.mock.calls[3][0].data.generatedByAi).toBe(true);
      expect(txIQCreate.mock.calls[4][0].data.generatedByAi).toBe(true);
    });

    it('should fall back to curated-only when RAG generation throws an error', async () => {
      prisma.interview.findFirst.mockResolvedValue(null);
      prisma.role.findUnique.mockResolvedValue({ id: 1, name: 'Backend' });
      prisma.level.findUnique.mockResolvedValue({ id: 1, name: 'Junior' });
      questionSelector.selectQuestions.mockResolvedValue([10, 20, 30, 40, 50]);
      ragGenerator.generateQuestions.mockRejectedValue(new Error('LLM down'));

      const txInterviewCreate = jest.fn().mockResolvedValue({ id: 9, userId });
      const txQuestionFindMany = jest.fn().mockResolvedValue([
        { id: 10, questionText: 'Q10', skillId: 1 },
        { id: 20, questionText: 'Q20', skillId: 1 },
        { id: 30, questionText: 'Q30', skillId: 1 },
        { id: 40, questionText: 'Q40', skillId: 1 },
        { id: 50, questionText: 'Q50', skillId: 1 },
      ]);
      const txIQCreate = jest.fn().mockResolvedValue({});
      prisma.$transaction.mockImplementation(async (fn: any) =>
        fn({
          interview: { create: txInterviewCreate },
          question: { findMany: txQuestionFindMany },
          interviewQuestion: { create: txIQCreate },
          $queryRawUnsafe: jest.fn(),
        }),
      );
      prisma.interview.findUnique.mockResolvedValue({ id: 9, userId, questions: [] });

      await service.create(userId, dto as any);

      // 5 curated, 0 RAG → 5 inserts en interviewQuestion.
      expect(txIQCreate).toHaveBeenCalledTimes(5);
      expect(embeddingProvider.embed).not.toHaveBeenCalled();
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
