import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import {
  AuditAction,
  NotificationEntity,
  NotificationType,
  ProjectStatus,
  ServiceOrderStatus,
  TaskStatus,
  TenantStatus,
  UserRole,
  UserStatus,
} from '@prisma/client';
import type { AuthUser } from '../auth/auth.types';
import { MailService } from '../mail/mail.service';
import type { DeadlineAlertMailItem } from '../mail/mail.types';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';

type AlertKind = 'serviceOrder' | 'project' | 'task';
type AlertItem = DeadlineAlertMailItem & {
  id: string;
  tenantId: string;
  kindKey: AlertKind;
  entity: NotificationEntity;
  overdue: boolean;
  recipientIds: string[];
};

export interface DeadlineAlertsSummary {
  overdueServiceOrders: number;
  upcomingServiceOrders: number;
  overdueProjects: number;
  upcomingProjects: number;
  overdueTasks: number;
  upcomingTasks: number;
  notificationsCreated: number;
  emailsAttempted: number;
  emailsSent: number;
  emailsFailed: number;
}

@Injectable()
export class DeadlineAlertsService implements OnModuleInit {
  private readonly logger = new Logger(DeadlineAlertsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly settings: SettingsService,
  ) {}

  onModuleInit() {
    const cronTime =
      this.config.get<string>('DEADLINE_ALERTS_CRON')?.trim() || '0 8 * * *';
    const timeZone = this.timezone();
    const job = CronJob.from({
      cronTime,
      timeZone,
      onTick: () => void this.handleDailyCron(),
      start: false,
    });
    this.schedulerRegistry.addCronJob('deadline-alerts', job);
    job.start();
    this.logger.log(`Rotina diária configurada (${cronTime}, ${timeZone}).`);
  }

  async handleDailyCron() {
    if (!this.enabled()) {
      this.logger.debug('Rotina diária de alertas desabilitada.');
      return;
    }
    await this.run();
  }

  async run(actor?: AuthUser): Promise<DeadlineAlertsSummary> {
    const total = this.emptySummary();
    if (actor && this.isDevelopment()) {
      this.logger.debug(
        `Início da rotina manual: executorId=${actor.id}, role=${actor.role}, tenantId=${actor.tenantId}.`,
      );
    }
    const tenants = actor
      ? [{ id: actor.tenantId }]
      : await this.prisma.tenant.findMany({
          where: { status: TenantStatus.ACTIVE },
          select: { id: true },
        });

    for (const tenant of tenants) {
      try {
        this.merge(total, await this.runForTenant(tenant.id, actor?.id));
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : 'erro desconhecido';
        this.logger.error(
          `Falha nos alertas do tenant ${tenant.id}: ${message}`,
        );
        await this.audit(tenant.id, actor?.id, 'DEADLINE_ALERTS_FAILED', {
          reason: message.slice(0, 500),
        });
      }
    }
    if (this.isDevelopment()) {
      this.logger.debug(
        `Fim da rotina${actor ? ' manual' : ' automática'}: tenantId=${actor?.tenantId ?? 'todos-ativos'}, ` +
          `encontrados={osVencidas:${total.overdueServiceOrders},osProximas:${total.upcomingServiceOrders},` +
          `projetosVencidos:${total.overdueProjects},projetosProximos:${total.upcomingProjects},` +
          `tarefasVencidas:${total.overdueTasks},tarefasProximas:${total.upcomingTasks}}, ` +
          `notificacoesCriadas=${total.notificationsCreated}, emailsEnviados=${total.emailsSent}, ` +
          `emailsFalhos=${total.emailsFailed}.`,
      );
    }
    return total;
  }

