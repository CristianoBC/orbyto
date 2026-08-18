import { Injectable, NotFoundException } from '@nestjs/common';
import {
  NotificationEntity,
  NotificationType,
  PermissionModule,
  Prisma,
  UserRole,
  UserStatus,
} from '@prisma/client';
import type { AuthUser } from '../auth/auth.types';
import { PermissionsService } from '../permissions/permissions.service';
import { PrismaService } from '../prisma/prisma.service';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto';

type NotificationDb = PrismaService | Prisma.TransactionClient;
type CreateNotification = {
  tenantId: string;
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
  entity: NotificationEntity;
  entityId?: string;
};

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionsService,
  ) {}

  async findAll(user: AuthUser, query: ListNotificationsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = { tenantId: user.tenantId, userId: user.id };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
    ]);
    return { items, page, limit, total, pages: Math.ceil(total / limit) };
  }

  async unreadCount(user: AuthUser) {
    const count = await this.prisma.notification.count({
      where: { tenantId: user.tenantId, userId: user.id, readAt: null },
    });
    return { count };
  }

  async markRead(user: AuthUser, id: string) {
    const result = await this.prisma.notification.updateMany({
      where: { id, tenantId: user.tenantId, userId: user.id },
      data: { readAt: new Date() },
    });
    if (!result.count)
      throw new NotFoundException('Notificação não encontrada.');
    return this.prisma.notification.findFirst({
      where: { id, tenantId: user.tenantId, userId: user.id },
    });
  }

  async markAllRead(user: AuthUser) {
    const result = await this.prisma.notification.updateMany({
      where: { tenantId: user.tenantId, userId: user.id, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: result.count };
  }

  createForUser(data: CreateNotification, db: NotificationDb = this.prisma) {
    return db.notification.create({
      data: { ...data, type: data.type ?? NotificationType.INFO },
    });
  }

  createForUsers(
    userIds: string[],
    data: Omit<CreateNotification, 'userId'>,
    db: NotificationDb = this.prisma,
  ) {
    const uniqueIds = [...new Set(userIds)];
    if (!uniqueIds.length) return Promise.resolve({ count: 0 });
    return db.notification.createMany({
      data: uniqueIds.map((userId) => ({
        ...data,
        userId,
        type: data.type ?? NotificationType.INFO,
      })),
    });
  }

  async serviceOrderStaffRecipientIds(
    tenantId: string,
    excludeUserId?: string,
  ) {
    const users = await this.prisma.user.findMany({
      where: {
        tenantId,
        status: UserStatus.ACTIVE,
        role: { in: [UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER] },
        id: excludeUserId ? { not: excludeUserId } : undefined,
      },
      select: { id: true, role: true },
    });
    const roles = [...new Set(users.map((item) => item.role))];
    const allowed = new Set<UserRole>();
    await Promise.all(
      roles.map(async (role) => {
        const permissions = await this.permissions.forRole(tenantId, role);
        const serviceOrders = permissions.find(
          (item) => item.module === PermissionModule.SERVICE_ORDERS,
        );
        if (serviceOrders?.canView || serviceOrders?.canManage)
          allowed.add(role);
      }),
    );
    return users
      .filter((item) => allowed.has(item.role))
      .map((item) => item.id);
  }

  activeRecipients(tenantId: string, userIds: string[]) {
    return this.prisma.user.findMany({
      where: {
        tenantId,
        id: { in: [...new Set(userIds)] },
        status: UserStatus.ACTIVE,
      },
      select: { id: true, name: true, email: true },
    });
  }
}
