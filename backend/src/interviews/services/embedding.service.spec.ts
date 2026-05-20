// Mock del SDK de OpenAI antes del import del servicio.
const mockEmbeddingsCreate = jest.fn();
jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    embeddings: { create: mockEmbeddingsCreate },
  })),
}));

import { ConfigService } from '@nestjs/config';
import { EmbeddingService } from './embedding.service.js';

function buildConfig(values: Record<string, string | undefined>): ConfigService {
  return {
    get: jest.fn().mockImplementation((key: string, def?: string) =>
      values[key] !== undefined ? values[key] : def,
    ),
  } as unknown as ConfigService;
}

describe('EmbeddingService', () => {
  beforeEach(() => {
    mockEmbeddingsCreate.mockReset();
  });

  describe('when LLM_SANDBOX is true (default)', () => {
    it('should return a 1536-length zero vector without calling OpenAI', async () => {
      const service = new EmbeddingService(buildConfig({ LLM_SANDBOX: 'true' }));

      const result = await service.embed('hello');

      expect(result).toHaveLength(1536);
      expect(result.every((v) => v === 0)).toBe(true);
      expect(mockEmbeddingsCreate).not.toHaveBeenCalled();
    });
  });

  describe('when LLM_SANDBOX is false', () => {
    it('should call OpenAI text-embedding-3-small with the text and return its embedding', async () => {
      mockEmbeddingsCreate.mockResolvedValue({
        data: [{ embedding: new Array(1536).fill(0.5) }],
      });
      const service = new EmbeddingService(buildConfig({ LLM_SANDBOX: 'false' }));

      const result = await service.embed('hola');

      expect(mockEmbeddingsCreate).toHaveBeenCalledWith({
        model: 'text-embedding-3-small',
        input: 'hola',
      });
      expect(result).toHaveLength(1536);
      expect(result[0]).toBe(0.5);
    });
  });
});
