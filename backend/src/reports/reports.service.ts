import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getDashboard(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const recentInterviews = await this.prisma.interview.findMany({
      where: { userId },
      orderBy: { startedAt: 'desc' },
      include: {
        role: true,
        level: true,
        language: true,
        framework: true,
        questions: {
          include: {
            answers: {
              include: {
                evaluation: { include: { detectedLevel: true } },
              },
            },
          },
        },
      },
    });

    const pendingNotifications = await this.prisma.interview.count({
      where: {
        userId,
        evaluationStatus: 'completed',
        evaluationNotificationSeen: false,
      },
    });

    const skillScores = await this.prisma.userSkillScore.findMany({
      where: { userId },
      include: { skill: true },
    });

    // Calculate average score
    const completedInterviews = await this.prisma.interview.findMany({
      where: { userId, evaluationStatus: 'completed' },
      include: {
        questions: {
          include: {
            answers: {
              include: { evaluation: true },
            },
          },
        },
      },
    });

    let averageScore: number | null = null;
    const allScores = completedInterviews.flatMap((i) =>
      i.questions.flatMap((q) =>
        q.answers
          .filter((a) => a.evaluation?.technicalCorrectness != null)
          .map((a) => a.evaluation!.technicalCorrectness!),
      ),
    );
    if (allScores.length > 0) {
      averageScore = allScores.reduce((sum, s) => sum + s, 0) / allScores.length;
    }

    const mappedInterviews = recentInterviews.map((iv) => {
      const evals = iv.questions.flatMap((q) =>
        q.answers
          .filter((a) => a.evaluation)
          .map((a) => a.evaluation!),
      );
      const avgScore =
        evals.length > 0
          ? evals.reduce(
              (sum, e) =>
                sum +
                ((e.technicalCorrectness ?? 0) +
                  (e.clarityOfExplanation ?? 0) +
                  (e.communication ?? 0) +
                  (e.confidence ?? 0) +
                  (e.problemSolving ?? 0)) /
                  5,
              0,
            ) / evals.length
          : null;

      // Most common detected level
      const levelCounts: Record<string, number> = {};
      for (const e of evals) {
        const name = (e as any).detectedLevel?.name;
        if (name) levelCounts[name] = (levelCounts[name] ?? 0) + 1;
      }
      const detectedLevel =
        Object.keys(levelCounts).length > 0
          ? Object.entries(levelCounts).sort((a, b) => b[1] - a[1])[0][0]
          : null;

      return {
        id: iv.id,
        startedAt: iv.startedAt,
        finishedAt: iv.finishedAt,
        evaluationStatus: iv.evaluationStatus,
        roleName: iv.role.name,
        levelName: iv.level.name,
        languageName: iv.language?.name ?? null,
        frameworkName: iv.framework?.name ?? null,
        questionCount: iv.questions.length,
        avgScore,
        detectedLevel,
      };
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
      averageScore,
      pendingNotifications,
      recentInterviews: mappedInterviews,
      skillScores: skillScores.map((ss) => ({
        skillId: ss.skillId,
        skillName: ss.skill.name,
        score: ss.score,
        lastUpdated: ss.lastUpdated,
      })),
    };
  }

  async getInterviewReport(id: number, userId: number) {
    const interview = await this.prisma.interview.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: { orderNumber: 'asc' },
          include: {
            answers: {
              include: {
                evaluation: {
                  include: { detectedLevel: true },
                },
              },
            },
          },
        },
      },
    });

    if (!interview) throw new NotFoundException('Interview not found');
    if (interview.userId !== userId) throw new ForbiddenException();

    return {
      interview,
      evaluations: interview.questions.map((q) => ({
        interviewQuestionId: q.id,
        orderNumber: q.orderNumber,
        questionTextSnapshot: q.questionTextSnapshot,
        answer: q.answers[0] ?? null,
        evaluation: q.answers[0]?.evaluation ?? null,
      })),
    };
  }

  async markSeen(id: number, userId: number) {
    const interview = await this.prisma.interview.findUnique({ where: { id } });
    if (!interview) throw new NotFoundException();
    if (interview.userId !== userId) throw new ForbiddenException();

    await this.prisma.interview.update({
      where: { id },
      data: { evaluationNotificationSeen: true },
    });
  }
}
