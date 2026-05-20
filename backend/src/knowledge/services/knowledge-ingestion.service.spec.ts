import { KnowledgeIngestionService } from './knowledge-ingestion.service.js';
import { ChunkingService, Chunk } from './chunking.service.js';
import { PrismaService } from '../../common/prisma.service.js';
import type { IEmbeddingProvider } from '../../llm/interfaces/embedding-provider.interface.js';

// KnowledgeIngestionService implementa RF-29 (almacenamiento de embeddings)
// y la primera fase del flujo RAG. Cubre: chunking del contenido, llamada
// al embedding provider, inserción por chunk con vector serializado, y
// transición de estado del documento (processing -> ready / failed).

function buildPrisma() {
  return {
    knowledgeDocument: {
      create: jest.fn(),
      update: jest.fn(),
    },
    $executeRawUnsafe: jest.fn().mockResolvedValue(1),
  } as unknown as PrismaService & {
    knowledgeDocument: { create: jest.Mock; update: jest.Mock };
    $executeRawUnsafe: jest.Mock;
  };
}

function buildChunkingMock(chunks: Chunk[]): ChunkingService {
  return { chunkText: jest.fn().mockReturnValue(chunks) } as unknown as ChunkingService;
}

function buildEmbeddingMock(vectors: number[][]): IEmbeddingProvider {
  return {
    embed: jest.fn(),
    embedBatch: jest.fn().mockResolvedValue(vectors),
    getDimensions: jest.fn().mockReturnValue(vectors[0]?.length ?? 0),
  };
}

const baseParams = {
  title: 'Guía Backend',
  content: 'Contenido cualquiera',
  uploadedById: 7,
};

describe('KnowledgeIngestionService', () => {
  it('should create the document with status "processing" before chunking (RF-29)', async () => {
    const prisma = buildPrisma();
    prisma.knowledgeDocument.create.mockResolvedValue({ id: 99 });
    prisma.knowledgeDocument.update.mockResolvedValue({});
    const chunking = buildChunkingMock([
      { content: 'c1', tokenCount: 10, chunkIndex: 0 },
    ]);
    const embedding = buildEmbeddingMock([[0.1, 0.2]]);

    const service = new KnowledgeIngestionService(prisma as any, chunking, embedding);

    await service.ingestDocument(baseParams);

    expect(prisma.knowledgeDocument.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: baseParams.title,
        rawContent: baseParams.content,
        uploadedById: baseParams.uploadedById,
        status: 'processing',
      }),
    });
  });

  it('should call EMBEDDING_PROVIDER.embedBatch with the chunk contents', async () => {
    const prisma = buildPrisma();
    prisma.knowledgeDocument.create.mockResolvedValue({ id: 1 });
    prisma.knowledgeDocument.update.mockResolvedValue({});
    const chunks: Chunk[] = [
      { content: 'A', tokenCount: 1, chunkIndex: 0 },
      { content: 'B', tokenCount: 2, chunkIndex: 1 },
    ];
    const embedding = buildEmbeddingMock([
      [0.1, 0.2],
      [0.3, 0.4],
    ]);
    const service = new KnowledgeIngestionService(prisma as any, buildChunkingMock(chunks), embedding);

    await service.ingestDocument(baseParams);

    expect(embedding.embedBatch).toHaveBeenCalledWith(['A', 'B']);
  });

  it('should persist each chunk with its vector serialized as pgvector literal', async () => {
    const prisma = buildPrisma();
    prisma.knowledgeDocument.create.mockResolvedValue({ id: 42 });
    prisma.knowledgeDocument.update.mockResolvedValue({});
    const chunks: Chunk[] = [
      { content: 'A', tokenCount: 11, chunkIndex: 0 },
      { content: 'B', tokenCount: 22, chunkIndex: 1 },
    ];
    const vectors = [
      [0.1, 0.2],
      [0.3, 0.4],
    ];
    const service = new KnowledgeIngestionService(
      prisma as any,
      buildChunkingMock(chunks),
      buildEmbeddingMock(vectors),
    );

    await service.ingestDocument(baseParams);

    expect(prisma.$executeRawUnsafe).toHaveBeenCalledTimes(2);

    const firstInsert = prisma.$executeRawUnsafe.mock.calls[0];
    // Args: [sql, documentId, chunkIndex, content, tokenCount, embeddingStr]
    expect(firstInsert[1]).toBe(42); // documentId
    expect(firstInsert[2]).toBe(0); // chunkIndex
    expect(firstInsert[3]).toBe('A'); // content
    expect(firstInsert[4]).toBe(11); // tokenCount
    expect(firstInsert[5]).toBe('[0.1,0.2]'); // embedding serializado

    const secondInsert = prisma.$executeRawUnsafe.mock.calls[1];
    expect(secondInsert[2]).toBe(1);
    expect(secondInsert[3]).toBe('B');
    expect(secondInsert[5]).toBe('[0.3,0.4]');
  });

  it('should transition the document to status "ready" after successful ingestion', async () => {
    const prisma = buildPrisma();
    prisma.knowledgeDocument.create.mockResolvedValue({ id: 5 });
    prisma.knowledgeDocument.update.mockResolvedValue({});
    const service = new KnowledgeIngestionService(
      prisma as any,
      buildChunkingMock([{ content: 'c', tokenCount: 1, chunkIndex: 0 }]),
      buildEmbeddingMock([[0.1]]),
    );

    const result = await service.ingestDocument(baseParams);

    expect(prisma.knowledgeDocument.update).toHaveBeenCalledWith({
      where: { id: 5 },
      data: { status: 'ready' },
    });
    expect(result).toEqual({ documentId: 5, chunkCount: 1 });
  });

  it('should mark the document as "failed" and rethrow if embedding fails', async () => {
    const prisma = buildPrisma();
    prisma.knowledgeDocument.create.mockResolvedValue({ id: 8 });
    prisma.knowledgeDocument.update.mockResolvedValue({});
    const embedding: IEmbeddingProvider = {
      embed: jest.fn(),
      embedBatch: jest.fn().mockRejectedValue(new Error('OpenAI timeout')),
      getDimensions: jest.fn(),
    };
    const service = new KnowledgeIngestionService(
      prisma as any,
      buildChunkingMock([{ content: 'c', tokenCount: 1, chunkIndex: 0 }]),
      embedding,
    );

    await expect(service.ingestDocument(baseParams)).rejects.toThrow('OpenAI timeout');

    expect(prisma.knowledgeDocument.update).toHaveBeenCalledWith({
      where: { id: 8 },
      data: { status: 'failed' },
    });
  });
});
