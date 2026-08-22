export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGIN_FAILED' | 'LOGOUT' | 'STATUS_CHANGE' | 'COMMENT' | 'ATTACHMENT' | 'ASSIGN' | 'COMPLETE' | 'CANCEL' | 'SATISFACTION_SUBMITTED' | 'SATISFACTION_LOW_RATING_RECEIVED' | 'SATISFACTION_FOLLOWUP_UPDATED';
export interface AuditActor { id: string; name: string; email: string; }
export interface AuditLog { id: string; action: AuditAction; entity: string; entityId?: string | null; createdAt: string; ipAddress?: string | null; userAgent?: string | null; user?: AuditActor | null; metadata?: Record<string, unknown> | null; critical: boolean; eventLabel: string; resourceLabel: string; summary: string; }
export interface AuditSummary { totalEvents: number; criticalEvents: number; byModule: { module: string; total: number }[]; activeUsers: { user: AuditActor | null; total: number }[]; recentRelevant: AuditLog[]; }
export interface AuditLogPage { items: AuditLog[]; total: number; page: number; limit: number; pages: number; summary: AuditSummary; }
export interface AuditExport { filename: string; csv: string; }
