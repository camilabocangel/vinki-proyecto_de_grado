import type { Job } from 'bullmq';
import { IngestionProcessor, IngestionJobData } from './ingestion.processor.js';
import { KnowledgeIngestionService } from '../services/knowledge-ingestion.service.js';

function makeJob(data: Partial<IngestionJobData> = {}): Job<IngestionJobData> {
  return {
    id: 'job-1',
    data: {
      documentId: 99,
      title: 'Guía',
      content: 'Contenido',
      uploadedById: 7,
      ...data,
    } as IngestionJobData,
  } as unknown as Job<IngestionJobData>;
}

describe('IngestionProcessor', () => {
  let ingestion: jest.Mocked<KnowledgeIngestionService>;
  let processor: IngestionProcessor;

  beforeEach(() => {
    ingestion = {
      ingestDocument: jest.fn().mockResolvedValue({ documentId: 99, chunkCount: 3 }),
    } as unknown as jest.Mocked<KnowledgeIngestionService>;
    processor = new IngestionProcessor(ingestion);
  });

  it('should delegate to KnowledgeIngestionService.ingestDocument with the job payload', async () => {
    const job = makeJob({
      sourceUrl: 'http://example.com',
      languageId: 1,
      frameworkId: 2,
    });

    await processor.process(job);

    expect(ingestion.ingestDocument).toHaveBeenCalledWith({
      title: 'Guía',
      content: 'Contenido',
      sourceUrl: 'http://example.com',
      languageId: 1,
      frameworkId: 2,
      uploadedById: 7,
    });
  });

  it('should propagate errors from the ingestion service so BullMQ can retry', async () => {
    ingestion.ingestDocument.mockRejectedValue(new Error('OpenAI timeout'));

    await expect(processor.process(makeJob())).rejects.toThrow('OpenAI timeout');
  });
});
