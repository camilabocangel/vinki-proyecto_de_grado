import { Controller, Sse, Get, Post, HttpCode, HttpStatus, UseGuards, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { Request } from 'express';
import { Observable, fromEvent, map, filter, takeUntil } from 'rxjs';
import { JwtCookieGuard } from '../auth/guards/jwt-cookie.guard.js';
import { PrismaService } from '../common/prisma.service.js';

interface MessageEvent {
  data: string | object;
  type?: string;
}

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(
    private eventEmitter: EventEmitter2,
    private prisma: PrismaService,
  ) {}

  @Get('pending')
  @UseGuards(JwtCookieGuard)
  async getPending(@Req() req: Request) {
    const userId = (req as any).user.userId;

    const interviews = await this.prisma.interview.findMany({
      where: {
        userId,
        evaluationStatus: 'completed',
        evaluationNotificationSeen: false,
      },
      orderBy: { finishedAt: 'desc' },
      take: 10,
      select: {
        id: true,
        finishedAt: true,
      },
    });

    const count = await this.prisma.interview.count({
      where: {
        userId,
        evaluationStatus: 'completed',
        evaluationNotificationSeen: false,
      },
    });

    return {
      count,
      items: interviews.map((iv) => ({
        interviewId: iv.id,
        completedAt: iv.finishedAt?.toISOString() ?? null,
      })),
    };
  }

  @Post('mark-all-seen')
  @UseGuards(JwtCookieGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async markAllSeen(@Req() req: Request) {
    const userId = (req as any).user.userId;

    await this.prisma.interview.updateMany({
      where: {
        userId,
        evaluationStatus: 'completed',
        evaluationNotificationSeen: false,
      },
      data: { evaluationNotificationSeen: true },
    });
  }

  @Sse('stream')
  @UseGuards(JwtCookieGuard)
  stream(@Req() req: Request): Observable<MessageEvent> {
    const user = (req as any).user;
    const userId = user.userId;

    const close$ = fromEvent(req, 'close');

    return new Observable<MessageEvent>((subscriber) => {
      const onCompleted = (data: { interviewId: number; userId: number }) => {
        if (data.userId === userId) {
          subscriber.next({
            type: 'evaluation.completed',
            data: JSON.stringify({
              type: 'evaluation.completed',
              interviewId: data.interviewId,
              message: '¡Tu evaluación está lista!',
            }),
          });
        }
      };

      const onFailed = (data: { interviewId: number; userId?: number }) => {
        if (data.userId === userId) {
          subscriber.next({
            type: 'evaluation.failed',
            data: JSON.stringify({
              type: 'evaluation.failed',
              interviewId: data.interviewId,
              message: 'Hubo un error procesando tu evaluación.',
            }),
          });
        }
      };

      this.eventEmitter.on('evaluation.completed', onCompleted);
      this.eventEmitter.on('evaluation.failed', onFailed);

      return () => {
        this.eventEmitter.off('evaluation.completed', onCompleted);
        this.eventEmitter.off('evaluation.failed', onFailed);
      };
    }).pipe(takeUntil(close$));
  }
}
