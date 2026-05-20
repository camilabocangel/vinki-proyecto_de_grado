import { QuestionSelectorService } from './question-selector.service.js';
import { PrismaService } from '../../common/prisma.service.js';
import type { IEmbeddingProvider } from '../../llm/interfaces/embedding-provider.interface.js';

// QuestionSelectorService implementa RF-12 (selección inteligente de
// preguntas por similitud semántica con diversificación por skill).
// Cubre: (1) embedding del roleText, (2) consulta SQL parametrizada,
// (3) algoritmo de diversificación (1ª pasada por skill, 2ª pasada
// completa), (4) límite de 5 preguntas.

function makeEmbedding(): IEmbeddingProvider {
  return {
    embed: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]),
    embedBatch: jest.fn(),
    getDimensions: jest.fn().mockReturnValue(3),
  };
}

function makePrisma(rows: Array<{ id: number; question_text: string; skill_id: number; distance: number }>) {
  return {
    $queryRawUnsafe: jest.fn().mockResolvedValue(rows),
  } as unknown as PrismaService & { $queryRawUnsafe: jest.Mock };
}

describe('QuestionSelectorService', () => {
  it('should embed the role text and call the SQL with vector + filters', async () => {
    const embedding = makeEmbedding();
    const prisma = makePrisma([]);
    const service = new QuestionSelectorService(prisma as any, embedding);

    await service.selectQuestions({
      languageId: 1,
      frameworkId: 2,
      levelId: 3,
      roleText: 'Backend TypeScript Junior',
    });

    expect(embedding.embed).toHaveBeenCalledWith('Backend TypeScript Junior');
    const args = (prisma as any).$queryRawUnsafe.mock.calls[0];
    // Args: [sql, vector, levelId, languageId, frameworkId]
    expect(args[1]).toBe('[0.1,0.2,0.3]'); // serializado pgvector
    expect(args[2]).toBe(3); // levelId
    expect(args[3]).toBe(1); // languageId
    expect(args[4]).toBe(2); // frameworkId
  });

  it('should pass null for optional language/framework filters when omitted', async () => {
    const embedding = makeEmbedding();
    const prisma = makePrisma([]);
    const service = new QuestionSelectorService(prisma as any, embedding);

    await service.selectQuestions({ levelId: 5, roleText: 'role' });

    const args = (prisma as any).$queryRawUnsafe.mock.calls[0];
    expect(args[3]).toBeNull();
    expect(args[4]).toBeNull();
  });

  it('should select one question per skill in the first diversification pass', async () => {
    // 5 candidatos: 3 skills distintas (A=10,15) , (B=20), (C=30,35). En la
    // 1ª pasada se elige 1 por skill: [10, 20, 30].
    const candidates = [
      { id: 10, question_text: 'q10', skill_id: 1, distance: 0.1 },
      { id: 15, question_text: 'q15', skill_id: 1, distance: 0.2 },
      { id: 20, question_text: 'q20', skill_id: 2, distance: 0.3 },
      { id: 30, question_text: 'q30', skill_id: 3, distance: 0.4 },
      { id: 35, question_text: 'q35', skill_id: 3, distance: 0.5 },
    ];
    const embedding = makeEmbedding();
    const prisma = makePrisma(candidates);
    const service = new QuestionSelectorService(prisma as any, embedding);

    const result = await service.selectQuestions({ levelId: 1, roleText: 'x' });

    // Tras 1ª pasada: [10, 20, 30]. 2ª pasada rellena hasta 5 con los más
    // cercanos restantes: [15, 35]. Orden final esperado: [10,20,30,15,35].
    expect(result).toEqual([10, 20, 30, 15, 35]);
  });

  it('should cap the result at 5 questions even with many candidates', async () => {
    const candidates = Array.from({ length: 25 }, (_, i) => ({
      id: i + 1,
      question_text: `q${i + 1}`,
      skill_id: i, // todas skills distintas
      distance: 0.01 * i,
    }));
    const service = new QuestionSelectorService(
      makePrisma(candidates) as any,
      makeEmbedding(),
    );

    const result = await service.selectQuestions({ levelId: 1, roleText: 'x' });

    expect(result).toHaveLength(5);
    expect(result).toEqual([1, 2, 3, 4, 5]); // los 5 más cercanos, todos distintos
  });

  it('should return an empty array when no candidates match the filters', async () => {
    const service = new QuestionSelectorService(
      makePrisma([]) as any,
      makeEmbedding(),
    );

    const result = await service.selectQuestions({ levelId: 1, roleText: 'x' });

    expect(result).toEqual([]);
  });
});
