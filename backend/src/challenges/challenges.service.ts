import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';

@Injectable()
export class ChallengesService {
  private readonly logger = new Logger(ChallengesService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get all active challenges, including user's participation status.
   */
  async getActiveChallenges(userId: number) {
    const now = new Date();
    const challenges = await this.prisma.challenge.findMany({
      where: {
        isActive: true,
        endDate: { gte: now },
        startDate: { lte: now },
      },
      include: {
        participants: { where: { userId }, take: 1 },
        _count: { select: { participants: true } },
      },
      orderBy: { endDate: 'asc' },
    });

    return challenges.map((c) => {
      const participation = c.participants[0] ?? null;
      return {
        id: c.id,
        title: c.title,
        titleEn: c.titleEn,
        description: c.description,
        descriptionEn: c.descriptionEn,
        type: c.type,
        target: c.target,
        metric: c.metric,
        icon: c.icon,
        startDate: c.startDate.toISOString(),
        endDate: c.endDate.toISOString(),
        participantCount: c._count.participants,
        joined: !!participation,
        progress: participation?.progress ?? 0,
        completed: participation?.completed ?? false,
        completedAt: participation?.completedAt?.toISOString() ?? null,
      };
    });
  }

  /**
   * Join a challenge.
   */
  async joinChallenge(userId: number, challengeId: number) {
    const challenge = await this.prisma.challenge.findUnique({
      where: { id: challengeId },
    });

    if (!challenge) {
      throw new NotFoundException('Challenge not found');
    }

    const now = new Date();
    if (!challenge.isActive || challenge.endDate < now || challenge.startDate > now) {
      throw new ConflictException('Challenge is not currently active');
    }

    try {
      const participation = await this.prisma.challengeParticipation.create({
        data: { userId, challengeId },
      });
      return participation;
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('Already joined this challenge');
      }
      throw error;
    }
  }

