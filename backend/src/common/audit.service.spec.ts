import { AuditService } from './audit.service.js';
import { PrismaService } from './prisma.service.js';

function buildPrisma() {
  return {
    auditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };
}

describe('AuditService', () => {
  let prisma: ReturnType<typeof buildPrisma>;
  let service: AuditService;

  beforeEach(() => {
    prisma = buildPrisma();
    service = new AuditService(prisma as unknown as PrismaService);
  });

  describe('log()', () => {
    it('should persist an audit entry with the action, entity and userId', async () => {
      prisma.auditLog.create.mockResolvedValue({ id: 1 });

      await service.log(7, 'login', 'user', 7);

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: 7,
          action: 'login',
          entity: 'user',
          entityId: 7,
          details: undefined,
        },
      });
    });

    it('should accept optional details string', async () => {
      prisma.auditLog.create.mockResolvedValue({ id: 1 });

      await service.log(7, 'delete', 'question', 42, '{"reason":"duplicate"}');

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: 7,
          action: 'delete',
          entity: 'question',
          entityId: 42,
          details: '{"reason":"duplicate"}',
        },
      });
    });

    it('should accept calls without entityId', async () => {
      prisma.auditLog.create.mockResolvedValue({ id: 1 });

      await service.log(7, 'logout', 'session');

      const call = prisma.auditLog.create.mock.calls[0][0];
      expect(call.data.entityId).toBeUndefined();
    });
  });

  describe('getLogs()', () => {
    it('should default to page=1, limit=20 and return all logs when no userId filter', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);
      prisma.auditLog.count.mockResolvedValue(0);

      const result = await service.getLogs();

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
          skip: 0,
          take: 20,
          orderBy: { createdAt: 'desc' },
        }),
      );
      expect(result).toEqual({ data: [], total: 0, page: 1, limit: 20 });
    });

    it('should filter by userId when provided', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);
      prisma.auditLog.count.mockResolvedValue(0);

      await service.getLogs(1, 20, 7);

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 7 } }),
      );
    });

    it('should compute skip from page and limit (page=3, limit=50 -> skip 100)', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);
      prisma.auditLog.count.mockResolvedValue(0);

      await service.getLogs(3, 50);

      const call = prisma.auditLog.findMany.mock.calls[0][0];
      expect(call.skip).toBe(100);
      expect(call.take).toBe(50);
    });
  });
});
