import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class TranscriptionService {
  private openai: OpenAI;

  constructor(private config: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.config.get<string>('OPENAI_API_KEY', ''),
    });
  }

  async transcribe(audioBuffer: Buffer, filename: string): Promise<string> {
    const uint8 = new Uint8Array(audioBuffer);
    const file = new File([uint8], filename, { type: 'audio/webm' });
    const response = await this.openai.audio.transcriptions.create({
      model: 'whisper-1',
      file,
      language: 'es',
    });
    return response.text;
  }
}
