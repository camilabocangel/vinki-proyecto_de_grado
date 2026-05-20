import { RagQuestionGeneratorService } from './rag-question-generator.service.js';
import { KnowledgeRetrievalService, RetrievedChunk } from '../../knowledge/services/knowledge-retrieval.service.js';
import type { ILlmProvider } from '../../llm/interfaces/llm-provider.interface.js';

// RagQuestionGeneratorService implementa RF-31 (recuperación de contexto
// para IA): primero llama a KnowledgeRetrievalService para obtener chunks,
// luego le pasa ese contexto al LLM para generar preguntas. Cubre:
// (1) el camino sin contexto devuelve [] sin invocar al LLM, (2) el camino
// con contexto incluye el contenido de los chunks en el prompt, (3) los
// parámetros de la consulta (lenguaje, framework, nivel) se propagan, y
// (4) el resultado se extrae del campo `questions` del JSON del LLM.

function makeKnowledge(chunks: RetrievedChunk[]): KnowledgeRetrievalService {
  return {
    searchRelevantChunks: jest.fn().mockResolvedValue(chunks),
  } as unknown as KnowledgeRetrievalService;
}

function makeLlm(responsePayload: unknown): ILlmProvider {
  return {
    generateJson: jest.fn().mockResolvedValue(responsePayload),
    generateText: jest.fn(),
  };
}

const defaultParams = {
  roleText: 'Backend Engineer',
  level: 'Junior',
  language: 'TypeScript',
  languageId: 1,
  frameworkId: 2,
  count: 3,
};

describe('RagQuestionGeneratorService', () => {
  it('should return an empty array and skip the LLM when no chunks are retrieved', async () => {
    const knowledge = makeKnowledge([]);
    const llm = makeLlm({ questions: ['should-not-appear'] });
    const service = new RagQuestionGeneratorService(knowledge, llm);

    const result = await service.generateQuestions(defaultParams);

    expect(result).toEqual([]);
    expect(llm.generateJson).not.toHaveBeenCalled();
  });

  it('should pass language/framework filters and a level-aware query to KnowledgeRetrievalService', async () => {
    const knowledge = makeKnowledge([
      { content: 'REST tutorial', distance: 0.1, documentTitle: 'Doc 1' },
    ]);
    const llm = makeLlm({ questions: ['Q1'] });
    const service = new RagQuestionGeneratorService(knowledge, llm);

    await service.generateQuestions(defaultParams);

    const call = (knowledge.searchRelevantChunks as jest.Mock).mock.calls[0][0];
    expect(call.languageId).toBe(1);
    expect(call.frameworkId).toBe(2);
    expect(call.query).toContain('Backend Engineer');
    expect(call.query).toContain('Junior');
    expect(call.limit).toBe(5);
  });

  it('should include the retrieved chunks as context in the user prompt sent to the LLM', async () => {
    const chunks: RetrievedChunk[] = [
      { content: 'REST: arquitectura HTTP', distance: 0.1, documentTitle: 'Doc 1' },
      { content: 'Verbs: GET, POST, PUT', distance: 0.2, documentTitle: 'Doc 2' },
    ];
    const llm = makeLlm({ questions: ['¿Qué es REST?'] });
    const service = new RagQuestionGeneratorService(makeKnowledge(chunks), llm);

    await service.generateQuestions(defaultParams);

    const params = (llm.generateJson as jest.Mock).mock.calls[0][0];
    expect(params.systemPrompt).toContain('experto en entrevistas');
    // El user prompt debe llevar el contenido de ambos chunks.
    expect(params.userPrompt).toContain('REST: arquitectura HTTP');
    expect(params.userPrompt).toContain('Verbs: GET, POST, PUT');
    // Y el nivel + cantidad + lenguaje pedidos.
    expect(params.userPrompt).toContain('Junior');
    expect(params.userPrompt).toContain('3'); // count
    expect(params.userPrompt).toContain('TypeScript');
  });

  it('should return the questions array from the LLM JSON response', async () => {
    const chunks: RetrievedChunk[] = [
      { content: 'algo relevante', distance: 0.1, documentTitle: 'D1' },
    ];
    const llm = makeLlm({ questions: ['Pregunta 1', 'Pregunta 2', 'Pregunta 3'] });
    const service = new RagQuestionGeneratorService(makeKnowledge(chunks), llm);

    const result = await service.generateQuestions(defaultParams);

    expect(result).toEqual(['Pregunta 1', 'Pregunta 2', 'Pregunta 3']);
  });

  it('should return [] when the LLM response is missing the "questions" field', async () => {
    const chunks: RetrievedChunk[] = [
      { content: 'x', distance: 0.1, documentTitle: 'D1' },
    ];
    const llm = makeLlm({}); // sin campo `questions`
    const service = new RagQuestionGeneratorService(makeKnowledge(chunks), llm);

    const result = await service.generateQuestions(defaultParams);

    expect(result).toEqual([]);
  });
});
