import { Test, TestingModule } from '@nestjs/testing';
import { CanActivate, ExecutionContext, BadRequestException } from '@nestjs/common';
import { AnswersController } from './answers.controller.js';
import { AnswersService } from './answers.service.js';
import { TranscriptionService } from '../services/transcription.service.js';
import { FollowUpService } from '../services/followup.service.js';
import { PrismaService } from '../../common/prisma.service.js';
import { JwtCookieGuard } from '../../auth/guards/jwt-cookie.guard.js';
import { RolesGuard } from '../../auth/guards/roles.guard.js';

const passThroughGuard: CanActivate = { canActivate: (_: ExecutionContext) => true };

describe('AnswersController', () => {
  let controller: AnswersController;
  let answersService: jest.Mocked<AnswersService>;
  let transcriptionService: jest.Mocked<TranscriptionService>;
  let followUpService: jest.Mocked<FollowUpService>;
  let prisma: { interview: { findUnique: jest.Mock } };

  beforeEach(async () => {
    answersService = {
      submit: jest.fn(),
      getQuestionText: jest.fn(),
      evaluateNow: jest.fn(),
    } as unknown as jest.Mocked<AnswersService>;

    transcriptionService = {
      transcribe: jest.fn(),
      getLanguageCode: jest.fn().mockReturnValue('es'),
    } as unknown as jest.Mocked<TranscriptionService>;

    followUpService = {
      generateFollowUp: jest.fn(),
    } as unknown as jest.Mocked<FollowUpService>;

    prisma = { interview: { findUnique: jest.fn() } };

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AnswersController],
      providers: [
        { provide: AnswersService, useValue: answersService },
        { provide: TranscriptionService, useValue: transcriptionService },
        { provide: FollowUpService, useValue: followUpService },
        { provide: PrismaService, useValue: prisma },
      ],
    })
      .overrideGuard(JwtCookieGuard)
      .useValue(passThroughGuard)
      .overrideGuard(RolesGuard)
      .useValue(passThroughGuard)
      .compile();

    controller = moduleRef.get(AnswersController);
  });

  describe('POST /answer (text/code)', () => {
    it('should delegate to AnswersService.submit with interviewId, questionId, userId, dto (RF-16)', async () => {
      const dto = { answerText: 'Una respuesta', audioUrl: undefined };
      answersService.submit.mockResolvedValue({ id: 100 } as any);
      const req = { user: { userId: 7 } };

      const result = await controller.submit(req, 1, 10, dto as any);

      expect(answersService.submit).toHaveBeenCalledWith(1, 10, 7, dto);
      expect(result).toEqual({ id: 100 });
    });
  });

  describe('POST /audio (RF-17)', () => {
    it('should throw BadRequestException when no file is uploaded', async () => {
      const req = { user: { userId: 7 } };

      await expect(
        controller.submitAudio(req, 1, 10, undefined as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should transcribe the audio, submit the answer with transcription text and return both', async () => {
      prisma.interview.findUnique.mockResolvedValue({
        id: 1,
        language: { name: 'TypeScript' },
      });
      transcriptionService.transcribe.mockResolvedValue('Texto transcrito');
      answersService.submit.mockResolvedValue({ id: 100, answerText: 'Texto transcrito' } as any);
      const file = {
        buffer: Buffer.from([1, 2, 3]),
        originalname: 'recording.webm',
      } as Express.Multer.File;
      const req = { user: { userId: 7 } };

      const result = await controller.submitAudio(req, 1, 10, file);

      expect(transcriptionService.getLanguageCode).toHaveBeenCalledWith('TypeScript');
      expect(transcriptionService.transcribe).toHaveBeenCalledWith(
        file.buffer,
        'recording.webm',
        'es',
      );
      expect(answersService.submit).toHaveBeenCalledWith(1, 10, 7, {
        answerText: 'Texto transcrito',
        audioUrl: 'audio://uploaded',
      });
      expect(result).toMatchObject({
        id: 100,
        transcription: 'Texto transcrito',
      });
    });

    it('should fall back to "audio.webm" filename when originalname is missing', async () => {
      prisma.interview.findUnique.mockResolvedValue({ id: 1, language: null });
      transcriptionService.transcribe.mockResolvedValue('x');
      answersService.submit.mockResolvedValue({ id: 100 } as any);
      const file = { buffer: Buffer.from([1]), originalname: undefined } as unknown as Express.Multer.File;
      const req = { user: { userId: 7 } };

      await controller.submitAudio(req, 1, 10, file);

      const transcribeCall = transcriptionService.transcribe.mock.calls[0];
      expect(transcribeCall[1]).toBe('audio.webm');
    });
  });

  describe('POST /evaluate-now', () => {
    it('should delegate to AnswersService.evaluateNow with interviewId, questionId and userId', async () => {
      answersService.evaluateNow.mockResolvedValue({ id: 500 } as any);
      const req = { user: { userId: 7 } };

      const result = await controller.evaluateNow(req, 1, 10);

      expect(answersService.evaluateNow).toHaveBeenCalledWith(1, 10, 7);
      expect(result).toEqual({ id: 500 });
    });
  });

  describe('POST /followup', () => {
    it('should fetch the question text and ask FollowUpService for a follow-up', async () => {
      answersService.getQuestionText.mockResolvedValue('¿Qué es REST?');
      followUpService.generateFollowUp.mockResolvedValue('¿Puedes ampliar X?');
      const req = { user: { userId: 7 } };

      const result = await controller.followUp(req, 1, 10, { answerText: 'mi respuesta' } as any);

      expect(answersService.getQuestionText).toHaveBeenCalledWith(1, 10, 7);
      expect(followUpService.generateFollowUp).toHaveBeenCalledWith(
        '¿Qué es REST?',
        'mi respuesta',
      );
      expect(result).toEqual({ followUpQuestion: '¿Puedes ampliar X?' });
    });

    it('should return null in the response when the LLM returns no follow-up', async () => {
      answersService.getQuestionText.mockResolvedValue('Q');
      followUpService.generateFollowUp.mockResolvedValue(null);

      const result = await controller.followUp(
        { user: { userId: 7 } },
        1,
        10,
        { answerText: 'r' } as any,
      );

      expect(result).toEqual({ followUpQuestion: null });
    });
  });
});
