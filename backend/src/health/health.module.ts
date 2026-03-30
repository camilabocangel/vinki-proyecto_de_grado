import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { HealthController } from './health.controller.js';
import { PrismaService } from '../common/prisma.service.js';
import { RedisService } from '../common/redis.service.js';

@Module({
  imports: [BullModule.registerQueue({ name: 'evaluation' })],
  controllers: [HealthController],
  providers: [PrismaService, RedisService],
})
export class HealthModule {}
