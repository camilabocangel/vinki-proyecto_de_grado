import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Req,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { AnswersService } from './answers.service.js';
import { TranscriptionService } from '../services/transcription.service.js';
import { PrismaService } from '../../common/prisma.service.js';
import { JwtCookieGuard } from '../../auth/guards/jwt-cookie.guard.js';
import { RolesGuard } from '../../auth/guards/roles.guard.js';
import { Roles } from '../../auth/guards/roles.decorator.js';
import { SubmitAnswerDto } from '../dto/submit-answer.dto.js';
import { FollowUpRequestDto } from '../dto/followup.dto.js';
import { FollowUpService } from '../services/followup.service.js';

@ApiTags('answers')
@Controller('interviews/:interviewId/questions/:questionId')
@UseGuards(JwtCookieGuard, RolesGuard)
export class AnswersController {
  constructor(
    private answersService: AnswersService,
    private transcriptionService: TranscriptionService,
    private followUpService: FollowUpService,
    private prisma: PrismaService,
  ) {}

  @Post('answer')
  @Roles('student')
  submit(
    @Req() req: any,
    @Param('interviewId', ParseIntPipe) interviewId: number,
    @Param('questionId', ParseIntPipe) questionId: number,
    @Body() dto: SubmitAnswerDto,
  ) {
    const user = (req as any).user;
    return this.answersService.submit(interviewId, questionId, user.userId, dto);
  }

  @Post('audio')
  @Roles('student')
  @UseInterceptors(FileInterceptor('audio'))
  async submitAudio(
    @Req() req: any,
    @Param('interviewId', ParseIntPipe) interviewId: number,
    @Param('questionId', ParseIntPipe) questionId: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Audio file is required');
    }

    // Get interview language for transcription
    const interview = await this.prisma.interview.findUnique({
      where: { id: interviewId },
      include: { language: true },
    });
    const langCode = this.transcriptionService.getLanguageCode(
      interview?.language?.name,
    );

    const transcription = await this.transcriptionService.transcribe(
      file.buffer,
      file.originalname || 'audio.webm',
      langCode,
    );

    const user = (req as any).user;
    const answer = await this.answersService.submit(
      interviewId,
      questionId,
      user.userId,
      {
        answerText: transcription,
        audioUrl: 'audio://uploaded',
      },
    );

    return { ...answer, transcription };
  }

  @Post('evaluate-now')
  @Roles('student')
  evaluateNow(
    @Req() req: any,
    @Param('interviewId', ParseIntPipe) interviewId: number,
    @Param('questionId', ParseIntPipe) questionId: number,
  ) {
    const user = (req as any).user;
    return this.answersService.evaluateNow(interviewId, questionId, user.userId);
  }

  @Post('followup')
  @Roles('student')
  async followUp(
    @Req() req: any,
    @Param('interviewId', ParseIntPipe) interviewId: number,
    @Param('questionId', ParseIntPipe) questionId: number,
    @Body() dto: FollowUpRequestDto,
  ) {
    const questionText = await this.answersService.getQuestionText(
      interviewId,
      questionId,
      (req as any).user.userId,
    );
    const followUpQuestion = await this.followUpService.generateFollowUp(
      questionText,
      dto.answerText,
    );
    return { followUpQuestion };
  }
}
