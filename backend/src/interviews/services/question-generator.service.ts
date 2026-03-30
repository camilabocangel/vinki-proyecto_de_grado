import { Inject, Injectable } from '@nestjs/common';
import { LLM_PROVIDER, ILlmProvider } from '../../llm/interfaces/llm-provider.interface.js';

@Injectable()
export class QuestionGeneratorService {
  constructor(
    @Inject(LLM_PROVIDER) private llm: ILlmProvider,
  ) {}

  async generateQuestions(params: {
    topic: string;
    level: string;
    language: string;
    count: number;
  }): Promise<string[]> {
    const result = await this.llm.generateJson<{ questions: string[] }>({
      systemPrompt:
        'Eres un experto en entrevistas técnicas. Genera preguntas de entrevista técnica relevantes y desafiantes.',
      userPrompt: `Genera ${params.count} preguntas de entrevista técnica sobre "${params.topic}" para un candidato nivel ${params.level} que trabaja con ${params.language}. Responde en JSON: { "questions": ["pregunta1", "pregunta2", ...] }`,
      temperature: 0.8,
    });

    return result.questions || [];
  }
}
