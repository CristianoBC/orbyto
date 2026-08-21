import { Injectable } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import type { AuthUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';
import { NotificationPreferenceEvent } from './notification-preference-events';

@Injectable()
export class NotificationPreferencesService {
  constructor(private readonly prisma: PrismaService) {}

  getOrCreateForUser(userId: string, tenantId: string) {
    return this.prisma.userNotificationPreference.upsert({
      where: { userId },
      update: {},
      create: { userId, tenantId },
    });
  }

  async updateForUser(actor: AuthUser, dto: UpdateNotificationPreferencesDto) {
    const before = await this.getOrCreateForUser(actor.id, actor.tenantId);
    const changedFields = Object.keys(dto).filter(
      (key) => (before as Record<string, unknown>)[key] !== (dto as Record<string, unknown>)[key],
    );
    if (!changedFields.length) return before;
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.userNotificationPreference.update({
        where: { userId: actor.id },
        data: dto,
      });
      await tx.auditLog.create({
        data: {
          tenantId: actor.tenantId,
          userId: actor.id,
          action: AuditAction.UPDATE,
          entity: 'UserNotificationPreference',
          entityId: updated.id,
          metadata: { operation: 'NOTIFICATION_PREFERENCES_UPDATED', changedFields } as Prisma.InputJsonObject,
        },
      });
      return updated;
    });
  }

  async shouldSendEmail(userId: string, tenantId: string, eventType: NotificationPreferenceEvent) {
    const preference = await this.getOrCreateForUser(userId, tenantId);
    if (!preference.emailNotificationsEnabled) return false;
    const fieldByEvent = {
      [NotificationPreferenceEvent.SERVICE_ORDER_UPDATED]: 'serviceOrderUpdatesEmail',
      [NotificationPreferenceEvent.SERVICE_ORDER_COMMENT_CREATED]: 'serviceOrderCommentsEmail',
      [NotificationPreferenceEvent.SERVICE_ORDER_ATTACHMENT_UPLOADED]: 'serviceOrderAttachmentsEmail',
      [NotificationPreferenceEvent.PROJECT_UPDATED]: 'projectUpdatesEmail',
      [NotificationPreferenceEvent.PROJECT_COMMENT_CREATED]: 'projectCommentsEmail',
      [NotificationPreferenceEvent.TASK_UPDATED]: 'taskUpdatesEmail',
      [NotificationPreferenceEvent.TASK_COMMENT_CREATED]: 'taskCommentsEmail',
      [NotificationPreferenceEvent.DEADLINE_ALERT]: 'deadlineAlertsEmail',
      [NotificationPreferenceEvent.SATISFACTION_LOW_RATING]: 'satisfactionAlertsEmail',
      [NotificationPreferenceEvent.DAILY_SUMMARY]: 'dailySummaryEmail',
    } as const;
    return preference[fieldByEvent[eventType]];
  }

  async shouldCreateInternalNotification(userId: string, tenantId: string, _eventType?: NotificationPreferenceEvent) {
    return (await this.getOrCreateForUser(userId, tenantId)).internalNotificationsEnabled;
  }
}
