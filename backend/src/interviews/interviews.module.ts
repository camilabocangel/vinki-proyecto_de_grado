import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MulterModule } from '@nestjs/platform-express';
import { InterviewsController } from './interviews.controller.js';
import { InterviewsService } from './interviews.service.js';
import { QuestionSelectorService } from './services/question-selector.service.js';
import { TranscriptionService } from './services/transcription.service.js';
import { FollowUpService } from './services/followup.service.js';
import { AnswersController } from './answers/answers.controller.js';
import { AnswersService } from './answers/answers.service.js';
import { TemplatesController } from './templates.controller.js';
import { TemplatesService } from './templates.service.js';
import { PrismaService } from '../common/prisma.service.js';
import { EvaluationModule } from '../evaluation/evaluation.module.js';
import { RagModule } from '../rag/rag.module.js';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'evaluation' }),
    MulterModule.register({ limits: { fileSize: 25 * 1024 * 1024 } }),
    EvaluationModule,
    RagModule,
  ],
  controllers: [TemplatesController, InterviewsController, AnswersController],
  providers: [
    InterviewsService,
    QuestionSelectorService,
    TranscriptionService,
    FollowUpService,
    AnswersService,
    TemplatesService,
    PrismaService,
  ],
  exports: [InterviewsService],
})
export class InterviewsModule {}
