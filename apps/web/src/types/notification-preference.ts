export interface NotificationPreference {
  id: string; tenantId: string; userId: string;
  internalNotificationsEnabled: boolean; emailNotificationsEnabled: boolean;
  serviceOrderUpdatesEmail: boolean; serviceOrderCommentsEmail: boolean; serviceOrderAttachmentsEmail: boolean;
  projectUpdatesEmail: boolean; projectCommentsEmail: boolean;
  taskUpdatesEmail: boolean; taskCommentsEmail: boolean;
  deadlineAlertsEmail: boolean; satisfactionAlertsEmail: boolean; dailySummaryEmail: boolean;
  createdAt: string; updatedAt: string;
}
export type NotificationPreferenceForm = Omit<NotificationPreference, 'id' | 'tenantId' | 'userId' | 'createdAt' | 'updatedAt'>;
