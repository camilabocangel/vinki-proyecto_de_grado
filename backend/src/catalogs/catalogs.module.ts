import { Module } from '@nestjs/common';
import { CatalogsController } from './catalogs.controller.js';
import { AdminQuestionsController } from './admin-questions.controller.js';
import { AdminAuditController } from './admin-audit.controller.js';
import { CatalogsService } from './catalogs.service.js';
import { QuestionGeneratorService } from '../interviews/services/question-generator.service.js';
import { PrismaService } from '../common/prisma.service.js';
import { AuditService } from '../common/audit.service.js';
import { RedisService } from '../common/redis.service.js';
import { CacheInterceptor } from '../common/cache.interceptor.js';

@Module({
  controllers: [CatalogsController, AdminQuestionsController, AdminAuditController],
  providers: [CatalogsService, QuestionGeneratorService, PrismaService, AuditService, RedisService, CacheInterceptor],
  exports: [CatalogsService, AuditService],
})
export class CatalogsModule {}
