import { EVALUATION_RUBRICS } from './rubrics.js';
import { BEHAVIORAL_RUBRICS } from './rubrics-behavioral.js';

// Las rúbricas son strings que se inyectan literalmente en el system prompt
// del LLM. El contrato de salida (campos del JSON) define el shape que el
// pipeline de evaluación espera parsear. Si alguien edita la rúbrica y
// olvida mencionar un campo, el LLM puede dejar de devolverlo y romper la
// persistencia en answer_evaluations. Estos tests blindan ese contrato.

const REQUIRED_DIMENSIONS = [
  'technicalCorrectness',
  'clarityOfExplanation',
  'communication',
  'confidence',
  'problemSolving',
] as const;

const REQUIRED_OUTPUT_FIELDS = [
  'answerId',
  'detectedLevel',
  'feedbackText',
  'juniorAnswer',
  'midAnswer',
  'seniorAnswer',
] as const;

const REQUIRED_LEVELS = ['Junior', 'Mid', 'Senior'] as const;

describe('EVALUATION_RUBRICS (técnica)', () => {
  it.each(REQUIRED_DIMENSIONS)('declares the "%s" dimension', (dim) => {
    expect(EVALUATION_RUBRICS).toContain(dim);
  });

  it.each(REQUIRED_LEVELS)('mentions the level "%s"', (level) => {
    expect(EVALUATION_RUBRICS).toContain(level);
  });

  it.each(REQUIRED_OUTPUT_FIELDS)('requires the output field "%s"', (field) => {
    expect(EVALUATION_RUBRICS).toContain(field);
  });

  it('declares the [0-5] scale and instructs to respond in JSON', () => {
    expect(EVALUATION_RUBRICS).toMatch(/0 a 5|0-5/);
    expect(EVALUATION_RUBRICS.toLowerCase()).toContain('json');
  });
});

describe('BEHAVIORAL_RUBRICS', () => {
  it.each(REQUIRED_DIMENSIONS)('reuses the "%s" dimension name (mapped to STAR)', (dim) => {
    expect(BEHAVIORAL_RUBRICS).toContain(dim);
  });

  it.each(REQUIRED_LEVELS)('mentions the level "%s"', (level) => {
    expect(BEHAVIORAL_RUBRICS).toContain(level);
  });

  it.each(REQUIRED_OUTPUT_FIELDS)('requires the output field "%s"', (field) => {
    expect(BEHAVIORAL_RUBRICS).toContain(field);
  });

  it('references the STAR method (Situation/Task/Action/Result)', () => {
    expect(BEHAVIORAL_RUBRICS).toMatch(/STAR/);
  });
});
