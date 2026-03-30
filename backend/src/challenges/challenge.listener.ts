import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ChallengesService } from './challenges.service.js';

@Injectable()
export class ChallengeListener {
  private readonly logger = new Logger(ChallengeListener.name);

  constructor(private readonly challengesService: ChallengesService) {}

  @OnEvent('evaluation.completed')
  async handleEvaluationCompleted(payload: { interviewId: number; userId: number }) {
    if (!payload.userId) return;

    try {
      await this.challengesService.updateProgress(payload.userId);
      this.logger.log(`Challenge progress updated for user ${payload.userId}`);
    } catch (error) {
      this.logger.error(
        `Challenge progress update failed for user ${payload.userId}: ${(error as Error).message}`,
      );
    }
  }
}
