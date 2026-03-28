import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import type { IEvaluatorService, AnswerInput, EvaluationOutput } from '../interfaces/evaluator.interface.js';
import { EVALUATION_RUBRICS } from '../rubrics.js';
import { BEHAVIORAL_RUBRICS } from '../rubrics-behavioral.js';

@Injectable()
export class OpenaiEvaluatorService implements IEvaluatorService {
  private openai: OpenAI;

  constructor(private config: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.config.get<string>('OPENAI_API_KEY', ''),
    });
  }

  async evaluate(answers: AnswerInput[], isBehavioral = false): Promise<EvaluationOutput[]> {
    const rubrics = isBehavioral ? BEHAVIORAL_RUBRICS : EVALUATION_RUBRICS;
    const contextLabel = isBehavioral ? 'entrevista conductual (behavioral)' : 'entrevista técnica';

    const answersText = answers
      .map(
        (a, i) =>
          `--- Respuesta ${i + 1} (answerId: ${a.answerId}) ---\nPregunta: ${a.questionText}\nRespuesta: ${a.answerText}`,
      )
      .join('\n\n');

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Eres un evaluador experto de ${contextLabel}. ${rubrics}`,
        },
        {
          role: 'user',
          content: `Evalúa las siguientes respuestas de ${contextLabel}:\n\n${answersText}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('Empty response from OpenAI');

    const parsed = JSON.parse(content) as { evaluations: EvaluationOutput[] };
    return parsed.evaluations;
  }
}
