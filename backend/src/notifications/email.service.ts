import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private config: ConfigService) {
    const host = this.config.get<string>('SMTP_HOST', '');
    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: this.config.get<number>('SMTP_PORT', 587),
        secure: this.config.get<number>('SMTP_PORT', 587) === 465,
        auth: {
          user: this.config.get<string>('SMTP_USER', ''),
          pass: this.config.get<string>('SMTP_PASS', ''),
        },
      });
    } else {
      this.logger.warn('SMTP not configured — email notifications disabled');
    }
  }

  async sendEvaluationComplete(to: string, userName: string, interviewId: number) {
    if (!this.transporter) {
      this.logger.debug(`Email skipped (no SMTP): evaluation complete for ${to}`);
      return;
    }

    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:5174');

    try {
      await this.transporter.sendMail({
        from: '"Vinki" <noreply@vinki.app>',
        to,
        subject: 'Tu evaluación está lista - Vinki',
        html: `
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
        `,
      });
      this.logger.log(`Evaluation email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}`, (error as Error).message);
    }
  }
}
