import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditAction,
  NotificationEntity,
  NotificationType,
  Prisma,
  Priority,
  ServiceOrderStatus,
  UserRole,
} from '@prisma/client';
import type { AuthUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MailService } from '../mail/mail.service';
import { getDeadlineInfo } from '../common/deadline';
import { CreateServiceOrderDto } from './dto/create-service-order.dto';
import { ListServiceOrdersQueryDto } from './dto/list-service-orders-query.dto';
import { UpdateServiceOrderDto } from './dto/update-service-order.dto';
import { SettingsService } from '../settings/settings.service';

const serviceOrderInclude = {
  requester: { select: { id: true, name: true, email: true } },
  responsible: { select: { id: true, name: true, email: true } },
} satisfies Prisma.ServiceOrderInclude;

const administrativeRoles: UserRole[] = [
  UserRole.OWNER,
  UserRole.ADMIN,
  UserRole.MANAGER,
];

@Injectable()
export class ServiceOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly mail: MailService,
    private readonly settings: SettingsService,
  ) {}

  async create(user: AuthUser, dto: CreateServiceOrderDto) {
    const tenantSettings = await this.settings.getOrCreateSettingsForTenant(user.tenantId);
    const dueDate = dto.dueDate ?? this.defaultDueDate(tenantSettings.defaultServiceOrderDeadlineDays);
    const recipients =
      user.role === UserRole.REQUESTER
        ? await this.notifications.serviceOrderStaffRecipientIds(
            user.tenantId,
            user.id,
          )
        : [];
    const created = await this.prisma.$transaction(async (transaction) => {
      const created = await transaction.serviceOrder.create({
        data: {
          ...dto,
          tenantId: user.tenantId,
          requesterId: user.id,
          status: ServiceOrderStatus.OPEN,
          priority: dto.priority ?? Priority.MEDIUM,
          dueDate,
        },
        include: serviceOrderInclude,
      });
      await transaction.auditLog.create({
        data: {
          tenantId: user.tenantId,
          userId: user.id,
          action: AuditAction.CREATE,
          entity: 'ServiceOrder',
          entityId: created.id,
          metadata: {
            title: created.title,
            status: created.status,
            priority: created.priority,
          },
        },
      });
      await this.notifications.createForUsers(
        recipients,
        {
          tenantId: user.tenantId,
          title: 'Nova ordem de serviço aberta',
          message: `${user.name} abriu a ordem de serviço “${created.title}”.`,
          type: NotificationType.ACTION_REQUIRED,
          entity: NotificationEntity.SERVICE_ORDER,
          entityId: created.id,
        },
        transaction,
      );
      const deadline = getDeadlineInfo(
        created.dueDate,
        created.status,
        ['COMPLETED', 'CANCELED'],
        3,
      );
      if (
        deadline.deadlineStatus === 'overdue' ||
        deadline.deadlineStatus === 'dueSoon'
      ) {
        await this.notifications.createForUsers(
          [...new Set([user.id, ...recipients])],
          {
            tenantId: user.tenantId,
            title:
              deadline.deadlineStatus === 'overdue'
                ? 'Ordem de serviço salva com prazo vencido'
                : 'Ordem de serviço próxima do prazo',
            message: `A ordem de serviço “${created.title}” requer atenção ao prazo.`,
            type: NotificationType.WARNING,
            entity: NotificationEntity.SERVICE_ORDER,
            entityId: created.id,
          },
          transaction,
        );
      }
      return created;
    });
    if (recipients.length)
      await this.emailStaff(
        user,
        created,
        recipients,
        'SERVICE_ORDER_CREATED',
      ).catch(() => undefined);
    return created;
  }

  private defaultDueDate(days: number | null) { return days ? new Date(Date.now() + days * 86_400_000) : undefined; }

  findMy(user: AuthUser, query: ListServiceOrdersQueryDto) {
    return this.prisma.serviceOrder.findMany({
      where: this.buildWhere(query, {
        tenantId: user.tenantId,
        requesterId: user.id,
      }),
      include: serviceOrderInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findMyOne(user: AuthUser, id: string) {
    const serviceOrder = await this.prisma.serviceOrder.findFirst({
      where: {
        id,
        tenantId: user.tenantId,
        requesterId: user.id,
      },
      include: serviceOrderInclude,
    });

    if (!serviceOrder) {
      throw new NotFoundException('Ordem de serviço não encontrada.');
    }

    return serviceOrder;
  }

  findAll(tenantId: string, query: ListServiceOrdersQueryDto) {
    return this.prisma.serviceOrder.findMany({
      where: this.buildWhere(query, { tenantId }),
      include: serviceOrderInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(user: AuthUser, id: string) {
    const serviceOrder = await this.prisma.serviceOrder.findFirst({
      where: { id, tenantId: user.tenantId },
      include: serviceOrderInclude,
    });

    if (!serviceOrder) {
      throw new NotFoundException('Ordem de serviço não encontrada.');
    }

    const canView =
      administrativeRoles.includes(user.role) ||
      user.role === UserRole.VIEWER ||
      (user.role === UserRole.REQUESTER &&
        serviceOrder.requesterId === user.id) ||
      (user.role === UserRole.MEMBER &&
        (serviceOrder.requesterId === user.id ||
          serviceOrder.responsibleId === user.id));

    if (!canView) {
      throw new ForbiddenException(
        'Você não pode visualizar esta ordem de serviço.',
      );
    }

    return serviceOrder;
  }

  async update(user: AuthUser, id: string, dto: UpdateServiceOrderDto) {
    const current = await this.prisma.serviceOrder.findFirst({
      where: { id, tenantId: user.tenantId },
    });

    if (!current) {
      throw new NotFoundException('Ordem de serviço não encontrada.');
    }

    if (dto.responsibleId) {
      const responsible = await this.prisma.user.findFirst({
        where: { id: dto.responsibleId, tenantId: user.tenantId },
        select: { id: true },
      });

      if (!responsible) {
        throw new NotFoundException(
          'Responsável não encontrado neste ambiente.',
        );
      }
    }

    const statusChanged =
      dto.status !== undefined && dto.status !== current.status;
    const data: Prisma.ServiceOrderUpdateInput = { ...dto };

    if (dto.status === ServiceOrderStatus.COMPLETED && !current.finishedAt) {
      data.finishedAt = new Date();
    } else if (
      statusChanged &&
      current.status === ServiceOrderStatus.COMPLETED
    ) {
      data.finishedAt = null;
    }

    const updated = await this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.serviceOrder.update({
        where: { id: current.id },
        data,
        include: serviceOrderInclude,
      });

      await transaction.auditLog.create({
        data: {
          tenantId: user.tenantId,
          userId: user.id,
          action: statusChanged
            ? AuditAction.STATUS_CHANGE
            : AuditAction.UPDATE,
          entity: 'ServiceOrder',
          entityId: current.id,
          metadata: statusChanged
            ? { previousStatus: current.status, newStatus: dto.status }
            : { updatedFields: Object.keys(dto) },
        },
      });

      if (current.requesterId !== user.id) {
        await this.notifications.createForUser(
          {
            tenantId: user.tenantId,
            userId: current.requesterId,
            title: statusChanged
              ? 'Status da ordem de serviço alterado'
              : 'Ordem de serviço atualizada',
            message: statusChanged
              ? `A ordem de serviço “${current.title}” mudou de ${current.status} para ${dto.status}.`
              : `A ordem de serviço “${current.title}” recebeu uma atualização.`,
            type: statusChanged
              ? NotificationType.ACTION_REQUIRED
              : NotificationType.INFO,
            entity: NotificationEntity.SERVICE_ORDER,
            entityId: current.id,
          },
          transaction,
        );
      }

      const dueDateChanged =
        dto.dueDate !== undefined &&
        updated.dueDate?.getTime() !== current.dueDate?.getTime();
      const deadline = getDeadlineInfo(
        updated.dueDate,
        updated.status,
        ['COMPLETED', 'CANCELED'],
        3,
      );
      if (
        dueDateChanged &&
        (deadline.deadlineStatus === 'overdue' ||
          deadline.deadlineStatus === 'dueSoon')
      ) {
        await this.notifications.createForUsers(
          [
            ...new Set([
              user.id,
              current.requesterId,
              ...(updated.responsibleId ? [updated.responsibleId] : []),
            ]),
          ],
          {
            tenantId: user.tenantId,
            title:
              deadline.deadlineStatus === 'overdue'
                ? 'Prazo vencido na ordem de serviço'
                : 'Ordem de serviço próxima do prazo',
            message: `O prazo da ordem de serviço “${updated.title}” requer atenção.`,
            type: NotificationType.WARNING,
            entity: NotificationEntity.SERVICE_ORDER,
            entityId: updated.id,
          },
          transaction,
        );
      }

      return updated;
    });
    if (current.requesterId !== user.id) {
      const [recipient] = await this.notifications
        .activeRecipients(user.tenantId, [current.requesterId])
        .catch(() => []);
      if (recipient) {
        const delivery = await this.mail.sendServiceOrderUpdatedEmail(
          {
            tenantId: user.tenantId,
            to: recipient.email,
            recipientName: recipient.name,
            title: updated.title,
            url: this.mail.webUrl(`/requester/service-orders/${updated.id}`),
            fields: statusChanged
              ? [
                  {
                    label: 'Status anterior',
                    value: this.mail.formatEnum(current.status),
                  },
                  {
                    label: 'Novo status',
                    value: this.mail.formatEnum(updated.status),
                  },
                ]
              : [
                  {
                    label: 'Status',
                    value: this.mail.formatEnum(updated.status),
                  },
                  {
                    label: 'Prioridade',
                    value: this.mail.formatEnum(updated.priority),
                  },
                  {
                    label: 'Prazo',
                    value: this.mail.formatDate(updated.dueDate),
                  },
                ],
          },
          statusChanged,
        );
        await this.mail.auditOperationalDelivery(
          {
            tenantId: user.tenantId,
            actorId: user.id,
            entity: 'ServiceOrder',
            entityId: updated.id,
            event: statusChanged
              ? 'SERVICE_ORDER_STATUS_CHANGED'
              : 'SERVICE_ORDER_UPDATED',
            recipient: recipient.email,
          },
          delivery,
        );
      }
    }
    return updated;
  }

  private async emailStaff(
    user: AuthUser,
    serviceOrder: Prisma.ServiceOrderGetPayload<{
      include: typeof serviceOrderInclude;
    }>,
    ids: string[],
    event: string,
  ) {
    const recipients = await this.notifications.activeRecipients(
      user.tenantId,
      ids,
    );
    for (const recipient of recipients) {
      const delivery = await this.mail.sendServiceOrderCreatedEmail({
        tenantId: user.tenantId,
        to: recipient.email,
        recipientName: recipient.name,
        title: serviceOrder.title,
        url: this.mail.webUrl(`/service-orders/${serviceOrder.id}`),
        fields: [
          { label: 'Solicitante', value: serviceOrder.requester.name },
          { label: 'Unidade', value: serviceOrder.unit },
          {
            label: 'Prioridade',
            value: this.mail.formatEnum(serviceOrder.priority),
          },
          { label: 'Prazo', value: this.mail.formatDate(serviceOrder.dueDate) },
        ],
      });
      await this.mail.auditOperationalDelivery(
        {
          tenantId: user.tenantId,
          actorId: user.id,
          entity: 'ServiceOrder',
          entityId: serviceOrder.id,
          event,
          recipient: recipient.email,
        },
        delivery,
      );
    }
  }

  private buildWhere(
    query: ListServiceOrdersQueryDto,
    required: Prisma.ServiceOrderWhereInput,
  ): Prisma.ServiceOrderWhereInput {
    const text = query.text?.trim();

    return {
      ...required,
      status: query.status,
      priority: query.priority,
      requesterId: required.requesterId ?? query.requesterId,
      responsibleId: query.responsibleId,
      system: query.system,
      ...(text
        ? {
            OR: [
              { title: { contains: text, mode: 'insensitive' } },
              { description: { contains: text, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
  }
}
