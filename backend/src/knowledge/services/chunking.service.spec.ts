import { ChunkingService } from './chunking.service.js';

// ChunkingService es código puro (sin DI ni I/O). Cubre el algoritmo de
// partición de texto en chunks respetando un límite de tokens estimado.

describe('ChunkingService', () => {
  let service: ChunkingService;

  beforeEach(() => {
    service = new ChunkingService();
  });

  describe('estimateTokens()', () => {
    it('should estimate tokens as ceil(words * 1.3)', () => {
      expect(service.estimateTokens('hello world')).toBe(Math.ceil(2 * 1.3)); // 3
      expect(service.estimateTokens('uno dos tres cuatro cinco')).toBe(Math.ceil(5 * 1.3)); // 7
    });

    it('should count an empty string as 1.3 estimated tokens (single split)', () => {
      // El comportamiento real: 'estimateTokens' calcula `split(/\s+/).length`,
      // que para '' produce 1 entrada (vacía). El test fija ese comportamiento
      // — si cambia, el spec lo evidencia.
      expect(service.estimateTokens('')).toBe(Math.ceil(1 * 1.3));
    });
  });

  describe('chunkText()', () => {
    it('should return one chunk for a short text', () => {
      const text = 'Esto es un texto corto.\n\nCon dos párrafos.';
      const chunks = service.chunkText(text);

      expect(chunks).toHaveLength(1);
      expect(chunks[0].chunkIndex).toBe(0);
      expect(chunks[0].content).toContain('Esto es un texto corto.');
      expect(chunks[0].content).toContain('Con dos párrafos.');
    });

    it('should assign sequential chunkIndex starting at 0', () => {
      const paragraph = 'palabra '.repeat(700); // ~910 tokens estimados — fuerza split
      const text = `${paragraph}\n\n${paragraph}\n\n${paragraph}`;

      const chunks = service.chunkText(text);

      expect(chunks.length).toBeGreaterThanOrEqual(2);
      chunks.forEach((c, i) => expect(c.chunkIndex).toBe(i));
    });

    it('should respect the 800-token maximum (each chunk under the cap)', () => {
      // Texto grande con varios párrafos separados por "\n\n".
      const sample = 'lorem ipsum '.repeat(50); // ~130 tokens / párrafo
      const text = Array(20).fill(sample).join('\n\n');

      const chunks = service.chunkText(text);

      // Cada chunk debe estar por debajo del límite duro de 800 tokens.
      for (const c of chunks) {
        expect(c.tokenCount).toBeLessThanOrEqual(800);
      }
    });

    it('should split a single oversize paragraph by sentences', () => {
      // 1 párrafo, varias oraciones, fuerza claramente > 800 tokens estimados
      // (estimateTokens = ceil(palabras * 1.3); ~9 palabras por oración × 250
      // oraciones ≈ 2925 tokens).
      const sentences = Array.from(
        { length: 250 },
        (_, i) => `Esta es la oración detallada número ${i} del texto técnico.`,
      ).join(' ');
      const chunks = service.chunkText(sentences);

      expect(chunks.length).toBeGreaterThan(1);
      for (const c of chunks) {
        expect(c.content.length).toBeGreaterThan(0);
      }
    });

    it('should skip blank-only paragraphs', () => {
      const text = 'Primer párrafo.\n\n   \n\nSegundo párrafo.';
      const chunks = service.chunkText(text);

      expect(chunks).toHaveLength(1);
      expect(chunks[0].content).toContain('Primer párrafo');
      expect(chunks[0].content).toContain('Segundo párrafo');
    });

    it('should return an empty array when input is empty', () => {
      expect(service.chunkText('')).toEqual([]);
      expect(service.chunkText('   ')).toEqual([]);
    });
  });
});
