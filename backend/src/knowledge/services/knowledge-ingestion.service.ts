import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service.js';
import { ChunkingService } from './chunking.service.js';
import { EMBEDDING_PROVIDER, IEmbeddingProvider } from '../../llm/interfaces/embedding-provider.interface.js';

@Injectable()
export class KnowledgeIngestionService {
  private readonly logger = new Logger(KnowledgeIngestionService.name);

  constructor(
    private prisma: PrismaService,
    private chunking: ChunkingService,
    @Inject(EMBEDDING_PROVIDER) private embedding: IEmbeddingProvider,
  ) {}

  async ingestDocument(params: {
    title: string;
    content: string;
    sourceUrl?: string;
    languageId?: number;
    frameworkId?: number;
  }): Promise<{ documentId: number; chunkCount: number }> {
    const document = await this.prisma.knowledgeDocument.create({
      data: {
        title: params.title,
        rawContent: params.content,
        sourceUrl: params.sourceUrl,
        languageId: params.languageId,
        frameworkId: params.frameworkId,
        status: 'processing',
      },
    });

    try {
      const chunks = this.chunking.chunkText(params.content);
      this.logger.log(`Document ${document.id}: ${chunks.length} chunks created`);

      const texts = chunks.map((c) => c.content);
      const embeddings = await this.embedding.embedBatch(texts);

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embeddingStr = `[${embeddings[i].join(',')}]`;

        await this.prisma.$executeRawUnsafe(
          `INSERT INTO knowledge_chunks (document_id, chunk_index, content, token_count, embedding, created_at)
           VALUES ($1, $2, $3, $4, $5::vector, NOW())`,
          document.id,
          chunk.chunkIndex,
          chunk.content,
          chunk.tokenCount,
          embeddingStr,
        );
      }

      await this.prisma.knowledgeDocument.update({
        where: { id: document.id },
        data: { status: 'ready' },
      });

      this.logger.log(`Document ${document.id}: ingestion complete`);
      return { documentId: document.id, chunkCount: chunks.length };
    } catch (error) {
      this.logger.error(`Document ${document.id}: ingestion failed`, error);
      await this.prisma.knowledgeDocument.update({
        where: { id: document.id },
        data: { status: 'failed' },
      });
      throw error;
    }
  }
}
