import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(userId: number, action: string, entity: string, entityId?: number, details?: string) {
    await this.prisma.auditLog.create({
      data: { userId, action, entity, entityId, details },
    });
  }

  async getLogs(page = 1, limit = 20, userId?: number) {
    const where = userId ? { userId } : {};
    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true, role: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { data, total, page, limit };
  }
}
