// Mock del SDK de OpenAI antes de cargar el servicio. El constructor de
// OpenaiEvaluatorService instancia `new OpenAI(...)` directamente, así que
// se mockea el módulo completo y se captura la implementación con un mock
// de `chat.completions.create`.
const mockChatCompletionsCreate = jest.fn();
jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: { completions: { create: mockChatCompletionsCreate } },
  })),
}));

import { ConfigService } from '@nestjs/config';
import { OpenaiEvaluatorService } from './openai-evaluator.service.js';
import { EVALUATION_RUBRICS } from '../rubrics.js';
import { BEHAVIORAL_RUBRICS } from '../rubrics-behavioral.js';
import type { EvaluationOutput } from '../interfaces/evaluator.interface.js';

function makeEvaluation(answerId: number, overrides: Partial<EvaluationOutput> = {}): EvaluationOutput {
  return {
    answerId,
    technicalCorrectness: 4,
    clarityOfExplanation: 4,
    communication: 4,
    confidence: 4,
    problemSolving: 4,
    detectedLevel: 'Mid',
    feedbackText: 'Buena respuesta con margen para mejorar.',
    juniorAnswer: 'Respuesta Junior...',
    midAnswer: 'Respuesta Mid...',
    seniorAnswer: 'Respuesta Senior...',
    ...overrides,
  };
}

function mockSuccessfulResponse(evaluations: EvaluationOutput[]) {
  mockChatCompletionsCreate.mockResolvedValue({
    choices: [
      {
        message: { content: JSON.stringify({ evaluations }) },
      },
    ],
  });
}

describe('OpenaiEvaluatorService', () => {
  let service: OpenaiEvaluatorService;
  let config: ConfigService;

  beforeEach(() => {
    mockChatCompletionsCreate.mockReset();
    config = { get: jest.fn().mockReturnValue('fake-api-key') } as unknown as ConfigService;
    service = new OpenaiEvaluatorService(config);
  });

  describe('evaluate (technical mode — RF-19 a RF-25)', () => {
    it('should call OpenAI with gpt-4o-mini, JSON response_format, and low temperature', async () => {
      const expected = [makeEvaluation(1)];
      mockSuccessfulResponse(expected);

      await service.evaluate(
        [{ answerId: 1, questionText: 'What is REST?', answerText: 'An architecture.' }],
        false,
      );

      expect(mockChatCompletionsCreate).toHaveBeenCalledTimes(1);
      const callArgs = mockChatCompletionsCreate.mock.calls[0][0];
      expect(callArgs.model).toBe('gpt-4o-mini');
      expect(callArgs.response_format).toEqual({ type: 'json_object' });
      expect(callArgs.temperature).toBeLessThanOrEqual(0.5); // baja: salidas estables
    });

    it('should include the technical rubric and the question/answer in the prompt', async () => {
      mockSuccessfulResponse([makeEvaluation(1)]);

      await service.evaluate(
        [{ answerId: 1, questionText: 'What is REST?', answerText: 'An architecture.' }],
        false,
      );

      const messages = mockChatCompletionsCreate.mock.calls[0][0].messages;
      const systemMessage = messages.find((m: { role: string }) => m.role === 'system');
      const userMessage = messages.find((m: { role: string }) => m.role === 'user');

      expect(systemMessage.content).toContain(EVALUATION_RUBRICS);
      expect(userMessage.content).toContain('What is REST?');
      expect(userMessage.content).toContain('An architecture.');
      expect(userMessage.content).toContain('answerId: 1');
    });

    it('should parse the JSON content and return the evaluations array', async () => {
      const expected = [makeEvaluation(10), makeEvaluation(11, { detectedLevel: 'Senior' })];
      mockSuccessfulResponse(expected);

      const result = await service.evaluate(
        [
          { answerId: 10, questionText: 'Q1', answerText: 'A1' },
          { answerId: 11, questionText: 'Q2', answerText: 'A2' },
        ],
        false,
      );

      expect(result).toHaveLength(2);
      expect(result).toEqual(expected);
    });

    it('should return scores within the [0, 5] range (RNF-18 — app-level)', async () => {
      const expected = [
        makeEvaluation(1, {
          technicalCorrectness: 0,
          clarityOfExplanation: 5,
          communication: 3.5,
          confidence: 2,
          problemSolving: 4.7,
        }),
      ];
      mockSuccessfulResponse(expected);

      const result = await service.evaluate(
        [{ answerId: 1, questionText: 'Q', answerText: 'A' }],
        false,
      );

      for (const dim of [
        'technicalCorrectness',
        'clarityOfExplanation',
        'communication',
        'confidence',
        'problemSolving',
      ] as const) {
        expect(result[0][dim]).toBeGreaterThanOrEqual(0);
        expect(result[0][dim]).toBeLessThanOrEqual(5);
      }
    });
  });

  describe('evaluate (behavioral mode)', () => {
    it('should use the behavioral rubric in the system message when isBehavioral=true', async () => {
      mockSuccessfulResponse([makeEvaluation(1)]);

      await service.evaluate(
        [{ answerId: 1, questionText: 'Tell me about a conflict', answerText: 'Once...' }],
        true,
      );

      const systemMessage = mockChatCompletionsCreate.mock.calls[0][0].messages.find(
        (m: { role: string }) => m.role === 'system',
      );
      expect(systemMessage.content).toContain(BEHAVIORAL_RUBRICS);
      expect(systemMessage.content).toContain('behavioral');
    });

    it('should default isBehavioral to false when not provided', async () => {
      mockSuccessfulResponse([makeEvaluation(1)]);

      // Llamada sin el segundo argumento.
      await service.evaluate([
        { answerId: 1, questionText: 'Q', answerText: 'A' },
      ]);

      const systemMessage = mockChatCompletionsCreate.mock.calls[0][0].messages.find(
        (m: { role: string }) => m.role === 'system',
      );
      expect(systemMessage.content).toContain(EVALUATION_RUBRICS);
      expect(systemMessage.content).not.toContain(BEHAVIORAL_RUBRICS);
    });
  });

  describe('error handling', () => {
    it('should throw when the OpenAI response has empty content', async () => {
      mockChatCompletionsCreate.mockResolvedValue({
        choices: [{ message: { content: null } }],
      });

      await expect(
        service.evaluate(
          [{ answerId: 1, questionText: 'Q', answerText: 'A' }],
          false,
        ),
      ).rejects.toThrow('Empty response from OpenAI');
    });

    it('should propagate errors raised by the OpenAI client', async () => {
      const boom = new Error('Rate limit');
      mockChatCompletionsCreate.mockRejectedValue(boom);

      await expect(
        service.evaluate(
          [{ answerId: 1, questionText: 'Q', answerText: 'A' }],
          false,
        ),
      ).rejects.toThrow(boom);
    });
  });
});
