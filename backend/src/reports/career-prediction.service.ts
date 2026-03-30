import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { JOB_PROFILES } from './job-profiles.js';

interface DataPoint {
  date: string;
  interviewId: number;
  avgScore: number;
  monthIndex: number;
}

export interface TrajectoryResult {
  currentLevel: string;
  predictedNextLevel: string | null;
  monthsToNext: number | null;
  growthRate: number;
  confidence: number;
  currentAvgScore: number;
  dataPoints: DataPoint[];
}

export interface JobFitResult {
  id: string;
  title: string;
  companyType: string;
  level: string;
  matchPercent: number;
  requiredSkills: { name: string; required: number; userScore: number }[];
  missingSkills: { name: string; required: number; gap: number }[];
}

@Injectable()
export class CareerPredictionService {
  constructor(private prisma: PrismaService) {}

  async predictTrajectory(userId: number): Promise<TrajectoryResult | null> {
    // 1. Get all user's completed interviews ordered by date
    const interviews = await this.prisma.interview.findMany({
      where: { userId, evaluationStatus: 'completed' },
      orderBy: { startedAt: 'asc' },
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

    if (interviews.length < 3) {
      return null;
    }

    // 2. Calculate average score per interview (across 5 metrics)
    const firstDate = interviews[0].startedAt;
    const dataPoints: DataPoint[] = interviews.map((iv) => {
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
          : 0;

      // Calculate month index relative to first interview
      const diffMs = iv.startedAt.getTime() - firstDate.getTime();
      const monthIndex = diffMs / (1000 * 60 * 60 * 24 * 30.44);

      return {
        date: iv.startedAt.toISOString().split('T')[0],
        interviewId: iv.id,
        avgScore: +avgScore.toFixed(2),
        monthIndex: +monthIndex.toFixed(2),
      };
    });

    // 3. Linear regression on scores over time -> growth rate per month
    const n = dataPoints.length;
    const sumX = dataPoints.reduce((s, dp) => s + dp.monthIndex, 0);
    const sumY = dataPoints.reduce((s, dp) => s + dp.avgScore, 0);
    const sumXY = dataPoints.reduce((s, dp) => s + dp.monthIndex * dp.avgScore, 0);
    const sumX2 = dataPoints.reduce((s, dp) => s + dp.monthIndex * dp.monthIndex, 0);

    const denominator = n * sumX2 - sumX * sumX;
    let slope = 0;
    if (denominator !== 0) {
      slope = (n * sumXY - sumX * sumY) / denominator;
    }

    const growthRate = +slope.toFixed(3);

    // 4. Calculate current estimated level based on most recent avg score
    const currentAvgScore = dataPoints[dataPoints.length - 1].avgScore;

    const currentLevel = this.scoreToLevel(currentAvgScore);
    const predictedNextLevel = this.getNextLevel(currentLevel);

    // 5. Predict months to next level at current growth rate
    let monthsToNext: number | null = null;
    if (predictedNextLevel && growthRate > 0) {
      const targetScore = this.levelThreshold(predictedNextLevel);
      if (currentAvgScore < targetScore) {
        const pointsNeeded = targetScore - currentAvgScore;
        monthsToNext = Math.ceil(pointsNeeded / growthRate);
        // Cap at a reasonable max
        if (monthsToNext > 120) monthsToNext = null;
      } else {
        monthsToNext = 0;
      }
    }

    // 6. Confidence based on number of data points and R-squared
    const meanY = sumY / n;
    const ssTotal = dataPoints.reduce((s, dp) => s + (dp.avgScore - meanY) ** 2, 0);
    const intercept = (sumY - slope * sumX) / n;
    const ssResidual = dataPoints.reduce(
      (s, dp) => s + (dp.avgScore - (intercept + slope * dp.monthIndex)) ** 2,
      0,
    );
    const rSquared = ssTotal > 0 ? 1 - ssResidual / ssTotal : 0;

    // Confidence = weighted combination of data points count and R-squared
    const dataConfidence = Math.min(n / 10, 1); // max at 10 interviews
    const confidence = +((dataConfidence * 0.5 + Math.max(rSquared, 0) * 0.5) * 100).toFixed(0);

    return {
      currentLevel,
      predictedNextLevel,
      monthsToNext,
      growthRate,
      confidence: Math.min(Math.max(confidence, 5), 95), // clamp 5-95
      currentAvgScore: +currentAvgScore.toFixed(2),
      dataPoints,
    };
  }

  async getJobFitProfiles(userId: number): Promise<JobFitResult[]> {
    // 1. Get user's skill scores
    const skillScores = await this.prisma.userSkillScore.findMany({
      where: { userId },
      include: { skill: true },
    });

    if (skillScores.length === 0) {
      return [];
    }

    // Build a map of skill name (normalized) -> score
    const userSkillMap: Record<string, number> = {};
    for (const ss of skillScores) {
      const normalizedName = ss.skill.name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
      userSkillMap[normalizedName] = ss.score;
    }

    // 2. Compare against predefined job profiles
    const results: JobFitResult[] = JOB_PROFILES.map((profile) => {
      const requiredSkillNames = Object.keys(profile.requiredSkills);

      // Build vectors for cosine similarity
      const allSkills = new Set([...requiredSkillNames, ...Object.keys(userSkillMap)]);
      const vecRequired: number[] = [];
      const vecUser: number[] = [];

      for (const skill of allSkills) {
        vecRequired.push(profile.requiredSkills[skill] ?? 0);
        vecUser.push(userSkillMap[skill] ?? 0);
      }

      // 3. Cosine similarity
      const dotProduct = vecRequired.reduce((sum, v, i) => sum + v * vecUser[i], 0);
      const magRequired = Math.sqrt(vecRequired.reduce((sum, v) => sum + v * v, 0));
      const magUser = Math.sqrt(vecUser.reduce((sum, v) => sum + v * v, 0));

      let cosineSim = 0;
      if (magRequired > 0 && magUser > 0) {
        cosineSim = dotProduct / (magRequired * magUser);
      }

      const matchPercent = +(cosineSim * 100).toFixed(0);

      // 4. Build required skills with user scores
      const requiredSkills = requiredSkillNames.map((name) => ({
        name,
        required: profile.requiredSkills[name],
        userScore: userSkillMap[name] ?? 0,
      }));

      // 5. Identify missing skills (gaps)
      const missingSkills = requiredSkills
        .filter((s) => s.userScore < s.required)
        .map((s) => ({
          name: s.name,
          required: s.required,
          gap: +(s.required - s.userScore).toFixed(0),
        }))
        .sort((a, b) => b.gap - a.gap);

      return {
        id: profile.id,
        title: profile.title,
        companyType: profile.companyType,
        level: profile.level,
        matchPercent,
        requiredSkills,
        missingSkills,
      };
    });

    // Return top 5 sorted by match % descending
    results.sort((a, b) => b.matchPercent - a.matchPercent);
    return results.slice(0, 5);
  }

  private scoreToLevel(avg: number): string {
    if (avg >= 3.8) return 'Senior';
    if (avg >= 2.5) return 'Mid';
    return 'Junior';
  }

  private getNextLevel(current: string): string | null {
    if (current === 'Junior') return 'Mid';
    if (current === 'Mid') return 'Senior';
    return null; // Already Senior
  }

  private levelThreshold(level: string): number {
    if (level === 'Mid') return 2.5;
    if (level === 'Senior') return 3.8;
    return 0;
  }
}
