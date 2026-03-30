import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TemplatesService } from './templates.service.js';
import { JwtCookieGuard } from '../auth/guards/jwt-cookie.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/guards/roles.decorator.js';
import { CreateTemplateDto } from './dto/create-template.dto.js';
import { PrismaService } from '../common/prisma.service.js';

@ApiTags('interview-templates')
@Controller('interviews/templates')
@UseGuards(JwtCookieGuard, RolesGuard)
export class TemplatesController {
  constructor(
    private templatesService: TemplatesService,
    private prisma: PrismaService,
  ) {}

  @Get('questions')
  @Roles('recruiter', 'admin')
  async listQuestions(@Query('q') q?: string) {
    const where = q
      ? { questionText: { contains: q, mode: 'insensitive' as const } }
      : {};
    return this.prisma.question.findMany({
      where,
      include: { language: true, level: true, skill: true },
      orderBy: { id: 'desc' },
      take: 200,
    });
  }

  @Get()
  list(@Req() req: any) {
    const user = req.user;
    return this.templatesService.listTemplates(user.userId, user.role);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.templatesService.getTemplate(id);
  }

  @Post()
  @Roles('recruiter', 'admin')
  create(@Req() req: any, @Body() dto: CreateTemplateDto) {
    const user = req.user;
    return this.templatesService.createTemplate(user.userId, dto);
  }

  @Delete(':id')
  @Roles('recruiter', 'admin')
  remove(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const user = req.user;
    return this.templatesService.deleteTemplate(id, user.userId, user.role);
  }

  @Post(':id/start')
  start(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const user = req.user;
    return this.templatesService.startFromTemplate(id, user.userId);
  }
}
