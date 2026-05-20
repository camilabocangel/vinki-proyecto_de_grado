// Mock del SDK de Google Generative AI.
// Tipados como `jest.fn<any, any[]>()` para que `mock.calls` sea un array
// abierto y no la tupla vacía que TS inferiría por el factory.
const mockEmbedContent = jest.fn<any, any[]>();
const mockGetGenerativeModel = jest.fn<any, any[]>(() => ({
  embedContent: mockEmbedContent,
}));
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: mockGetGenerativeModel,
  })),
}));

import { ConfigService } from '@nestjs/config';
import { GeminiEmbeddingService } from './gemini-embedding.service.js';

function buildService(): GeminiEmbeddingService {
  const config = { get: jest.fn().mockReturnValue('fake-key') } as unknown as ConfigService;
  return new GeminiEmbeddingService(config);
}

describe('GeminiEmbeddingService', () => {
  beforeEach(() => {
    mockEmbedContent.mockReset();
    mockGetGenerativeModel.mockClear();
  });

  it('should expose 768 as the embedding dimension (text-embedding-004)', () => {
    expect(buildService().getDimensions()).toBe(768);
  });

  describe('embed()', () => {
    it('should call Gemini with text-embedding-004 and return the vector', async () => {
      mockEmbedContent.mockResolvedValue({
        embedding: { values: new Array(768).fill(0.5) },
      });

      const result = await buildService().embed('hello');

      expect(mockGetGenerativeModel.mock.calls[0][0].model).toBe('text-embedding-004');
      expect(mockEmbedContent).toHaveBeenCalledWith('hello');
      expect(result).toHaveLength(768);
    });
  });

  describe('embedBatch()', () => {
    it('should call embedContent once per text and return the vectors in input order', async () => {
      let counter = 0;
      mockEmbedContent.mockImplementation(async () => {
        counter += 1;
        return { embedding: { values: [counter, counter, counter] } };
      });

      const result = await buildService().embedBatch(['a', 'b', 'c']);

      expect(mockEmbedContent).toHaveBeenCalledTimes(3);
      expect(result).toEqual([
        [1, 1, 1],
        [2, 2, 2],
        [3, 3, 3],
      ]);
    });
  });
});
