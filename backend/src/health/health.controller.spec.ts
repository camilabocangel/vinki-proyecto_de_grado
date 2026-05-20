import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { HealthController } from './health.controller.js';
import { PrismaService } from '../common/prisma.service.js';
import { RedisService } from '../common/redis.service.js';

describe('HealthController', () => {
  let controller: HealthController;
  let prisma: { $queryRaw: jest.Mock };
  let redis: { ping: jest.Mock };
  let queue: {
    getWaitingCount: jest.Mock;
    getActiveCount: jest.Mock;
    getFailedCount: jest.Mock;
  };
  let config: { get: jest.Mock };
  let fetchSpy: jest.SpyInstance;

  beforeEach(async () => {
    prisma = { $queryRaw: jest.fn() };
    redis = { ping: jest.fn() };
    queue = {
      getWaitingCount: jest.fn(),
      getActiveCount: jest.fn(),
      getFailedCount: jest.fn(),
    };
    config = { get: jest.fn() };

    // Stub global fetch (usado por checkStorage).
    fetchSpy = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue({ ok: true, status: 200 } as Response);

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
        { provide: ConfigService, useValue: config },
        { provide: getQueueToken('evaluation'), useValue: queue },
      ],
    }).compile();

    controller = moduleRef.get(HealthController);
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('should report status="ok" when DB and Redis are connected', async () => {
    prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
    redis.ping.mockResolvedValue(true);
    queue.getWaitingCount.mockResolvedValue(0);
    queue.getActiveCount.mockResolvedValue(0);
    queue.getFailedCount.mockResolvedValue(0);
    config.get.mockReturnValue(undefined);

    const result = await controller.check();

    expect(result.status).toBe('ok');
    expect(result.database).toBe('connected');
    expect(result.redis).toBe('connected');
    expect(result.evaluationQueue).toEqual({ waiting: 0, active: 0, failed: 0 });
    expect(result.storage).toBe('not_configured');
    expect(result.timestamp).toMatch(/\d{4}-\d{2}-\d{2}T/);
  });

  it('should report status="degraded" and database="disconnected" when DB query fails', async () => {
    prisma.$queryRaw.mockRejectedValue(new Error('connection refused'));
    redis.ping.mockResolvedValue(true);
    queue.getWaitingCount.mockResolvedValue(0);
    queue.getActiveCount.mockResolvedValue(0);
    queue.getFailedCount.mockResolvedValue(0);
    config.get.mockReturnValue(undefined);

    const result = await controller.check();

    expect(result.status).toBe('degraded');
    expect(result.database).toBe('disconnected');
  });

  it('should report status="degraded" and redis="disconnected" when ping returns false', async () => {
    prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
    redis.ping.mockResolvedValue(false);
    queue.getWaitingCount.mockResolvedValue(0);
    queue.getActiveCount.mockResolvedValue(0);
    queue.getFailedCount.mockResolvedValue(0);
    config.get.mockReturnValue(undefined);

    const result = await controller.check();

    expect(result.status).toBe('degraded');
    expect(result.redis).toBe('disconnected');
  });

  it('should return queue counts from BullMQ', async () => {
    prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
    redis.ping.mockResolvedValue(true);
    queue.getWaitingCount.mockResolvedValue(5);
    queue.getActiveCount.mockResolvedValue(2);
    queue.getFailedCount.mockResolvedValue(1);
    config.get.mockReturnValue(undefined);

    const result = await controller.check();

    expect(result.evaluationQueue).toEqual({ waiting: 5, active: 2, failed: 1 });
  });

  it('should report queue {waiting:-1, active:-1, failed:-1} when queue queries fail', async () => {
    prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
    redis.ping.mockResolvedValue(true);
    queue.getWaitingCount.mockRejectedValue(new Error('queue err'));
    queue.getActiveCount.mockResolvedValue(0);
    queue.getFailedCount.mockResolvedValue(0);
    config.get.mockReturnValue(undefined);

    const result = await controller.check();

    expect(result.evaluationQueue).toEqual({ waiting: -1, active: -1, failed: -1 });
  });

  describe('storage check', () => {
    it('should call fetch HEAD on AWS_S3_ENDPOINT when configured', async () => {
      prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
      redis.ping.mockResolvedValue(true);
      queue.getWaitingCount.mockResolvedValue(0);
      queue.getActiveCount.mockResolvedValue(0);
      queue.getFailedCount.mockResolvedValue(0);
      config.get.mockReturnValue('http://minio:9000');

      const result = await controller.check();

      expect(fetchSpy).toHaveBeenCalledWith(
        'http://minio:9000',
        expect.objectContaining({ method: 'HEAD' }),
      );
      expect(result.storage).toBe('connected');
    });

    it('should report storage="disconnected" on 5xx', async () => {
      prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
      redis.ping.mockResolvedValue(true);
      queue.getWaitingCount.mockResolvedValue(0);
      queue.getActiveCount.mockResolvedValue(0);
      queue.getFailedCount.mockResolvedValue(0);
      config.get.mockReturnValue('http://minio:9000');
      fetchSpy.mockResolvedValue({ ok: false, status: 503 } as Response);

      const result = await controller.check();

      expect(result.storage).toBe('disconnected');
    });

    it('should report storage="disconnected" when fetch throws', async () => {
      prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
      redis.ping.mockResolvedValue(true);
      queue.getWaitingCount.mockResolvedValue(0);
      queue.getActiveCount.mockResolvedValue(0);
      queue.getFailedCount.mockResolvedValue(0);
      config.get.mockReturnValue('http://minio:9000');
      fetchSpy.mockRejectedValue(new Error('network error'));

      const result = await controller.check();

      expect(result.storage).toBe('disconnected');
    });
  });
});
