import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { TemplatesService } from './templates.service.js';
import { PrismaService } from '../common/prisma.service.js';

function buildPrisma() {
  return {
    interviewTemplate: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    question: { findMany: jest.fn() },
    role: { findUnique: jest.fn() },
    level: { findUnique: jest.fn() },
    interview: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };
}

const adminUserId = 100;
const studentUserId = 7;

describe('TemplatesService', () => {
  let prisma: ReturnType<typeof buildPrisma>;
  let service: TemplatesService;

  beforeEach(() => {
    prisma = buildPrisma();
    service = new TemplatesService(prisma as unknown as PrismaService);
  });

  describe('listTemplates()', () => {
    it('should fetch ALL templates when role is admin', async () => {
      prisma.interviewTemplate.findMany.mockResolvedValue([]);

      await service.listTemplates(adminUserId, 'admin');

      const callArgs = prisma.interviewTemplate.findMany.mock.calls[0][0];
      expect(callArgs.where).toEqual({});
    });

    it("should restrict templates to public OR user's own when role is not admin", async () => {
      prisma.interviewTemplate.findMany.mockResolvedValue([]);

      await service.listTemplates(studentUserId, 'recruiter');

      const callArgs = prisma.interviewTemplate.findMany.mock.calls[0][0];
      expect(callArgs.where).toEqual({
        OR: [{ isPublic: true }, { createdById: studentUserId }],
      });
    });

    it('should include role, level, language, framework, createdBy and questions in the query', async () => {
      prisma.interviewTemplate.findMany.mockResolvedValue([]);

      await service.listTemplates(studentUserId, 'student');

      const include = prisma.interviewTemplate.findMany.mock.calls[0][0].include;
      expect(include).toMatchObject({
        role: true,
        level: true,
        language: true,
        framework: true,
        createdBy: { select: { id: true, name: true } },
        questions: { select: { id: true } },
      });
    });

    it('should order by createdAt desc', async () => {
      prisma.interviewTemplate.findMany.mockResolvedValue([]);

      await service.listTemplates(studentUserId, 'student');

      expect(prisma.interviewTemplate.findMany.mock.calls[0][0].orderBy).toEqual({
        createdAt: 'desc',
      });
    });
  });

  describe('getTemplate()', () => {
    it('should return the template with full relations when found', async () => {
      const template = { id: 5, name: 'Backend Junior', questions: [] };
      prisma.interviewTemplate.findUnique.mockResolvedValue(template);

      const result = await service.getTemplate(5);

      expect(prisma.interviewTemplate.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 5 } }),
      );
      expect(result).toEqual(template);
    });

    it('should throw NotFoundException when template does not exist', async () => {
      prisma.interviewTemplate.findUnique.mockResolvedValue(null);

      await expect(service.getTemplate(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('createTemplate()', () => {
    const baseDto = {
      name: 'Backend Junior',
      description: 'Plantilla para entrevistas Backend Junior',
      companyType: 'startup',
      roleId: 1,
      levelId: 2,
      questionIds: [10, 20, 30],
    };

    it('should create the template and persist its questions in order (RF-13/RF-14)', async () => {
      prisma.question.findMany.mockResolvedValue([
        { id: 10 },
        { id: 20 },
        { id: 30 },
      ]);
      prisma.role.findUnique.mockResolvedValue({ id: 1, name: 'Backend' });
      prisma.level.findUnique.mockResolvedValue({ id: 2, name: 'Junior' });

      const createdTemplate = { id: 50 };
      const txTemplate = jest.fn().mockResolvedValue(createdTemplate);
      const txTemplateQuestion = jest.fn().mockResolvedValue({});
      prisma.$transaction.mockImplementation(async (cb: any) => {
        return cb({
          interviewTemplate: { create: txTemplate },
          templateQuestion: { create: txTemplateQuestion },
        });
      });
      // getTemplate (llamado al final del transaction) hace findUnique:
      prisma.interviewTemplate.findUnique.mockResolvedValue({
        id: 50,
        ...baseDto,
      });

      const result = await service.createTemplate(adminUserId, baseDto as any);

      expect(txTemplate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: baseDto.name,
          createdById: adminUserId,
          isPublic: false, // default
        }),
      });
      expect(txTemplateQuestion).toHaveBeenCalledTimes(3);
      // Cada pregunta se inserta con orderNumber = i + 1.
      expect(txTemplateQuestion).toHaveBeenNthCalledWith(1, {
        data: { templateId: 50, questionId: 10, orderNumber: 1 },
      });
      expect(txTemplateQuestion).toHaveBeenNthCalledWith(2, {
        data: { templateId: 50, questionId: 20, orderNumber: 2 },
      });
      expect(txTemplateQuestion).toHaveBeenNthCalledWith(3, {
        data: { templateId: 50, questionId: 30, orderNumber: 3 },
      });
      expect(result.id).toBe(50);
    });

    it('should throw BadRequestException listing missing question IDs', async () => {
      prisma.question.findMany.mockResolvedValue([{ id: 10 }]);

      await expect(service.createTemplate(adminUserId, baseDto as any)).rejects.toThrow(
        BadRequestException,
      );
      // Las IDs faltantes deben aparecer en el mensaje (20, 30).
      try {
        await service.createTemplate(adminUserId, baseDto as any);
      } catch (err) {
        expect((err as Error).message).toContain('20');
        expect((err as Error).message).toContain('30');
      }
    });

    it('should throw NotFoundException when role does not exist', async () => {
      prisma.question.findMany.mockResolvedValue([{ id: 10 }, { id: 20 }, { id: 30 }]);
      prisma.role.findUnique.mockResolvedValue(null);

      await expect(service.createTemplate(adminUserId, baseDto as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when level does not exist', async () => {
      prisma.question.findMany.mockResolvedValue([{ id: 10 }, { id: 20 }, { id: 30 }]);
      prisma.role.findUnique.mockResolvedValue({ id: 1, name: 'Backend' });
      prisma.level.findUnique.mockResolvedValue(null);

      await expect(service.createTemplate(adminUserId, baseDto as any)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteTemplate()', () => {
    it('should delete the template when caller is the owner', async () => {
      prisma.interviewTemplate.findUnique.mockResolvedValue({
        id: 5,
        createdById: studentUserId,
      });
      prisma.interviewTemplate.delete.mockResolvedValue({ id: 5 });

      const result = await service.deleteTemplate(5, studentUserId, 'recruiter');

      expect(prisma.interviewTemplate.delete).toHaveBeenCalledWith({ where: { id: 5 } });
      expect(result).toEqual({ deleted: true });
    });

    it('should allow admin to delete a template owned by another user', async () => {
      prisma.interviewTemplate.findUnique.mockResolvedValue({
        id: 5,
        createdById: studentUserId,
      });
      prisma.interviewTemplate.delete.mockResolvedValue({ id: 5 });

      await service.deleteTemplate(5, adminUserId, 'admin');

      expect(prisma.interviewTemplate.delete).toHaveBeenCalled();
    });

    it("should throw ForbiddenException when non-admin tries to delete someone else's template", async () => {
      prisma.interviewTemplate.findUnique.mockResolvedValue({
        id: 5,
        createdById: 999, // owner is somebody else
      });

      await expect(
        service.deleteTemplate(5, studentUserId, 'recruiter'),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.interviewTemplate.delete).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when the template does not exist', async () => {
      prisma.interviewTemplate.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteTemplate(999, studentUserId, 'student'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('startFromTemplate()', () => {
    it('should create an interview with snapshot questions from the template', async () => {
      prisma.interview.findFirst.mockResolvedValue(null); // no active interview
      const template = {
        id: 5,
        roleId: 1,
        levelId: 2,
        languageId: 3,
        frameworkId: 4,
        questions: [
          { questionId: 10, orderNumber: 1, question: { questionText: 'Q1' } },
          { questionId: 20, orderNumber: 2, question: { questionText: 'Q2' } },
        ],
      };
      prisma.interviewTemplate.findUnique.mockResolvedValue(template);

      const created = { id: 88 };
      const txInterview = jest.fn().mockResolvedValue(created);
      const txInterviewQuestion = jest.fn().mockResolvedValue({});
      prisma.$transaction.mockImplementation(async (cb: any) =>
        cb({
          interview: { create: txInterview },
          interviewQuestion: { create: txInterviewQuestion },
        }),
      );
      const fullInterview = { id: 88, questions: [] };
      prisma.interview.findUnique.mockResolvedValue(fullInterview);

      const result = await service.startFromTemplate(5, studentUserId);

      expect(txInterview).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: studentUserId,
          roleId: 1,
          languageId: 3,
          frameworkId: 4,
          chosenLevelId: 2,
          mode: 'evaluation',
        }),
      });
      expect(txInterviewQuestion).toHaveBeenCalledTimes(2);
      // generatedByAi: false (preguntas del template son curadas, no IA — RF-15).
      expect(txInterviewQuestion.mock.calls[0][0].data.generatedByAi).toBe(false);
      expect(result).toEqual(fullInterview);
    });

    it('should throw ConflictException when the user already has an active interview', async () => {
      prisma.interview.findFirst.mockResolvedValue({ id: 99, finishedAt: null });

      await expect(service.startFromTemplate(5, studentUserId)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw NotFoundException when the template does not exist', async () => {
      prisma.interview.findFirst.mockResolvedValue(null);
      prisma.interviewTemplate.findUnique.mockResolvedValue(null);

      await expect(service.startFromTemplate(999, studentUserId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when the template has zero questions', async () => {
      prisma.interview.findFirst.mockResolvedValue(null);
      prisma.interviewTemplate.findUnique.mockResolvedValue({
        id: 5,
        roleId: 1,
        levelId: 2,
        questions: [],
      });

      await expect(service.startFromTemplate(5, studentUserId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
