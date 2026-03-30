import { Inject, Injectable } from '@nestjs/common';
import { LLM_PROVIDER, ILlmProvider } from '../../llm/interfaces/llm-provider.interface.js';

@Injectable()
export class FollowUpService {
  constructor(
    @Inject(LLM_PROVIDER) private llm: ILlmProvider,
  ) {}

  async generateFollowUp(questionText: string, answerText: string): Promise<string | null> {
    const result = await this.llm.generateText({
      systemPrompt:
        'Eres un entrevistador técnico experto. Genera UNA pregunta de seguimiento breve y específica basada en la respuesta del candidato. La pregunta debe profundizar en un aspecto mencionado o explorar un punto débil detectado. Responde solo con la pregunta, sin introducción.',
      userPrompt: `Pregunta original: ${questionText}\n\nRespuesta del candidato: ${answerText}\n\nGenera una pregunta de seguimiento:`,
      temperature: 0.7,
      maxTokens: 150,
    });

    return result || null;
  }
}
