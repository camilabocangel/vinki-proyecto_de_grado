import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AchievementsService } from './achievements.service.js';

@Injectable()
export class AchievementListener {
  private readonly logger = new Logger(AchievementListener.name);

  constructor(private readonly achievementsService: AchievementsService) {}

  @OnEvent('evaluation.completed')
  async handleEvaluationCompleted(payload: { interviewId: number; userId: number }) {
    if (!payload.userId) return;

    try {
      await this.achievementsService.checkAndAward(payload.userId);
      this.logger.log(`Achievement check completed for user ${payload.userId}`);
    } catch (error) {
      this.logger.error(
        `Achievement check failed for user ${payload.userId}: ${(error as Error).message}`,
      );
    }
  }
}
