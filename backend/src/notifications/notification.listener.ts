import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../common/prisma.service.js';
import { EmailService } from './email.service.js';

@Injectable()
export class NotificationListener {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  @OnEvent('evaluation.completed')
  async handleEvaluationCompleted(payload: { interviewId: number; userId: number }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.userId },
    });
    if (user?.email) {
      await this.emailService.sendEvaluationComplete(
        user.email,
        user.name,
        payload.interviewId,
      );
    }
  }
}
