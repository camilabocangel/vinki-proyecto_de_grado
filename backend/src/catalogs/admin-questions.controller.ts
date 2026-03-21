import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  Res,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags } from '@nestjs/swagger';
import { JwtCookieGuard } from '../auth/guards/jwt-cookie.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/guards/roles.decorator.js';
import { PrismaService } from '../common/prisma.service.js';

@ApiTags('admin-questions')
@Controller('admin/questions')
@UseGuards(JwtCookieGuard, RolesGuard)
@Roles('admin')
export class AdminQuestionsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('q') q?: string,
  ) {
    const p = parseInt(page || '1', 10);
    const ps = parseInt(limit || '20', 10);
    const search = q;
    const skip = (p - 1) * ps;

    const where = search
      ? { questionText: { contains: search, mode: 'insensitive' as const } }
      : {};

    const [data, total] = await Promise.all([
      this.prisma.question.findMany({
        where,
        include: { language: true, framework: true, level: true, skill: true },
        orderBy: { id: 'desc' },
        skip,
        take: ps,
      }),
      this.prisma.question.count({ where }),
    ]);

    return { data, total, page: p, pageSize: ps };
  }

  @Get('export')
  async exportQuestions(@Query('format') format: string, @Res() res: Response) {
    const questions = await this.prisma.question.findMany({
      include: { language: true, level: true, skill: true, framework: true },
      orderBy: { id: 'asc' },
    });

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=questions.json');
      res.send(JSON.stringify(questions, null, 2));
    } else {
      // CSV
      const headers = ['ID', 'Question', 'Type', 'Language', 'Framework', 'Level', 'Skill'];
      const rows = questions.map((q) => [
        q.id,
        `"${q.questionText.replace(/"/g, '""')}"`,
        q.type,
        q.language?.name ?? '',
        q.framework?.name ?? '',
        q.level?.name ?? '',
        q.skill?.name ?? '',
      ]);
      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=questions.csv');
      res.send(csv);
    }
  }

  @Post('import')
  async importQuestions(
    @Body() body: { questions: Array<{ questionText: string; type?: string; languageId?: number; levelId?: number; skillId?: number }> },
  ) {
    const results = { created: 0, errors: 0 };
    for (const q of body.questions) {
      try {
        const languageId = q.languageId ?? (await this.prisma.language.findFirst())?.id ?? 1;
        const levelId = q.levelId ?? (await this.prisma.level.findFirst())?.id ?? 1;
        const skillId = q.skillId ?? (await this.prisma.skill.findFirst())?.id ?? 1;
        await this.prisma.question.create({
          data: {
            questionText: q.questionText,
            type: q.type || 'open',
            languageId,
            levelId,
            skillId,
          },
        });
        results.created++;
      } catch {
        results.errors++;
      }
    }
    return results;
  }

  @Post()
  async create(
    @Body()
    body: {
      questionText: string;
      type?: string;
      languageId?: number;
      frameworkId?: number;
      levelId?: number;
      skillId?: number;
    },
  ) {
    // Default to first available if not provided
    const languageId = body.languageId ?? (await this.prisma.language.findFirst())?.id ?? 1;
    const levelId = body.levelId ?? (await this.prisma.level.findFirst())?.id ?? 1;
    const skillId = body.skillId ?? (await this.prisma.skill.findFirst())?.id ?? 1;

    return this.prisma.question.create({
      data: {
        questionText: body.questionText,
        type: body.type || 'open',
        languageId,
        frameworkId: body.frameworkId,
        levelId,
        skillId,
      },
    });
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      questionText?: string;
      type?: string;
      languageId?: number;
      frameworkId?: number;
      levelId?: number;
      skillId?: number;
    },
  ) {
    return this.prisma.question.update({
      where: { id },
      data: {
        ...(body.questionText !== undefined && { questionText: body.questionText }),
        ...(body.type !== undefined && { type: body.type }),
        ...(body.languageId !== undefined && { languageId: body.languageId }),
        ...(body.frameworkId !== undefined && { frameworkId: body.frameworkId }),
        ...(body.levelId !== undefined && { levelId: body.levelId }),
        ...(body.skillId !== undefined && { skillId: body.skillId }),
      },
    });
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.prisma.question.delete({ where: { id } });
    return { deleted: true };
  }
}
