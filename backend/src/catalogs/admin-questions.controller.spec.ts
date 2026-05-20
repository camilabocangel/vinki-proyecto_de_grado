import { Test, TestingModule } from '@nestjs/testing';
import { CanActivate, ExecutionContext } from '@nestjs/common';
import { AdminQuestionsController } from './admin-questions.controller.js';
import { PrismaService } from '../common/prisma.service.js';
import { JwtCookieGuard } from '../auth/guards/jwt-cookie.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';

const passThroughGuard: CanActivate = { canActivate: (_: ExecutionContext) => true };

function buildResponseMock() {
  const res = {
    setHeader: jest.fn(),
    send: jest.fn(),
  };
  return res;
}

describe('AdminQuestionsController (RF-42 — gestión del banco de preguntas)', () => {
  let controller: AdminQuestionsController;
  let prisma: {
    question: {
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    language: { findFirst: jest.Mock };
    level: { findFirst: jest.Mock };
    skill: { findFirst: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      question: {
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      language: { findFirst: jest.fn() },
      level: { findFirst: jest.fn() },
      skill: { findFirst: jest.fn() },
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AdminQuestionsController],
      providers: [{ provide: PrismaService, useValue: prisma }],
    })
      .overrideGuard(JwtCookieGuard)
      .useValue(passThroughGuard)
      .overrideGuard(RolesGuard)
      .useValue(passThroughGuard)
      .compile();

    controller = moduleRef.get(AdminQuestionsController);
  });

  describe('GET /admin/questions (listado paginado)', () => {
    it('should default to page=1 and pageSize=20 when query params are absent', async () => {
      prisma.question.findMany.mockResolvedValue([]);
      prisma.question.count.mockResolvedValue(0);

      const result = await controller.findAll();

      expect(prisma.question.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 20, where: {} }),
      );
      expect(result).toEqual({ data: [], total: 0, page: 1, pageSize: 20 });
    });

    it('should apply skip/take according to page and limit query params', async () => {
      prisma.question.findMany.mockResolvedValue([]);
      prisma.question.count.mockResolvedValue(150);

      const result = await controller.findAll('3', '50');

      expect(prisma.question.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 100, take: 50 }),
      );
      expect(result.page).toBe(3);
      expect(result.pageSize).toBe(50);
      expect(result.total).toBe(150);
    });

    it('should apply case-insensitive contains filter on questionText when "q" is provided', async () => {
      prisma.question.findMany.mockResolvedValue([]);
      prisma.question.count.mockResolvedValue(0);

      await controller.findAll('1', '20', 'REST');

      expect(prisma.question.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { questionText: { contains: 'REST', mode: 'insensitive' } },
        }),
      );
    });
  });

  describe('GET /admin/questions/export', () => {
    it('should emit JSON when format=json with proper headers', async () => {
      prisma.question.findMany.mockResolvedValue([
        { id: 1, questionText: 'Q', type: 'open', language: { name: 'TS' }, framework: null, level: { name: 'J' }, skill: { name: 'API' } },
      ]);
      const res = buildResponseMock();

      await controller.exportQuestions('json', res as any);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename=questions.json',
      );
      expect(res.send).toHaveBeenCalled();
      const body = res.send.mock.calls[0][0];
      expect(JSON.parse(body)).toHaveLength(1);
    });

    it('should emit CSV when format !== json, escaping quotes in question text', async () => {
      prisma.question.findMany.mockResolvedValue([
        {
          id: 1,
          questionText: 'Que es "REST"?',
          type: 'open',
          language: { name: 'TS' },
          framework: { name: 'NestJS' },
          level: { name: 'J' },
          skill: { name: 'API' },
        },
      ]);
      const res = buildResponseMock();

      await controller.exportQuestions('csv', res as any);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
      const body = res.send.mock.calls[0][0] as string;
      expect(body).toContain('ID,Question,Type,Language,Framework,Level,Skill');
      // Las comillas internas se duplican (escape CSV).
      expect(body).toContain('Que es ""REST""');
    });
  });

  describe('POST /admin/questions/import', () => {
    it('should create each question and count successes/errors', async () => {
      prisma.language.findFirst.mockResolvedValue({ id: 1 });
      prisma.level.findFirst.mockResolvedValue({ id: 1 });
      prisma.skill.findFirst.mockResolvedValue({ id: 1 });
      prisma.question.create
        .mockResolvedValueOnce({ id: 100 })
        .mockRejectedValueOnce(new Error('bad row'))
        .mockResolvedValueOnce({ id: 102 });

      const result = await controller.importQuestions({
        questions: [
          { questionText: 'Q1' },
          { questionText: 'Q2' },
          { questionText: 'Q3' },
        ],
      });

      expect(result).toEqual({ created: 2, errors: 1 });
      expect(prisma.question.create).toHaveBeenCalledTimes(3);
    });

    it('should respect explicit languageId/levelId/skillId in the row when provided', async () => {
      prisma.question.create.mockResolvedValue({ id: 1 });

      await controller.importQuestions({
        questions: [{ questionText: 'Q', languageId: 7, levelId: 3, skillId: 5 }],
      });

      // Como languageId/levelId/skillId vinieron explícitos, NO se consulta findFirst.
      expect(prisma.language.findFirst).not.toHaveBeenCalled();
      expect(prisma.level.findFirst).not.toHaveBeenCalled();
      expect(prisma.skill.findFirst).not.toHaveBeenCalled();
      expect(prisma.question.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          languageId: 7,
          levelId: 3,
          skillId: 5,
          type: 'open',
        }),
      });
    });
  });

  describe('POST /admin/questions (create)', () => {
    it('should look up defaults from catalogs when language/level/skill are not provided', async () => {
      prisma.language.findFirst.mockResolvedValue({ id: 11 });
      prisma.level.findFirst.mockResolvedValue({ id: 22 });
      prisma.skill.findFirst.mockResolvedValue({ id: 33 });
      prisma.question.create.mockResolvedValue({ id: 1 });

      await controller.create({ questionText: 'Nueva pregunta' });

      expect(prisma.question.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          questionText: 'Nueva pregunta',
          languageId: 11,
          levelId: 22,
          skillId: 33,
          type: 'open',
        }),
      });
    });

    it('should accept explicit type, frameworkId and propagate them', async () => {
      prisma.language.findFirst.mockResolvedValue({ id: 1 });
      prisma.level.findFirst.mockResolvedValue({ id: 1 });
      prisma.skill.findFirst.mockResolvedValue({ id: 1 });
      prisma.question.create.mockResolvedValue({ id: 1 });

      await controller.create({
        questionText: 'Q',
        type: 'behavioral',
        frameworkId: 99,
      });

      expect(prisma.question.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'behavioral',
          frameworkId: 99,
        }),
      });
    });
  });

  describe('PUT /admin/questions/:id (update parcial)', () => {
    it('should update only the fields provided in the body', async () => {
      prisma.question.update.mockResolvedValue({ id: 5 });

      await controller.update(5, { questionText: 'Nuevo texto' });

      expect(prisma.question.update).toHaveBeenCalledWith({
        where: { id: 5 },
        data: { questionText: 'Nuevo texto' },
      });
    });

    it('should accept multiple fields at once', async () => {
      prisma.question.update.mockResolvedValue({ id: 5 });

      await controller.update(5, {
        questionText: 'X',
        type: 'open',
        languageId: 2,
        frameworkId: 3,
        levelId: 4,
        skillId: 5,
      });

      const call = prisma.question.update.mock.calls[0][0];
      expect(call.data).toEqual({
        questionText: 'X',
        type: 'open',
        languageId: 2,
        frameworkId: 3,
        levelId: 4,
        skillId: 5,
      });
    });

    it('should not include fields that were not provided', async () => {
      prisma.question.update.mockResolvedValue({ id: 5 });

      await controller.update(5, {});

      expect(prisma.question.update).toHaveBeenCalledWith({
        where: { id: 5 },
        data: {},
      });
    });
  });

  describe('DELETE /admin/questions/:id', () => {
    it('should call prisma.question.delete and return { deleted: true }', async () => {
      prisma.question.delete.mockResolvedValue({ id: 9 });

      const result = await controller.remove(9);

      expect(prisma.question.delete).toHaveBeenCalledWith({ where: { id: 9 } });
      expect(result).toEqual({ deleted: true });
    });
  });
});
