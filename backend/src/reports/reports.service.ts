import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';

const ShareLinkStore = new Map<string, { interviewId: number; expiresAt: number }>();

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
            question: { include: { skill: true } },
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
        skillName: q.question?.skill?.name ?? null,
        source: q.question?.source ?? null,
        answer: q.answers[0] ?? null,
        evaluation: q.answers[0]?.evaluation ?? null,
      })),
    };
  }

  async getPercentiles(userId: number) {
    // Get all users' skill scores
    const allScores = await this.prisma.userSkillScore.findMany({
      include: { skill: true },
    });

    // Get this user's scores
    const userScores = allScores.filter((s) => s.userId === userId);

    // Calculate percentiles per skill
    const percentiles = userScores.map((us) => {
      const sameSkillScores = allScores
        .filter((s) => s.skillId === us.skillId)
        .map((s) => s.score)
        .sort((a, b) => a - b);

      const rank = sameSkillScores.findIndex((s) => s >= us.score);
      const percentile =
        sameSkillScores.length > 1
          ? Math.round((rank / (sameSkillScores.length - 1)) * 100)
          : 50;

      return {
        skillId: us.skillId,
        skillName: us.skill.name,
        score: us.score,
        percentile,
        totalCandidates: sameSkillScores.length,
      };
    });

    // Overall percentile
    const allOverallScores = await this.prisma.userSkillScore.groupBy({
      by: ['userId'],
      _avg: { score: true },
    });

    const userOverall =
      allOverallScores.find((s) => s.userId === userId)?._avg.score ?? 0;
    const sortedOverall = allOverallScores
      .map((s) => s._avg.score ?? 0)
      .sort((a, b) => a - b);
    const overallRank = sortedOverall.findIndex((s) => s >= userOverall);
    const overallPercentile =
      sortedOverall.length > 1
        ? Math.round((overallRank / (sortedOverall.length - 1)) * 100)
        : 50;

    return {
      percentiles,
      overall: {
        score: userOverall,
        percentile: overallPercentile,
        totalCandidates: sortedOverall.length,
      },
    };
  }

  async exportPDF(id: number, userId: number) {
    const report = await this.getInterviewReport(id, userId);
    const PDFDocument = (await import('pdfkit')).default;
    const doc = new PDFDocument({ margin: 50 });

    // Header
    doc.fontSize(20).fillColor('#7C3AED').text('Vinki', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(16).fillColor('#111827').text('Reporte de Entrevista', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#6B7280').text(`Entrevista #${id} | Estado: ${report.interview.evaluationStatus}`, { align: 'center' });
    doc.moveDown(1);

    // Separator
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#E5E7EB').stroke();
    doc.moveDown(1);

    for (const item of report.evaluations) {
      // Question header
      doc.fontSize(12).fillColor('#7C3AED').text(`Pregunta ${item.orderNumber}`);
      doc.fontSize(11).fillColor('#111827').text(item.questionTextSnapshot);
      doc.moveDown(0.5);

      // Answer
      doc.fontSize(10).fillColor('#6B7280').text('Respuesta:');
      doc.fontSize(10).fillColor('#111827').text(item.answer?.answerText || 'Sin respuesta', { indent: 10 });
      doc.moveDown(0.5);

      if (item.evaluation) {
        // Metrics
        const e = item.evaluation;
        doc.fontSize(10).fillColor('#6B7280').text('Métricas:');
        const metrics = [
          `Corrección técnica: ${e.technicalCorrectness?.toFixed(1) ?? '-'}/5`,
          `Claridad: ${e.clarityOfExplanation?.toFixed(1) ?? '-'}/5`,
          `Comunicación: ${e.communication?.toFixed(1) ?? '-'}/5`,
          `Confianza: ${e.confidence?.toFixed(1) ?? '-'}/5`,
          `Resolución: ${e.problemSolving?.toFixed(1) ?? '-'}/5`,
        ];
        doc.fontSize(9).fillColor('#374151').text(metrics.join('  |  '), { indent: 10 });
        doc.moveDown(0.3);

        // Detected level
        if ((e as any).detectedLevel?.name) {
          doc.fontSize(10).fillColor('#7C3AED').text(`Nivel detectado: ${(e as any).detectedLevel.name}`);
        }

        // Feedback
        if (e.feedbackText) {
          doc.moveDown(0.3);
          doc.fontSize(10).fillColor('#6B7280').text('Feedback IA:');
          doc.fontSize(9).fillColor('#374151').text(e.feedbackText, { indent: 10 });
        }

        // Level recommendations
        if ((e as any).juniorAnswer) {
          doc.moveDown(0.3);
          doc.fontSize(9).fillColor('#10B981').text('Junior: ', { continued: true });
          doc.fillColor('#374151').text((e as any).juniorAnswer);
        }
        if ((e as any).midAnswer) {
          doc.fontSize(9).fillColor('#3B82F6').text('Mid: ', { continued: true });
          doc.fillColor('#374151').text((e as any).midAnswer);
        }
        if ((e as any).seniorAnswer) {
          doc.fontSize(9).fillColor('#F59E0B').text('Senior: ', { continued: true });
          doc.fillColor('#374151').text((e as any).seniorAnswer);
        }
      }

      doc.moveDown(1);
      // Separator between questions
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#E5E7EB').stroke();
      doc.moveDown(0.5);
    }

    // Footer
    doc.fontSize(8).fillColor('#9CA3AF').text(`Generado por Vinki | ${new Date().toLocaleDateString()}`, { align: 'center' });

    return doc;
  }

  async exportCSV(id: number, userId: number) {
    const report = await this.getInterviewReport(id, userId);
    const headers = ['Pregunta', 'Orden', 'Respuesta', 'Corrección Técnica', 'Claridad', 'Comunicación', 'Confianza', 'Resolución', 'Nivel Detectado', 'Feedback'];
    const rows = report.evaluations.map((item) => [
      `"${item.questionTextSnapshot.replace(/"/g, '""')}"`,
      item.orderNumber,
      `"${(item.answer?.answerText || '').replace(/"/g, '""')}"`,
      item.evaluation?.technicalCorrectness ?? '',
      item.evaluation?.clarityOfExplanation ?? '',
      item.evaluation?.communication ?? '',
      item.evaluation?.confidence ?? '',
      item.evaluation?.problemSolving ?? '',
      (item.evaluation as any)?.detectedLevel?.name ?? '',
      `"${(item.evaluation?.feedbackText || '').replace(/"/g, '""')}"`,
    ]);
    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  async getProgressHistory(userId: number) {
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

    const progress = interviews.map((iv) => {
      const evals = iv.questions.flatMap((q) =>
        q.answers
          .filter((a) => a.evaluation)
          .map((a) => a.evaluation!),
      );

      const avg = (field: 'technicalCorrectness' | 'clarityOfExplanation' | 'communication' | 'confidence' | 'problemSolving') => {
        const values = evals.map((e) => e[field]).filter((v): v is number => v != null);
        return values.length > 0 ? values.reduce((s, v) => s + v, 0) / values.length : 0;
      };

      const technicalCorrectness = avg('technicalCorrectness');
      const clarityOfExplanation = avg('clarityOfExplanation');
      const communication = avg('communication');
      const confidence = avg('confidence');
      const problemSolving = avg('problemSolving');
      const overall = (technicalCorrectness + clarityOfExplanation + communication + confidence + problemSolving) / 5;

      return {
        date: iv.startedAt.toISOString().split('T')[0],
        interviewId: iv.id,
        technicalCorrectness: +technicalCorrectness.toFixed(2),
        clarityOfExplanation: +clarityOfExplanation.toFixed(2),
        communication: +communication.toFixed(2),
        confidence: +confidence.toFixed(2),
        problemSolving: +problemSolving.toFixed(2),
        overall: +overall.toFixed(2),
      };
    });

    return { progress };
  }

  async getRecruiterDashboard(filters?: { levelName?: string; skillName?: string; languageName?: string }) {
    const students = await this.prisma.user.findMany({
      where: { role: 'student' },
      include: {
        skillScores: { include: { skill: true } },
        interviews: {
          orderBy: { startedAt: 'desc' },
          take: 1,
          include: { level: true, language: true },
        },
      },
    });

    let mapped = students.map((s) => {
      const avgScore = s.skillScores.length > 0
        ? s.skillScores.reduce((sum, ss) => sum + ss.score, 0) / s.skillScores.length
        : null;
      const lastInterview = s.interviews[0] ?? null;
      return {
        id: s.id,
        name: s.name,
        email: s.email,
        interviewCount: s.interviews.length,
        avgScore,
        levelName: lastInterview?.level?.name ?? null,
        languageName: lastInterview?.language?.name ?? null,
        skills: s.skillScores.map((ss) => ({ name: ss.skill.name, score: ss.score })),
        lastInterviewDate: lastInterview?.startedAt ?? null,
      };
    });

    // Apply filters
    if (filters?.levelName) {
      mapped = mapped.filter((s) => s.levelName === filters.levelName);
    }
    if (filters?.languageName) {
      mapped = mapped.filter((s) => s.languageName === filters.languageName);
    }

    // Sort by avgScore descending (ranking)
    mapped.sort((a, b) => (b.avgScore ?? 0) - (a.avgScore ?? 0));

    return { students: mapped, total: mapped.length };
  }

  async generateStudyPlan(userId: number) {
    const skillScores = await this.prisma.userSkillScore.findMany({
      where: { userId },
      include: { skill: true },
    });

    if (skillScores.length === 0) return null;

    // Find weakest skills (below 60%)
    const weakSkills = skillScores
      .filter((s) => s.score < 60)
      .sort((a, b) => a.score - b.score)
      .map((s) => ({ name: s.skill.name, score: s.score }));

    const strongSkills = skillScores
      .filter((s) => s.score >= 60)
      .sort((a, b) => b.score - a.score)
      .map((s) => ({ name: s.skill.name, score: s.score }));

    // Use OpenAI to generate a study plan
    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });

    const sandbox = process.env.LLM_SANDBOX === 'true';

    let plan: any;
    if (sandbox) {
      plan = {
        summary: 'Plan de estudio personalizado basado en tus resultados.',
        strengths: strongSkills.map((s) => s.name),
        improvements: weakSkills.map((s) => ({
          skill: s.name,
          currentScore: s.score,
          recommendations: [
            { type: 'article', title: `Guía completa de ${s.name}`, url: '#' },
            { type: 'video', title: `Tutorial de ${s.name}`, url: '#' },
            { type: 'exercise', title: `Práctica de ${s.name}`, url: '#' },
          ],
        })),
      };
    } else {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Eres un mentor técnico. Genera un plan de estudio personalizado en JSON con recursos reales (artículos, videos, ejercicios) para mejorar las habilidades débiles del candidato.',
          },
          {
            role: 'user',
            content: `El candidato tiene estas habilidades débiles (score de 0-100): ${JSON.stringify(weakSkills)}. Y estas fortalezas: ${JSON.stringify(strongSkills)}. Genera un plan en JSON: { "summary": "resumen", "strengths": ["skill1"], "improvements": [{ "skill": "name", "currentScore": N, "recommendations": [{ "type": "article|video|exercise", "title": "titulo", "url": "url real" }] }] }`,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      });
      plan = JSON.parse(response.choices[0]?.message?.content || '{}');
    }

    return plan;
  }

  async generateStudyPlanPdf(plan: any): Promise<Buffer> {
    const PDFDocument = (await import('pdfkit')).default;
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    doc.fontSize(22).fillColor('#4F46E5').text('Vinki - Plan de Estudio', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#6B7280').text(`Generado: ${new Date().toLocaleDateString('es')}`, { align: 'center' });
    doc.moveDown(1);

    if (plan.summary) {
      doc.fontSize(12).fillColor('#111827').text(plan.summary);
      doc.moveDown(1);
    }

    if (plan.strengths?.length > 0) {
      doc.fontSize(16).fillColor('#059669').text('Fortalezas');
      doc.moveDown(0.3);
      for (const s of plan.strengths) {
        doc.fontSize(11).fillColor('#111827').text(`  - ${s}`);
      }
      doc.moveDown(1);
    }

    if (plan.improvements?.length > 0) {
      doc.fontSize(16).fillColor('#DC2626').text('Areas de Mejora');
      doc.moveDown(0.3);

      for (const item of plan.improvements) {
        doc.moveDown(0.5);
        doc.fontSize(13).fillColor('#1F2937').text(`${item.skill} (Score: ${item.currentScore}/100)`);
        doc.moveDown(0.2);

        if (item.recommendations) {
          for (const rec of item.recommendations) {
            const icon = rec.type === 'article' ? '[Art]' : rec.type === 'video' ? '[Vid]' : '[Ej]';
            doc.fontSize(10).fillColor('#4B5563').text(`    ${icon}  ${rec.title}`);
            if (rec.url && rec.url !== '#') {
              doc.fontSize(9).fillColor('#2563EB').text(`       ${rec.url}`);
            }
          }
        }
      }
    }

    doc.end();

    return new Promise((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }

  async compareStudents(studentIds: number[]) {
    const profiles = await Promise.all(
      studentIds.map(async (studentId) => {
        const user = await this.prisma.user.findUnique({
          where: { id: studentId, role: 'student' },
        });
        if (!user) throw new NotFoundException(`Student ${studentId} not found`);

        const interviews = await this.prisma.interview.findMany({
          where: { userId: studentId, evaluationStatus: 'completed' },
          orderBy: { startedAt: 'desc' },
          include: {
            level: true,
            questions: {
              include: {
                answers: {
                  include: { evaluation: { include: { detectedLevel: true } } },
                },
              },
            },
          },
        });

        const skillScores = await this.prisma.userSkillScore.findMany({
          where: { userId: studentId },
          include: { skill: true },
        });

        // Avg score across all completed interviews
        const allEvals = interviews.flatMap((iv) =>
          iv.questions.flatMap((q) =>
            q.answers.filter((a) => a.evaluation).map((a) => a.evaluation!),
          ),
        );
        const avgScore =
          allEvals.length > 0
            ? allEvals.reduce(
                (sum, e) =>
                  sum +
                  ((e.technicalCorrectness ?? 0) +
                    (e.clarityOfExplanation ?? 0) +
                    (e.communication ?? 0) +
                    (e.confidence ?? 0) +
                    (e.problemSolving ?? 0)) /
                    5,
                0,
              ) / allEvals.length
            : null;

        // Level distribution
        const levelCounts: Record<string, number> = {};
        for (const e of allEvals) {
          const name = (e as any).detectedLevel?.name;
          if (name) levelCounts[name] = (levelCounts[name] ?? 0) + 1;
        }

        // Last 5 interview scores
        const last5 = interviews.slice(0, 5).map((iv) => {
          const evals = iv.questions.flatMap((q) =>
            q.answers.filter((a) => a.evaluation).map((a) => a.evaluation!),
          );
          const score =
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
          return {
            interviewId: iv.id,
            date: iv.startedAt,
            score,
          };
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          interviewCount: interviews.length,
          avgScore,
          skillScores: skillScores.map((ss) => ({
            skillName: ss.skill.name,
            score: ss.score,
          })),
          levelDistribution: Object.entries(levelCounts).map(([level, count]) => ({
            level,
            count,
          })),
          last5Interviews: last5,
        };
      }),
    );

    return { students: profiles };
  }

  async getStudentProfile(studentId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: studentId, role: 'student' },
    });
    if (!user) throw new NotFoundException('Student not found');

    const interviews = await this.prisma.interview.findMany({
      where: { userId: studentId },
      orderBy: { startedAt: 'desc' },
      include: {
        role: true,
        level: true,
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

    const skillScores = await this.prisma.userSkillScore.findMany({
      where: { userId: studentId },
      include: { skill: true },
    });

    const mappedInterviews = interviews.map((iv) => {
      const evals = iv.questions.flatMap((q) =>
        q.answers.filter((a) => a.evaluation).map((a) => a.evaluation!),
      );
      const avgScore = evals.length > 0
        ? evals.reduce((sum, e) =>
            sum + ((e.technicalCorrectness ?? 0) + (e.clarityOfExplanation ?? 0) +
              (e.communication ?? 0) + (e.confidence ?? 0) + (e.problemSolving ?? 0)) / 5, 0,
          ) / evals.length
        : null;
      return {
        id: iv.id,
        startedAt: iv.startedAt,
        finishedAt: iv.finishedAt,
        evaluationStatus: iv.evaluationStatus,
        roleName: iv.role.name,
        levelName: iv.level.name,
        languageName: iv.language?.name ?? null,
        avgScore,
      };
    });

    const notes = await this.prisma.recruiterNote.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      user: { id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt },
      recentInterviews: mappedInterviews,
      skillScores: skillScores.map((ss) => ({
        skillId: ss.skillId,
        skillName: ss.skill.name,
        score: ss.score,
      })),
      notes: notes.map((n) => ({
        id: n.id,
        content: n.content,
        createdAt: n.createdAt,
      })),
    };
  }

  async addNote(recruiterId: number, studentId: number, content: string) {
    return this.prisma.recruiterNote.create({
      data: { recruiterId, studentId, content },
    });
  }

  async getNotes(studentId: number) {
    return this.prisma.recruiterNote.findMany({
      where: { studentId },
      include: { recruiter: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
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

  async getAdminAnalytics() {
    const totalUsers = await this.prisma.user.count();
    const totalStudents = await this.prisma.user.count({ where: { role: 'student' } });
    const totalInterviews = await this.prisma.interview.count();
    const completedInterviews = await this.prisma.interview.count({ where: { evaluationStatus: 'completed' } });

    // Interviews per day (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentInterviews = await this.prisma.interview.findMany({
      where: { startedAt: { gte: thirtyDaysAgo } },
      select: { startedAt: true },
    });

    const interviewsPerDay: Record<string, number> = {};
    for (const iv of recentInterviews) {
      const day = iv.startedAt.toISOString().split('T')[0];
      interviewsPerDay[day] = (interviewsPerDay[day] ?? 0) + 1;
    }

    // Level distribution
    const levelDist = await this.prisma.interview.groupBy({
      by: ['chosenLevelId'],
      _count: true,
    });
    const levels = await this.prisma.level.findMany();
    const levelDistribution = levelDist.map((d) => ({
      level: levels.find((l) => l.id === d.chosenLevelId)?.name ?? 'Unknown',
      count: d._count,
    }));

    // Total questions
    const totalQuestions = await this.prisma.question.count();

    return {
      totalUsers,
      totalStudents,
      totalInterviews,
      completedInterviews,
      totalQuestions,
      interviewsPerDay,
      levelDistribution,
    };
  }

  async createShareLink(interviewId: number, userId: number) {
    const interview = await this.prisma.interview.findUnique({ where: { id: interviewId } });
    if (!interview) throw new NotFoundException();
    if (interview.userId !== userId) throw new ForbiddenException();

    // Generate a random token
    const { randomBytes } = await import('crypto');
    const token = randomBytes(16).toString('hex');

    // Store the token in a Map (in production, use DB)
    ShareLinkStore.set(token, { interviewId, expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 });

    return { token, expiresIn: '7 days' };
  }

  async getSharedReport(token: string) {
    const link = ShareLinkStore.get(token);
    if (!link || link.expiresAt < Date.now()) {
      throw new NotFoundException('Link expired or invalid');
    }
    // Get report without userId check
    const interview = await this.prisma.interview.findUnique({
      where: { id: link.interviewId },
      include: {
        user: { select: { name: true } },
        questions: {
          orderBy: { orderNumber: 'asc' },
          include: {
            question: { include: { skill: true } },
            answers: { include: { evaluation: { include: { detectedLevel: true } } } },
          },
        },
      },
    });
    if (!interview) throw new NotFoundException();
    return {
      studentName: interview.user.name,
      interview,
      evaluations: interview.questions.map((q) => ({
        interviewQuestionId: q.id,
        orderNumber: q.orderNumber,
        questionTextSnapshot: q.questionTextSnapshot,
        skillName: q.question?.skill?.name ?? null,
        source: q.question?.source ?? null,
        answer: q.answers[0] ?? null,
        evaluation: q.answers[0]?.evaluation ?? null,
      })),
    };
  }
}
