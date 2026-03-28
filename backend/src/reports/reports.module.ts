import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller.js';
import { SharedReportController } from './shared-report.controller.js';
import { ReportsService } from './reports.service.js';
import { PrismaService } from '../common/prisma.service.js';

@Module({
  controllers: [ReportsController, SharedReportController],
  providers: [ReportsService, PrismaService],
})
export class ReportsModule {}
