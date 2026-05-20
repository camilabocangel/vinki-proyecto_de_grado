// Mock global del SDK de OpenAI (mismo patrón que openai-evaluator.service.spec.ts).
const mockChatCompletionsCreate = jest.fn();
jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: { completions: { create: mockChatCompletionsCreate } },
  })),
}));

import { ConfigService } from '@nestjs/config';
import { OpenaiLlmService } from './openai-llm.service.js';

describe('OpenaiLlmService', () => {
  let service: OpenaiLlmService;

  beforeEach(() => {
    mockChatCompletionsCreate.mockReset();
    const config = { get: jest.fn().mockReturnValue('test-key') } as unknown as ConfigService;
    service = new OpenaiLlmService(config);
  });

  describe('generateJson()', () => {
    it('should send system and user messages with JSON response_format', async () => {
      mockChatCompletionsCreate.mockResolvedValue({
        choices: [{ message: { content: '{"foo":"bar"}' } }],
      });

      const result = await service.generateJson<{ foo: string }>({
        systemPrompt: 'sys-prompt',
        userPrompt: 'user-prompt',
      });

      const call = mockChatCompletionsCreate.mock.calls[0][0];
      expect(call.model).toBe('gpt-4o-mini');
      expect(call.response_format).toEqual({ type: 'json_object' });
      expect(call.messages).toEqual([
        { role: 'system', content: 'sys-prompt' },
        { role: 'user', content: 'user-prompt' },
      ]);
      expect(result).toEqual({ foo: 'bar' });
    });

    it('should use the provided temperature when given', async () => {
      mockChatCompletionsCreate.mockResolvedValue({
        choices: [{ message: { content: '{}' } }],
      });

      await service.generateJson({ systemPrompt: 's', userPrompt: 'u', temperature: 0.2 });

      expect(mockChatCompletionsCreate.mock.calls[0][0].temperature).toBe(0.2);
    });

    it('should default to temperature 0.7 when not provided', async () => {
      mockChatCompletionsCreate.mockResolvedValue({
        choices: [{ message: { content: '{}' } }],
      });

      await service.generateJson({ systemPrompt: 's', userPrompt: 'u' });

      expect(mockChatCompletionsCreate.mock.calls[0][0].temperature).toBe(0.7);
    });

    it('should throw when response content is empty', async () => {
      mockChatCompletionsCreate.mockResolvedValue({
        choices: [{ message: { content: '' } }],
      });

      await expect(
        service.generateJson({ systemPrompt: 's', userPrompt: 'u' }),
      ).rejects.toThrow('Empty response from OpenAI');
    });
  });

  describe('generateText()', () => {
    it('should return the text content from the OpenAI response', async () => {
      mockChatCompletionsCreate.mockResolvedValue({
        choices: [{ message: { content: 'hello world' } }],
      });

      const result = await service.generateText({ systemPrompt: 's', userPrompt: 'u' });

      expect(result).toBe('hello world');
    });

    it('should forward maxTokens to the OpenAI client', async () => {
      mockChatCompletionsCreate.mockResolvedValue({
        choices: [{ message: { content: 'x' } }],
      });

      await service.generateText({ systemPrompt: 's', userPrompt: 'u', maxTokens: 256 });

      expect(mockChatCompletionsCreate.mock.calls[0][0].max_tokens).toBe(256);
    });

    it('should return an empty string when the response has no content', async () => {
      mockChatCompletionsCreate.mockResolvedValue({
        choices: [{ message: { content: null } }],
      });

      const result = await service.generateText({ systemPrompt: 's', userPrompt: 'u' });

      expect(result).toBe('');
    });
  });
});
