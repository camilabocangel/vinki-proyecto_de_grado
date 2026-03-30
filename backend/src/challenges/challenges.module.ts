import { Module } from '@nestjs/common';
import { ChallengesController } from './challenges.controller.js';
import { ChallengesService } from './challenges.service.js';
import { ChallengeListener } from './challenge.listener.js';
import { PrismaService } from '../common/prisma.service.js';

@Module({
  controllers: [ChallengesController],
  providers: [ChallengesService, ChallengeListener, PrismaService],
  exports: [ChallengesService],
})
export class ChallengesModule {}
