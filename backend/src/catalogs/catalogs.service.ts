import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';

@Injectable()
export class CatalogsService {
  constructor(private prisma: PrismaService) {}

  getLanguages() {
    return this.prisma.language.findMany({ orderBy: { name: 'asc' } });
  }

  getFrameworksByLanguage(languageId: number) {
    return this.prisma.framework.findMany({
      where: { languageId },
      orderBy: { name: 'asc' },
    });
  }

  getLevels() {
    return this.prisma.level.findMany({ orderBy: { id: 'asc' } });
  }

  getRoles() {
    return this.prisma.role.findMany({ orderBy: { name: 'asc' } });
  }
}
