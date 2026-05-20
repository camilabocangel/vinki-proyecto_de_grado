import { Test, TestingModule } from '@nestjs/testing';
import {
  CanActivate,
  ExecutionContext,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { KnowledgeController } from './knowledge.controller.js';
import { KnowledgeIngestionService } from './services/knowledge-ingestion.service.js';
import { KnowledgeRetrievalService } from './services/knowledge-retrieval.service.js';
import { PrismaService } from '../common/prisma.service.js';
import { JwtCookieGuard } from '../auth/guards/jwt-cookie.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';

const passThroughGuard: CanActivate = { canActivate: (_: ExecutionContext) => true };

describe('KnowledgeController', () => {
  let controller: KnowledgeController;
  let ingestion: jest.Mocked<KnowledgeIngestionService>;
  let retrieval: jest.Mocked<KnowledgeRetrievalService>;
  let prisma: {
    knowledgeDocument: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(async () => {
    ingestion = {
      ingestDocument: jest.fn(),
    } as unknown as jest.Mocked<KnowledgeIngestionService>;
    retrieval = {
      searchRelevantChunks: jest.fn(),
    } as unknown as jest.Mocked<KnowledgeRetrievalService>;
    prisma = {
      knowledgeDocument: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
      },
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [KnowledgeController],
      providers: [
        { provide: KnowledgeIngestionService, useValue: ingestion },
        { provide: KnowledgeRetrievalService, useValue: retrieval },
        { provide: PrismaService, useValue: prisma },
      ],
    })
      .overrideGuard(JwtCookieGuard)
      .useValue(passThroughGuard)
      .overrideGuard(RolesGuard)
      .useValue(passThroughGuard)
      .compile();

    controller = moduleRef.get(KnowledgeController);
  });

  describe('POST /knowledge', () => {
    it('should delegate to KnowledgeIngestionService.ingestDocument with the userId of the uploader', async () => {
      ingestion.ingestDocument.mockResolvedValue({ documentId: 99, chunkCount: 5 });
      const req = { user: { userId: 7, role: 'admin' } };
      const dto = {
        title: 'Guía',
        content: 'Contenido',
        sourceUrl: 'http://x',
        languageId: 1,
        frameworkId: 2,
      } as any;

      const result = await controller.ingestDocument(req, dto);

      expect(ingestion.ingestDocument).toHaveBeenCalledWith({
        title: 'Guía',
        content: 'Contenido',
        sourceUrl: 'http://x',
        languageId: 1,
        frameworkId: 2,
        uploadedById: 7,
      });
      expect(result).toEqual({
        message: 'Document ingested successfully',
        documentId: 99,
        chunkCount: 5,
      });
    });
  });

  describe('GET /knowledge (list)', () => {
    it('should query ALL documents for admin (no where filter)', async () => {
      prisma.knowledgeDocument.findMany.mockResolvedValue([]);
      const req = { user: { userId: 7, role: 'admin' } };

      await controller.listDocuments(req);

      expect(prisma.knowledgeDocument.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
    });

    it("should restrict documents to user's own when role is not admin", async () => {
      prisma.knowledgeDocument.findMany.mockResolvedValue([]);
      const req = { user: { userId: 7, role: 'recruiter' } };

      await controller.listDocuments(req);

      expect(prisma.knowledgeDocument.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { uploadedById: 7 } }),
      );
    });

    it('should flatten the _count.chunks into a chunkCount field', async () => {
      prisma.knowledgeDocument.findMany.mockResolvedValue([
        { id: 1, title: 'T', _count: { chunks: 4 } },
        { id: 2, title: 'U', _count: { chunks: 0 } },
      ]);

      const result = await controller.listDocuments({ user: { userId: 7, role: 'admin' } });

      expect(result[0].chunkCount).toBe(4);
      expect(result[1].chunkCount).toBe(0);
      expect(result[0]._count).toBeUndefined();
    });
  });

  describe('GET /knowledge/:id (detail)', () => {
    it('should return the document when found and owned by the requester', async () => {
      prisma.knowledgeDocument.findUnique.mockResolvedValue({
        id: 5,
        uploadedById: 7,
        _count: { chunks: 3 },
      });

      const result = await controller.getDocument(
        { user: { userId: 7, role: 'recruiter' } },
        5,
      );

      expect(result.chunkCount).toBe(3);
      expect(result._count).toBeUndefined();
    });

    it('should allow admin to see any document', async () => {
      prisma.knowledgeDocument.findUnique.mockResolvedValue({
        id: 5,
        uploadedById: 999, // otra persona
        _count: { chunks: 2 },
      });

      const result = await controller.getDocument(
        { user: { userId: 7, role: 'admin' } },
        5,
      );

      expect(result.id).toBe(5);
    });

    it("should throw ForbiddenException when non-admin reads someone else's document", async () => {
      prisma.knowledgeDocument.findUnique.mockResolvedValue({
        id: 5,
        uploadedById: 999,
        _count: { chunks: 1 },
      });

      await expect(
        controller.getDocument({ user: { userId: 7, role: 'recruiter' } }, 5),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when document does not exist', async () => {
      prisma.knowledgeDocument.findUnique.mockResolvedValue(null);

      await expect(
        controller.getDocument({ user: { userId: 7, role: 'admin' } }, 999),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('DELETE /knowledge/:id', () => {
    it('should delete the document and chunks (cascade) when owner deletes', async () => {
      prisma.knowledgeDocument.findUnique.mockResolvedValue({ id: 5, uploadedById: 7 });
      prisma.knowledgeDocument.delete.mockResolvedValue({ id: 5 });

      const result = await controller.deleteDocument(
        { user: { userId: 7, role: 'recruiter' } },
        5,
      );

      expect(prisma.knowledgeDocument.delete).toHaveBeenCalledWith({ where: { id: 5 } });
      expect(result).toEqual({ message: 'Document and its chunks deleted successfully' });
    });

    it("should throw ForbiddenException when non-admin tries to delete someone else's document", async () => {
      prisma.knowledgeDocument.findUnique.mockResolvedValue({ id: 5, uploadedById: 999 });

      await expect(
        controller.deleteDocument({ user: { userId: 7, role: 'recruiter' } }, 5),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.knowledgeDocument.delete).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when document does not exist', async () => {
      prisma.knowledgeDocument.findUnique.mockResolvedValue(null);

      await expect(
        controller.deleteDocument({ user: { userId: 7, role: 'admin' } }, 999),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('POST /knowledge/search (RF-30 / RF-31)', () => {
    it('should delegate to KnowledgeRetrievalService.searchRelevantChunks with default limit=5', async () => {
      retrieval.searchRelevantChunks.mockResolvedValue([]);

      const result = await controller.searchKnowledge({
        query: 'REST',
      } as any);

      expect(retrieval.searchRelevantChunks).toHaveBeenCalledWith({
        query: 'REST',
        languageId: undefined,
        frameworkId: undefined,
        limit: 5,
      });
      expect(result).toEqual({ results: [] });
    });

    it('should forward optional filters and limit to the retrieval service', async () => {
      retrieval.searchRelevantChunks.mockResolvedValue([
        { content: 'X', distance: 0.1, documentTitle: 'D1' },
      ]);

      await controller.searchKnowledge({
        query: 'REST',
        languageId: 1,
        frameworkId: 2,
        limit: 10,
      } as any);

      expect(retrieval.searchRelevantChunks).toHaveBeenCalledWith({
        query: 'REST',
        languageId: 1,
        frameworkId: 2,
        limit: 10,
      });
    });
  });
});
