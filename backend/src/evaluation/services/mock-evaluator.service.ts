import { Injectable } from '@nestjs/common';
import type { IEvaluatorService, AnswerInput, EvaluationOutput } from '../interfaces/evaluator.interface.js';

@Injectable()
export class MockEvaluatorService implements IEvaluatorService {
  async evaluate(answers: AnswerInput[]): Promise<EvaluationOutput[]> {
    const levels = ['Junior', 'Mid', 'Senior'] as const;
    return answers.map((answer) => ({
      answerId: answer.answerId,
      technicalCorrectness: this.randomScore(),
      clarityOfExplanation: this.randomScore(),
      communication: this.randomScore(),
      confidence: this.randomScore(),
      problemSolving: this.randomScore(),
      detectedLevel: levels[Math.floor(Math.random() * levels.length)],
      feedbackText: `Evaluación de prueba (sandbox) para la respuesta. Tu respuesta demuestra conocimiento del tema. Áreas de mejora: profundizar en los detalles técnicos y estructurar mejor la explicación.`,
    }));
  }

  private randomScore(): number {
    return Math.round((Math.random() * 2 + 3) * 10) / 10; // 3.0–5.0
  }
}
