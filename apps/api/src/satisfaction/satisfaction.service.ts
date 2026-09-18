import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, NotificationEntity, NotificationType, PermissionModule, Prisma, SatisfactionFollowUpStatus, ServiceOrderStatus, UserRole, UserStatus } from '@prisma/client';
import type { AuthUser } from '../auth/auth.types';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PermissionsService } from '../permissions/permissions.service';
import { PrismaService } from '../prisma/prisma.service';
import { ListSatisfactionQueryDto } from './dto/list-satisfaction-query.dto';
import { SubmitSatisfactionDto } from './dto/submit-satisfaction.dto';
import { UpdateFollowUpDto } from './dto/update-follow-up.dto';

const include = {
  requester: { select: { id: true, name: true, email: true } },
  serviceOrder: { select: { id: true, title: true, status: true, finishedAt: true } },
  followedUpBy: { select: { id: true, name: true } },
} satisfies Prisma.ServiceOrderSatisfactionInclude;

@Injectable()
export class SatisfactionService {
  constructor(private readonly prisma: PrismaService, private readonly notifications: NotificationsService, private readonly mail: MailService, private readonly permissions: PermissionsService) {}

  list(user: AuthUser, query: ListSatisfactionQueryDto) {
    return this.prisma.serviceOrderSatisfaction.findMany({ where: this.where(user.tenantId, query), include, orderBy: { createdAt: 'desc' } });
  }

  async summary(user: AuthUser, query: ListSatisfactionQueryDto) {
    const where = this.where(user.tenantId, query);
    const [aggregate, lowRatings, highRatings, pendingFollowUps] = await this.prisma.$transaction([
      this.prisma.serviceOrderSatisfaction.aggregate({ where, _avg: { rating: true }, _count: true }),
      this.prisma.serviceOrderSatisfaction.count({ where: { ...where, rating: { lte: 3 } } }),
      this.prisma.serviceOrderSatisfaction.count({ where: { ...where, rating: { gte: 4 } } }),
      this.prisma.serviceOrderSatisfaction.count({ where: { ...where, rating: { lte: 3 }, followUpStatus: { in: [SatisfactionFollowUpStatus.PENDING, SatisfactionFollowUpStatus.IN_REVIEW] } } }),
    ]);
    return { averageRating: aggregate._avg.rating ?? 0, total: aggregate._count, lowRatings, highSatisfactionPercentage: aggregate._count ? Math.round(highRatings / aggregate._count * 100) : 0, pendingFollowUps };
  }

  async getForOrder(user: AuthUser, serviceOrderId: string) {
    const order = await this.prisma.serviceOrder.findFirst({ where: { id: serviceOrderId, tenantId: user.tenantId }, select: { requesterId: true, status: true } });
    if (!order) throw new NotFoundException('Ordem de serviço não encontrada.');
    const administrative = await this.permissions.has(user, PermissionModule.SATISFACTION, 'view');
    if (order.requesterId !== user.id && !administrative) throw new ForbiddenException('Você não pode visualizar esta avaliação.');
    const satisfaction = await this.prisma.serviceOrderSatisfaction.findFirst({ where: { serviceOrderId, tenantId: user.tenantId }, include });
    return {
      satisfaction,
      canEvaluate:
        !satisfaction &&
        order.status === ServiceOrderStatus.COMPLETED &&
        order.requesterId === user.id,
    };
  }

