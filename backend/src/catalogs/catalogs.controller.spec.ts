import { Test, TestingModule } from '@nestjs/testing';
import { CanActivate, ExecutionContext, NestInterceptor, CallHandler } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { CatalogsController } from './catalogs.controller.js';
import { CatalogsService } from './catalogs.service.js';
import { QuestionGeneratorService } from '../interviews/services/question-generator.service.js';
import { CacheInterceptor } from '../common/cache.interceptor.js';
import { JwtCookieGuard } from '../auth/guards/jwt-cookie.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';

const passThroughGuard: CanActivate = { canActivate: (_: ExecutionContext) => true };

// Interceptor pasa-todo para no necesitar Redis ni Reflector reales.
const passThroughInterceptor: NestInterceptor = {
  intercept(_: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle();
  },
};

describe('CatalogsController', () => {
  let controller: CatalogsController;
  let catalogsService: jest.Mocked<CatalogsService>;
  let questionGenerator: jest.Mocked<QuestionGeneratorService>;

  beforeEach(async () => {
    catalogsService = {
      getLanguages: jest.fn(),
      getLanguagesByRole: jest.fn(),
      getFrameworksByLanguage: jest.fn(),
      getLevels: jest.fn(),
      getRoles: jest.fn(),
      getSkills: jest.fn(),
    } as unknown as jest.Mocked<CatalogsService>;
    questionGenerator = {
      generateQuestions: jest.fn(),
    } as unknown as jest.Mocked<QuestionGeneratorService>;

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [CatalogsController],
      providers: [
        { provide: CatalogsService, useValue: catalogsService },
        { provide: QuestionGeneratorService, useValue: questionGenerator },
      ],
    })
      .overrideInterceptor(CacheInterceptor)
      .useValue(passThroughInterceptor)
      .overrideGuard(JwtCookieGuard)
      .useValue(passThroughGuard)
      .overrideGuard(RolesGuard)
      .useValue(passThroughGuard)
      .compile();

    controller = moduleRef.get(CatalogsController);
  });

  it('GET /catalogs/languages → delegates to service.getLanguages (RF-06)', async () => {
    catalogsService.getLanguages.mockResolvedValue([{ id: 1, name: 'Python' }] as any);

    const result = await controller.getLanguages();

    expect(catalogsService.getLanguages).toHaveBeenCalled();
    expect(result).toEqual([{ id: 1, name: 'Python' }]);
  });

  it('GET /catalogs/roles/:roleId/languages → delegates with parsed roleId', async () => {
    catalogsService.getLanguagesByRole.mockResolvedValue([] as any);

    await controller.getLanguagesByRole(5);

    expect(catalogsService.getLanguagesByRole).toHaveBeenCalledWith(5);
  });

  it('GET /catalogs/languages/:id/frameworks → delegates with parsed id (RF-07)', async () => {
    catalogsService.getFrameworksByLanguage.mockResolvedValue([] as any);

    await controller.getFrameworks(3);

    expect(catalogsService.getFrameworksByLanguage).toHaveBeenCalledWith(3);
  });

  it('GET /catalogs/levels → delegates to service.getLevels (RF-08)', async () => {
    catalogsService.getLevels.mockResolvedValue([] as any);

    await controller.getLevels();

    expect(catalogsService.getLevels).toHaveBeenCalled();
  });

  it('GET /catalogs/roles → delegates to service.getRoles (RF-05)', async () => {
    catalogsService.getRoles.mockResolvedValue([] as any);

    await controller.getRoles();

    expect(catalogsService.getRoles).toHaveBeenCalled();
  });

  it('GET /catalogs/skills → delegates to service.getSkills', async () => {
    catalogsService.getSkills.mockResolvedValue([] as any);

    await controller.getSkills();

    expect(catalogsService.getSkills).toHaveBeenCalled();
  });

  it('POST /catalogs/questions/generate → delegates DTO to QuestionGeneratorService and wraps the response', async () => {
    questionGenerator.generateQuestions.mockResolvedValue(['Q1', 'Q2']);
    const dto = { topic: 'REST', level: 'Junior', language: 'TS', count: 2 } as any;

    const result = await controller.generateQuestions(dto);

    expect(questionGenerator.generateQuestions).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ questions: ['Q1', 'Q2'] });
  });
});
