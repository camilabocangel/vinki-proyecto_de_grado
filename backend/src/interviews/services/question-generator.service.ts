import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class QuestionGeneratorService {
  private openai: OpenAI;

  constructor(private config: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.config.get<string>('OPENAI_API_KEY', ''),
    });
  }

  async generateQuestions(params: {
    topic: string;
    level: string;
    language: string;
    count: number;
  }): Promise<string[]> {
    const sandbox = this.config.get<string>('LLM_SANDBOX', 'true') === 'true';
    if (sandbox) {
      return Array.from({ length: params.count }, (_, i) =>
        `[Sandbox] Pregunta ${i + 1} sobre ${params.topic} para nivel ${params.level} en ${params.language}`,
      );
    }

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'Eres un experto en entrevistas técnicas. Genera preguntas de entrevista técnica relevantes y desafiantes.',
        },
        {
          role: 'user',
          content: `Genera ${params.count} preguntas de entrevista técnica sobre "${params.topic}" para un candidato nivel ${params.level} que trabaja con ${params.language}. Responde en JSON: { "questions": ["pregunta1", "pregunta2", ...] }`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.8,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return [];

    const parsed = JSON.parse(content) as { questions: string[] };
    return parsed.questions;
  }
}
