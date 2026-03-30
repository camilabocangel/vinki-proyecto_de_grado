export const LLM_PROVIDER = 'LLM_PROVIDER';

export interface ILlmProvider {
  generateJson<T>(params: {
    systemPrompt: string;
    userPrompt: string;
    temperature?: number;
  }): Promise<T>;

  generateText(params: {
    systemPrompt: string;
    userPrompt: string;
    temperature?: number;
    maxTokens?: number;
  }): Promise<string>;
}
