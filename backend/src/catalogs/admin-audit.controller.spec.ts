import { Test, TestingModule } from '@nestjs/testing';
import { CanActivate, ExecutionContext } from '@nestjs/common';
import { AdminAuditController } from './admin-audit.controller.js';
import { AuditService } from '../common/audit.service.js';
import { JwtCookieGuard } from '../auth/guards/jwt-cookie.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';

const passThroughGuard: CanActivate = { canActivate: (_: ExecutionContext) => true };

describe('AdminAuditController', () => {
  let controller: AdminAuditController;
  let auditService: jest.Mocked<AuditService>;

  beforeEach(async () => {
    auditService = {
      getLogs: jest.fn(),
    } as unknown as jest.Mocked<AuditService>;

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AdminAuditController],
      providers: [{ provide: AuditService, useValue: auditService }],
    })
      .overrideGuard(JwtCookieGuard)
      .useValue(passThroughGuard)
      .overrideGuard(RolesGuard)
      .useValue(passThroughGuard)
      .compile();

    controller = moduleRef.get(AdminAuditController);
  });

  it('should default page=1 and limit=20 when no query params are sent', () => {
    auditService.getLogs.mockReturnValue([] as any);

    controller.getLogs();

    expect(auditService.getLogs).toHaveBeenCalledWith(1, 20);
  });

  it('should parse page and limit from query strings', () => {
    auditService.getLogs.mockReturnValue([] as any);

    controller.getLogs('4', '50');

    expect(auditService.getLogs).toHaveBeenCalledWith(4, 50);
  });
});
