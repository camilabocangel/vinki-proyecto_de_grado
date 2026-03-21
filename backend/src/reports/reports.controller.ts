import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  Req,
  Res,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags } from '@nestjs/swagger';
import { ReportsService } from './reports.service.js';
import { JwtCookieGuard } from '../auth/guards/jwt-cookie.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/guards/roles.decorator.js';

@ApiTags('reports')
@UseGuards(JwtCookieGuard, RolesGuard)
@Controller()
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('dashboard')
  @Roles('student')
  getDashboard(@Req() req: any) {
    const user = (req as any).user;
    return this.reportsService.getDashboard(user.userId);
  }

  @Get('percentiles')
  @Roles('student')
  getPercentiles(@Req() req: any) {
    const user = (req as any).user;
    return this.reportsService.getPercentiles(user.userId);
  }

  @Get('progress')
  @Roles('student')
  getProgressHistory(@Req() req: any) {
    const user = (req as any).user;
    return this.reportsService.getProgressHistory(user.userId);
  }

  @Get('interviews/:id/report')
  @Roles('student')
  getReport(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const user = (req as any).user;
    return this.reportsService.getInterviewReport(id, user.userId);
  }

  @Get('interviews/:id/report/export')
  @Roles('student')
  async exportReport(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Query('format') format: string,
    @Res() res: Response,
  ) {
    const user = (req as any).user;
    if (format === 'csv') {
      const csv = await this.reportsService.exportCSV(id, user.userId);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=interview-${id}.csv`);
      res.send(csv);
    } else {
      const pdf = await this.reportsService.exportPDF(id, user.userId);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=interview-${id}.pdf`);
      pdf.pipe(res);
      pdf.end();
    }
  }

  @Get('recruiter/students')
  @Roles('recruiter', 'admin')
  getRecruiterDashboard(
    @Query('level') level?: string,
    @Query('language') language?: string,
  ) {
    return this.reportsService.getRecruiterDashboard({
      levelName: level,
      languageName: language,
    });
  }

  @Get('study-plan')
  @Roles('student')
  getStudyPlan(@Req() req: any) {
    const user = (req as any).user;
    return this.reportsService.generateStudyPlan(user.userId);
  }

  @Post('interviews/:id/mark-seen')
  @Roles('student')
  @HttpCode(HttpStatus.NO_CONTENT)
  markSeen(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const user = (req as any).user;
    return this.reportsService.markSeen(id, user.userId);
  }
}
