// Mock del SDK de Google Generative AI.
// Tipados como `jest.fn<any, any[]>()` para que `mock.calls` sea un array
// `any[][]` y no la tupla vacía que TS inferiría a partir del factory.
const mockGenerateContent = jest.fn<any, any[]>();
const mockGetGenerativeModel = jest.fn<any, any[]>(() => ({
  generateContent: mockGenerateContent,
}));
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: mockGetGenerativeModel,
  })),
}));

import { ConfigService } from '@nestjs/config';
import { GeminiLlmService } from './gemini-llm.service.js';

function buildService(): GeminiLlmService {
  const config = { get: jest.fn().mockReturnValue('fake-key') } as unknown as ConfigService;
  return new GeminiLlmService(config);
}

describe('GeminiLlmService', () => {
  beforeEach(() => {
    mockGenerateContent.mockReset();
    mockGetGenerativeModel.mockClear();
  });

  describe('generateJson()', () => {
    it('should request a JSON mime type and parse the response', async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: () => '{"foo":"bar"}' },
      });

      const service = buildService();
      const result = await service.generateJson<{ foo: string }>({
        systemPrompt: 'sys',
        userPrompt: 'user',
        temperature: 0.5,
      });

      const modelOpts = mockGetGenerativeModel.mock.calls[0][0];
      expect(modelOpts.model).toBe('gemini-2.0-flash');
      expect(modelOpts.generationConfig.responseMimeType).toBe('application/json');
      expect(modelOpts.generationConfig.temperature).toBe(0.5);
      expect(modelOpts.systemInstruction).toBe('sys');
      expect(mockGenerateContent).toHaveBeenCalledWith('user');
      expect(result).toEqual({ foo: 'bar' });
    });

    it('should throw when Gemini returns empty text', async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: () => '' },
      });

      await expect(
        buildService().generateJson({ systemPrompt: 's', userPrompt: 'u' }),
      ).rejects.toThrow('Empty response from Gemini');
    });
  });

  describe('generateText()', () => {
    it('should forward maxTokens to the model and return the text', async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: () => 'plain text' },
      });

      const result = await buildService().generateText({
        systemPrompt: 's',
        userPrompt: 'u',
        maxTokens: 200,
      });

      const modelOpts = mockGetGenerativeModel.mock.calls[0][0];
      expect(modelOpts.generationConfig.maxOutputTokens).toBe(200);
      expect(result).toBe('plain text');
    });

    it('should return empty string when response text is falsy', async () => {
      mockGenerateContent.mockResolvedValue({ response: { text: () => '' } });

      const result = await buildService().generateText({ systemPrompt: 's', userPrompt: 'u' });

      expect(result).toBe('');
    });
  });
});
