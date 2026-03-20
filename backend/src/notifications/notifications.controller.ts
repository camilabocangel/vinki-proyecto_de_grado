import { Controller, Sse, UseGuards, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { Request } from 'express';
import { Observable, fromEvent, map, filter, takeUntil } from 'rxjs';
import { JwtCookieGuard } from '../auth/guards/jwt-cookie.guard.js';

interface MessageEvent {
  data: string | object;
  type?: string;
}

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private eventEmitter: EventEmitter2) {}

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
