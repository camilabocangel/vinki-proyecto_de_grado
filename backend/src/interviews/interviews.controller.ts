import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InterviewsService } from './interviews.service.js';
import { JwtCookieGuard } from '../auth/guards/jwt-cookie.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/guards/roles.decorator.js';
import { CreateInterviewDto } from './dto/create-interview.dto.js';

@ApiTags('interviews')
@Controller('interviews')
@UseGuards(JwtCookieGuard, RolesGuard)
export class InterviewsController {
  constructor(private interviewsService: InterviewsService) {}

  @Post()
  @Roles('student')
  create(@Req() req: any, @Body() dto: CreateInterviewDto) {
    const user = (req as any).user;
    return this.interviewsService.create(user.userId, dto);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const user = (req as any).user;
    return this.interviewsService.findOne(id, user.userId);
  }

  @Post(':id/finish')
  @Roles('student')
  finish(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const user = (req as any).user;
    return this.interviewsService.finish(id, user.userId);
  }
}
