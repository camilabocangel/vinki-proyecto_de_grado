import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ILlmProvider } from '../interfaces/llm-provider.interface.js';
import { CircuitBreaker } from './circuit-breaker.js';

@Injectable()
export class GeminiLlmService implements ILlmProvider {
  private genAI: GoogleGenerativeAI;
  private circuitBreaker: CircuitBreaker;

  constructor(private config: ConfigService) {
    this.genAI = new GoogleGenerativeAI(
      this.config.get<string>('GOOGLE_AI_API_KEY', ''),
    );
    this.circuitBreaker = new CircuitBreaker({ name: 'Gemini-LLM' });
  }

  async generateJson<T>(params: {
    systemPrompt: string;
    userPrompt: string;
    temperature?: number;
  }): Promise<T> {
    return this.circuitBreaker.exec(async () => {
      const model = this.genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: params.temperature ?? 0.7,
        },
        systemInstruction: params.systemPrompt,
      });

      const result = await model.generateContent(params.userPrompt);
      const text = result.response.text();
      if (!text) throw new Error('Empty response from Gemini');
      return JSON.parse(text) as T;
    });
  }

  async generateText(params: {
    systemPrompt: string;
    userPrompt: string;
    temperature?: number;
    maxTokens?: number;
  }): Promise<string> {
    return this.circuitBreaker.exec(async () => {
      const model = this.genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        generationConfig: {
          temperature: params.temperature ?? 0.7,
          maxOutputTokens: params.maxTokens,
        },
        systemInstruction: params.systemPrompt,
      });

      const result = await model.generateContent(params.userPrompt);
      return result.response.text() || '';
    });
  }
}
