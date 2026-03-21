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
      juniorAnswer: `Un Junior respondería mencionando los conceptos básicos: definiría el término, daría un ejemplo simple y mostraría comprensión fundamental del tema sin entrar en detalles de implementación.`,
      midAnswer: `Un Mid respondería con aplicación práctica: explicaría cómo lo ha usado en proyectos reales, mencionaría patrones comunes, trade-offs básicos y buenas prácticas que ha aprendido con experiencia.`,
      seniorAnswer: `Un Senior respondería con visión arquitectónica: analizaría múltiples enfoques, discutiría trade-offs avanzados, consideraciones de escalabilidad, mantenibilidad y cómo la decisión impacta al sistema completo.`,
    }));
  }

  private randomScore(): number {
    return Math.round((Math.random() * 2 + 3) * 10) / 10; // 3.0–5.0
  }
}
