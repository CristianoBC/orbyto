export type UserRole = 'OWNER' | 'ADMIN' | 'MANAGER' | 'MEMBER' | 'REQUESTER' | 'VIEWER';
export type UserStatus = 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
export type PermissionModule = 'DASHBOARD' | 'SERVICE_ORDERS' | 'PROJECTS' | 'TASKS' | 'KANBAN' | 'DAILY_LOGS' | 'SCHEDULE' | 'USERS' | 'REQUESTER_PORTAL';
export interface RolePermission { module: PermissionModule; canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean; canManage: boolean; }

export interface AuthUser {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
  tenant: { id: string; name: string; slug: string; status: string; plan: string };
}

export interface User extends AuthUser {
  phone?: string | null;
  avatarUrl?: string | null;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt?: string;
}
