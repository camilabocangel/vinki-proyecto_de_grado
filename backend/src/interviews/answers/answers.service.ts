import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service.js';
import { SubmitAnswerDto } from '../dto/submit-answer.dto.js';

@Injectable()
export class AnswersService {
  constructor(private prisma: PrismaService) {}

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
}
