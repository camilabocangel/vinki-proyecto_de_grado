import { Inject, Injectable, Logger } from '@nestjs/common';
import { KnowledgeRetrievalService } from '../../knowledge/services/knowledge-retrieval.service.js';
import { LLM_PROVIDER, ILlmProvider } from '../../llm/interfaces/llm-provider.interface.js';

@Injectable()
export class RagQuestionGeneratorService {
  private readonly logger = new Logger(RagQuestionGeneratorService.name);

  constructor(
    private knowledgeRetrieval: KnowledgeRetrievalService,
    @Inject(LLM_PROVIDER) private llm: ILlmProvider,
  ) {}

  async generateQuestions(params: {
    roleText: string;
    level: string;
    language: string;
    languageId?: number;
    frameworkId?: number;
    count: number;
  }): Promise<string[]> {
    const chunks = await this.knowledgeRetrieval.searchRelevantChunks({
      query: `${params.roleText} ${params.level} interview questions`,
      languageId: params.languageId,
      frameworkId: params.frameworkId,
      limit: 5,
    });

    if (chunks.length === 0) {
      this.logger.log('No knowledge base content found, skipping RAG generation');
      return [];
    }

    const context = chunks.map((c) => c.content).join('\n\n---\n\n');

    const result = await this.llm.generateJson<{ questions: string[] }>({
      systemPrompt:
        'Eres un experto en entrevistas técnicas. Genera preguntas de entrevista basadas EXCLUSIVAMENTE en el contenido técnico proporcionado. Las preguntas deben evaluar comprensión profunda de los conceptos del material.',
      userPrompt: `Basándote en el siguiente contenido técnico:\n\n${context}\n\nGenera ${params.count} preguntas de entrevista técnica para un candidato nivel ${params.level} de ${params.roleText} trabajando con ${params.language}. Las preguntas deben evaluar comprensión profunda del contenido proporcionado. Responde en JSON: { "questions": ["pregunta1", "pregunta2", ...] }`,
      temperature: 0.8,
    });

    this.logger.log(`RAG generated ${result.questions?.length ?? 0} questions`);
    return result.questions || [];
  }
}
