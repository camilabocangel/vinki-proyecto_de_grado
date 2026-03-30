import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Req,
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

@Controller('knowledge')
@UseGuards(JwtCookieGuard, RolesGuard)
@Roles('recruiter', 'admin')
export class KnowledgeController {
  constructor(
    private prisma: PrismaService,
    private ingestionService: KnowledgeIngestionService,
    private retrievalService: KnowledgeRetrievalService,
  ) {}

  @Post()
  async ingestDocument(@Req() req: any, @Body() dto: IngestDocumentDto) {
    const user = req.user;
    const result = await this.ingestionService.ingestDocument({
      title: dto.title,
      content: dto.content,
      sourceUrl: dto.sourceUrl,
      languageId: dto.languageId,
      frameworkId: dto.frameworkId,
      uploadedById: user.userId,
    });

    return {
      message: 'Document ingested successfully',
      documentId: result.documentId,
      chunkCount: result.chunkCount,
    };
  }

  @Get()
  async listDocuments(@Req() req: any) {
    const user = req.user;
    const isAdmin = user.role === 'admin';

    const documents = await this.prisma.knowledgeDocument.findMany({
      where: isAdmin ? {} : { uploadedById: user.userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        sourceUrl: true,
        status: true,
        languageId: true,
        frameworkId: true,
        uploadedById: true,
        createdAt: true,
        updatedAt: true,
        uploadedBy: { select: { name: true } },
        language: { select: { name: true } },
        framework: { select: { name: true } },
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
  async getDocument(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const user = req.user;
    const document = await this.prisma.knowledgeDocument.findUnique({
      where: { id },
      include: {
        language: true,
        framework: true,
        uploadedBy: { select: { name: true } },
        _count: { select: { chunks: true } },
      },
    });

    if (!document) throw new NotFoundException('Document not found');
    if (user.role !== 'admin' && document.uploadedById !== user.userId) {
      throw new ForbiddenException();
    }

    return {
      ...document,
      chunkCount: document._count.chunks,
      _count: undefined,
    };
  }

  @Delete(':id')
  async deleteDocument(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const user = req.user;
    const document = await this.prisma.knowledgeDocument.findUnique({
      where: { id },
    });

    if (!document) throw new NotFoundException('Document not found');
    if (user.role !== 'admin' && document.uploadedById !== user.userId) {
      throw new ForbiddenException();
    }

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
