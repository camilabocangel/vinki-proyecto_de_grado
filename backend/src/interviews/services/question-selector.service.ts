import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service.js';
import { EMBEDDING_PROVIDER, IEmbeddingProvider } from '../../llm/interfaces/embedding-provider.interface.js';

interface QuestionCandidate {
  id: number;
  question_text: string;
  skill_id: number;
  distance: number;
}

@Injectable()
export class QuestionSelectorService {
  constructor(
    private prisma: PrismaService,
    @Inject(EMBEDDING_PROVIDER) private embeddingService: IEmbeddingProvider,
  ) {}

  async selectQuestions(filters: {
    languageId?: number;
    frameworkId?: number;
    levelId: number;
    roleText: string;
  }): Promise<number[]> {
    const embedding = await this.embeddingService.embed(filters.roleText);
    const embeddingStr = `[${embedding.join(',')}]`;

    // Phase 1: Get 25 candidates by cosine similarity
    const candidates = await this.prisma.$queryRawUnsafe<QuestionCandidate[]>(
      `SELECT q.id, q.question_text, q.skill_id,
              q.embedding <=> $1::vector AS distance
       FROM questions q
       WHERE q.level_id = $2
         AND ($3::int IS NULL OR q.language_id = $3)
         AND ($4::int IS NULL OR q.framework_id = $4)
         AND q.embedding IS NOT NULL
       ORDER BY distance ASC
       LIMIT 25`,
      embeddingStr,
      filters.levelId,
      filters.languageId ?? null,
      filters.frameworkId ?? null,
    );

    // Phase 2: Skill-bucket diversification — pick up to 5 from different skills
    const selected: QuestionCandidate[] = [];
    const usedSkills = new Set<number>();

    // First pass: one per skill
    for (const c of candidates) {
      if (selected.length >= 5) break;
      if (!usedSkills.has(c.skill_id)) {
        selected.push(c);
        usedSkills.add(c.skill_id);
      }
    }

    // Second pass: fill remaining from best candidates
    for (const c of candidates) {
      if (selected.length >= 5) break;
      if (!selected.includes(c)) {
        selected.push(c);
      }
    }

    return selected.map((q) => q.id);
  }
}