  private async runForTenant(
    tenantId: string,
    actorId?: string,
  ): Promise<DeadlineAlertsSummary> {
    const summary = this.emptySummary();
    const tenantSettings = await this.settings.getOrCreateSettingsForTenant(tenantId);
    if (!tenantSettings.deadlineAlertsEnabled) {
      this.logger.debug(`Alertas de prazo desabilitados para o tenant ${tenantId}.`);
      return summary;
    }
    const { today, serviceOrderLimit, projectLimit } = this.dateBoundaries();
    const [serviceOrders, projects, tasks, administrators, staffIds] =
      await Promise.all([
        this.prisma.serviceOrder.findMany({
          where: {
            tenantId,
            dueDate: { not: null, lt: serviceOrderLimit },
            status: {
              notIn: [
                ServiceOrderStatus.COMPLETED,
                ServiceOrderStatus.CANCELED,
              ],
            },
          },
          select: {
            id: true,
            title: true,
            dueDate: true,
            requesterId: true,
            responsibleId: true,
          },
        }),
        this.prisma.project.findMany({
          where: {
            tenantId,
            status: {
              notIn: [ProjectStatus.COMPLETED, ProjectStatus.CANCELED],
            },
            OR: [
              { dueDate: { not: null, lt: today }, finishedAt: null },
              { dueDate: { not: null, gte: today, lt: projectLimit } },
            ],
          },
          select: { id: true, title: true, dueDate: true, ownerId: true },
        }),
        this.prisma.task.findMany({
          where: {
            tenantId,
            dueDate: { not: null, lt: serviceOrderLimit },
            status: { notIn: [TaskStatus.DONE, TaskStatus.CANCELED] },
          },
          select: {
            id: true,
            title: true,
            dueDate: true,
            assigneeId: true,
            project: { select: { ownerId: true } },
          },
        }),
        this.prisma.user.findMany({
          where: {
            tenantId,
            status: UserStatus.ACTIVE,
            role: { in: [UserRole.OWNER, UserRole.ADMIN] },
          },
          select: { id: true },
        }),
        this.notifications.serviceOrderStaffRecipientIds(tenantId),
      ]);

    const adminIds = administrators.map(({ id }) => id);
    if (this.isDevelopment()) {
      this.logger.debug(
        `Itens encontrados: tenantId=${tenantId}, ordensServico=${serviceOrders.length}, ` +
          `projetos=${projects.length}, tarefas=${tasks.length}.`,
      );
    }
    const items: AlertItem[] = [];
    for (const item of serviceOrders) {
      const overdue = item.dueDate! < today;
      summary[overdue ? 'overdueServiceOrders' : 'upcomingServiceOrders']++;
      items.push(
        this.item(
          item,
          tenantId,
          'serviceOrder',
          NotificationEntity.SERVICE_ORDER,
          overdue,
          [...staffIds, item.responsibleId, item.requesterId],
        ),
      );
    }
    for (const item of projects) {
      const overdue = item.dueDate! < today;
      summary[overdue ? 'overdueProjects' : 'upcomingProjects']++;
      items.push(
        this.item(
          item,
          tenantId,
          'project',
          NotificationEntity.PROJECT,
          overdue,
          [item.ownerId, ...adminIds],
        ),
      );
    }
    for (const item of tasks) {
      const overdue = item.dueDate! < today;
      summary[overdue ? 'overdueTasks' : 'upcomingTasks']++;
      items.push(
        this.item(item, tenantId, 'task', NotificationEntity.TASK, overdue, [
          item.assigneeId,
          item.project.ownerId,
        ]),
      );
    }

    const candidateIds = [
      ...new Set(items.flatMap((item) => item.recipientIds)),
    ];
    const recipients = await this.notifications.activeRecipients(
      tenantId,
      candidateIds,
    );
    const activeIds = new Set(recipients.map(({ id }) => id));
    const itemsByUser = new Map<string, AlertItem[]>();
    for (const item of items) {
      for (const userId of item.recipientIds) {
        if (!activeIds.has(userId)) continue;
        const current = itemsByUser.get(userId) ?? [];
        current.push(item);
        itemsByUser.set(userId, current);
      }
    }

    for (const recipient of recipients) {
      const userItems = itemsByUser.get(recipient.id) ?? [];
      const newlyCreated: AlertItem[] = [];
      for (const item of userItems) {
        const exists = await this.prisma.notification.findFirst({
          where: {
            tenantId,
            userId: recipient.id,
            entity: item.entity,
            entityId: item.id,
            type: NotificationType.WARNING,
            createdAt: { gte: today },
          },
          select: { id: true },
        });
        if (exists) continue;
        await this.notifications.createForUser({
          tenantId,
          userId: recipient.id,
          title: item.overdue
            ? 'Item com prazo vencido'
            : 'Item próximo do prazo',
          message: `${item.kind}: ${item.title} — prazo ${item.dueDate}.`,
          type: NotificationType.WARNING,
          entity: item.entity,
          entityId: item.id,
        });
        newlyCreated.push(item);
        summary.notificationsCreated++;
      }
      if (!newlyCreated.length) continue;
      summary.emailsAttempted++;
      const delivery = await this.mail.sendDeadlineAlertSummaryEmail({
        tenantId,
        to: recipient.email,
        recipientName: recipient.name,
        overdue: newlyCreated.filter((item) => item.overdue),
        upcoming: newlyCreated.filter((item) => !item.overdue),
      });
      if (delivery.sent) summary.emailsSent++;
      else {
        summary.emailsFailed++;
        await this.audit(tenantId, actorId, 'DEADLINE_ALERTS_FAILED', {
          stage: 'email',
          recipientId: recipient.id,
          reason: delivery.reason,
        });
      }
    }

    await this.audit(tenantId, actorId, 'DEADLINE_ALERTS_RUN', summary);
    return summary;
  }

