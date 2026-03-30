import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';

interface LanguageScore {
  languageId: number;
  languageName: string;
  avgScore: number;
  interviewCount: number;
}

export interface TransferRecommendation {
  fromLanguage: string;
  fromScore: number;
  toLanguage: string;
  predictedScore: number;
  confidence: number;
  reason: string;
}

// Transfer affinity matrix: how well skills transfer between languages
// 1.0 = perfect transfer, 0.5 = moderate, 0.0 = no transfer
const TRANSFER_AFFINITY: Record<string, Record<string, number>> = {
  JavaScript: { TypeScript: 0.95, Python: 0.7, Java: 0.6, Go: 0.55, Rust: 0.4, SQL: 0.3 },
  TypeScript: { JavaScript: 0.95, Python: 0.65, Java: 0.65, Go: 0.55, Rust: 0.45, SQL: 0.3 },
  Python: { JavaScript: 0.65, TypeScript: 0.6, Java: 0.7, Go: 0.6, Rust: 0.4, SQL: 0.5 },
  Java: { JavaScript: 0.55, TypeScript: 0.6, Python: 0.7, Go: 0.65, Rust: 0.5, SQL: 0.4 },
  Go: { JavaScript: 0.5, TypeScript: 0.5, Python: 0.6, Java: 0.65, Rust: 0.7, SQL: 0.35 },
  Rust: { JavaScript: 0.35, TypeScript: 0.4, Python: 0.4, Java: 0.5, Go: 0.7, SQL: 0.25 },
  SQL: { JavaScript: 0.3, TypeScript: 0.3, Python: 0.5, Java: 0.4, Go: 0.35, Rust: 0.25 },
};

@Injectable()
export class TransferLearningService {
  constructor(private prisma: PrismaService) {}

  async getRecommendations(userId: number): Promise<TransferRecommendation[]> {
    // Get user's scores per language from completed interviews
    const interviews = await this.prisma.interview.findMany({
      where: {
        userId,
        evaluationStatus: 'completed',
        languageId: { not: null },
      },
      include: {
        language: true,
        questions: {
          include: {
            answers: {
              include: { evaluation: true },
            },
          },
        },
      },
    });

    // Calculate avg score per language
    const languageScores: Map<number, LanguageScore> = new Map();

    for (const interview of interviews) {
      if (!interview.language) continue;

      const scores = interview.questions
        .flatMap((q) => q.answers)
        .map((a) => a.evaluation)
        .filter(Boolean)
        .map((e) => {
          const vals = [
            e!.technicalCorrectness,
            e!.clarityOfExplanation,
            e!.communication,
            e!.confidence,
            e!.problemSolving,
          ].filter((v): v is number => v !== null);
          return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
        });

      if (scores.length === 0) continue;

      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      const existing = languageScores.get(interview.language.id);

      if (existing) {
        existing.avgScore = (existing.avgScore * existing.interviewCount + avgScore) / (existing.interviewCount + 1);
        existing.interviewCount++;
      } else {
        languageScores.set(interview.language.id, {
          languageId: interview.language.id,
          languageName: interview.language.name,
          avgScore,
          interviewCount: 1,
        });
      }
    }

    if (languageScores.size === 0) return [];

    // Get all available languages
    const allLanguages = await this.prisma.language.findMany();
    const knownLanguageNames = new Set([...languageScores.values()].map((l) => l.languageName));

    // Generate recommendations for languages user hasn't tried
    const recommendations: TransferRecommendation[] = [];

    for (const targetLang of allLanguages) {
      if (knownLanguageNames.has(targetLang.name)) continue;
      if (!['JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'Rust', 'SQL'].includes(targetLang.name)) continue;

      // Find best source language for this target
      let bestPrediction = 0;
      let bestSource: LanguageScore | null = null;
      let bestAffinity = 0;

      for (const source of languageScores.values()) {
        const affinity = TRANSFER_AFFINITY[source.languageName]?.[targetLang.name] ?? 0;
        const predicted = source.avgScore * affinity;

        if (predicted > bestPrediction) {
          bestPrediction = predicted;
          bestSource = source;
          bestAffinity = affinity;
        }
      }

      if (bestSource && bestPrediction > 1.5) {
        const confidence = Math.min(bestSource.interviewCount / 5, 1) * bestAffinity;

        recommendations.push({
          fromLanguage: bestSource.languageName,
          fromScore: Math.round(bestSource.avgScore * 20),
          toLanguage: targetLang.name,
          predictedScore: Math.round(bestPrediction * 20),
          confidence: Math.round(confidence * 100),
          reason: this.getTransferReason(bestSource.languageName, targetLang.name, bestAffinity),
        });
      }
    }

    return recommendations.sort((a, b) => b.predictedScore - a.predictedScore).slice(0, 5);
  }

  private getTransferReason(from: string, to: string, affinity: number): string {
    if (affinity >= 0.9) return `${from} y ${to} comparten casi toda su sintaxis y patrones`;
    if (affinity >= 0.7) return `Muchos conceptos de ${from} aplican directamente en ${to}`;
    if (affinity >= 0.5) return `${from} te da una base sólida para aprender ${to}`;
    return `Algunos conceptos de ${from} se transfieren a ${to}`;
  }
}
