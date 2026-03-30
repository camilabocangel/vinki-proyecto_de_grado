import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { IEmbeddingProvider } from '../interfaces/embedding-provider.interface.js';
import { CircuitBreaker } from './circuit-breaker.js';

@Injectable()
export class OpenaiEmbeddingService implements IEmbeddingProvider {
  private openai: OpenAI;
  private circuitBreaker: CircuitBreaker;

  constructor(private config: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.config.get<string>('OPENAI_API_KEY', ''),
    });
    this.circuitBreaker = new CircuitBreaker({ name: 'OpenAI-Embedding' });
  }

  getDimensions(): number {
    return 1536;
  }

  async embed(text: string): Promise<number[]> {
    return this.circuitBreaker.exec(async () => {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      });
      return response.data[0].embedding;
    });
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    return this.circuitBreaker.exec(async () => {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: texts,
      });
      return response.data
        .sort((a, b) => a.index - b.index)
        .map((d) => d.embedding);
    });
  }
}
