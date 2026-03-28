import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IEmbeddingProvider } from '../interfaces/embedding-provider.interface.js';

@Injectable()
export class MockEmbeddingService implements IEmbeddingProvider {
  private dimensions: number;

  constructor(private config: ConfigService) {
    this.dimensions = parseInt(
      this.config.get<string>('EMBEDDING_DIMENSIONS', '1536'),
      10,
    );
  }

  getDimensions(): number {
    return this.dimensions;
  }

  async embed(_text: string): Promise<number[]> {
    return new Array(this.dimensions).fill(0);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    return texts.map(() => new Array(this.dimensions).fill(0));
  }
}
