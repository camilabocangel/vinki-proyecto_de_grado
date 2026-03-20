import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { InterviewsController } from './interviews.controller.js';
import { InterviewsService } from './interviews.service.js';
import { QuestionSelectorService } from './services/question-selector.service.js';
import { EmbeddingService } from './services/embedding.service.js';
import { AnswersController } from './answers/answers.controller.js';
import { AnswersService } from './answers/answers.service.js';
import { PrismaService } from '../common/prisma.service.js';

@Module({
  imports: [BullModule.registerQueue({ name: 'evaluation' })],
  controllers: [InterviewsController, AnswersController],
  providers: [
    InterviewsService,
    QuestionSelectorService,
    EmbeddingService,
    AnswersService,
    PrismaService,
  ],
  exports: [InterviewsService],
})
export class InterviewsModule {}
