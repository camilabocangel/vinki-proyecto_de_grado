import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtCookieGuard } from '../auth/guards/jwt-cookie.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/guards/roles.decorator.js';
import { PrismaService } from '../common/prisma.service.js';
import { IngestDocumentDto } from './dto/ingest-document.dto.js';
import { SearchKnowledgeDto } from './dto/search-knowledge.dto.js';
import { KnowledgeIngestionService } from './services/knowledge-ingestion.service.js';
import { KnowledgeRetrievalService } from './services/knowledge-retrieval.service.js';

@Controller('admin/knowledge')
@UseGuards(JwtCookieGuard, RolesGuard)
@Roles('admin')
export class KnowledgeController {
  constructor(
    private prisma: PrismaService,
    private ingestionService: KnowledgeIngestionService,
    private retrievalService: KnowledgeRetrievalService,
  ) {}

  @Post()
  async ingestDocument(@Body() dto: IngestDocumentDto) {
    const result = await this.ingestionService.ingestDocument({
      title: dto.title,
      content: dto.content,
      sourceUrl: dto.sourceUrl,
      languageId: dto.languageId,
      frameworkId: dto.frameworkId,
    });

    return {
      message: 'Document ingested successfully',
      documentId: result.documentId,
      chunkCount: result.chunkCount,
    };
  }

  @Get()
  async listDocuments() {
    const documents = await this.prisma.knowledgeDocument.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        sourceUrl: true,
        status: true,
        languageId: true,
        frameworkId: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { chunks: true } },
      },
    });

    return documents.map((d) => ({
      ...d,
      chunkCount: d._count.chunks,
      _count: undefined,
    }));
  }

  @Get(':id')
  async getDocument(@Param('id', ParseIntPipe) id: number) {
    const document = await this.prisma.knowledgeDocument.findUniqueOrThrow({
      where: { id },
      include: {
        language: true,
        framework: true,
        _count: { select: { chunks: true } },
      },
    });

    return {
      ...document,
      chunkCount: document._count.chunks,
      _count: undefined,
    };
  }

  @Delete(':id')
  async deleteDocument(@Param('id', ParseIntPipe) id: number) {
    await this.prisma.knowledgeDocument.delete({ where: { id } });
    return { message: 'Document and its chunks deleted successfully' };
  }

  @Post('search')
  async searchKnowledge(@Body() dto: SearchKnowledgeDto) {
    const results = await this.retrievalService.searchRelevantChunks({
      query: dto.query,
      languageId: dto.languageId,
      frameworkId: dto.frameworkId,
      limit: dto.limit ?? 5,
    });

    return { results };
  }
}