  async submit(user: AuthUser, serviceOrderId: string, dto: SubmitSatisfactionDto) {
    const order = await this.prisma.serviceOrder.findFirst({ where: { id: serviceOrderId, tenantId: user.tenantId }, select: { id: true, title: true, requesterId: true, status: true } });
    if (!order) throw new NotFoundException('Ordem de serviço não encontrada.');
    if (order.requesterId !== user.id) throw new ForbiddenException('Apenas o solicitante original pode avaliar esta ordem de serviço.');
    if (order.status !== ServiceOrderStatus.COMPLETED) throw new BadRequestException('A avaliação só pode ser enviada após a conclusão da ordem de serviço.');
    const reason = dto.lowRatingReason?.trim();
    if (dto.rating <= 3 && !reason) throw new BadRequestException('Informe a justificativa para notas de 1 a 3.');
    const low = dto.rating <= 3;
    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const item = await tx.serviceOrderSatisfaction.create({ data: { tenantId: user.tenantId, serviceOrderId, requesterId: user.id, rating: dto.rating, comment: dto.comment?.trim() || null, lowRatingReason: low ? reason : null, followUpStatus: low ? SatisfactionFollowUpStatus.PENDING : null }, include });
        await tx.auditLog.create({ data: { tenantId: user.tenantId, userId: user.id, action: AuditAction.SATISFACTION_SUBMITTED, entity: 'ServiceOrderSatisfaction', entityId: item.id, metadata: { serviceOrderId, rating: dto.rating } } });
        if (low) await tx.auditLog.create({ data: { tenantId: user.tenantId, userId: user.id, action: AuditAction.SATISFACTION_LOW_RATING_RECEIVED, entity: 'ServiceOrderSatisfaction', entityId: item.id, metadata: { serviceOrderId, rating: dto.rating } } });
        return item;
      });
      if (low) await this.notifyLowRating(user, order, created.id, dto.rating);
      return created;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('Esta ordem de serviço já foi avaliada.');
      throw error;
    }
  }

  async followUp(user: AuthUser, id: string, dto: UpdateFollowUpDto) {
    const current = await this.prisma.serviceOrderSatisfaction.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!current) throw new NotFoundException('Avaliação não encontrada.');
    if (current.rating > 3) throw new BadRequestException('A tratativa é destinada a avaliações de nota baixa.');
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.serviceOrderSatisfaction.update({ where: { id }, data: { followUpStatus: dto.followUpStatus, followUpNotes: dto.followUpNotes.trim(), followedUpById: user.id, followedUpAt: new Date() }, include });
      await tx.auditLog.create({ data: { tenantId: user.tenantId, userId: user.id, action: AuditAction.SATISFACTION_FOLLOWUP_UPDATED, entity: 'ServiceOrderSatisfaction', entityId: id, metadata: { previousStatus: current.followUpStatus, newStatus: dto.followUpStatus, serviceOrderId: current.serviceOrderId } } });
      return updated;
    });
  }

  private where(tenantId: string, query: ListSatisfactionQueryDto): Prisma.ServiceOrderSatisfactionWhereInput {
    return { tenantId, rating: query.lowOnly ? { lte: 3 } : query.rating, followUpStatus: query.followUpStatus, createdAt: query.from || query.to ? { gte: query.from ? new Date(query.from) : undefined, lte: query.to ? new Date(`${query.to}T23:59:59.999`) : undefined } : undefined, requester: query.requester?.trim() ? { OR: [{ name: { contains: query.requester.trim(), mode: 'insensitive' } }, { email: { contains: query.requester.trim(), mode: 'insensitive' } }] } : undefined };
  }

  private async notifyLowRating(user: AuthUser, order: { id: string; title: string }, satisfactionId: string, rating: number) {
    const staff = await this.prisma.user.findMany({ where: { tenantId: user.tenantId, status: UserStatus.ACTIVE, role: { in: [UserRole.OWNER, UserRole.ADMIN] } }, select: { id: true, name: true, email: true } });
    await this.notifications.createForUsers(staff.map(({ id }) => id), { tenantId: user.tenantId, title: 'Avaliação baixa recebida', message: `${user.name} avaliou a OS “${order.title}” com nota ${rating}.`, type: NotificationType.ACTION_REQUIRED, entity: NotificationEntity.SATISFACTION, entityId: satisfactionId });
    for (const recipient of staff) {
      const delivery = await this.mail.sendSatisfactionLowRatingEmail({ tenantId: user.tenantId, to: recipient.email, recipientName: recipient.name, title: order.title, url: this.mail.webUrl(`/service-orders/${order.id}`), fields: [{ label: 'Solicitante', value: user.name }, { label: 'Nota', value: String(rating) }] });
      await this.mail.auditOperationalDelivery({ tenantId: user.tenantId, actorId: user.id, entity: 'ServiceOrderSatisfaction', entityId: satisfactionId, event: 'SATISFACTION_LOW_RATING_RECEIVED', recipient: recipient.email }, delivery);
    }
  }
}
