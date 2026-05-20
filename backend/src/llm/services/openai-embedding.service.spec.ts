// Mock del SDK de OpenAI con el endpoint de embeddings.
const mockEmbeddingsCreate = jest.fn();
jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    embeddings: { create: mockEmbeddingsCreate },
  })),
}));

import { ConfigService } from '@nestjs/config';
import { OpenaiEmbeddingService } from './openai-embedding.service.js';

describe('OpenaiEmbeddingService', () => {
  let service: OpenaiEmbeddingService;

  beforeEach(() => {
    mockEmbeddingsCreate.mockReset();
    const config = { get: jest.fn().mockReturnValue('test-key') } as unknown as ConfigService;
    service = new OpenaiEmbeddingService(config);
  });

  it('should expose 1536 as the embedding dimension (text-embedding-3-small)', () => {
    expect(service.getDimensions()).toBe(1536);
  });

  describe('embed()', () => {
    it('should call OpenAI with text-embedding-3-small and return the embedding vector', async () => {
      mockEmbeddingsCreate.mockResolvedValue({
        data: [{ embedding: new Array(1536).fill(0.1), index: 0 }],
      });

      const result = await service.embed('hello world');

      const callArgs = mockEmbeddingsCreate.mock.calls[0][0];
      expect(callArgs.model).toBe('text-embedding-3-small');
      expect(callArgs.input).toBe('hello world');
      expect(result).toHaveLength(1536);
    });
  });

  describe('embedBatch()', () => {
    it('should return one vector per input, sorted by `index`', async () => {
      mockEmbeddingsCreate.mockResolvedValue({
        data: [
          { embedding: [3, 3, 3], index: 2 },
          { embedding: [1, 1, 1], index: 0 },
          { embedding: [2, 2, 2], index: 1 },
        ],
      });

      const result = await service.embedBatch(['a', 'b', 'c']);

      expect(result).toEqual([
        [1, 1, 1],
        [2, 2, 2],
        [3, 3, 3],
      ]);
    });
  });
});
