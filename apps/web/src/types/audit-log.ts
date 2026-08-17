export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGIN_FAILED' | 'LOGOUT' | 'STATUS_CHANGE' | 'COMMENT' | 'ATTACHMENT' | 'ASSIGN' | 'COMPLETE' | 'CANCEL';
export interface AuditLog { id: string; action: AuditAction; entity: string; entityId?: string | null; createdAt: string; user?: { id: string; name: string; email: string } | null; metadata?: Record<string, unknown> | null; }
export interface AuditLogPage { items: AuditLog[]; total: number; page: number; limit: number; pages: number; }
