import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { PrismaService } from '../common/prisma.service';

describe('ReportsService', () => {
  let service: ReportsService;
  let prisma: Record<string, any>;

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn() },
      interview: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
      },
      userSkillScore: {
        findMany: jest.fn(),
        groupBy: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
  });

  describe('getDashboard()', () => {
    const userId = 1;
    const mockUser = {
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
      role: 'student',
      createdAt: new Date('2025-01-01'),
    };

    it('should throw NotFoundException if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getDashboard(userId)).rejects.toThrow(NotFoundException);
    });

    it('should return dashboard data with interviews, skill scores, and average score', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      // Recent interviews (with full relations)
      prisma.interview.findMany.mockImplementation((args: any) => {
        const { where, orderBy } = args;
        if (orderBy?.startedAt === 'desc') {
          // recentInterviews query
          return Promise.resolve([
            {
              id: 1,
              startedAt: new Date('2025-06-01'),
              finishedAt: new Date('2025-06-01'),
              evaluationStatus: 'completed',
              role: { name: 'Backend' },
              level: { name: 'Junior' },
              language: { name: 'TypeScript' },
              framework: null,
              questions: [
                {
                  answers: [
                    {
                      evaluation: {
                        technicalCorrectness: 4,
                        clarityOfExplanation: 3,
                        communication: 4,
                        confidence: 3,
                        problemSolving: 4,
                        detectedLevel: { name: 'Junior' },
                      },
                    },
                  ],
                },
              ],
            },
          ]);
        }
        // completedInterviews query
        return Promise.resolve([
          {
            questions: [
              {
                answers: [
                  { evaluation: { technicalCorrectness: 4 } },
                ],
              },
            ],
          },
        ]);
      });

      prisma.interview.count.mockResolvedValue(1);

      prisma.userSkillScore.findMany.mockResolvedValue([
        { skillId: 1, skill: { name: 'JavaScript' }, score: 80, lastUpdated: new Date() },
      ]);

      const result = await service.getDashboard(userId);

      expect(result.user.id).toBe(1);
      expect(result.user.name).toBe('Test User');
      expect(result.averageScore).toBe(4);
      expect(result.pendingNotifications).toBe(1);
      expect(result.recentInterviews).toHaveLength(1);
      expect(result.recentInterviews[0].roleName).toBe('Backend');
      expect(result.recentInterviews[0].avgScore).toBeCloseTo(3.6);
      expect(result.recentInterviews[0].detectedLevel).toBe('Junior');
      expect(result.skillScores).toHaveLength(1);
      expect(result.skillScores[0].skillName).toBe('JavaScript');
    });

    it('should return null averageScore when no completed interviews', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.interview.findMany.mockResolvedValue([]);
      prisma.interview.count.mockResolvedValue(0);
      prisma.userSkillScore.findMany.mockResolvedValue([]);

      const result = await service.getDashboard(userId);

      expect(result.averageScore).toBeNull();
      expect(result.recentInterviews).toEqual([]);
      expect(result.skillScores).toEqual([]);
    });
  });

  describe('getInterviewReport()', () => {
    it('should return the interview report with evaluations', async () => {
      const mockInterview = {
        id: 1,
        userId: 1,
        questions: [
          {
            id: 10,
            orderNumber: 1,
            questionTextSnapshot: 'What is REST?',
            question: { skill: { name: 'APIs' } },
            answers: [
              {
                id: 100,
                answerText: 'REST is...',
                evaluation: {
                  technicalCorrectness: 4,
                  feedbackText: 'Good answer',
                  detectedLevel: { name: 'Mid' },
                },
              },
            ],
          },
        ],
      };

      prisma.interview.findUnique.mockResolvedValue(mockInterview);

      const result = await service.getInterviewReport(1, 1);

      expect(result.interview).toEqual(mockInterview);
      expect(result.evaluations).toHaveLength(1);
      expect(result.evaluations[0].skillName).toBe('APIs');
      expect(result.evaluations[0].evaluation?.technicalCorrectness).toBe(4);
    });

    it('should throw NotFoundException if interview not found', async () => {
      prisma.interview.findUnique.mockResolvedValue(null);

      await expect(service.getInterviewReport(999, 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user does not own the interview', async () => {
      prisma.interview.findUnique.mockResolvedValue({ id: 1, userId: 99, questions: [] });

      await expect(service.getInterviewReport(1, 1)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getPercentiles()', () => {
    it('should calculate percentiles correctly', async () => {
      prisma.userSkillScore.findMany.mockResolvedValue([
        { userId: 1, skillId: 1, skill: { name: 'JavaScript' }, score: 80 },
        { userId: 2, skillId: 1, skill: { name: 'JavaScript' }, score: 60 },
        { userId: 3, skillId: 1, skill: { name: 'JavaScript' }, score: 90 },
        { userId: 4, skillId: 1, skill: { name: 'JavaScript' }, score: 70 },
      ]);

      prisma.userSkillScore.groupBy.mockResolvedValue([
        { userId: 1, _avg: { score: 80 } },
        { userId: 2, _avg: { score: 60 } },
        { userId: 3, _avg: { score: 90 } },
        { userId: 4, _avg: { score: 70 } },
      ]);

      const result = await service.getPercentiles(1);

      // userId=1 has score 80. Sorted: [60, 70, 80, 90]. Index of first >= 80 is 2.
      // percentile = (2 / 3) * 100 = 67
      expect(result.percentiles).toHaveLength(1);
      expect(result.percentiles[0].skillName).toBe('JavaScript');
      expect(result.percentiles[0].percentile).toBe(67);
      expect(result.percentiles[0].totalCandidates).toBe(4);

      // Overall: same values, user 1 avg is 80, rank index 2, percentile 67
      expect(result.overall.percentile).toBe(67);
      expect(result.overall.totalCandidates).toBe(4);
    });

    it('should return 50 percentile when user is the only candidate', async () => {
      prisma.userSkillScore.findMany.mockResolvedValue([
        { userId: 1, skillId: 1, skill: { name: 'JavaScript' }, score: 75 },
      ]);

      prisma.userSkillScore.groupBy.mockResolvedValue([
        { userId: 1, _avg: { score: 75 } },
      ]);

      const result = await service.getPercentiles(1);

      expect(result.percentiles[0].percentile).toBe(50);
      expect(result.overall.percentile).toBe(50);
    });

    it('should return empty percentiles for user with no scores', async () => {
      prisma.userSkillScore.findMany.mockResolvedValue([]);
      prisma.userSkillScore.groupBy.mockResolvedValue([]);

      const result = await service.getPercentiles(1);

      expect(result.percentiles).toEqual([]);
      // overall: user not found -> score 0, sortedOverall is empty -> length 0 -> percentile 50
      expect(result.overall.score).toBe(0);
    });
  });

  describe('getProgressHistory()', () => {
    it('should return progress data sorted by date', async () => {
      prisma.interview.findMany.mockResolvedValue([
        {
          id: 1,
          startedAt: new Date('2025-05-01'),
          evaluationStatus: 'completed',
          questions: [
            {
              answers: [
                {
                  evaluation: {
                    technicalCorrectness: 3,
                    clarityOfExplanation: 3,
                    communication: 3,
                    confidence: 3,
                    problemSolving: 3,
                  },
                },
              ],
            },
          ],
        },
        {
          id: 2,
          startedAt: new Date('2025-06-01'),
          evaluationStatus: 'completed',
          questions: [
            {
              answers: [
                {
                  evaluation: {
                    technicalCorrectness: 4,
                    clarityOfExplanation: 4,
                    communication: 4,
                    confidence: 4,
                    problemSolving: 4,
                  },
                },
              ],
            },
          ],
        },
      ]);

      const result = await service.getProgressHistory(1);

      expect(result.progress).toHaveLength(2);
      expect(result.progress[0].date).toBe('2025-05-01');
      expect(result.progress[0].overall).toBe(3);
      expect(result.progress[0].interviewId).toBe(1);
      expect(result.progress[1].date).toBe('2025-06-01');
      expect(result.progress[1].overall).toBe(4);
      expect(result.progress[1].interviewId).toBe(2);
    });

    it('should return empty progress for user with no completed interviews', async () => {
      prisma.interview.findMany.mockResolvedValue([]);

      const result = await service.getProgressHistory(1);

      expect(result.progress).toEqual([]);
    });

    it('should handle questions with no evaluations', async () => {
      prisma.interview.findMany.mockResolvedValue([
        {
          id: 1,
          startedAt: new Date('2025-05-01'),
          questions: [
            { answers: [{ evaluation: null }] },
          ],
        },
      ]);

      const result = await service.getProgressHistory(1);

      expect(result.progress).toHaveLength(1);
      expect(result.progress[0].overall).toBe(0);
    });
  });
});
