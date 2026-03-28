import { Injectable } from '@nestjs/common';
import { ILlmProvider } from '../interfaces/llm-provider.interface.js';

@Injectable()
export class MockLlmService implements ILlmProvider {
  async generateJson<T>(params: {
    systemPrompt: string;
    userPrompt: string;
    temperature?: number;
  }): Promise<T> {
    if (params.userPrompt.includes('preguntas') || params.userPrompt.includes('questions')) {
      return {
        questions: [
          '[Sandbox] Pregunta generada 1 sobre el tema solicitado',
          '[Sandbox] Pregunta generada 2 sobre el tema solicitado',
        ],
      } as T;
    }

    return {} as T;
  }

  async generateText(params: {
    systemPrompt: string;
    userPrompt: string;
    temperature?: number;
    maxTokens?: number;
  }): Promise<string> {
    return '[Sandbox] Respuesta generada para: ' + params.userPrompt.slice(0, 50);
  }
}
