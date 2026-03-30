import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Job } from 'bullmq';
import { PrismaService } from '../../common/prisma.service.js';
import { EVALUATOR_SERVICE, type IEvaluatorService, type AnswerInput } from '../interfaces/evaluator.interface.js';

const SKILL_SCORE_ALPHA = 0.3; // exponential moving average weight

@Processor('evaluation')
export class EvaluationProcessor extends WorkerHost {
  private readonly logger = new Logger(EvaluationProcessor.name);

  constructor(
    private prisma: PrismaService,
    @Inject(EVALUATOR_SERVICE) private evaluator: IEvaluatorService,
    private eventEmitter: EventEmitter2,
  ) {
    super();
  }

  async process(job: Job<{ interviewId: number }>) {
    const { interviewId } = job.data;
    this.logger.log(`Processing evaluation for interview ${interviewId}`);

    try {
      // Load all answers with question skill info
      const interviewQuestions = await this.prisma.interviewQuestion.findMany({
        where: { interviewId },
        include: {
          answers: true,
          question: { include: { skill: true } },
        },
      });

      const answerInputs: AnswerInput[] = interviewQuestions
        .flatMap((iq) =>
          iq.answers
            .filter((a) => a.answerText)
            .map((a) => ({
              answerId: a.id,
              questionText: iq.questionTextSnapshot,
              answerText: a.answerText!,
            })),
        );

      if (answerInputs.length === 0) {
        this.logger.warn(`No text answers found for interview ${interviewId}`);
        await this.prisma.interview.update({
          where: { id: interviewId },
          data: { evaluationStatus: 'completed' },
        });
        return;
      }

      // Load levels from DB (Junior, Mid, Senior)
      const dbLevels = await this.prisma.level.findMany();
      const levelByName = new Map(dbLevels.map((l) => [l.name, l.id]));

      // Check if this is a behavioral interview
      const interviewData = await this.prisma.interview.findUnique({
        where: { id: interviewId },
        select: { mode: true, userId: true },
      });
      const isBehavioral = interviewData?.mode === 'behavioral';

      // Run evaluation (pass mode hint for behavioral rubrics)
      const results = await this.evaluator.evaluate(answerInputs, isBehavioral);

      // Build a map: answerId -> skillId for UserSkillScore updates
      const answerSkillMap = new Map<number, number>();
      for (const iq of interviewQuestions) {
        for (const answer of iq.answers) {
          if (answer.answerText) {
            answerSkillMap.set(answer.id, iq.question.skillId);
          }
        }
      }

      // Get userId for skill score update
      const userId = interviewData?.userId;

      // Persist evaluations and update skill scores
      for (const result of results) {
        const detectedLevelId = levelByName.get(result.detectedLevel) ?? null;

        await this.prisma.answerEvaluation.upsert({
          where: { answerId: result.answerId },
          create: {
            answerId: result.answerId,
            technicalCorrectness: result.technicalCorrectness,
            clarityOfExplanation: result.clarityOfExplanation,
            communication: result.communication,
            confidence: result.confidence,
            problemSolving: result.problemSolving,
            detectedLevelId,
            feedbackText: result.feedbackText,
            juniorAnswer: result.juniorAnswer,
            midAnswer: result.midAnswer,
            seniorAnswer: result.seniorAnswer,
          },
          update: {
            technicalCorrectness: result.technicalCorrectness,
            clarityOfExplanation: result.clarityOfExplanation,
            communication: result.communication,
            confidence: result.confidence,
            problemSolving: result.problemSolving,
            detectedLevelId,
            feedbackText: result.feedbackText,
            juniorAnswer: result.juniorAnswer,
            midAnswer: result.midAnswer,
            seniorAnswer: result.seniorAnswer,
          },
        });

        // Update UserSkillScore with exponential moving average
        if (userId) {
          const skillId = answerSkillMap.get(result.answerId);
          if (skillId) {
            const avgScore =
              (result.technicalCorrectness +
                result.clarityOfExplanation +
                result.communication +
                result.confidence +
                result.problemSolving) /
              5;
            // Convert 0-5 scale to 0-100 percentage
            const newScorePercent = (avgScore / 5) * 100;

            const existing = await this.prisma.userSkillScore.findUnique({
              where: { userId_skillId: { userId, skillId } },
            });

            if (existing) {
              const updatedScore =
                SKILL_SCORE_ALPHA * newScorePercent +
                (1 - SKILL_SCORE_ALPHA) * existing.score;
              await this.prisma.userSkillScore.update({
                where: { userId_skillId: { userId, skillId } },
                data: { score: updatedScore, lastUpdated: new Date() },
              });
            } else {
              await this.prisma.userSkillScore.create({
                data: { userId, skillId, score: newScorePercent },
              });
            }
          }
        }
      }

      // Update interview status
      await this.prisma.interview.update({
        where: { id: interviewId },
        data: { evaluationStatus: 'completed' },
      });

      this.eventEmitter.emit('evaluation.completed', {
        interviewId,
        userId,
      });

      this.logger.log(`Evaluation completed for interview ${interviewId}`);
    } catch (error) {
      this.logger.error(`Evaluation failed for interview ${interviewId}: ${(error as Error).message}`, (error as Error).stack);

      if (job.attemptsMade >= (job.opts.attempts ?? 3) - 1) {
        await this.prisma.interview.update({
          where: { id: interviewId },
          data: { evaluationStatus: 'failed' },
        });
        this.eventEmitter.emit('evaluation.failed', { interviewId });
      }

      throw error;
    }
  }
}
