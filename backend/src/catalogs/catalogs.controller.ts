import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CatalogsService } from './catalogs.service.js';

@ApiTags('catalogs')
@Controller('catalogs')
export class CatalogsController {
  constructor(private catalogsService: CatalogsService) {}

  @Get('languages')
  getLanguages() {
    return this.catalogsService.getLanguages();
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
}
