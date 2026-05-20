import { ConfigService } from '@nestjs/config';
import { MockEmbeddingService } from './mock-embedding.service.js';

function buildConfig(value: string | undefined): ConfigService {
  // El servicio usa `config.get(KEY, default)` — el mock debe respetar el
  // parámetro de default cuando el valor configurado es undefined, tal
  // como hace el ConfigService real.
  return {
    get: jest.fn().mockImplementation((_key: string, defaultValue?: string) =>
      value === undefined ? defaultValue : value,
    ),
  } as unknown as ConfigService;
}

describe('MockEmbeddingService', () => {
  it('should default to 1536 dimensions when EMBEDDING_DIMENSIONS is not set', () => {
    const service = new MockEmbeddingService(buildConfig(undefined));
    expect(service.getDimensions()).toBe(1536);
  });

  it('should honor EMBEDDING_DIMENSIONS from the config service', () => {
    const service = new MockEmbeddingService(buildConfig('768'));
    expect(service.getDimensions()).toBe(768);
  });

  it('should return a zero-filled vector of the configured length on embed()', async () => {
    const service = new MockEmbeddingService(buildConfig('1536'));
    const vector = await service.embed('hello');

    expect(vector).toHaveLength(1536);
    expect(vector.every((v) => v === 0)).toBe(true);
  });

  it('should return one zero-filled vector per input text on embedBatch()', async () => {
    const service = new MockEmbeddingService(buildConfig('1536'));
    const batch = await service.embedBatch(['a', 'b', 'c']);

    expect(batch).toHaveLength(3);
    for (const vec of batch) {
      expect(vec).toHaveLength(1536);
      expect(vec.every((v) => v === 0)).toBe(true);
    }
  });
});
