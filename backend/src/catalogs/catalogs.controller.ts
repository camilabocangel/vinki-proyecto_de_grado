import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CatalogsService } from './catalogs.service.js';
import { QuestionGeneratorService } from '../interviews/services/question-generator.service.js';
import { JwtCookieGuard } from '../auth/guards/jwt-cookie.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/guards/roles.decorator.js';
import { GenerateQuestionsDto } from './dto/generate-questions.dto.js';

@ApiTags('catalogs')
@Controller('catalogs')
export class CatalogsController {
  constructor(
    private catalogsService: CatalogsService,
    private questionGenerator: QuestionGeneratorService,
  ) {}

  @Get('languages')
  getLanguages() {
    return this.catalogsService.getLanguages();
  }

  @Get('roles/:roleId/languages')
  getLanguagesByRole(@Param('roleId', ParseIntPipe) roleId: number) {
    return this.catalogsService.getLanguagesByRole(roleId);
  }

  @Get('languages/:id/frameworks')
  getFrameworks(@Param('id', ParseIntPipe) id: number) {
    return this.catalogsService.getFrameworksByLanguage(id);
  }

  @Get('levels')
  getLevels() {
    return this.catalogsService.getLevels();
  }

  @Get('roles')
  getRoles() {
    return this.catalogsService.getRoles();
  }

  @Get('skills')
  getSkills() {
    return this.catalogsService.getSkills();
  }

  @Post('questions/generate')
  @UseGuards(JwtCookieGuard, RolesGuard)
  @Roles('admin')
  async generateQuestions(@Body() dto: GenerateQuestionsDto) {
    const questions = await this.questionGenerator.generateQuestions(dto);
    return { questions };
  }
}
