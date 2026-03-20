import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Job } from 'bullmq';
import { PrismaService } from '../../common/prisma.service.js';
import { EVALUATOR_SERVICE, type IEvaluatorService, type AnswerInput } from '../interfaces/evaluator.interface.js';

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
      // Load all answers for this interview
      const interviewQuestions = await this.prisma.interviewQuestion.findMany({
        where: { interviewId },
        include: { answers: true },
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

      // Run evaluation
      const results = await this.evaluator.evaluate(answerInputs);

      // Persist evaluations
      for (const result of results) {
        await this.prisma.answerEvaluation.create({
          data: {
            answerId: result.answerId,
            technicalCorrectness: result.technicalCorrectness,
            clarityOfExplanation: result.clarityOfExplanation,
            communication: result.communication,
            confidence: result.confidence,
            problemSolving: result.problemSolving,
            feedbackText: result.feedbackText,
          },
        });
      }

      // Update interview status
      await this.prisma.interview.update({
        where: { id: interviewId },
        data: { evaluationStatus: 'completed' },
      });

      // Get userId for SSE notification
      const interview = await this.prisma.interview.findUnique({
        where: { id: interviewId },
      });

      this.eventEmitter.emit('evaluation.completed', {
        interviewId,
        userId: interview?.userId,
      });

      this.logger.log(`Evaluation completed for interview ${interviewId}`);
    } catch (error) {
      this.logger.error(`Evaluation failed for interview ${interviewId}`, error);

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
