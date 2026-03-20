export const EVALUATOR_SERVICE = 'EVALUATOR_SERVICE';

export interface AnswerInput {
  answerId: number;
  questionText: string;
  answerText: string;
}

export interface EvaluationOutput {
  answerId: number;
  technicalCorrectness: number;
  clarityOfExplanation: number;
  communication: number;
  confidence: number;
  problemSolving: number;
  feedbackText: string;
  detectedLevel: 'Junior' | 'Mid' | 'Senior';
}

export interface AnswerInputWithLevel extends AnswerInput {
  questionLevel: string;
}

export interface IEvaluatorService {
  evaluate(answers: AnswerInput[]): Promise<EvaluationOutput[]>;
}
