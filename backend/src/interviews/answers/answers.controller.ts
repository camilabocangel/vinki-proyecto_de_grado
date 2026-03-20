import {
  Controller,
  Post,
  Param,
  Body,
  UseGuards,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AnswersService } from './answers.service.js';
import { JwtCookieGuard } from '../../auth/guards/jwt-cookie.guard.js';
import { RolesGuard } from '../../auth/guards/roles.guard.js';
import { Roles } from '../../auth/guards/roles.decorator.js';
import { SubmitAnswerDto } from '../dto/submit-answer.dto.js';

@ApiTags('answers')
@Controller('interviews/:interviewId/questions/:questionId')
@UseGuards(JwtCookieGuard, RolesGuard)
export class AnswersController {
  constructor(private answersService: AnswersService) {}

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
}
