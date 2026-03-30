import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EMBEDDING_PROVIDER } from './interfaces/embedding-provider.interface.js';
import { LLM_PROVIDER } from './interfaces/llm-provider.interface.js';
import { OpenaiEmbeddingService } from './services/openai-embedding.service.js';
import { GeminiEmbeddingService } from './services/gemini-embedding.service.js';
import { MockEmbeddingService } from './services/mock-embedding.service.js';
import { OpenaiLlmService } from './services/openai-llm.service.js';
import { GeminiLlmService } from './services/gemini-llm.service.js';
import { MockLlmService } from './services/mock-llm.service.js';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    OpenaiEmbeddingService,
    GeminiEmbeddingService,
    MockEmbeddingService,
    OpenaiLlmService,
    GeminiLlmService,
    MockLlmService,
    {
      provide: EMBEDDING_PROVIDER,
      useFactory: (
        config: ConfigService,
        openai: OpenaiEmbeddingService,
        gemini: GeminiEmbeddingService,
        mock: MockEmbeddingService,
      ) => {
        const sandbox = config.get<string>('LLM_SANDBOX', 'true') === 'true';
        if (sandbox) return mock;

        const provider = config.get<string>('LLM_EMBEDDING_PROVIDER', 'openai');
        return provider === 'gemini' ? gemini : openai;
      },
      inject: [ConfigService, OpenaiEmbeddingService, GeminiEmbeddingService, MockEmbeddingService],
    },
    {
      provide: LLM_PROVIDER,
      useFactory: (
        config: ConfigService,
        openai: OpenaiLlmService,
        gemini: GeminiLlmService,
        mock: MockLlmService,
      ) => {
        const sandbox = config.get<string>('LLM_SANDBOX', 'true') === 'true';
        if (sandbox) return mock;

        const provider = config.get<string>('LLM_TEXT_PROVIDER', 'openai');
        return provider === 'gemini' ? gemini : openai;
      },
      inject: [ConfigService, OpenaiLlmService, GeminiLlmService, MockLlmService],
    },
  ],
  exports: [EMBEDDING_PROVIDER, LLM_PROVIDER],
})
export class LlmModule {}
