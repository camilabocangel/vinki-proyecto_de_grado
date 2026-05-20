// Mock de ioredis. El constructor de RedisService llama a `new Redis(url, ...)`
// y luego `.connect()` y `.on('error', ...)`. Capturamos esa instancia para
// inspeccionar las llamadas.
const mockRedisInstance = {
  on: jest.fn(),
  connect: jest.fn().mockResolvedValue(undefined),
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  keys: jest.fn(),
  ping: jest.fn(),
  quit: jest.fn(),
};
const mockRedisCtor = jest.fn().mockImplementation(() => mockRedisInstance);
jest.mock('ioredis', () => ({
  __esModule: true,
  default: mockRedisCtor,
}));

import { ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service.js';

function buildService(): RedisService {
  const config = {
    get: jest.fn().mockImplementation((_k: string, def?: string) => def),
  } as unknown as ConfigService;
  return new RedisService(config);
}

describe('RedisService', () => {
  let service: RedisService;

  beforeEach(() => {
    Object.values(mockRedisInstance).forEach(
      (fn) => (fn as jest.Mock).mockClear?.(),
    );
    mockRedisCtor.mockClear();
    service = buildService();
  });

  describe('constructor', () => {
    it('should instantiate ioredis with the URL from config and lazyConnect:true', () => {
      expect(mockRedisCtor).toHaveBeenCalledWith(
        expect.stringMatching(/^redis:\/\//),
        expect.objectContaining({ lazyConnect: true, maxRetriesPerRequest: 3 }),
      );
    });

    it('should attach an error listener and call .connect() at startup', () => {
      expect(mockRedisInstance.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockRedisInstance.connect).toHaveBeenCalled();
    });
  });

  describe('get()', () => {
    it('should delegate to client.get and return the cached value', async () => {
      mockRedisInstance.get.mockResolvedValue('cached-value');

      const result = await service.get('key');

      expect(mockRedisInstance.get).toHaveBeenCalledWith('key');
      expect(result).toBe('cached-value');
    });

    it('should return null when the key is absent', async () => {
      mockRedisInstance.get.mockResolvedValue(null);

      const result = await service.get('missing');

      expect(result).toBeNull();
    });
  });

  describe('set()', () => {
    it('should call client.set with EX TTL when ttlSeconds is provided', async () => {
      await service.set('key', 'value', 60);

      expect(mockRedisInstance.set).toHaveBeenCalledWith('key', 'value', 'EX', 60);
    });

    it('should call client.set without TTL flag when ttlSeconds is omitted', async () => {
      await service.set('key', 'value');

      expect(mockRedisInstance.set).toHaveBeenCalledWith('key', 'value');
    });
  });

  describe('del() — glob pattern', () => {
    it('should not call del when no keys match the pattern', async () => {
      mockRedisInstance.keys.mockResolvedValue([]);

      await service.del('cache:*');

      expect(mockRedisInstance.keys).toHaveBeenCalledWith('cache:*');
      expect(mockRedisInstance.del).not.toHaveBeenCalled();
    });

    it('should call del with all matching keys when found', async () => {
      mockRedisInstance.keys.mockResolvedValue(['cache:a', 'cache:b']);

      await service.del('cache:*');

      expect(mockRedisInstance.del).toHaveBeenCalledWith('cache:a', 'cache:b');
    });
  });

  describe('ping()', () => {
    it('should return true when Redis responds with "PONG"', async () => {
      mockRedisInstance.ping.mockResolvedValue('PONG');

      expect(await service.ping()).toBe(true);
    });

    it('should return false when Redis responds with something else', async () => {
      mockRedisInstance.ping.mockResolvedValue('???');

      expect(await service.ping()).toBe(false);
    });

    it('should return false when ping() throws (Redis unreachable)', async () => {
      mockRedisInstance.ping.mockRejectedValue(new Error('ECONNREFUSED'));

      expect(await service.ping()).toBe(false);
    });
  });

  describe('onModuleDestroy()', () => {
    it('should call client.quit() to gracefully close the connection', async () => {
      mockRedisInstance.quit.mockResolvedValue('OK');

      await service.onModuleDestroy();

      expect(mockRedisInstance.quit).toHaveBeenCalled();
    });
  });
});
