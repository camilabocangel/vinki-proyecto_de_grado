import { Test, TestingModule } from '@nestjs/testing';
import { CanActivate, ExecutionContext } from '@nestjs/common';
import { TemplatesController } from './templates.controller.js';
import { TemplatesService } from './templates.service.js';
import { PrismaService } from '../common/prisma.service.js';
import { JwtCookieGuard } from '../auth/guards/jwt-cookie.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';

const passThroughGuard: CanActivate = { canActivate: (_: ExecutionContext) => true };

describe('TemplatesController', () => {
  let controller: TemplatesController;
  let templatesService: jest.Mocked<TemplatesService>;
  let prisma: { question: { findMany: jest.Mock } };

  beforeEach(async () => {
    templatesService = {
      listTemplates: jest.fn(),
      getTemplate: jest.fn(),
      createTemplate: jest.fn(),
      deleteTemplate: jest.fn(),
      startFromTemplate: jest.fn(),
    } as unknown as jest.Mocked<TemplatesService>;
    prisma = { question: { findMany: jest.fn() } };

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [TemplatesController],
      providers: [
        { provide: TemplatesService, useValue: templatesService },
        { provide: PrismaService, useValue: prisma },
      ],
    })
      .overrideGuard(JwtCookieGuard)
      .useValue(passThroughGuard)
      .overrideGuard(RolesGuard)
      .useValue(passThroughGuard)
      .compile();

    controller = moduleRef.get(TemplatesController);
  });

  describe('GET /interviews/templates/questions', () => {
    it('should search question text case-insensitively when "q" is provided', async () => {
      prisma.question.findMany.mockResolvedValue([{ id: 1 }] as any);

      await controller.listQuestions('rest');

      const call = prisma.question.findMany.mock.calls[0][0];
      expect(call.where).toEqual({
        questionText: { contains: 'rest', mode: 'insensitive' },
      });
      expect(call.take).toBe(200);
      expect(call.orderBy).toEqual({ id: 'desc' });
    });

    it('should query with empty where when "q" is omitted', async () => {
      prisma.question.findMany.mockResolvedValue([] as any);

      await controller.listQuestions();

      expect(prisma.question.findMany.mock.calls[0][0].where).toEqual({});
    });
  });

  describe('GET /interviews/templates', () => {
    it('should delegate to TemplatesService.listTemplates with userId and role from request', async () => {
      templatesService.listTemplates.mockResolvedValue([] as any);
      const req = { user: { userId: 7, role: 'recruiter' } };

      await controller.list(req);

      expect(templatesService.listTemplates).toHaveBeenCalledWith(7, 'recruiter');
    });
  });

  describe('GET /interviews/templates/:id', () => {
    it('should delegate to TemplatesService.getTemplate with the parsed id', async () => {
      templatesService.getTemplate.mockResolvedValue({ id: 5 } as any);

      const result = await controller.findOne(5);

      expect(templatesService.getTemplate).toHaveBeenCalledWith(5);
      expect(result).toEqual({ id: 5 });
    });
  });

  describe('POST /interviews/templates', () => {
    it('should delegate to TemplatesService.createTemplate with userId and DTO', async () => {
      templatesService.createTemplate.mockResolvedValue({ id: 9 } as any);
      const dto = { name: 'T', description: 'D', companyType: 'startup', roleId: 1, levelId: 2, questionIds: [10] } as any;
      const req = { user: { userId: 7, role: 'recruiter' } };

      const result = await controller.create(req, dto);

      expect(templatesService.createTemplate).toHaveBeenCalledWith(7, dto);
      expect(result).toEqual({ id: 9 });
    });
  });

  describe('DELETE /interviews/templates/:id', () => {
    it('should delegate to TemplatesService.deleteTemplate with id, userId and role', async () => {
      templatesService.deleteTemplate.mockResolvedValue({ deleted: true } as any);
      const req = { user: { userId: 7, role: 'admin' } };

      const result = await controller.remove(req, 5);

      expect(templatesService.deleteTemplate).toHaveBeenCalledWith(5, 7, 'admin');
      expect(result).toEqual({ deleted: true });
    });
  });

  describe('POST /interviews/templates/:id/start', () => {
    it('should delegate to TemplatesService.startFromTemplate with templateId and userId', async () => {
      templatesService.startFromTemplate.mockResolvedValue({ id: 99 } as any);
      const req = { user: { userId: 7, role: 'student' } };

      const result = await controller.start(req, 5);

      expect(templatesService.startFromTemplate).toHaveBeenCalledWith(5, 7);
      expect(result).toEqual({ id: 99 });
    });
  });
});
