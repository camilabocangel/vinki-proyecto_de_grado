import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller.js';
import { SharedReportController } from './shared-report.controller.js';
import { ReportsService } from './reports.service.js';
import { CareerPredictionService } from './career-prediction.service.js';
import { TransferLearningService } from './transfer-learning.service.js';
import { PrismaService } from '../common/prisma.service.js';
import { RedisService } from '../common/redis.service.js';
import { CacheInterceptor } from '../common/cache.interceptor.js';

@Module({
  controllers: [ReportsController, SharedReportController],
  providers: [ReportsService, CareerPredictionService, TransferLearningService, PrismaService, RedisService, CacheInterceptor],
})
export class ReportsModule {}
