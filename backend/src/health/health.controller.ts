import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';

@Controller('health')
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async check() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', timestamp: new Date().toISOString(), database: 'connected' };
    } catch {
      return { status: 'degraded', timestamp: new Date().toISOString(), database: 'disconnected' };
    }
  }
}
