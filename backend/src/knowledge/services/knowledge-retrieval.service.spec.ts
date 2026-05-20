import { KnowledgeRetrievalService } from './knowledge-retrieval.service.js';
import { PrismaService } from '../../common/prisma.service.js';
import type { IEmbeddingProvider } from '../../llm/interfaces/embedding-provider.interface.js';

// KnowledgeRetrievalService implementa RF-30 (búsqueda por similitud
// semántica) y forma la primera mitad del flujo RAG (RF-31). Los tests
// blindan que: (1) se llama al embedding provider con el query original,
// (2) la consulta SQL se construye con el vector serializado, (3) los
// filtros opcionales (languageId, frameworkId) viajan a la consulta,
// (4) los resultados se mapean al shape de RetrievedChunk.

function makeEmbedding(): IEmbeddingProvider {
  return {
    embed: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]),
    embedBatch: jest.fn(),
    getDimensions: jest.fn().mockReturnValue(3),
  };
}

function makePrisma(rows: Array<{ content: string; distance: number; document_title: string }>) {
  return {
    $queryRawUnsafe: jest.fn().mockResolvedValue(rows),
  } as unknown as PrismaService & { $queryRawUnsafe: jest.Mock };
}

describe('KnowledgeRetrievalService', () => {
  it('should call EMBEDDING_PROVIDER.embed with the user query (RF-30/RF-31)', async () => {
    const embedding = makeEmbedding();
    const prisma = makePrisma([]);
    const service = new KnowledgeRetrievalService(prisma as any, embedding);

    await service.searchRelevantChunks({ query: 'REST best practices' });

    expect(embedding.embed).toHaveBeenCalledWith('REST best practices');
  });

  it('should serialize the embedding as a pgvector literal in the SQL query', async () => {
    const embedding = makeEmbedding();
    const prisma = makePrisma([]);
    const service = new KnowledgeRetrievalService(prisma as any, embedding);

    await service.searchRelevantChunks({ query: 'TypeScript generics' });

    const queryArgs = (prisma as any).$queryRawUnsafe.mock.calls[0];
    // El primer parámetro es el SQL; el segundo (parámetro $1) es el vector
    // serializado como "[v1,v2,v3]".
    expect(queryArgs[1]).toBe('[0.1,0.2,0.3]');
  });

  it('should pass language/framework filters through to the SQL parameters', async () => {
    const embedding = makeEmbedding();
    const prisma = makePrisma([]);
    const service = new KnowledgeRetrievalService(prisma as any, embedding);

    await service.searchRelevantChunks({
      query: 'q',
      languageId: 7,
      frameworkId: 11,
      limit: 3,
    });

    const args = (prisma as any).$queryRawUnsafe.mock.calls[0];
    // Orden: [sql, vector, languageId, frameworkId, limit]
    expect(args[2]).toBe(7);
    expect(args[3]).toBe(11);
    expect(args[4]).toBe(3);
  });

  it('should pass null filters and default limit (5) when not provided', async () => {
    const embedding = makeEmbedding();
    const prisma = makePrisma([]);
    const service = new KnowledgeRetrievalService(prisma as any, embedding);

    await service.searchRelevantChunks({ query: 'q' });

    const args = (prisma as any).$queryRawUnsafe.mock.calls[0];
    expect(args[2]).toBeNull();
    expect(args[3]).toBeNull();
    expect(args[4]).toBe(5);
  });

  it('should map raw SQL rows to the RetrievedChunk shape', async () => {
    const embedding = makeEmbedding();
    const prisma = makePrisma([
      { content: 'Chunk A', distance: 0.12, document_title: 'Doc 1' },
      { content: 'Chunk B', distance: 0.34, document_title: 'Doc 2' },
    ]);
    const service = new KnowledgeRetrievalService(prisma as any, embedding);

    const result = await service.searchRelevantChunks({ query: 'q' });

    expect(result).toEqual([
      { content: 'Chunk A', distance: 0.12, documentTitle: 'Doc 1' },
      { content: 'Chunk B', distance: 0.34, documentTitle: 'Doc 2' },
    ]);
  });

  it('should return an empty array when the knowledge base has no matches', async () => {
    const embedding = makeEmbedding();
    const prisma = makePrisma([]);
    const service = new KnowledgeRetrievalService(prisma as any, embedding);

    const result = await service.searchRelevantChunks({ query: 'algo raro' });

    expect(result).toEqual([]);
  });
});
