import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, NotificationEntity, NotificationType, Prisma, RefType, UserRole } from '@prisma/client';
import type { AuthUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateCommentDto } from './dto/create-comment.dto';

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
  constructor(private readonly prisma: PrismaService, private readonly notifications: NotificationsService) {}

  async create(user: AuthUser, dto: CreateCommentDto) {
    if (user.role === UserRole.VIEWER) {
      throw new ForbiddenException('O perfil Visualizador não pode adicionar comentários.');
    }
    if (dto.refType !== RefType.SERVICE_ORDER) {
      throw new BadRequestException(
        `Comentários para o tipo ${dto.refType} ainda não estão implementados.`,
      );
    }

    const serviceOrder = await this.validateServiceOrderAccess(user, dto.refId, 'comentar');
    const recipients = user.id === serviceOrder.requesterId
      ? await this.notifications.serviceOrderStaffRecipientIds(user.tenantId, user.id)
      : [serviceOrder.requesterId].filter((id) => id !== user.id);

    return this.prisma.$transaction(async (transaction) => {
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

      await this.notifications.createForUsers(recipients, {
        tenantId: user.tenantId, title: 'Novo comentário na ordem de serviço',
        message: `${user.name} comentou na ordem de serviço.`, type: NotificationType.INFO,
        entity: NotificationEntity.SERVICE_ORDER, entityId: dto.refId,
      }, transaction);

      return comment;
    });
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

  private async validateServiceOrderAccess(
    user: AuthUser,
    serviceOrderId: string,
    action: 'comentar' | 'visualizar',
  ) {
    const serviceOrder = await this.prisma.serviceOrder.findFirst({
      where: { id: serviceOrderId, tenantId: user.tenantId },
      select: { requesterId: true, responsibleId: true },
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
}
