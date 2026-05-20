import { CatalogsService } from './catalogs.service.js';
import { PrismaService } from '../common/prisma.service.js';

// CatalogsService implementa los endpoints READ-only para RF-05 a RF-08
// (selección de rol, lenguaje, framework y nivel desde catálogo). Cubre
// los 6 métodos públicos y verifica los filtros/orden esperados.
//
// Nota D-5: este módulo NO tiene operaciones de escritura (RF-37 a RF-41
// fueron diferidas como funcionalidad fuera del MVP académico).

function buildPrisma() {
  return {
    language: { findMany: jest.fn() },
    framework: { findMany: jest.fn() },
    level: { findMany: jest.fn() },
    role: { findMany: jest.fn() },
    skill: { findMany: jest.fn() },
  };
}

describe('CatalogsService', () => {
  let prisma: ReturnType<typeof buildPrisma>;
  let service: CatalogsService;

  beforeEach(() => {
    prisma = buildPrisma();
    service = new CatalogsService(prisma as unknown as PrismaService);
  });

  describe('getLanguages()', () => {
    it('should return all languages sorted by name ascending (RF-06)', async () => {
      prisma.language.findMany.mockResolvedValue([
        { id: 1, name: 'JavaScript' },
        { id: 2, name: 'Python' },
      ]);

      const result = await service.getLanguages();

      expect(prisma.language.findMany).toHaveBeenCalledWith({ orderBy: { name: 'asc' } });
      expect(result).toHaveLength(2);
    });
  });

  describe('getLanguagesByRole()', () => {
    it('should filter languages by roleLanguages relation and sort by name (RF-06/RF-07)', async () => {
      prisma.language.findMany.mockResolvedValue([]);

      await service.getLanguagesByRole(5);

      expect(prisma.language.findMany).toHaveBeenCalledWith({
        where: { roleLanguages: { some: { roleId: 5 } } },
        orderBy: { name: 'asc' },
      });
    });
  });

  describe('getFrameworksByLanguage()', () => {
    it('should return frameworks for a given language sorted by name (RF-07)', async () => {
      prisma.framework.findMany.mockResolvedValue([]);

      await service.getFrameworksByLanguage(3);

      expect(prisma.framework.findMany).toHaveBeenCalledWith({
        where: { languageId: 3 },
        orderBy: { name: 'asc' },
      });
    });
  });

  describe('getLevels()', () => {
    it('should return all levels sorted by id ascending (Junior, Mid, Senior — RF-08)', async () => {
      prisma.level.findMany.mockResolvedValue([
        { id: 1, name: 'Junior' },
        { id: 2, name: 'Mid' },
        { id: 3, name: 'Senior' },
      ]);

      const result = await service.getLevels();

      expect(prisma.level.findMany).toHaveBeenCalledWith({ orderBy: { id: 'asc' } });
      expect(result.map((l) => l.name)).toEqual(['Junior', 'Mid', 'Senior']);
    });
  });

  describe('getRoles()', () => {
    it('should return all roles sorted by name (RF-05)', async () => {
      prisma.role.findMany.mockResolvedValue([]);

      await service.getRoles();

      expect(prisma.role.findMany).toHaveBeenCalledWith({ orderBy: { name: 'asc' } });
    });
  });

  describe('getSkills()', () => {
    it('should return all skills sorted by name', async () => {
      prisma.skill.findMany.mockResolvedValue([]);

      await service.getSkills();

      expect(prisma.skill.findMany).toHaveBeenCalledWith({ orderBy: { name: 'asc' } });
    });
  });
});
