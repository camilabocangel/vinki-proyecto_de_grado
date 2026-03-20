import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Req,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
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

  @Get('interviews/:id/report')
  @Roles('student')
  getReport(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const user = (req as any).user;
    return this.reportsService.getInterviewReport(id, user.userId);
  }

  @Post('interviews/:id/mark-seen')
  @Roles('student')
  @HttpCode(HttpStatus.NO_CONTENT)
  markSeen(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const user = (req as any).user;
    return this.reportsService.markSeen(id, user.userId);
  }
}
