export interface TenantSettings {
  id: string; tenantId: string;
  environmentName: string | null; institutionName: string | null; environmentDescription: string | null; allowedEmailDomain: string | null;
  requesterSelfRegistrationEnabled: boolean; internalNotificationsEnabled: boolean; operationalEmailsEnabled: boolean; deadlineAlertsEnabled: boolean;
  defaultServiceOrderDeadlineDays: number | null; defaultTaskDeadlineDays: number | null; defaultProjectDeadlineDays: number | null;
  createdAt: string; updatedAt: string;
}