  private item(
    value: { id: string; title: string; dueDate: Date | null },
    tenantId: string,
    kindKey: AlertKind,
    entity: NotificationEntity,
    overdue: boolean,
    recipientIds: Array<string | null>,
  ): AlertItem {
    const routes = {
      serviceOrder: 'service-orders',
      project: 'projects',
      task: 'tasks',
    };
    const labels = {
      serviceOrder: 'Ordem de serviço',
      project: 'Projeto',
      task: 'Tarefa',
    } as const;
    return {
      id: value.id,
      tenantId,
      title: value.title,
      kindKey,
      kind: labels[kindKey],
      entity,
      overdue,
      dueDate: this.mail.formatDate(value.dueDate),
      url: this.mail.webUrl(
        kindKey === 'task' ? '/tasks' : `/${routes[kindKey]}/${value.id}`,
      ),
      recipientIds: [
        ...new Set(recipientIds.filter((id): id is string => Boolean(id))),
      ],
    };
  }

  private dateBoundaries() {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: this.timezone(),
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const [year, month, day] = formatter
      .format(new Date())
      .split('-')
      .map(Number);
    const today = new Date(Date.UTC(year, month - 1, day));
    const addDays = (days: number) =>
      new Date(today.getTime() + days * 86_400_000);
    return {
      today,
      serviceOrderLimit: addDays(4),
      projectLimit: addDays(8),
    };
  }

  private audit(
    tenantId: string,
    userId: string | undefined,
    operation: 'DEADLINE_ALERTS_RUN' | 'DEADLINE_ALERTS_FAILED',
    metadata: object,
  ) {
    return this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: AuditAction.UPDATE,
        entity: 'DeadlineAlerts',
        metadata: { operation, ...metadata },
      },
    });
  }

  private enabled() {
    return ['true', '1', 'yes'].includes(
      (this.config.get<string>('DEADLINE_ALERTS_ENABLED') ?? 'true')
        .trim()
        .toLowerCase(),
    );
  }

  private isDevelopment() {
    return (
      (this.config.get<string>('NODE_ENV') ?? 'development') === 'development'
    );
  }

  private timezone() {
    return (
      this.config.get<string>('DEADLINE_ALERTS_TIMEZONE')?.trim() ||
      'America/Sao_Paulo'
    );
  }

  private emptySummary(): DeadlineAlertsSummary {
    return {
      overdueServiceOrders: 0,
      upcomingServiceOrders: 0,
      overdueProjects: 0,
      upcomingProjects: 0,
      overdueTasks: 0,
      upcomingTasks: 0,
      notificationsCreated: 0,
      emailsAttempted: 0,
      emailsSent: 0,
      emailsFailed: 0,
    };
  }

  private merge(target: DeadlineAlertsSummary, source: DeadlineAlertsSummary) {
    for (const key of Object.keys(target) as Array<keyof DeadlineAlertsSummary>)
      target[key] += source[key];
  }
}
