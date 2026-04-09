import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtCookieGuard } from '../auth/guards/jwt-cookie.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/guards/roles.decorator.js';
import { AchievementsService } from './achievements.service.js';

@ApiTags('achievements')
@Controller('achievements')
@UseGuards(JwtCookieGuard, RolesGuard)
@Roles('student')
export class AchievementsController {
  constructor(private readonly achievementsService: AchievementsService) {}

  @Get()
  async getAchievements(@Req() req: Request) {
    const userId = (req as any).user.userId;
    return this.achievementsService.getUserAchievements(userId);
  }
}
