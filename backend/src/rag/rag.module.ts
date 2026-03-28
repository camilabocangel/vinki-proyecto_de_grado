import { Module } from '@nestjs/common';
import { KnowledgeModule } from '../knowledge/knowledge.module.js';
import { RagQuestionGeneratorService } from './services/rag-question-generator.service.js';

@Module({
  imports: [KnowledgeModule],
  providers: [RagQuestionGeneratorService],
  exports: [RagQuestionGeneratorService],
})
export class RagModule {}
