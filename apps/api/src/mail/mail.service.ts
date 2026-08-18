import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';
import { AuditAction } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  operationalTemplate,
  passwordResetTemplate,
  userInvitationTemplate,
} from './mail.templates';
import type {
  MailDeliveryResult,
  OperationalAuditContext,
  OperationalMailBase,
  PasswordResetMail,
  UserInvitationMail,
} from './mail.types';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter | null;
  private readonly from: { name: string; address: string } | null;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const host = config.get<string>('SMTP_HOST')?.trim();
    const address = config.get<string>('MAIL_FROM_ADDRESS')?.trim();
    this.from = address
      ? {
          name: config.get<string>('MAIL_FROM_NAME')?.trim() || 'Orbyto',
          address,
        }
      : null;

    if (!host || !this.from) {
      this.transporter = null;
      this.logger.warn(
        'SMTP não configurado. E-mails transacionais não serão enviados.',
      );
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

  async sendPasswordReset(
    input: PasswordResetMail,
  ): Promise<MailDeliveryResult> {
    if (!this.transporter || !this.from)
      return { sent: false, reason: 'not_configured' };
    const template = passwordResetTemplate(
      input.name,
      input.resetUrl,
      input.expiresInMinutes,
    );
    try {
      await this.transporter.sendMail({
        from: this.from,
        to: input.to,
        ...template,
      });
      this.logger.log(
        `E-mail de recuperação enviado para ${this.maskEmail(input.to)}.`,
      );
      return { sent: true };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'erro desconhecido';
      this.logger.error(
        `Falha ao enviar e-mail de recuperação para ${this.maskEmail(input.to)}: ${message}`,
      );
      return { sent: false, reason: 'delivery_failed' };
    }
  }

  async sendUserInvitation(
    input: UserInvitationMail,
  ): Promise<MailDeliveryResult> {
    if (!this.transporter || !this.from)
      return { sent: false, reason: 'not_configured' };
    const template = userInvitationTemplate(
      input.name,
      input.inviteUrl,
      input.expiresInHours,
    );
    try {
      await this.transporter.sendMail({
        from: this.from,
        to: input.to,
        ...template,
      });
      this.logger.log(
        `Convite de usuário enviado para ${this.maskEmail(input.to)}.`,
      );
      return { sent: true };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'erro desconhecido';
      this.logger.error(
        `Falha ao enviar convite para ${this.maskEmail(input.to)}: ${message}`,
      );
      return { sent: false, reason: 'delivery_failed' };
    }
  }

  sendServiceOrderCreatedEmail(input: OperationalMailBase) {
    return this.sendOperational(
      input,
      'Nova ordem de serviço aberta — Orbyto',
      'Nova ordem de serviço aberta',
      'service-order',
    );
  }
  sendServiceOrderUpdatedEmail(
    input: OperationalMailBase,
    statusChanged = false,
  ) {
    return this.sendOperational(
      input,
      statusChanged
        ? 'Status da sua ordem de serviço foi alterado — Orbyto'
        : 'Sua ordem de serviço foi atualizada — Orbyto',
      statusChanged
        ? 'Status da sua ordem de serviço foi alterado'
        : 'Sua ordem de serviço foi atualizada',
      'service-order',
    );
  }
  sendServiceOrderCommentEmail(input: OperationalMailBase) {
    return this.sendOperational(
      input,
      'Novo comentário em ordem de serviço — Orbyto',
      'Novo comentário em ordem de serviço',
      'service-order',
    );
  }
  sendServiceOrderAttachmentEmail(input: OperationalMailBase) {
    return this.sendOperational(
      input,
      'Novo anexo em ordem de serviço — Orbyto',
      'Novo anexo em ordem de serviço',
      'service-order',
    );
  }
  sendTaskAssignedEmail(input: OperationalMailBase) {
    return this.sendOperational(
      input,
      'Nova tarefa atribuída a você — Orbyto',
      'Nova tarefa atribuída a você',
      'task',
    );
  }
  sendTaskUpdatedEmail(
    input: OperationalMailBase,
    kind: 'status' | 'deadline',
  ) {
    return this.sendOperational(
      input,
      kind === 'deadline'
        ? 'Prazo de tarefa atualizado — Orbyto'
        : 'Status de tarefa atualizado — Orbyto',
      kind === 'deadline'
        ? 'Prazo de tarefa atualizado'
        : 'Status de tarefa atualizado',
      'task',
    );
  }
  sendProjectCreatedEmail(input: OperationalMailBase) {
    return this.sendOperational(
      input,
      'Novo projeto sob sua responsabilidade — Orbyto',
      'Novo projeto sob sua responsabilidade',
      'project',
    );
  }
  sendProjectUpdatedEmail(input: OperationalMailBase, deadlineChanged = false) {
    return this.sendOperational(
      input,
      deadlineChanged
        ? 'Prazo de projeto atualizado — Orbyto'
        : 'Projeto atualizado — Orbyto',
      deadlineChanged ? 'Prazo de projeto atualizado' : 'Projeto atualizado',
      'project',
    );
  }

  // Preparados para uma futura rotina diária; esta tarefa não agenda execuções.
  sendServiceOrderDeadlineAlertEmail(input: OperationalMailBase) {
    return this.sendOperational(
      input,
      'Alerta de prazo de ordem de serviço — Orbyto',
      'Alerta de prazo de ordem de serviço',
      'deadline',
    );
  }
  sendTaskDeadlineAlertEmail(input: OperationalMailBase) {
    return this.sendOperational(
      input,
      'Alerta de prazo de tarefa — Orbyto',
      'Alerta de prazo de tarefa',
      'deadline',
    );
  }
  sendProjectDeadlineAlertEmail(input: OperationalMailBase) {
    return this.sendOperational(
      input,
      'Alerta de prazo de projeto — Orbyto',
      'Alerta de prazo de projeto',
      'deadline',
    );
  }

  formatDate(value: Date | string | null | undefined) {
    if (!value) return 'Não informado';
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime())
      ? 'Não informado'
      : new Intl.DateTimeFormat('pt-BR', {
          timeZone: 'America/Sao_Paulo',
          dateStyle: 'short',
        }).format(date);
  }

  formatEnum(value: string | null | undefined) {
    if (!value) return 'Não informado';
    const labels: Record<string, string> = {
      LOW: 'Baixa',
      MEDIUM: 'Média',
      HIGH: 'Alta',
      CRITICAL: 'Crítica',
      OPEN: 'Aberta',
      IN_REVIEW: 'Em análise',
      IN_PROGRESS: 'Em andamento',
      WAITING_REQUESTER: 'Aguardando solicitante',
      COMPLETED: 'Concluída',
      CANCELED: 'Cancelada',
      PLANNED: 'Planejada',
      TODO: 'A fazer',
      DOING: 'Em execução',
      DONE: 'Concluída',
      PAUSED: 'Pausado',
    };
    return (
      labels[value] ?? value.replaceAll('_', ' ').toLocaleLowerCase('pt-BR')
    );
  }

  webUrl(path: string) {
    const base = (
      this.config.get<string>('APP_WEB_URL') ??
      this.config.get<string>('WEB_URL') ??
      'http://localhost:3000'
    ).replace(/\/$/, '');
    return `${base}${path.startsWith('/') ? path : `/${path}`}`;
  }

  async auditOperationalDelivery(
    context: OperationalAuditContext,
    delivery: MailDeliveryResult,
  ) {
    if (!delivery.sent && delivery.reason === 'disabled') return;
    await this.prisma.auditLog
      .create({
        data: {
          tenantId: context.tenantId,
          userId: context.actorId,
          action: AuditAction.UPDATE,
          entity: context.entity,
          entityId: context.entityId,
          metadata: {
            operation: delivery.sent
              ? 'OPERATIONAL_EMAIL_SENT'
              : 'OPERATIONAL_EMAIL_FAILED',
            event: context.event,
            recipient: this.maskEmail(context.recipient),
            ...(delivery.sent ? {} : { reason: delivery.reason }),
          },
        },
      })
      .catch((error: unknown) =>
        this.logger.error(
          `Falha ao auditar e-mail operacional: ${error instanceof Error ? error.message : 'erro desconhecido'}`,
        ),
      );
  }

  private async sendOperational(
    input: OperationalMailBase,
    subject: string,
    heading: string,
    category: 'service-order' | 'task' | 'project' | 'deadline',
  ): Promise<MailDeliveryResult> {
    if (!this.operationalEnabled(category))
      return { sent: false, reason: 'disabled' };
    if (!this.transporter || !this.from)
      return { sent: false, reason: 'not_configured' };
    try {
      await this.transporter.sendMail({
        from: this.from,
        to: input.to,
        ...operationalTemplate(
          subject,
          heading,
          input.recipientName,
          [{ label: 'Título', value: input.title }, ...input.fields],
          input.url,
        ),
      });
      this.logger.log(
        `E-mail operacional enviado para ${this.maskEmail(input.to)}.`,
      );
      return { sent: true };
    } catch (error: unknown) {
      this.logger.error(
        `Falha ao enviar e-mail operacional para ${this.maskEmail(input.to)}: ${error instanceof Error ? error.message : 'erro desconhecido'}`,
      );
      return { sent: false, reason: 'delivery_failed' };
    }
  }

  private operationalEnabled(
    category: 'service-order' | 'task' | 'project' | 'deadline',
  ) {
    if (
      !this.readBoolean(
        this.config.get<string>('MAIL_OPERATIONAL_NOTIFICATIONS_ENABLED'),
      )
    )
      return false;
    const key = {
      'service-order': 'MAIL_SERVICE_ORDER_NOTIFICATIONS_ENABLED',
      task: 'MAIL_TASK_NOTIFICATIONS_ENABLED',
      project: 'MAIL_PROJECT_NOTIFICATIONS_ENABLED',
      deadline: 'MAIL_DEADLINE_ALERTS_ENABLED',
    }[category];
    const scoped = this.config.get<string>(key);
    return (
      scoped === undefined || scoped.trim() === '' || this.readBoolean(scoped)
    );
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
