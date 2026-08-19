export type MailDeliveryResult =
  | { sent: true }
  | { sent: false; reason: 'disabled' | 'not_configured' | 'delivery_failed' };

export interface PasswordResetMail {
  to: string;
  name?: string | null;
  resetUrl: string;
  expiresInMinutes: number;
}

export interface UserInvitationMail {
  to: string;
  name: string;
  inviteUrl: string;
  expiresInHours: number;
}

export type OperationalEntity = 'ServiceOrder' | 'Task' | 'Project';

export interface OperationalMailBase {
  tenantId?: string;
  to: string;
  recipientName?: string | null;
  title: string;
  url: string;
  fields: Array<{ label: string; value: string | null | undefined }>;
}

export interface OperationalAuditContext {
  tenantId: string;
  actorId: string;
  entity: OperationalEntity;
  entityId: string;
  event: string;
  recipient: string;
}

export interface DeadlineAlertMailItem {
  title: string;
  kind: 'Ordem de serviço' | 'Projeto' | 'Tarefa';
  dueDate: string;
  url: string;
}

export interface DeadlineAlertSummaryMail {
  tenantId: string;
  to: string;
  recipientName?: string | null;
  overdue: DeadlineAlertMailItem[];
  upcoming: DeadlineAlertMailItem[];
}
