import { EvaluationProcessor } from './processors/evaluation.processor';
import { PrismaService } from '../common/prisma.service';
import type { IEvaluatorService, EvaluationOutput } from './interfaces/evaluator.interface';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Job } from 'bullmq';

function createMockPrisma() {
  return {
    interviewQuestion: { findMany: jest.fn() },
    interview: { findUnique: jest.fn(), update: jest.fn() },
    level: { findMany: jest.fn() },
    answerEvaluation: { upsert: jest.fn() },
    userSkillScore: { findUnique: jest.fn(), update: jest.fn(), create: jest.fn() },
  } as unknown as PrismaService;
}

function createMockEvaluator(): jest.Mocked<IEvaluatorService> {
  return { evaluate: jest.fn() };
}

function createMockEventEmitter(): jest.Mocked<Pick<EventEmitter2, 'emit'>> & EventEmitter2 {
  return { emit: jest.fn() } as unknown as jest.Mocked<Pick<EventEmitter2, 'emit'>> & EventEmitter2;
}

function createJob(interviewId: number, attemptsMade = 0, attempts = 3): Job<{ interviewId: number }> {
  return {
    data: { interviewId },
    attemptsMade,
    opts: { attempts },
  } as unknown as Job<{ interviewId: number }>;
}

function buildEvaluationOutput(answerId: number): EvaluationOutput {
  return {
    answerId,
    technicalCorrectness: 4,
    clarityOfExplanation: 3.5,
    communication: 4,
    confidence: 3,
    problemSolving: 4.5,
    detectedLevel: 'Mid',
    feedbackText: 'Good answer',
    juniorAnswer: 'Junior would say...',
    midAnswer: 'Mid would say...',
    seniorAnswer: 'Senior would say...',
  };
}

