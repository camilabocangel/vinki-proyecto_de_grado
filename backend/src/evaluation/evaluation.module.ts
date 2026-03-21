import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EvaluationProcessor } from './processors/evaluation.processor.js';
import { OpenaiEvaluatorService } from './services/openai-evaluator.service.js';
import { MockEvaluatorService } from './services/mock-evaluator.service.js';
import { EVALUATOR_SERVICE } from './interfaces/evaluator.interface.js';
import { PrismaService } from '../common/prisma.service.js';

@Module({
  imports: [
    ConfigModule,
    BullModule.registerQueue({ name: 'evaluation' }),
  ],
  providers: [
    PrismaService,
    EvaluationProcessor,
    OpenaiEvaluatorService,
    MockEvaluatorService,
    {
      provide: EVALUATOR_SERVICE,
      useFactory: (config: ConfigService, openai: OpenaiEvaluatorService, mock: MockEvaluatorService) => {
        const sandbox = config.get<string>('LLM_SANDBOX', 'true');
        return sandbox === 'true' ? mock : openai;
      },
      inject: [ConfigService, OpenaiEvaluatorService, MockEvaluatorService],
    },
  ],
})
export class EvaluationModule {}
