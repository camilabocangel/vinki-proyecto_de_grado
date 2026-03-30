import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { IEmbeddingProvider } from '../interfaces/embedding-provider.interface.js';
import { CircuitBreaker } from './circuit-breaker.js';

@Injectable()
export class GeminiEmbeddingService implements IEmbeddingProvider {
  private genAI: GoogleGenerativeAI;
  private circuitBreaker: CircuitBreaker;

  constructor(private config: ConfigService) {
    this.genAI = new GoogleGenerativeAI(
      this.config.get<string>('GOOGLE_AI_API_KEY', ''),
    );
    this.circuitBreaker = new CircuitBreaker({ name: 'Gemini-Embedding' });
  }

  getDimensions(): number {
    return 768;
  }

  async embed(text: string): Promise<number[]> {
    return this.circuitBreaker.exec(async () => {
      const model = this.genAI.getGenerativeModel({ model: 'text-embedding-004' });
      const result = await model.embedContent(text);
      return result.embedding.values;
    });
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    return this.circuitBreaker.exec(async () => {
      const model = this.genAI.getGenerativeModel({ model: 'text-embedding-004' });
      const results = await Promise.all(
        texts.map((text) => model.embedContent(text)),
      );
      return results.map((r) => r.embedding.values);
    });
  }
}
