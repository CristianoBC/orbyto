import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditAction,
  NotificationEntity,
  NotificationType,
  Prisma,
  RefType,
  PermissionModule,
  UserRole,
} from '@prisma/client';
import type { AuthUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MailService } from '../mail/mail.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { PermissionsService } from '../permissions/permissions.service';

const commentInclude = {
  author: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      avatarUrl: true,
    },
  },
} satisfies Prisma.CommentInclude;

const administrativeRoles: UserRole[] = [
  UserRole.OWNER,
  UserRole.ADMIN,
  UserRole.MANAGER,
];

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly mail: MailService,
    private readonly permissions: PermissionsService,
  ) {}

  async create(user: AuthUser, dto: CreateCommentDto) {
    if (user.role === UserRole.VIEWER) {
      throw new ForbiddenException(
        'O perfil Visualizador não pode adicionar comentários.',
      );
    }
    if (dto.refType === RefType.PROJECT) return this.createForProject(user, dto.refId, dto.text);
    if (dto.refType === RefType.TASK) return this.createForTask(user, dto.refId, dto.text);
    if (dto.refType !== RefType.SERVICE_ORDER) throw new BadRequestException(`Comentários para o tipo ${dto.refType} ainda não estão implementados.`);

    const serviceOrder = await this.validateServiceOrderAccess(
      user,
      dto.refId,
      'comentar',
    );
    const recipients =
      user.id === serviceOrder.requesterId
        ? await this.notifications.serviceOrderStaffRecipientIds(
            user.tenantId,
            user.id,
          )
        : [serviceOrder.requesterId].filter((id) => id !== user.id);

    const comment = await this.prisma.$transaction(async (transaction) => {
      const comment = await transaction.comment.create({
        data: {
          tenantId: user.tenantId,
          authorId: user.id,
          refType: dto.refType,
          refId: dto.refId,
          serviceOrderId: dto.refId,
          text: dto.text,
        },
        include: commentInclude,
      });

      await transaction.auditLog.create({
        data: {
          tenantId: user.tenantId,
          userId: user.id,
          action: AuditAction.COMMENT,
          entity: 'ServiceOrder',
          entityId: dto.refId,
          metadata: { commentId: comment.id },
        },
      });

      await this.notifications.createForUsers(
        recipients,
        {
          tenantId: user.tenantId,
          title: 'Novo comentário na ordem de serviço',
          message: `${user.name} comentou na ordem de serviço.`,
          type: NotificationType.INFO,
          entity: NotificationEntity.SERVICE_ORDER,
          entityId: dto.refId,
        },
        transaction,
      );

      return comment;
    });
    await this.emailRecipients(
      user,
      serviceOrder,
      recipients,
      'SERVICE_ORDER_COMMENT',
    ).catch(() => undefined);
    return comment;
  }

  async findByServiceOrder(user: AuthUser, serviceOrderId: string) {
    await this.validateServiceOrderAccess(user, serviceOrderId, 'visualizar');

    return this.prisma.comment.findMany({
      where: {
        tenantId: user.tenantId,
        refType: RefType.SERVICE_ORDER,
        refId: serviceOrderId,
      },
      include: commentInclude,
      orderBy: { createdAt: 'asc' },
    });
  }

  async findByProject(user: AuthUser, projectId: string) {
    await this.validateProjectAccess(user, projectId, false);
    return this.prisma.comment.findMany({ where: { tenantId: user.tenantId, refType: RefType.PROJECT, refId: projectId, projectId }, include: commentInclude, orderBy: { createdAt: 'asc' } });
  }

  async findByTask(user: AuthUser, taskId: string) {
    await this.validateTaskAccess(user, taskId, false);
    return this.prisma.comment.findMany({ where: { tenantId: user.tenantId, refType: RefType.TASK, refId: taskId, taskId }, include: commentInclude, orderBy: { createdAt: 'asc' } });
  }

  private async createForProject(user: AuthUser, projectId: string, text: string) {
    const project = await this.validateProjectAccess(user, projectId, true);
    const recipients = [project.ownerId].filter((id) => id !== user.id);
    return this.prisma.$transaction(async (tx) => {
      const comment = await tx.comment.create({ data: { tenantId: user.tenantId, authorId: user.id, refType: RefType.PROJECT, refId: projectId, projectId, text: text.trim() }, include: commentInclude });
      await tx.auditLog.create({ data: { tenantId: user.tenantId, userId: user.id, action: AuditAction.COMMENT, entity: 'Project', entityId: projectId, metadata: { event: 'PROJECT_COMMENT_CREATED', commentId: comment.id } } });
      await this.notifications.createForUsers(recipients, { tenantId: user.tenantId, title: 'Novo comentário no projeto', message: `${user.name} comentou no projeto “${project.title}”.`, type: NotificationType.INFO, entity: NotificationEntity.PROJECT, entityId: projectId }, tx);
      return comment;
    });
  }

  private async createForTask(user: AuthUser, taskId: string, text: string) {
    const task = await this.validateTaskAccess(user, taskId, true);
    const recipients = [task.assigneeId, task.project.ownerId].filter((id): id is string => Boolean(id) && id !== user.id);
    return this.prisma.$transaction(async (tx) => {
      const comment = await tx.comment.create({ data: { tenantId: user.tenantId, authorId: user.id, refType: RefType.TASK, refId: taskId, taskId, text: text.trim() }, include: commentInclude });
      await tx.auditLog.create({ data: { tenantId: user.tenantId, userId: user.id, action: AuditAction.COMMENT, entity: 'Task', entityId: taskId, metadata: { event: 'TASK_COMMENT_CREATED', commentId: comment.id } } });
      await this.notifications.createForUsers(recipients, { tenantId: user.tenantId, title: 'Novo comentário na tarefa', message: `${user.name} comentou na tarefa “${task.title}”.`, type: NotificationType.INFO, entity: NotificationEntity.TASK, entityId: taskId }, tx);
      return comment;
    });
  }

  private async canWrite(user: AuthUser, module: PermissionModule) {
    return user.role === UserRole.OWNER || await this.permissions.has(user, module, 'edit') || await this.permissions.has(user, module, 'manage');
  }

  private async validateProjectAccess(user: AuthUser, projectId: string, write: boolean) {
    const project = await this.prisma.project.findFirst({ where: { id: projectId, tenantId: user.tenantId }, select: { id: true, title: true, ownerId: true, tasks: { where: { tenantId: user.tenantId, assigneeId: user.id }, select: { id: true }, take: 1 } } });
    if (!project) throw new NotFoundException('Projeto não encontrado.');
    if (write && !(await this.canWrite(user, PermissionModule.PROJECTS))) throw new ForbiddenException('Você não pode comentar neste projeto.');
    if (!administrativeRoles.includes(user.role) && user.role !== UserRole.VIEWER && project.ownerId !== user.id && !project.tasks.length) throw new ForbiddenException('Você não pode acessar este projeto.');
    return project;
  }

  private async validateTaskAccess(user: AuthUser, taskId: string, write: boolean) {
    const task = await this.prisma.task.findFirst({ where: { id: taskId, tenantId: user.tenantId }, select: { id: true, title: true, assigneeId: true, project: { select: { ownerId: true } } } });
    if (!task) throw new NotFoundException('Tarefa não encontrada.');
    if (write && !(await this.canWrite(user, PermissionModule.TASKS))) throw new ForbiddenException('Você não pode comentar nesta tarefa.');
    if (!administrativeRoles.includes(user.role) && user.role !== UserRole.VIEWER && task.assigneeId !== user.id && task.project.ownerId !== user.id) throw new ForbiddenException('Você não pode acessar esta tarefa.');
    return task;
  }

  private async validateServiceOrderAccess(
    user: AuthUser,
    serviceOrderId: string,
    action: 'comentar' | 'visualizar',
  ) {
    const serviceOrder = await this.prisma.serviceOrder.findFirst({
      where: { id: serviceOrderId, tenantId: user.tenantId },
      select: { id: true, title: true, requesterId: true, responsibleId: true },
    });

    if (!serviceOrder) {
      throw new NotFoundException('Ordem de serviço não encontrada.');
    }

    const hasAccess =
      administrativeRoles.includes(user.role) ||
      user.role === UserRole.VIEWER ||
      (user.role === UserRole.REQUESTER &&
        serviceOrder.requesterId === user.id) ||
      (user.role === UserRole.MEMBER &&
        (serviceOrder.requesterId === user.id ||
          serviceOrder.responsibleId === user.id));

    if (!hasAccess) {
      throw new ForbiddenException(
        `Você não pode ${action} comentários desta ordem de serviço.`,
      );
    }

    return serviceOrder;
  }

  private async emailRecipients(
    user: AuthUser,
    serviceOrder: {
      id: string;
      title: string;
      requesterId: string;
      responsibleId: string | null;
    },
    ids: string[],
    event: string,
  ) {
    for (const recipient of await this.notifications.activeRecipients(
      user.tenantId,
      ids,
    )) {
      const requesterLink = recipient.id === serviceOrder.requesterId;
      const delivery = await this.mail.sendServiceOrderCommentEmail({
        tenantId: user.tenantId,
        to: recipient.email,
        recipientName: recipient.name,
        title: serviceOrder.title,
        url: this.mail.webUrl(
          `${requesterLink ? '/requester' : ''}/service-orders/${serviceOrder.id}`,
        ),
        fields: [{ label: 'Comentado por', value: user.name }],
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
}