  /**
   * Update progress for all active challenge participations for a user.
   * Called after an interview evaluation is completed.
   */
  async updateProgress(userId: number): Promise<void> {
    const now = new Date();

    const participations = await this.prisma.challengeParticipation.findMany({
      where: {
        userId,
        completed: false,
        challenge: {
          isActive: true,
          endDate: { gte: now },
        },
      },
      include: { challenge: true },
    });

    for (const p of participations) {
      const challenge = p.challenge;
      let progress = 0;

      try {
        switch (challenge.metric) {
          case 'interviews_completed': {
            progress = await this.prisma.interview.count({
              where: {
                userId,
                evaluationStatus: 'completed',
                startedAt: { gte: challenge.startDate },
                finishedAt: { lte: challenge.endDate },
              },
            });
            break;
          }

          case 'questions_answered': {
            const interviews = await this.prisma.interview.findMany({
              where: {
                userId,
                startedAt: { gte: challenge.startDate },
              },
              select: { id: true },
            });
            const interviewIds = interviews.map((i) => i.id);
            if (interviewIds.length > 0) {
              progress = await this.prisma.answer.count({
                where: {
                  interviewQuestion: { interviewId: { in: interviewIds } },
                  answerText: { not: null },
                },
              });
            }
            break;
          }

          case 'avg_score_above': {
            const evals = await this.prisma.answerEvaluation.findMany({
              where: {
                answer: {
                  interviewQuestion: {
                    interview: {
                      userId,
                      evaluationStatus: 'completed',
                      startedAt: { gte: challenge.startDate },
                    },
                  },
                },
              },
              select: {
                technicalCorrectness: true,
                clarityOfExplanation: true,
                communication: true,
                confidence: true,
                problemSolving: true,
              },
            });

            if (evals.length > 0) {
              const avg =
                evals.reduce((sum, e) => {
                  const vals = [
                    e.technicalCorrectness,
                    e.clarityOfExplanation,
                    e.communication,
                    e.confidence,
                    e.problemSolving,
                  ].filter((v): v is number => v !== null);
                  return (
                    sum +
                    (vals.length > 0
                      ? vals.reduce((a, b) => a + b, 0) / vals.length
                      : 0)
                  );
                }, 0) / evals.length;

              const rounded = Math.round(avg * 10) / 10;
              progress =
                rounded >= challenge.target ? challenge.target : rounded;
            }
            break;
          }

          case 'consecutive_days': {
            const interviews = await this.prisma.interview.findMany({
              where: {
                userId,
                evaluationStatus: 'completed',
                startedAt: { gte: challenge.startDate },
                finishedAt: { lte: challenge.endDate },
              },
              select: { startedAt: true },
              orderBy: { startedAt: 'asc' },
            });

            if (interviews.length > 0) {
              const days = new Set(
                interviews.map((i) => i.startedAt.toISOString().slice(0, 10)),
              );
              const sortedDays = Array.from(days).sort();
              let maxStreak = 1;
              let currentStreak = 1;
              for (let i = 1; i < sortedDays.length; i++) {
                const prev = new Date(sortedDays[i - 1]);
                const curr = new Date(sortedDays[i]);
                const diffDays =
                  (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
                if (diffDays === 1) {
                  currentStreak++;
                  maxStreak = Math.max(maxStreak, currentStreak);
                } else {
                  currentStreak = 1;
                }
              }
              progress = maxStreak;
            }
            break;
          }

          default:
            this.logger.warn(`Unknown metric: ${challenge.metric}`);
            continue;
        }

        const completed = progress >= challenge.target;
        await this.prisma.challengeParticipation.update({
          where: { id: p.id },
          data: {
            progress: Math.min(progress, challenge.target),
            completed,
            completedAt: completed && !p.completed ? new Date() : p.completedAt,
          },
        });

        if (completed) {
          this.logger.log(
            `User ${userId} completed challenge "${challenge.title}" (id=${challenge.id})`,
          );
        }
      } catch (error) {
        this.logger.error(
          `Error updating progress for challenge ${challenge.id}: ${(error as Error).message}`,
        );
      }
    }
  }

  /**
   * Get leaderboard for a specific challenge (top 20).
   */
  async getLeaderboard(challengeId: number) {
    const challenge = await this.prisma.challenge.findUnique({
      where: { id: challengeId },
    });
    if (!challenge) {
      throw new NotFoundException('Challenge not found');
    }

    const participants = await this.prisma.challengeParticipation.findMany({
      where: { challengeId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: [
        { completed: 'desc' },
        { progress: 'desc' },
        { joinedAt: 'asc' },
      ],
      take: 20,
    });

    return participants.map((p, i) => ({
      rank: i + 1,
      userId: p.user.id,
      name: p.user.name,
      progress: p.progress,
      target: challenge.target,
      completed: p.completed,
      completedAt: p.completedAt?.toISOString() ?? null,
    }));
  }

  /**
   * Global monthly leaderboard: top 20 users by avg score this month.
   */
  async getGlobalLeaderboard() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );

    const students = await this.prisma.user.findMany({
      where: { role: 'student' },
      include: {
        interviews: {
          where: {
            evaluationStatus: 'completed',
            startedAt: { gte: startOfMonth },
          },
          include: {
            questions: {
              include: { answers: { include: { evaluation: true } } },
            },
          },
        },
      },
    });

    const leaderboard = students
      .map((s) => {
        const allEvals = s.interviews.flatMap((i) =>
          i.questions.flatMap((q) =>
            q.answers.map((a) => a.evaluation).filter(Boolean),
          ),
        );
        if (allEvals.length === 0) return null;

        const avg =
          allEvals.reduce((sum, e) => {
            const vals = [
              e!.technicalCorrectness,
              e!.clarityOfExplanation,
              e!.communication,
              e!.confidence,
              e!.problemSolving,
            ].filter((v): v is number => v !== null);
            return (
              sum +
              (vals.length > 0
                ? vals.reduce((a, b) => a + b, 0) / vals.length
                : 0)
            );
          }, 0) / allEvals.length;

        return {
          userId: s.id,
          name: s.name,
          avgScore: Math.round(avg * 100) / 100,
          interviewCount: s.interviews.length,
        };
      })
      .filter(Boolean)
      .sort((a, b) => b!.avgScore - a!.avgScore || b!.interviewCount - a!.interviewCount)
      .slice(0, 20)
      .map((s, i) => ({ rank: i + 1, ...s! }));

    const daysUntilReset = Math.ceil(
      (endOfMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    return {
      month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
      daysUntilReset,
      entries: leaderboard,
    };
  }
}
