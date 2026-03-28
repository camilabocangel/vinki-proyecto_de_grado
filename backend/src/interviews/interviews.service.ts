import {
  Inject,
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../common/prisma.service.js';
import { QuestionSelectorService } from './services/question-selector.service.js';
import { RagQuestionGeneratorService } from '../rag/services/rag-question-generator.service.js';
import { EMBEDDING_PROVIDER, IEmbeddingProvider } from '../llm/interfaces/embedding-provider.interface.js';
import { CreateInterviewDto } from './dto/create-interview.dto.js';

@Injectable()
export class InterviewsService {
  private readonly logger = new Logger(InterviewsService.name);

  constructor(
    private prisma: PrismaService,
    private questionSelector: QuestionSelectorService,
    private ragGenerator: RagQuestionGeneratorService,
    @Inject(EMBEDDING_PROVIDER) private embeddingProvider: IEmbeddingProvider,
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

    const interviewMode = dto.mode ?? 'evaluation';

    // For behavioral mode: select only behavioral questions
    if (interviewMode === 'behavioral') {
      const behavioralQuestions = await this.prisma.question.findMany({
        where: {
          type: 'behavioral',
          levelId: dto.chosenLevelId,
        },
        take: 5,
      });

      if (behavioralQuestions.length === 0) {
        throw new NotFoundException('No behavioral questions found for the selected level');
      }

      const interview = await this.prisma.$transaction(async (tx) => {
        const interview = await tx.interview.create({
          data: {
            userId,
            roleId: dto.roleId,
            languageId: dto.languageId,
            frameworkId: dto.frameworkId,
            chosenLevelId: dto.chosenLevelId,
            mode: 'behavioral',
          },
        });

        let orderNumber = 1;
        for (const q of behavioralQuestions) {
          await tx.interviewQuestion.create({
            data: {
              interviewId: interview.id,
              questionId: q.id,
              questionTextSnapshot: q.questionText,
              orderNumber: orderNumber++,
              generatedByAi: false,
            },
          });
        }

        return interview;
      });

      return this.findOne(interview.id, userId);
    }

    // Try RAG generation first
    let ragQuestionTexts: string[] = [];
    try {
      ragQuestionTexts = await this.ragGenerator.generateQuestions({
        roleText,
        level: level?.name ?? '',
        language: language?.name ?? '',
        languageId: dto.languageId,
        frameworkId: dto.frameworkId,
        count: 2,
      });
    } catch (error) {
      this.logger.warn('RAG generation failed, using curated questions only', error);
    }

    // Select curated questions (3 if RAG succeeded, 5 if not)
    const curatedCount = ragQuestionTexts.length > 0 ? 3 : 5;
    const allCuratedIds = await this.questionSelector.selectQuestions({
      languageId: dto.languageId,
      frameworkId: dto.frameworkId,
      levelId: dto.chosenLevelId,
      roleText,
    });
    const curatedIds = allCuratedIds.slice(0, curatedCount);

    if (curatedIds.length === 0 && ragQuestionTexts.length === 0) {
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
          mode: interviewMode,
        },
      });

      // Add curated questions
      const questions = await tx.question.findMany({
        where: { id: { in: curatedIds } },
      });

      let orderNumber = 1;
      for (const q of questions) {
        await tx.interviewQuestion.create({
          data: {
            interviewId: interview.id,
            questionId: q.id,
            questionTextSnapshot: q.questionText,
            orderNumber: orderNumber++,
          },
        });
      }

      // Add RAG-generated questions
      for (const text of ragQuestionTexts) {
        const embedding = await this.embeddingProvider.embed(text);
        const embeddingStr = `[${embedding.join(',')}]`;

        const [ragQuestion] = await tx.$queryRawUnsafe<Array<{ id: number }>>(
          `INSERT INTO questions (question_text, type, source, language_id, framework_id, level_id, skill_id, embedding, created_at)
           VALUES ($1, 'open', 'rag', $2, $3, $4, $5, $6::vector, NOW())
           RETURNING id`,
          text,
          dto.languageId ?? questions[0]?.languageId ?? 1,
          dto.frameworkId ?? null,
          dto.chosenLevelId,
          questions[0]?.skillId ?? 1,
          embeddingStr,
        );

        await tx.interviewQuestion.create({
          data: {
            interviewId: interview.id,
            questionId: ragQuestion.id,
            questionTextSnapshot: text,
            orderNumber: orderNumber++,
            generatedByAi: true,
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
            question: {
              select: { source: true },
            },
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
