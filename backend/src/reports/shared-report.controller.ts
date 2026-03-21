import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ReportsService } from './reports.service.js';

@ApiTags('shared-reports')
@Controller()
export class SharedReportController {
  constructor(private reportsService: ReportsService) {}

  @Get('shared/:token')
  getSharedReport(@Param('token') token: string) {
    return this.reportsService.getSharedReport(token);
  }
}
