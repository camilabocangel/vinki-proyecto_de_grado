import { Module } from '@nestjs/common';
import { CatalogsController } from './catalogs.controller.js';
import { CatalogsService } from './catalogs.service.js';
import { PrismaService } from '../common/prisma.service.js';

@Module({
  controllers: [CatalogsController],
  providers: [CatalogsService, PrismaService],
  exports: [CatalogsService],
})
export class CatalogsModule {}
