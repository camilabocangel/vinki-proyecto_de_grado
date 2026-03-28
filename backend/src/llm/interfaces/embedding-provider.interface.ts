export const EMBEDDING_PROVIDER = 'EMBEDDING_PROVIDER';

export interface IEmbeddingProvider {
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
  getDimensions(): number;
}
