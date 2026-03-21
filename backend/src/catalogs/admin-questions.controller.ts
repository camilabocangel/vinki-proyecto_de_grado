import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
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

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.prisma.question.delete({ where: { id } });
    return { deleted: true };
  }
}
