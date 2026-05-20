import { FollowUpService } from './followup.service.js';
import type { ILlmProvider } from '../../llm/interfaces/llm-provider.interface.js';

function makeLlm(text: string): ILlmProvider {
  return {
    generateJson: jest.fn(),
    generateText: jest.fn().mockResolvedValue(text),
  };
}

describe('FollowUpService', () => {
  it('should send the original question and the candidate answer to the LLM', async () => {
    const llm = makeLlm('¿Puedes profundizar en X?');
    const service = new FollowUpService(llm);

    await service.generateFollowUp('¿Qué es REST?', 'Es una arquitectura HTTP');

    const params = (llm.generateText as jest.Mock).mock.calls[0][0];
    expect(params.userPrompt).toContain('¿Qué es REST?');
    expect(params.userPrompt).toContain('Es una arquitectura HTTP');
    // Temperatura moderada y límite estricto de tokens (pregunta breve).
    expect(params.temperature).toBeLessThanOrEqual(0.9);
    expect(params.maxTokens).toBeLessThanOrEqual(200);
  });

  it('should return the LLM text trimmed when the LLM responds with content', async () => {
    const llm = makeLlm('¿Cómo manejarías la autenticación?');
    const service = new FollowUpService(llm);

    const result = await service.generateFollowUp('Q', 'A');

    expect(result).toBe('¿Cómo manejarías la autenticación?');
  });

  it('should return null when the LLM responds with empty string', async () => {
    const llm = makeLlm('');
    const service = new FollowUpService(llm);

    const result = await service.generateFollowUp('Q', 'A');

    expect(result).toBeNull();
  });
});