describe('EvaluationProcessor', () => {
  let processor: EvaluationProcessor;
  let prisma: ReturnType<typeof createMockPrisma>;
  let evaluator: jest.Mocked<IEvaluatorService>;
  let eventEmitter: ReturnType<typeof createMockEventEmitter>;

  beforeEach(() => {
    prisma = createMockPrisma();
    evaluator = createMockEvaluator();
    eventEmitter = createMockEventEmitter();
    processor = new EvaluationProcessor(
      prisma as PrismaService,
      evaluator,
      eventEmitter,
    );
  });

  function setupStandardMocks(opts?: {
    answerText?: string | null;
    existingSkillScore?: { score: number } | null;
    userId?: number | null;
  }) {
    const answerText = opts?.answerText ?? 'My answer';
    const userId = opts?.userId !== undefined ? opts.userId : 10;

    (prisma.interviewQuestion.findMany as jest.Mock).mockResolvedValue([
      {
        interviewId: 1,
        questionTextSnapshot: 'What is REST?',
        answers: [{ id: 100, answerText }],
        question: { skillId: 5, skill: { id: 5, name: 'REST' } },
      },
    ]);

    (prisma.level.findMany as jest.Mock).mockResolvedValue([
      { id: 1, name: 'Junior' },
      { id: 2, name: 'Mid' },
      { id: 3, name: 'Senior' },
    ]);

    (prisma.interview.findUnique as jest.Mock).mockResolvedValue({
      id: 1,
      userId,
    });

    (prisma.interview.update as jest.Mock).mockResolvedValue({});
    (prisma.answerEvaluation.upsert as jest.Mock).mockResolvedValue({});

    const existingSkillScore = opts?.existingSkillScore ?? null;
    (prisma.userSkillScore.findUnique as jest.Mock).mockResolvedValue(existingSkillScore);
    (prisma.userSkillScore.update as jest.Mock).mockResolvedValue({});
    (prisma.userSkillScore.create as jest.Mock).mockResolvedValue({});

    evaluator.evaluate.mockResolvedValue([buildEvaluationOutput(100)]);
  }

  it('should load answers, call evaluator, and persist results', async () => {
    setupStandardMocks();

    await processor.process(createJob(1));

    expect(prisma.interviewQuestion.findMany).toHaveBeenCalledWith({
      where: { interviewId: 1 },
      include: {
        answers: true,
        question: { include: { skill: true } },
      },
    });

    // El procesador llama a `evaluator.evaluate(answerInputs, isBehavioral)`.
    // En este flujo el interview mockeado no tiene `mode: 'behavioral'`, por
    // lo que `isBehavioral === false` (ver evaluation.processor.ts:65).
    expect(evaluator.evaluate).toHaveBeenCalledWith(
      [{ answerId: 100, questionText: 'What is REST?', answerText: 'My answer' }],
      false,
    );

    expect(prisma.answerEvaluation.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { answerId: 100 },
        create: expect.objectContaining({
          answerId: 100,
          technicalCorrectness: 4,
          detectedLevelId: 2, // 'Mid' maps to id 2
        }),
      }),
    );
  });

  it('should create UserSkillScore when none exists', async () => {
    setupStandardMocks({ existingSkillScore: null });

    await processor.process(createJob(1));

    // avgScore = (4 + 3.5 + 4 + 3 + 4.5) / 5 = 3.8
    // newScorePercent = (3.8 / 5) * 100 = 76
    expect(prisma.userSkillScore.create).toHaveBeenCalledWith({
      data: { userId: 10, skillId: 5, score: 76 },
    });
  });

  it('should update UserSkillScore with EMA when score exists', async () => {
    setupStandardMocks({ existingSkillScore: { score: 60 } });

    await processor.process(createJob(1));

    // EMA: 0.3 * 76 + 0.7 * 60 = 22.8 + 42 = 64.8
    expect(prisma.userSkillScore.update).toHaveBeenCalledWith({
      where: { userId_skillId: { userId: 10, skillId: 5 } },
      data: { score: 64.8, lastUpdated: expect.any(Date) },
    });
  });

  it('should handle empty answers gracefully', async () => {
    (prisma.interviewQuestion.findMany as jest.Mock).mockResolvedValue([
      {
        interviewId: 1,
        questionTextSnapshot: 'What is REST?',
        answers: [{ id: 100, answerText: null }],
        question: { skillId: 5, skill: { id: 5, name: 'REST' } },
      },
    ]);
    (prisma.interview.update as jest.Mock).mockResolvedValue({});

    await processor.process(createJob(1));

    expect(evaluator.evaluate).not.toHaveBeenCalled();
    expect(prisma.interview.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { evaluationStatus: 'completed' },
    });
  });

  it('should emit evaluation.completed event on success', async () => {
    setupStandardMocks();

    await processor.process(createJob(1));

    expect(eventEmitter.emit).toHaveBeenCalledWith('evaluation.completed', {
      interviewId: 1,
      userId: 10,
    });
  });

  it('should mark interview as failed after max retries', async () => {
    setupStandardMocks();
    evaluator.evaluate.mockRejectedValue(new Error('OpenAI timeout'));

    // attemptsMade = 2, opts.attempts = 3 -> last attempt (2 >= 3-1)
    const job = createJob(1, 2, 3);

    await expect(processor.process(job)).rejects.toThrow('OpenAI timeout');

    expect(prisma.interview.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { evaluationStatus: 'failed' },
    });
    expect(eventEmitter.emit).toHaveBeenCalledWith('evaluation.failed', {
      interviewId: 1,
    });
  });

  it('should not mark as failed if retries remain', async () => {
    setupStandardMocks();
    evaluator.evaluate.mockRejectedValue(new Error('Transient error'));

    // attemptsMade = 0, opts.attempts = 3 -> not last attempt
    const job = createJob(1, 0, 3);

    await expect(processor.process(job)).rejects.toThrow('Transient error');

    // interview.update should NOT have been called (no status change on non-final retry)
    expect(prisma.interview.update).not.toHaveBeenCalled();
    expect(eventEmitter.emit).not.toHaveBeenCalledWith(
      'evaluation.failed',
      expect.anything(),
    );
  });

  it('should skip UserSkillScore update when userId is null', async () => {
    setupStandardMocks({ userId: null });

    await processor.process(createJob(1));

    expect(prisma.userSkillScore.findUnique).not.toHaveBeenCalled();
    expect(prisma.userSkillScore.create).not.toHaveBeenCalled();
    expect(prisma.userSkillScore.update).not.toHaveBeenCalled();
  });
});
