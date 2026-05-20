import { QuestionGeneratorService } from './question-generator.service.js';
import type { ILlmProvider } from '../../llm/interfaces/llm-provider.interface.js';

function makeLlm(payload: unknown): ILlmProvider {
  return {
    generateJson: jest.fn().mockResolvedValue(payload),
    generateText: jest.fn(),
  };
}

describe('QuestionGeneratorService', () => {
  it('should ask the LLM for the requested number of questions on the given topic/level/language (RF-12)', async () => {
    const llm = makeLlm({ questions: ['Q1', 'Q2', 'Q3'] });
    const service = new QuestionGeneratorService(llm);

    await service.generateQuestions({
      topic: 'REST',
      level: 'Junior',
      language: 'TypeScript',
      count: 3,
    });

    const params = (llm.generateJson as jest.Mock).mock.calls[0][0];
    expect(params.systemPrompt).toContain('experto en entrevistas');
    expect(params.userPrompt).toContain('REST');
    expect(params.userPrompt).toContain('Junior');
    expect(params.userPrompt).toContain('TypeScript');
    expect(params.userPrompt).toContain('3');
    // Temperatura alta para diversidad creativa.
    expect(params.temperature).toBeGreaterThanOrEqual(0.5);
  });

  it('should return the questions array from the LLM JSON response', async () => {
    const llm = makeLlm({ questions: ['¿Qué es REST?', '¿GraphQL vs REST?'] });
    const service = new QuestionGeneratorService(llm);

    const result = await service.generateQuestions({
      topic: 'APIs',
      level: 'Mid',
      language: 'Node.js',
      count: 2,
    });

    expect(result).toEqual(['¿Qué es REST?', '¿GraphQL vs REST?']);
  });

  it('should return [] when the LLM response is missing the "questions" field', async () => {
    const llm = makeLlm({});
    const service = new QuestionGeneratorService(llm);

    const result = await service.generateQuestions({
      topic: 't',
      level: 'l',
      language: 'l',
      count: 1,
    });

    expect(result).toEqual([]);
  });
});
