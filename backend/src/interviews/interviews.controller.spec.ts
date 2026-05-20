import { Test, TestingModule } from '@nestjs/testing';
import { CanActivate, ExecutionContext } from '@nestjs/common';
import { InterviewsController } from './interviews.controller.js';
import { InterviewsService } from './interviews.service.js';
import { JwtCookieGuard } from '../auth/guards/jwt-cookie.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';

const passThroughGuard: CanActivate = { canActivate: (_: ExecutionContext) => true };

describe('InterviewsController', () => {
  let controller: InterviewsController;
  let interviewsService: jest.Mocked<InterviewsService>;

  beforeEach(async () => {
    interviewsService = {
      create: jest.fn(),
      findOne: jest.fn(),
      finish: jest.fn(),
    } as unknown as jest.Mocked<InterviewsService>;

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [InterviewsController],
      providers: [{ provide: InterviewsService, useValue: interviewsService }],
    })
      .overrideGuard(JwtCookieGuard)
      .useValue(passThroughGuard)
      .overrideGuard(RolesGuard)
      .useValue(passThroughGuard)
      .compile();

    controller = moduleRef.get(InterviewsController);
  });

  describe('POST /interviews', () => {
    it('should delegate to InterviewsService.create with userId from request (RF-09/RF-10)', async () => {
      interviewsService.create.mockResolvedValue({ id: 1, userId: 7 } as any);
      const req = { user: { userId: 7, role: 'student' } };
      const dto = { roleId: 1, chosenLevelId: 2 } as any;

      const result = await controller.create(req, dto);

      expect(interviewsService.create).toHaveBeenCalledWith(7, dto);
      expect(result).toEqual({ id: 1, userId: 7 });
    });
  });

  describe('GET /interviews/:id', () => {
    it('should delegate to InterviewsService.findOne with parsed id and userId', async () => {
      interviewsService.findOne.mockResolvedValue({ id: 5, userId: 7, questions: [] } as any);
      const req = { user: { userId: 7, role: 'student' } };

      const result = await controller.findOne(req, 5);

      expect(interviewsService.findOne).toHaveBeenCalledWith(5, 7);
      expect(result).toEqual({ id: 5, userId: 7, questions: [] });
    });
  });

  describe('POST /interviews/:id/finish', () => {
    it('should delegate to InterviewsService.finish with id and userId (RF-11)', async () => {
      interviewsService.finish.mockResolvedValue({
        interviewId: 5,
        evaluationStatus: 'processing',
      } as any);
      const req = { user: { userId: 7, role: 'student' } };

      const result = await controller.finish(req, 5);

      expect(interviewsService.finish).toHaveBeenCalledWith(5, 7);
      expect(result).toEqual({ interviewId: 5, evaluationStatus: 'processing' });
    });
  });
});
