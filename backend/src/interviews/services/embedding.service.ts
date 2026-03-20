import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class EmbeddingService {
  private openai: OpenAI;
  private isSandbox: boolean;

  constructor(private config: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.config.get<string>('OPENAI_API_KEY', ''),
    });
    this.isSandbox = this.config.get<string>('LLM_SANDBOX', 'true') === 'true';
  }

  async embed(text: string): Promise<number[]> {
    if (this.isSandbox) {
      return new Array(1536).fill(0);
    }

    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });

    return response.data[0].embedding;
  }
}
