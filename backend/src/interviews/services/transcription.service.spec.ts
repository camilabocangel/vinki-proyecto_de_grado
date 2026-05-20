// Mock del SDK de OpenAI antes del import del servicio.
const mockAudioTranscriptionsCreate = jest.fn();
jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    audio: { transcriptions: { create: mockAudioTranscriptionsCreate } },
  })),
}));

import { ConfigService } from '@nestjs/config';
import { TranscriptionService } from './transcription.service.js';

function buildService(): TranscriptionService {
  const config = { get: jest.fn().mockReturnValue('fake-key') } as unknown as ConfigService;
  return new TranscriptionService(config);
}

describe('TranscriptionService', () => {
  beforeEach(() => {
    mockAudioTranscriptionsCreate.mockReset();
  });

  describe('transcribe()', () => {
    it('should call OpenAI Whisper-1 with the audio buffer and language code (RF-17)', async () => {
      mockAudioTranscriptionsCreate.mockResolvedValue({ text: 'Hola mundo' });

      const result = await buildService().transcribe(
        Buffer.from([1, 2, 3, 4]),
        'answer.webm',
        'es',
      );

      expect(mockAudioTranscriptionsCreate).toHaveBeenCalledTimes(1);
      const args = mockAudioTranscriptionsCreate.mock.calls[0][0];
      expect(args.model).toBe('whisper-1');
      expect(args.language).toBe('es');
      // El campo `file` se construye como File a partir del Buffer; aquí
      // verificamos que llegó algún archivo con el nombre correcto.
      expect(args.file).toBeDefined();
      expect(args.file.name).toBe('answer.webm');
      expect(result).toBe('Hola mundo');
    });

    it('should default to language "es" when no language code is provided', async () => {
      mockAudioTranscriptionsCreate.mockResolvedValue({ text: '' });

      await buildService().transcribe(Buffer.from([1]), 'a.webm');

      expect(mockAudioTranscriptionsCreate.mock.calls[0][0].language).toBe('es');
    });
  });

  describe('getLanguageCode()', () => {
    it('should return "en" for "English"', () => {
      expect(buildService().getLanguageCode('English')).toBe('en');
    });

    it('should return "es" for known programming languages (TypeScript, Python, etc.)', () => {
      const service = buildService();
      expect(service.getLanguageCode('TypeScript')).toBe('es');
      expect(service.getLanguageCode('Python')).toBe('es');
      expect(service.getLanguageCode('Go')).toBe('es');
    });

    it('should default to "es" for unknown languages or when omitted', () => {
      const service = buildService();
      expect(service.getLanguageCode('Klingon')).toBe('es');
      expect(service.getLanguageCode(undefined)).toBe('es');
    });
  });
});
