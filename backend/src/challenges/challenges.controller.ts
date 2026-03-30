import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtCookieGuard } from '../auth/guards/jwt-cookie.guard.js';
import { ChallengesService } from './challenges.service.js';

@ApiTags('challenges')
@Controller()
@UseGuards(JwtCookieGuard)
export class ChallengesController {
  constructor(private readonly challengesService: ChallengesService) {}

  @Get('challenges')
  getActiveChallenges(@Req() req: Request) {
    const userId = (req as any).user.userId;
    return this.challengesService.getActiveChallenges(userId);
  }

  @Post('challenges/:id/join')
  joinChallenge(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const userId = (req as any).user.userId;
    return this.challengesService.joinChallenge(userId, id);
  }

  @Get('challenges/:id/leaderboard')
  getChallengeLeaderboard(@Param('id', ParseIntPipe) id: number) {
    return this.challengesService.getLeaderboard(id);
  }

  @Get('leaderboard')
  getGlobalLeaderboard() {
    return this.challengesService.getGlobalLeaderboard();
  }
}
