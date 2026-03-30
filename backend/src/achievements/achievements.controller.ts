import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtCookieGuard } from '../auth/guards/jwt-cookie.guard.js';
import { AchievementsService } from './achievements.service.js';

@ApiTags('achievements')
@Controller('achievements')
export class AchievementsController {
  constructor(private readonly achievementsService: AchievementsService) {}

  @Get()
  @UseGuards(JwtCookieGuard)
  async getAchievements(@Req() req: Request) {
    const userId = (req as any).user.userId;
    return this.achievementsService.getUserAchievements(userId);
  }
}
