// Suite de integración A.4 — Foreign keys obligatorias y opcionales
// (RNF-09, RNF-10, RNF-11)
//
// Mapeo:
//   - RNF-09: frameworks.language_id NOT NULL → REFERENCES languages(id).
//   - RNF-10: questions.{language_id, level_id, skill_id} NOT NULL;
//             questions.framework_id NULL permitido.
//   - RNF-11: interviews.{user_id, role_id, chosen_level_id} NOT NULL;
//             interviews.{language_id, framework_id} NULL permitido.

import {
  prisma,
  resetDatabase,
  seedCatalogs,
  createUser,
  SeededCatalogs,
  TestUser,
} from '../db-helpers';

describe('Integridad — Foreign keys (RNF-09 / RNF-10 / RNF-11)', () => {
  let catalogs: SeededCatalogs;
  let student: TestUser;

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await resetDatabase();
    catalogs = await seedCatalogs();
    student = await createUser({ role: 'student' });
  });

  // ===========================================================
  // RNF-09 — frameworks pertenecen a un language
  // ===========================================================

  describe('RNF-09 — frameworks.language_id obligatorio + FK válida', () => {
    it('should reject framework without language_id (NOT NULL)', async () => {
      await expect(
        prisma.framework.create({
          // language_id se omite; TypeScript lo bloquea, hacemos cast.
          data: { name: 'OrphanFramework' } as unknown as { name: string; languageId: number },
        }),
      ).rejects.toThrow();
    });

    it('should reject framework with non-existent language_id (FK violation)', async () => {
      await expect(
        prisma.framework.create({
          data: { name: 'GhostFramework', languageId: 999_999 },
        }),
      ).rejects.toThrow(/foreign key|frameworks_language_id_fkey/i);
    });

    it('should accept framework with existing language_id', async () => {
      const fw = await prisma.framework.create({
        data: { name: 'NestJS-x', languageId: catalogs.languageId },
      });
      expect(fw.languageId).toBe(catalogs.languageId);
    });
  });

  // ===========================================================
  // RNF-10 — questions: language/level/skill obligatorios, framework opcional
  // ===========================================================

  describe('RNF-10 — questions FK obligatorias y opcional', () => {
    it('should reject question without language_id', async () => {
      await expect(
        prisma.question.create({
          data: {
            questionText: '¿Qué es REST?',
            type: 'open',
            // languageId omitido a propósito
            levelId: catalogs.levelJuniorId,
            skillId: catalogs.skillId,
          } as unknown as {
            questionText: string;
            type: string;
            languageId: number;
            levelId: number;
            skillId: number;
          },
        }),
      ).rejects.toThrow();
    });

    it('should reject question without level_id', async () => {
      await expect(
        prisma.question.create({
          data: {
            questionText: '¿Qué es REST?',
            type: 'open',
            languageId: catalogs.languageId,
            // levelId omitido
            skillId: catalogs.skillId,
          } as unknown as {
            questionText: string;
            type: string;
            languageId: number;
            levelId: number;
            skillId: number;
          },
        }),
      ).rejects.toThrow();
    });

    it('should reject question without skill_id', async () => {
      await expect(
        prisma.question.create({
          data: {
            questionText: '¿Qué es REST?',
            type: 'open',
            languageId: catalogs.languageId,
            levelId: catalogs.levelJuniorId,
            // skillId omitido
          } as unknown as {
            questionText: string;
            type: string;
            languageId: number;
            levelId: number;
            skillId: number;
          },
        }),
      ).rejects.toThrow();
    });

    it('should reject question with non-existent language_id (FK violation)', async () => {
      await expect(
        prisma.question.create({
          data: {
            questionText: 'Q',
            type: 'open',
            languageId: 999_999,
            levelId: catalogs.levelJuniorId,
            skillId: catalogs.skillId,
          },
        }),
      ).rejects.toThrow(/foreign key|questions_language_id_fkey/i);
    });

    it('should accept question without framework_id (optional FK)', async () => {
      const q = await prisma.question.create({
        data: {
          questionText: '¿Qué es REST?',
          type: 'open',
          languageId: catalogs.languageId,
          // frameworkId omitido — opcional.
          levelId: catalogs.levelJuniorId,
          skillId: catalogs.skillId,
        },
      });
      expect(q.frameworkId).toBeNull();
    });
  });

  // ===========================================================
  // RNF-11 — interviews: user/role/level obligatorios, lang/framework opcionales
  // ===========================================================

  describe('RNF-11 — interviews FK obligatorias y opcionales', () => {
    it('should reject interview without user_id', async () => {
      await expect(
        prisma.interview.create({
          data: {
            // userId omitido
            roleId: catalogs.roleId,
            chosenLevelId: catalogs.levelJuniorId,
          } as unknown as {
            userId: number;
            roleId: number;
            chosenLevelId: number;
          },
        }),
      ).rejects.toThrow();
    });

    it('should reject interview without role_id', async () => {
      await expect(
        prisma.interview.create({
          data: {
            userId: student.id,
            // roleId omitido
            chosenLevelId: catalogs.levelJuniorId,
          } as unknown as {
            userId: number;
            roleId: number;
            chosenLevelId: number;
          },
        }),
      ).rejects.toThrow();
    });

    it('should reject interview with non-existent user_id (FK violation)', async () => {
      await expect(
        prisma.interview.create({
          data: {
            userId: 999_999,
            roleId: catalogs.roleId,
            chosenLevelId: catalogs.levelJuniorId,
          },
        }),
      ).rejects.toThrow(/foreign key|interviews_user_id_fkey/i);
    });

    it('should accept interview without language_id (optional FK)', async () => {
      const interview = await prisma.interview.create({
        data: {
          userId: student.id,
          roleId: catalogs.roleId,
          chosenLevelId: catalogs.levelJuniorId,
          // languageId y frameworkId omitidos — opcionales.
        },
      });
      expect(interview.languageId).toBeNull();
      expect(interview.frameworkId).toBeNull();
    });
  });
});
