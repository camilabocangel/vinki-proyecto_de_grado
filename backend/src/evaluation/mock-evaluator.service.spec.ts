import { MockEvaluatorService } from './services/mock-evaluator.service';

describe('MockEvaluatorService', () => {
  let service: MockEvaluatorService;

  beforeEach(() => {
    service = new MockEvaluatorService();
  });

  it('should return evaluations for all input answers', async () => {
    const answers = [
      { answerId: 1, questionText: 'What is REST?', answerText: 'REST is...' },
      { answerId: 2, questionText: 'Explain MVC', answerText: 'MVC is...' },
    ];
    const results = await service.evaluate(answers);
    expect(results).toHaveLength(2);
    expect(results[0].answerId).toBe(1);
    expect(results[1].answerId).toBe(2);
  });

  it('should return scores between 3.0 and 5.0', async () => {
    const results = await service.evaluate([
      { answerId: 1, questionText: 'Q', answerText: 'A' },
    ]);
    const r = results[0];
    expect(r.technicalCorrectness).toBeGreaterThanOrEqual(3);
    expect(r.technicalCorrectness).toBeLessThanOrEqual(5);
    expect(r.clarityOfExplanation).toBeGreaterThanOrEqual(3);
    expect(r.clarityOfExplanation).toBeLessThanOrEqual(5);
    expect(r.communication).toBeGreaterThanOrEqual(3);
    expect(r.communication).toBeLessThanOrEqual(5);
    expect(r.confidence).toBeGreaterThanOrEqual(3);
    expect(r.confidence).toBeLessThanOrEqual(5);
    expect(r.problemSolving).toBeGreaterThanOrEqual(3);
    expect(r.problemSolving).toBeLessThanOrEqual(5);
  });

  it('should return a detected level (Junior, Mid, or Senior)', async () => {
    const results = await service.evaluate([
      { answerId: 1, questionText: 'Q', answerText: 'A' },
    ]);
    expect(['Junior', 'Mid', 'Senior']).toContain(results[0].detectedLevel);
  });

  it('should return feedback text', async () => {
    const results = await service.evaluate([
      { answerId: 1, questionText: 'Q', answerText: 'A' },
    ]);
    expect(results[0].feedbackText).toBeTruthy();
    expect(typeof results[0].feedbackText).toBe('string');
  });

  it('should return level-specific answer recommendations', async () => {
    const results = await service.evaluate([
      { answerId: 1, questionText: 'Q', answerText: 'A' },
    ]);
    expect(results[0].juniorAnswer).toBeTruthy();
    expect(results[0].midAnswer).toBeTruthy();
    expect(results[0].seniorAnswer).toBeTruthy();
  });

  it('should return an empty array when given no answers', async () => {
    const results = await service.evaluate([]);
    expect(results).toHaveLength(0);
  });
});
