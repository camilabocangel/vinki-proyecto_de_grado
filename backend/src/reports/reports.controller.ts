import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  UseInterceptors,
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
import { CacheInterceptor, Cacheable } from '../common/cache.interceptor.js';

@ApiTags('reports')
@UseGuards(JwtCookieGuard, RolesGuard)
@UseInterceptors(CacheInterceptor)
@Controller()
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('dashboard')
  @Roles('student')
  @Cacheable(60)
  getDashboard(@Req() req: any) {
    const user = (req as any).user;
    return this.reportsService.getDashboard(user.userId);
  }

  @Get('percentiles')
  @Roles('student')
  @Cacheable(300)
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

  @Get('recruiter/students/:studentId/notes')
  @Roles('recruiter', 'admin')
  getStudentNotes(@Param('studentId', ParseIntPipe) studentId: number) {
    return this.reportsService.getNotes(studentId);
  }

  @Post('recruiter/students/:studentId/notes')
  @Roles('recruiter', 'admin')
  addStudentNote(
    @Req() req: any,
    @Param('studentId', ParseIntPipe) studentId: number,
    @Body() body: { content: string },
  ) {
    const user = (req as any).user;
    return this.reportsService.addNote(user.userId, studentId, body.content);
  }

  @Get('recruiter/compare')
  @Roles('recruiter', 'admin')
  compareStudents(@Query('studentIds') studentIds: string) {
    const ids = studentIds
      .split(',')
      .map((id) => parseInt(id.trim(), 10))
      .filter((id) => !isNaN(id));
    return this.reportsService.compareStudents(ids);
  }

  @Get('recruiter/students/:studentId')
  @Roles('recruiter', 'admin')
  getStudentProfile(@Param('studentId', ParseIntPipe) studentId: number) {
    return this.reportsService.getStudentProfile(studentId);
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

  @Get('study-plan/export/pdf')
  @Roles('student')
  async exportStudyPlanPdf(@Req() req: any, @Res() res: Response) {
    const user = (req as any).user;
    const plan = await this.reportsService.generateStudyPlan(user.userId);
    if (!plan) {
      res.status(404).json({ message: 'No study plan available' });
      return;
    }
    const pdfBuffer = await this.reportsService.generateStudyPlanPdf(plan);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="vinki-study-plan.pdf"',
    });
    res.end(pdfBuffer);
  }

  @Post('interviews/:id/mark-seen')
  @Roles('student')
  @HttpCode(HttpStatus.NO_CONTENT)
  markSeen(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const user = (req as any).user;
    return this.reportsService.markSeen(id, user.userId);
  }

  @Get('admin/analytics')
  @Roles('admin')
  getAdminAnalytics() {
    return this.reportsService.getAdminAnalytics();
  }

  @Post('interviews/:id/share')
  @Roles('student')
  createShareLink(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const user = (req as any).user;
    return this.reportsService.createShareLink(id, user.userId);
  }
}
