import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service.js';
import { EMBEDDING_PROVIDER, IEmbeddingProvider } from '../../llm/interfaces/embedding-provider.interface.js';

export interface RetrievedChunk {
  content: string;
  distance: number;
  documentTitle: string;
}

@Injectable()
export class KnowledgeRetrievalService {
  constructor(
    private prisma: PrismaService,
    @Inject(EMBEDDING_PROVIDER) private embedding: IEmbeddingProvider,
  ) {}

  async searchRelevantChunks(params: {
    query: string;
    languageId?: number;
    frameworkId?: number;
    limit?: number;
  }): Promise<RetrievedChunk[]> {
    const queryEmbedding = await this.embedding.embed(params.query);
    const embeddingStr = `[${queryEmbedding.join(',')}]`;
    const limit = params.limit ?? 5;

    const results = await this.prisma.$queryRawUnsafe<
      Array<{ content: string; distance: number; document_title: string }>
    >(
      `SELECT kc.content,
              kc.embedding <=> $1::vector AS distance,
              kd.title AS document_title
       FROM knowledge_chunks kc
       JOIN knowledge_documents kd ON kd.id = kc.document_id
       WHERE kd.status = 'ready'
         AND kc.embedding IS NOT NULL
         AND ($2::int IS NULL OR kd.language_id = $2)
         AND ($3::int IS NULL OR kd.framework_id = $3)
       ORDER BY distance ASC
       LIMIT $4`,
      embeddingStr,
      params.languageId ?? null,
      params.frameworkId ?? null,
      limit,
    );

    return results.map((r) => ({
      content: r.content,
      distance: r.distance,
      documentTitle: r.document_title,
    }));
  }
}
