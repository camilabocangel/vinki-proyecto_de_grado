import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

const LANGUAGE_CODE_MAP: Record<string, string> = {
  JavaScript: 'es',
  TypeScript: 'es',
  Python: 'es',
  Java: 'es',
  Go: 'es',
  Rust: 'es',
  SQL: 'es',
  HTML: 'es',
  CSS: 'es',
  English: 'en',
};

@Injectable()
export class TranscriptionService {
  private openai: OpenAI;

  constructor(private config: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.config.get<string>('OPENAI_API_KEY', ''),
    });
  }

  async transcribe(
    audioBuffer: Buffer,
    filename: string,
    languageCode?: string,
  ): Promise<string> {
    const uint8 = new Uint8Array(audioBuffer);
    const file = new File([uint8], filename, { type: 'audio/webm' });
    const response = await this.openai.audio.transcriptions.create({
      model: 'whisper-1',
      file,
      language: languageCode || 'es',
    });
    return response.text;
  }

  getLanguageCode(languageName?: string): string {
    if (!languageName) return 'es';
    return LANGUAGE_CODE_MAP[languageName] || 'es';
  }
}
