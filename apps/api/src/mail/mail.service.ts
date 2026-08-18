import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';
import { passwordResetTemplate } from './mail.templates';
import type { MailDeliveryResult, PasswordResetMail } from './mail.types';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter | null;
  private readonly from: { name: string; address: string } | null;

  constructor(private readonly config: ConfigService) {
    const host = config.get<string>('SMTP_HOST')?.trim();
    const address = config.get<string>('MAIL_FROM_ADDRESS')?.trim();
    this.from = address ? { name: config.get<string>('MAIL_FROM_NAME')?.trim() || 'Orbyto', address } : null;

    if (!host || !this.from) {
      this.transporter = null;
      this.logger.warn('SMTP não configurado. E-mails transacionais não serão enviados.');
      return;
    }

    const user = config.get<string>('SMTP_USER')?.trim();
    const pass = config.get<string>('SMTP_PASS');
    this.transporter = nodemailer.createTransport({
      host,
      port: this.readPort(config.get<string>('SMTP_PORT')),
      secure: this.readBoolean(config.get<string>('SMTP_SECURE')),
      ...(user && pass ? { auth: { user, pass } } : {}),
    });
  }

  async sendPasswordReset(input: PasswordResetMail): Promise<MailDeliveryResult> {
    if (!this.transporter || !this.from) return { sent: false, reason: 'not_configured' };
    const template = passwordResetTemplate(input.name, input.resetUrl, input.expiresInMinutes);
    try {
      await this.transporter.sendMail({ from: this.from, to: input.to, ...template });
      this.logger.log(`E-mail de recuperação enviado para ${this.maskEmail(input.to)}.`);
      return { sent: true };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'erro desconhecido';
      this.logger.error(`Falha ao enviar e-mail de recuperação para ${this.maskEmail(input.to)}: ${message}`);
      return { sent: false, reason: 'delivery_failed' };
    }
  }

  private readPort(value?: string) {
    const port = Number(value ?? 587);
    return Number.isInteger(port) && port > 0 && port <= 65535 ? port : 587;
  }

  private readBoolean(value?: string) {
    return ['true', '1', 'yes'].includes((value ?? '').trim().toLowerCase());
  }

  private maskEmail(email: string) {
    const [local, domain] = email.split('@');
    return `${local.slice(0, 2)}***@${domain ?? 'domínio'}`;
  }
}
