import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';

@Injectable()
export class AchievementsService {
  private readonly logger = new Logger(AchievementsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Check all achievement conditions for a user and award any new ones.
   */
  async checkAndAward(userId: number): Promise<void> {
    const achievements = await this.prisma.achievement.findMany();
    const existing = await this.prisma.userAchievement.findMany({
      where: { userId },
      select: { achievementId: true },
    });
    const unlockedIds = new Set(existing.map((e) => e.achievementId));

    for (const achievement of achievements) {
      if (unlockedIds.has(achievement.id)) continue;

      const earned = await this.evaluate(userId, achievement.key, achievement.threshold);
      if (earned) {
        await this.prisma.userAchievement.create({
          data: { userId, achievementId: achievement.id },
        });
        this.logger.log(`User ${userId} unlocked achievement: ${achievement.key}`);
      }
    }
  }

  /**
   * Evaluate whether a user meets a specific achievement condition.
   */
  private async evaluate(userId: number, key: string, threshold: number): Promise<boolean> {
    switch (key) {
      case 'first_interview': {
        const count = await this.prisma.interview.count({
          where: { userId, evaluationStatus: 'completed' },
        });
        return count >= 1;
      }

      case 'five_interviews': {
        const count = await this.prisma.interview.count({
          where: { userId, evaluationStatus: 'completed' },
        });
        return count >= 5;
      }

      case 'ten_interviews': {
        const count = await this.prisma.interview.count({
          where: { userId, evaluationStatus: 'completed' },
        });
        return count >= 10;
      }

      case 'perfect_score': {
        const perfect = await this.prisma.answerEvaluation.findFirst({
          where: {
            answer: {
              interviewQuestion: {
                interview: { userId },
              },
            },
            OR: [
              { technicalCorrectness: 5.0 },
              { clarityOfExplanation: 5.0 },
              { communication: 5.0 },
              { confidence: 5.0 },
              { problemSolving: 5.0 },
            ],
          },
        });
        return !!perfect;
      }

      case 'skill_master': {
        const highSkill = await this.prisma.userSkillScore.findFirst({
          where: { userId, score: { gte: 80 } },
        });
        return !!highSkill;
      }

      case 'all_rounder': {
        const totalSkills = await this.prisma.skill.count();
        if (totalSkills === 0) return false;
        const userSkillCount = await this.prisma.userSkillScore.count({
          where: { userId },
        });
        return userSkillCount >= totalSkills;
      }

      case 'level_up': {
        // Check if any detected level is higher than the chosen level
        const interviews = await this.prisma.interview.findMany({
          where: { userId, evaluationStatus: 'completed' },
          select: {
            chosenLevelId: true,
            questions: {
              select: {
                answers: {
                  select: {
                    evaluation: {
                      select: { detectedLevelId: true },
                    },
                  },
                },
              },
            },
          },
        });

        const levels = await this.prisma.level.findMany();
        const levelOrder = new Map<number, number>();
        for (const l of levels) {
          if (l.name === 'Junior') levelOrder.set(l.id, 0);
          else if (l.name === 'Mid') levelOrder.set(l.id, 1);
          else if (l.name === 'Senior') levelOrder.set(l.id, 2);
        }

        for (const interview of interviews) {
          const chosenRank = levelOrder.get(interview.chosenLevelId) ?? 0;
          for (const q of interview.questions) {
            for (const a of q.answers) {
              const detectedId = a.evaluation?.detectedLevelId;
              if (detectedId) {
                const detectedRank = levelOrder.get(detectedId) ?? 0;
                if (detectedRank > chosenRank) return true;
              }
            }
          }
        }
        return false;
      }

      case 'practice_champion': {
        const count = await this.prisma.interview.count({
          where: { userId, mode: 'practice', evaluationStatus: 'completed' },
        });
        return count >= threshold;
      }

      case 'speed_demon': {
        // User finished an interview where all questions have answers
        const completedInterviews = await this.prisma.interview.findMany({
          where: { userId, evaluationStatus: 'completed', finishedAt: { not: null } },
          select: {
            id: true,
            questions: {
              select: {
                id: true,
                answers: { select: { id: true } },
              },
            },
          },
        });

        for (const iv of completedInterviews) {
          if (iv.questions.length > 0) {
            const allAnswered = iv.questions.every((q) => q.answers.length > 0);
            if (allAnswered) return true;
          }
        }
        return false;
      }

      case 'knowledge_contributor': {
        const count = await this.prisma.knowledgeDocument.count({
          where: { uploadedById: userId },
        });
        return count >= 1;
      }

      default:
        return false;
    }
  }

  /**
   * Get all achievements with the user's unlock status.
   */
  async getUserAchievements(userId: number) {
    const achievements = await this.prisma.achievement.findMany({
      orderBy: [{ category: 'asc' }, { id: 'asc' }],
    });

    const userAchievements = await this.prisma.userAchievement.findMany({
      where: { userId },
    });

    const unlockedMap = new Map(
      userAchievements.map((ua) => [ua.achievementId, ua.unlockedAt]),
    );

    return achievements.map((a) => ({
      id: a.id,
      key: a.key,
      title: a.title,
      titleEn: a.titleEn,
      description: a.description,
      descriptionEn: a.descriptionEn,
      icon: a.icon,
      category: a.category,
      threshold: a.threshold,
      unlocked: unlockedMap.has(a.id),
      unlockedAt: unlockedMap.get(a.id)?.toISOString() ?? null,
    }));
  }
}
