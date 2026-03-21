import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class FollowUpService {
  private openai: OpenAI;

  constructor(private config: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.config.get<string>('OPENAI_API_KEY', ''),
    });
  }

  async generateFollowUp(questionText: string, answerText: string): Promise<string | null> {
    const sandbox = process.env.LLM_SANDBOX === 'true';
    if (sandbox) {
      return '¿Podrías profundizar más en tu respuesta? ¿Qué alternativas considerarías?';
    }

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Eres un entrevistador técnico experto. Genera UNA pregunta de seguimiento breve y específica basada en la respuesta del candidato. La pregunta debe profundizar en un aspecto mencionado o explorar un punto débil detectado. Responde solo con la pregunta, sin introducción.',
        },
        {
          role: 'user',
          content: `Pregunta original: ${questionText}\n\nRespuesta del candidato: ${answerText}\n\nGenera una pregunta de seguimiento:`,
        },
      ],
      temperature: 0.7,
      max_tokens: 150,
    });

    return response.choices[0]?.message?.content || null;
  }
}
