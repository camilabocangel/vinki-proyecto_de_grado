import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { KnowledgeController } from './knowledge.controller.js';
import { ChunkingService } from './services/chunking.service.js';
import { KnowledgeIngestionService } from './services/knowledge-ingestion.service.js';
import { KnowledgeRetrievalService } from './services/knowledge-retrieval.service.js';
import { IngestionProcessor } from './processors/ingestion.processor.js';
import { PrismaService } from '../common/prisma.service.js';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'knowledge-ingestion' }),
  ],
  controllers: [KnowledgeController],
  providers: [
    ChunkingService,
    KnowledgeIngestionService,
    KnowledgeRetrievalService,
    IngestionProcessor,
    PrismaService,
  ],
  exports: [KnowledgeRetrievalService],
})
export class KnowledgeModule {}
