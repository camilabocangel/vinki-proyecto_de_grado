import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { KnowledgeIngestionService } from '../services/knowledge-ingestion.service.js';

export interface IngestionJobData {
  documentId: number;
  title: string;
  content: string;
  sourceUrl?: string;
  languageId?: number;
  frameworkId?: number;
  uploadedById: number;
}

@Processor('knowledge-ingestion')
export class IngestionProcessor extends WorkerHost {
  private readonly logger = new Logger(IngestionProcessor.name);

  constructor(private ingestionService: KnowledgeIngestionService) {
    super();
  }

  async process(job: Job<IngestionJobData>): Promise<void> {
    this.logger.log(`Processing ingestion job ${job.id} for document ${job.data.documentId}`);

    await this.ingestionService.ingestDocument({
      title: job.data.title,
      content: job.data.content,
      sourceUrl: job.data.sourceUrl,
      languageId: job.data.languageId,
      frameworkId: job.data.frameworkId,
      uploadedById: job.data.uploadedById,
    });

    this.logger.log(`Ingestion job ${job.id} completed`);
  }
}
