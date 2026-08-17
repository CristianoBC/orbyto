export type NotificationType = 'INFO' | 'SUCCESS' | 'WARNING' | 'ACTION_REQUIRED';
export type NotificationEntity = 'SERVICE_ORDER' | 'PROJECT' | 'TASK' | 'DAILY_LOG' | 'USER' | 'PERMISSION' | 'SYSTEM';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  entity: NotificationEntity;
  entityId: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationPage {
  items: Notification[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}
