// Suite de integración A.3 — UNIQUE constraints (RNF-15, RNF-16, RNF-17)
// Valida que las restricciones UNIQUE del esquema rechazan duplicados
// a nivel de PostgreSQL.
//
// Mapeo:
//   - RNF-15: users.email UNIQUE.
//   - RNF-16: roles.name, languages.name, levels.name, skills.name UNIQUE.
//   - RNF-17: user_skill_scores @@unique([user_id, skill_id]).

import {
  prisma,
  resetDatabase,
  createUser,
  seedCatalogs,
  SeededCatalogs,
  TestUser,
} from '../db-helpers';

describe('Integridad — UNIQUE constraints (RNF-15 / RNF-16 / RNF-17)', () => {
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
  });

  describe('RNF-15 — users.email UNIQUE', () => {
    it('should reject duplicate user email', async () => {
      const email = 'duplicate@vinki.dev';
      await prisma.user.create({
        data: { email, name: 'Primero', passwordHash: 'h', role: 'student' },
      });

      await expect(
        prisma.user.create({
          data: { email, name: 'Segundo', passwordHash: 'h', role: 'student' },
        }),
      ).rejects.toThrow(/Unique constraint failed.*email|users_email_key/);
    });

    it('should accept different emails for different users', async () => {
      await prisma.user.create({
        data: { email: 'a@vinki.dev', name: 'A', passwordHash: 'h', role: 'student' },
      });
      const second = await prisma.user.create({
        data: { email: 'b@vinki.dev', name: 'B', passwordHash: 'h', role: 'student' },
      });
      expect(second.email).toBe('b@vinki.dev');
    });
  });

  describe('RNF-16 — nombres únicos en catálogos', () => {
    beforeEach(async () => {
      // Cada test crea sus propios catálogos para forzar el conflicto.
    });

    it('should reject duplicate role name', async () => {
      await prisma.role.create({ data: { name: 'Backend Engineer' } });
      await expect(
        prisma.role.create({ data: { name: 'Backend Engineer' } }),
      ).rejects.toThrow(/Unique constraint failed.*name|roles_name_key/);
    });

    it('should reject duplicate language name', async () => {
      await prisma.language.create({ data: { name: 'TypeScript' } });
      await expect(
        prisma.language.create({ data: { name: 'TypeScript' } }),
      ).rejects.toThrow(/Unique constraint failed.*name|languages_name_key/);
    });

    it('should reject duplicate level name', async () => {
      await prisma.level.create({ data: { name: 'Junior' } });
      await expect(
        prisma.level.create({ data: { name: 'Junior' } }),
      ).rejects.toThrow(/Unique constraint failed.*name|levels_name_key/);
    });

    it('should reject duplicate skill name', async () => {
      await prisma.skill.create({ data: { name: 'APIs REST' } });
      await expect(
        prisma.skill.create({ data: { name: 'APIs REST' } }),
      ).rejects.toThrow(/Unique constraint failed.*name|skills_name_key/);
    });

    it('should accept different names in the same catalog', async () => {
      await prisma.role.create({ data: { name: 'Backend' } });
      const second = await prisma.role.create({ data: { name: 'Frontend' } });
      expect(second.name).toBe('Frontend');
    });
  });

  describe('RNF-17 — user_skill_scores @@unique([user_id, skill_id])', () => {
    beforeEach(async () => {
      catalogs = await seedCatalogs();
      student = await createUser({ role: 'student' });
    });

    it('should reject duplicate (user_id, skill_id) pair', async () => {
      await prisma.userSkillScore.create({
        data: { userId: student.id, skillId: catalogs.skillId, score: 50 },
      });
      await expect(
        prisma.userSkillScore.create({
          data: { userId: student.id, skillId: catalogs.skillId, score: 75 },
        }),
      ).rejects.toThrow(/Unique constraint failed|user_skill_scores/);
    });

    it('should accept different skills for the same user', async () => {
      const skill2 = await prisma.skill.create({ data: { name: 'GraphQL' } });

      await prisma.userSkillScore.create({
        data: { userId: student.id, skillId: catalogs.skillId, score: 50 },
      });
      const second = await prisma.userSkillScore.create({
        data: { userId: student.id, skillId: skill2.id, score: 70 },
      });
      expect(second.score).toBe(70);
    });

    it('should accept same skill for different users', async () => {
      const otherStudent = await createUser({ email: 'second@vinki.dev' });

      await prisma.userSkillScore.create({
        data: { userId: student.id, skillId: catalogs.skillId, score: 50 },
      });
      const second = await prisma.userSkillScore.create({
        data: { userId: otherStudent.id, skillId: catalogs.skillId, score: 80 },
      });
      expect(second.score).toBe(80);
    });
  });
});
