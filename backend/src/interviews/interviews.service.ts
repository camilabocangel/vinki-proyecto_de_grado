import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../common/prisma.service.js';
import { QuestionSelectorService } from './services/question-selector.service.js';
import { CreateInterviewDto } from './dto/create-interview.dto.js';

@Injectable()
export class InterviewsService {
  constructor(
    private prisma: PrismaService,
    private questionSelector: QuestionSelectorService,
    @InjectQueue('evaluation') private evaluationQueue: Queue,
  ) {}

  async create(userId: number, dto: CreateInterviewDto) {
    // Check no active interview
    const active = await this.prisma.interview.findFirst({
      where: { userId, finishedAt: null },
    });
    if (active) {
      throw new ConflictException('You already have an active interview');
    }

    // Get role name for embedding context
    const role = await this.prisma.role.findUnique({ where: { id: dto.roleId } });
    if (!role) throw new NotFoundException('Role not found');

    const language = dto.languageId
      ? await this.prisma.language.findUnique({ where: { id: dto.languageId } })
      : null;
    const framework = dto.frameworkId
      ? await this.prisma.framework.findUnique({ where: { id: dto.frameworkId } })
      : null;
    const level = await this.prisma.level.findUnique({ where: { id: dto.chosenLevelId } });

    const roleText = [role.name, language?.name, framework?.name, level?.name]
      .filter(Boolean)
      .join(' ');

    // Select 5 questions
    const questionIds = await this.questionSelector.selectQuestions({
      languageId: dto.languageId,
      frameworkId: dto.frameworkId,
      levelId: dto.chosenLevelId,
      roleText,
    });

    if (questionIds.length === 0) {
      throw new NotFoundException('No questions found for the selected criteria');
    }

    // Create interview with questions in a transaction
    const interview = await this.prisma.$transaction(async (tx) => {
      const interview = await tx.interview.create({
        data: {
          userId,
          roleId: dto.roleId,
          languageId: dto.languageId,
          frameworkId: dto.frameworkId,
          chosenLevelId: dto.chosenLevelId,
          mode: dto.mode ?? 'evaluation',
        },
      });

      const questions = await tx.question.findMany({
        where: { id: { in: questionIds } },
      });

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        await tx.interviewQuestion.create({
          data: {
            interviewId: interview.id,
            questionId: q.id,
            questionTextSnapshot: q.questionText,
            orderNumber: i + 1,
          },
        });
      }

      return interview;
    });

    return this.findOne(interview.id, userId);
  }

  async findOne(id: number, userId: number) {
    const interview = await this.prisma.interview.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: { orderNumber: 'asc' },
          include: {
            answers: true,
          },
        },
      },
    });

    if (!interview) throw new NotFoundException('Interview not found');
    if (interview.userId !== userId) throw new ForbiddenException();

    return interview;
  }

  async finish(id: number, userId: number) {
    const interview = await this.prisma.interview.findUnique({ where: { id } });
    if (!interview) throw new NotFoundException('Interview not found');
    if (interview.userId !== userId) throw new ForbiddenException();
    if (interview.finishedAt) throw new ConflictException('Interview already finished');

    await this.prisma.interview.update({
      where: { id },
      data: {
        finishedAt: new Date(),
        evaluationStatus: 'processing',
      },
    });

    // Enqueue evaluation job
    await this.evaluationQueue.add(
      'evaluate',
      { interviewId: id },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      },
    );

    return { interviewId: id, evaluationStatus: 'processing' };
  }
}
