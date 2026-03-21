import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service.js';
import { SubmitAnswerDto } from '../dto/submit-answer.dto.js';
import {
  EVALUATOR_SERVICE,
  type IEvaluatorService,
} from '../../evaluation/interfaces/evaluator.interface.js';

@Injectable()
export class AnswersService {
  constructor(
    private prisma: PrismaService,
    @Inject(EVALUATOR_SERVICE) private evaluator: IEvaluatorService,
  ) {}

  async submit(
    interviewId: number,
    questionId: number,
    userId: number,
    dto: SubmitAnswerDto,
  ) {
    // Verify interview belongs to user and is active
    const interview = await this.prisma.interview.findUnique({
      where: { id: interviewId },
    });
    if (!interview) throw new NotFoundException('Interview not found');
    if (interview.userId !== userId) throw new ForbiddenException();
    if (interview.finishedAt) throw new ConflictException('Interview already finished');

    // Verify question belongs to this interview
    const interviewQuestion = await this.prisma.interviewQuestion.findFirst({
      where: { interviewId, id: questionId },
    });
    if (!interviewQuestion) {
      throw new NotFoundException('Question not found in this interview');
    }

    // Upsert answer
    const existingAnswer = await this.prisma.answer.findFirst({
      where: { interviewQuestionId: interviewQuestion.id },
    });

    if (existingAnswer) {
      return this.prisma.answer.update({
        where: { id: existingAnswer.id },
        data: {
          answerText: dto.answerText,
          audioUrl: dto.audioUrl,
          answeredAt: new Date(),
        },
      });
    }

    return this.prisma.answer.create({
      data: {
        interviewQuestionId: interviewQuestion.id,
        answerText: dto.answerText,
        audioUrl: dto.audioUrl,
      },
    });
  }

  async getQuestionText(
    interviewId: number,
    questionId: number,
    userId: number,
  ): Promise<string> {
    const interview = await this.prisma.interview.findUnique({
      where: { id: interviewId },
    });
    if (!interview) throw new NotFoundException('Interview not found');
    if (interview.userId !== userId) throw new ForbiddenException();

    const interviewQuestion = await this.prisma.interviewQuestion.findFirst({
      where: { interviewId, id: questionId },
    });
    if (!interviewQuestion) {
      throw new NotFoundException('Question not found in this interview');
    }

    return interviewQuestion.questionTextSnapshot;
  }

  async evaluateNow(
    interviewId: number,
    questionId: number,
    userId: number,
  ) {
    // Verify interview belongs to user
    const interview = await this.prisma.interview.findUnique({
      where: { id: interviewId },
    });
    if (!interview) throw new NotFoundException('Interview not found');
    if (interview.userId !== userId) throw new ForbiddenException();
    if (interview.mode !== 'practice') {
      throw new BadRequestException('Instant evaluation is only available in practice mode');
    }

    // Find the interview question and its answer
    const interviewQuestion = await this.prisma.interviewQuestion.findFirst({
      where: { interviewId, id: questionId },
      include: { answers: true },
    });
    if (!interviewQuestion) {
      throw new NotFoundException('Question not found in this interview');
    }

    const answer = interviewQuestion.answers[0];
    if (!answer || !answer.answerText) {
      throw new BadRequestException('No answer found for this question');
    }

    // Run evaluation on this single answer
    const results = await this.evaluator.evaluate([
      {
        answerId: answer.id,
        questionText: interviewQuestion.questionTextSnapshot,
        answerText: answer.answerText,
      },
    ]);

    if (results.length === 0) {
      throw new BadRequestException('Evaluation returned no results');
    }

    const result = results[0];

    // Look up detected level id
    const dbLevels = await this.prisma.level.findMany();
    const levelByName = new Map(dbLevels.map((l) => [l.name, l.id]));
    const detectedLevelId = levelByName.get(result.detectedLevel) ?? null;

    // Persist the evaluation
    const evaluation = await this.prisma.answerEvaluation.upsert({
      where: { answerId: answer.id },
      create: {
        answerId: answer.id,
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

    return evaluation;
  }
}
