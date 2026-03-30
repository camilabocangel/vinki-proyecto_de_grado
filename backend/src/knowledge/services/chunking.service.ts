import { Injectable } from '@nestjs/common';

export interface Chunk {
  content: string;
  tokenCount: number;
  chunkIndex: number;
}

@Injectable()
export class ChunkingService {
  private maxTokens = 800;
  private overlapTokens = 100;

  chunkText(text: string): Chunk[] {
    const paragraphs = text.split(/\n{2,}/).filter((p) => p.trim().length > 0);
    const chunks: Chunk[] = [];
    let currentContent = '';
    let currentTokens = 0;

    for (const paragraph of paragraphs) {
      const paragraphTokens = this.estimateTokens(paragraph);

      // If a single paragraph exceeds max, split it by sentences
      if (paragraphTokens > this.maxTokens) {
        if (currentContent.trim()) {
          chunks.push(this.createChunk(currentContent, currentTokens, chunks.length));
          currentContent = this.getOverlapText(currentContent);
          currentTokens = this.estimateTokens(currentContent);
        }
        const sentenceChunks = this.splitBySentences(paragraph);
        for (const sc of sentenceChunks) {
          chunks.push(this.createChunk(sc.content, sc.tokenCount, chunks.length));
        }
        currentContent = '';
        currentTokens = 0;
        continue;
      }

      if (currentTokens + paragraphTokens > this.maxTokens && currentContent.trim()) {
        chunks.push(this.createChunk(currentContent, currentTokens, chunks.length));
        currentContent = this.getOverlapText(currentContent);
        currentTokens = this.estimateTokens(currentContent);
      }

      currentContent += (currentContent ? '\n\n' : '') + paragraph;
      currentTokens += paragraphTokens;
    }

    if (currentContent.trim()) {
      chunks.push(this.createChunk(currentContent, currentTokens, chunks.length));
    }

    return chunks;
  }

  private createChunk(content: string, tokenCount: number, index: number): Chunk {
    return { content: content.trim(), tokenCount, chunkIndex: index };
  }

  private splitBySentences(text: string): Chunk[] {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const chunks: Chunk[] = [];
    let current = '';
    let tokens = 0;

    for (const sentence of sentences) {
      const sentenceTokens = this.estimateTokens(sentence);
      if (tokens + sentenceTokens > this.maxTokens && current.trim()) {
        chunks.push({ content: current.trim(), tokenCount: tokens, chunkIndex: 0 });
        current = this.getOverlapText(current);
        tokens = this.estimateTokens(current);
      }
      current += sentence;
      tokens += sentenceTokens;
    }

    if (current.trim()) {
      chunks.push({ content: current.trim(), tokenCount: tokens, chunkIndex: 0 });
    }

    return chunks;
  }

  private getOverlapText(text: string): string {
    const words = text.split(/\s+/);
    const overlapWords = Math.ceil(this.overlapTokens / 1.3);
    if (words.length <= overlapWords) return text;
    return words.slice(-overlapWords).join(' ');
  }

  estimateTokens(text: string): number {
    return Math.ceil(text.split(/\s+/).length * 1.3);
  }
}
