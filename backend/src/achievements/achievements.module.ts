import { Module } from '@nestjs/common';
import { AchievementsController } from './achievements.controller.js';
import { AchievementsService } from './achievements.service.js';
import { AchievementListener } from './achievement.listener.js';
import { PrismaService } from '../common/prisma.service.js';

@Module({
  controllers: [AchievementsController],
  providers: [AchievementsService, AchievementListener, PrismaService],
  exports: [AchievementsService],
})
export class AchievementsModule {}
