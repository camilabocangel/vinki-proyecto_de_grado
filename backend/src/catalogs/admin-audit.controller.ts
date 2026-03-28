import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtCookieGuard } from '../auth/guards/jwt-cookie.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/guards/roles.decorator.js';
import { AuditService } from '../common/audit.service.js';

@Controller('admin/audit-logs')
@UseGuards(JwtCookieGuard, RolesGuard)
@Roles('admin')
export class AdminAuditController {
  constructor(private auditService: AuditService) {}

  @Get()
  getLogs(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.auditService.getLogs(parseInt(page || '1', 10), parseInt(limit || '20', 10));
  }
}
