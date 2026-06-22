import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, gmail_v1 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private gmail: gmail_v1.Gmail | null = null;
  private senderEmail = '';

  constructor(private config: ConfigService) {
    const clientId = this.config.get<string>('GMAIL_CLIENT_ID', '');
    const clientSecret = this.config.get<string>('GMAIL_CLIENT_SECRET', '');
    const refreshToken = this.config.get<string>('GMAIL_REFRESH_TOKEN', '');
    this.senderEmail = this.config.get<string>('GMAIL_SENDER_EMAIL', '');

    if (!clientId || !clientSecret || !refreshToken || !this.senderEmail) {
      this.logger.warn(
        'Gmail API not configured — email notifications disabled',
      );
      return;
    }

    const oauth2Client = new OAuth2Client(
      clientId,
      clientSecret,
      'https://developers.google.com/oauthplayground',
    );
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    this.gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  }

  async sendEvaluationComplete(to: string, userName: string, interviewId: number) {
    if (!this.gmail) {
      this.logger.debug(`Email skipped (no Gmail API): evaluation complete for ${to}`);
      return;
    }

    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:5174');
    const subject = 'Tu evaluación está lista - Vinki';
    const html = `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; width: 48px; height: 48px; border-radius: 12px; background: linear-gradient(135deg, #7C3AED, #6D28D9); color: #fff; font-size: 24px; font-weight: 700; line-height: 48px;">V</div>
        </div>
        <h2 style="color: #111827; text-align: center;">¡Hola, ${userName}!</h2>
        <p style="color: #6B7280; text-align: center; font-size: 16px;">
          Tu evaluación de entrevista ha sido completada por nuestra IA.
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${frontendUrl}/feedback/${interviewId}"
             style="display: inline-block; padding: 12px 32px; background: #7C3AED; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">
            Ver mi reporte
          </a>
        </div>
        <p style="color: #9CA3AF; font-size: 12px; text-align: center;">
          Este es un correo automático de Vinki. No respondas a este mensaje.
        </p>
      </div>
    `;

    try {
      await this.sendWithRetry(to, subject, html);
      this.logger.log(`Evaluation email sent to ${to}`);
    } catch (error) {
      this.logger.error(
        `Failed to send email to ${to}`,
        (error as Error).message,
      );
    }
  }

  private async sendWithRetry(
    to: string,
    subject: string,
    html: string,
    maxAttempts = 3,
  ): Promise<void> {
    const raw = this.buildRawMessage(to, subject, html);
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await this.gmail!.users.messages.send({
          userId: 'me',
          requestBody: { raw },
        });
        return;
      } catch (err: unknown) {
        lastError = err;
        const status = this.extractStatus(err);

        // Errores de autenticación/permisos/payload — no reintentar.
        if (status === 400 || status === 401 || status === 403) {
          throw err;
        }

        if (attempt < maxAttempts) {
          const backoffMs = 2 ** (attempt - 1) * 500;
          this.logger.warn(
            `Gmail send failed (attempt ${attempt}/${maxAttempts}, status=${status ?? 'unknown'}). Retrying in ${backoffMs}ms.`,
          );
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
        }
      }
    }

    throw lastError;
  }

  private buildRawMessage(to: string, subject: string, html: string): string {
    const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
    const message = [
      `From: "Vinki" <${this.senderEmail}>`,
      `To: ${to}`,
      `Subject: ${utf8Subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      '',
      html,
    ].join('\r\n');

    return Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  private extractStatus(err: unknown): number | undefined {
    if (typeof err !== 'object' || err === null) return undefined;
    const e = err as { code?: number; response?: { status?: number } };
    return e.code ?? e.response?.status;
  }
}
