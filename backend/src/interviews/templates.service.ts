import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { CreateTemplateDto } from './dto/create-template.dto.js';

@Injectable()
export class TemplatesService {
  constructor(private prisma: PrismaService) {}

  async listTemplates(userId: number, role: string) {
    const where =
      role === 'admin'
        ? {} // admin sees all
        : {
            OR: [{ isPublic: true }, { createdById: userId }],
          };

    return this.prisma.interviewTemplate.findMany({
      where,
      include: {
        role: true,
        level: true,
        language: true,
        framework: true,
        createdBy: { select: { id: true, name: true } },
        questions: { select: { id: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTemplate(id: number) {
    const template = await this.prisma.interviewTemplate.findUnique({
      where: { id },
      include: {
        role: true,
        level: true,
        language: true,
        framework: true,
        createdBy: { select: { id: true, name: true } },
        questions: {
          orderBy: { orderNumber: 'asc' },
          include: {
            question: {
              include: {
                skill: true,
                level: true,
                language: true,
              },
            },
          },
        },
      },
    });

    if (!template) throw new NotFoundException('Template not found');
    return template;
  }

  async createTemplate(userId: number, dto: CreateTemplateDto) {
    // Validate that all questions exist
    const questions = await this.prisma.question.findMany({
      where: { id: { in: dto.questionIds } },
    });

    if (questions.length !== dto.questionIds.length) {
      const found = new Set(questions.map((q) => q.id));
      const missing = dto.questionIds.filter((id) => !found.has(id));
      throw new BadRequestException(
        `Questions not found: ${missing.join(', ')}`,
      );
    }

    // Validate role and level exist
    const role = await this.prisma.role.findUnique({ where: { id: dto.roleId } });
    if (!role) throw new NotFoundException('Role not found');

    const level = await this.prisma.level.findUnique({ where: { id: dto.levelId } });
    if (!level) throw new NotFoundException('Level not found');

    return this.prisma.$transaction(async (tx) => {
      const template = await tx.interviewTemplate.create({
        data: {
          name: dto.name,
          description: dto.description,
          companyType: dto.companyType,
          roleId: dto.roleId,
          levelId: dto.levelId,
          languageId: dto.languageId ?? null,
          frameworkId: dto.frameworkId ?? null,
          isPublic: dto.isPublic ?? false,
          createdById: userId,
        },
      });

      for (let i = 0; i < dto.questionIds.length; i++) {
        await tx.templateQuestion.create({
          data: {
            templateId: template.id,
            questionId: dto.questionIds[i],
            orderNumber: i + 1,
          },
        });
      }

      return this.getTemplate(template.id);
    });
  }

  async deleteTemplate(id: number, userId: number, role: string) {
    const template = await this.prisma.interviewTemplate.findUnique({
      where: { id },
    });

    if (!template) throw new NotFoundException('Template not found');
    if (template.createdById !== userId && role !== 'admin') {
      throw new ForbiddenException('You can only delete your own templates');
    }

    await this.prisma.interviewTemplate.delete({ where: { id } });
    return { deleted: true };
  }

  async startFromTemplate(templateId: number, userId: number) {
    // Check no active interview
    const active = await this.prisma.interview.findFirst({
      where: { userId, finishedAt: null },
    });
    if (active) {
      throw new ConflictException('You already have an active interview');
    }

    const template = await this.prisma.interviewTemplate.findUnique({
      where: { id: templateId },
      include: {
        questions: {
          orderBy: { orderNumber: 'asc' },
          include: { question: true },
        },
      },
    });

    if (!template) throw new NotFoundException('Template not found');

    if (template.questions.length === 0) {
      throw new BadRequestException('Template has no questions');
    }

    const interview = await this.prisma.$transaction(async (tx) => {
      const interview = await tx.interview.create({
        data: {
          userId,
          roleId: template.roleId,
          languageId: template.languageId,
          frameworkId: template.frameworkId,
          chosenLevelId: template.levelId,
          mode: 'evaluation',
        },
      });

      for (const tq of template.questions) {
        await tx.interviewQuestion.create({
          data: {
            interviewId: interview.id,
            questionId: tq.questionId,
            questionTextSnapshot: tq.question.questionText,
            orderNumber: tq.orderNumber,
            generatedByAi: false,
          },
        });
      }

      return interview;
    });

    // Return full interview with questions
    const full = await this.prisma.interview.findUnique({
      where: { id: interview.id },
      include: {
        questions: {
          orderBy: { orderNumber: 'asc' },
          include: {
            answers: true,
            question: { select: { source: true } },
          },
        },
      },
    });

    return full;
  }
}
