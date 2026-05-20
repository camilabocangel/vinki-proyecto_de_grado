import { MockLlmService } from './mock-llm.service.js';

// MockLlmService es la implementación fallback usada cuando LLM_SANDBOX=true
// (decisiones D-6 + plan maestro §6). Estos tests blindan el contrato
// determinista: ante prompts que pidan "preguntas" devuelve un array
// reconocible; en otros casos devuelve un objeto vacío.

describe('MockLlmService', () => {
  let service: MockLlmService;

  beforeEach(() => {
    service = new MockLlmService();
  });

  describe('generateJson()', () => {
    it('should return a {questions: string[]} object when the userPrompt mentions "preguntas"', async () => {
      const result = await service.generateJson<{ questions: string[] }>({
        systemPrompt: 'sys',
        userPrompt: 'Genera 3 preguntas sobre TypeScript',
      });

      expect(Array.isArray(result.questions)).toBe(true);
      expect(result.questions.length).toBeGreaterThanOrEqual(1);
      expect(result.questions.every((q) => typeof q === 'string')).toBe(true);
    });

    it('should also match the english variant "questions"', async () => {
      const result = await service.generateJson<{ questions: string[] }>({
        systemPrompt: 'sys',
        userPrompt: 'Generate questions about REST',
      });

      expect(result.questions).toEqual(expect.any(Array));
      expect(result.questions.length).toBeGreaterThan(0);
    });

    it('should return an empty object when the prompt does not request questions', async () => {
      const result = await service.generateJson<Record<string, unknown>>({
        systemPrompt: 'sys',
        userPrompt: 'Algo sin patrón reconocido',
      });

      expect(result).toEqual({});
    });
  });

  describe('generateText()', () => {
    it('should return a deterministic sandbox string echoing the user prompt prefix', async () => {
      const result = await service.generateText({
        systemPrompt: 'sys',
        userPrompt: 'Explica REST en una frase',
      });

      expect(result).toContain('[Sandbox]');
      expect(result).toContain('Explica REST');
    });
  });
});
