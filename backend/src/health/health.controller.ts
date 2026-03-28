import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../common/prisma.service.js';
import { RedisService } from '../common/redis.service.js';

@Controller('health')
export class HealthController {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
    private config: ConfigService,
    @InjectQueue('evaluation') private evaluationQueue: Queue,
  ) {}

  @Get()
  async check() {
    const timestamp = new Date().toISOString();

    const [database, redis, evaluationQueue, storage] = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkEvaluationQueue(),
      this.checkStorage(),
    ]);

    const dbStatus = database.status === 'fulfilled' ? database.value : 'disconnected';
    const redisStatus = redis.status === 'fulfilled' ? redis.value : 'disconnected';
    const queueStatus =
      evaluationQueue.status === 'fulfilled'
        ? evaluationQueue.value
        : { waiting: -1, active: -1, failed: -1 };
    const storageStatus = storage.status === 'fulfilled' ? storage.value : 'disconnected';

    const overallStatus =
      dbStatus === 'connected' && redisStatus === 'connected'
        ? 'ok'
        : 'degraded';

    return {
      status: overallStatus,
      timestamp,
      database: dbStatus,
      redis: redisStatus,
      evaluationQueue: queueStatus,
      storage: storageStatus,
    };
  }

  private async checkDatabase(): Promise<string> {
    await this.prisma.$queryRaw`SELECT 1`;
    return 'connected';
  }

  private async checkRedis(): Promise<string> {
    const ok = await this.redisService.ping();
    return ok ? 'connected' : 'disconnected';
  }

  private async checkEvaluationQueue(): Promise<{
    waiting: number;
    active: number;
    failed: number;
  }> {
    const [waiting, active, failed] = await Promise.all([
      this.evaluationQueue.getWaitingCount(),
      this.evaluationQueue.getActiveCount(),
      this.evaluationQueue.getFailedCount(),
    ]);
    return { waiting, active, failed };
  }

  private async checkStorage(): Promise<string> {
    const endpoint = this.config.get<string>('AWS_S3_ENDPOINT');
    if (!endpoint) {
      return 'not_configured';
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(endpoint, {
        method: 'HEAD',
        signal: controller.signal,
      });
      // MinIO returns various status codes; any response means it's reachable
      return response.ok || response.status < 500 ? 'connected' : 'disconnected';
    } finally {
      clearTimeout(timeout);
    }
  }
}
