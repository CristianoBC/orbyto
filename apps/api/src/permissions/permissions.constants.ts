import { PermissionModule, UserRole } from '@prisma/client';

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'manage';
export const actionField = { view: 'canView', create: 'canCreate', edit: 'canEdit', delete: 'canDelete', manage: 'canManage' } as const;
export const permissionModules = Object.values(PermissionModule);

export function defaultEnabled(role: UserRole, module: PermissionModule) {
  if (role === UserRole.OWNER || role === UserRole.ADMIN) return module !== PermissionModule.REQUESTER_PORTAL;
  if (role === UserRole.MANAGER) return module !== PermissionModule.REQUESTER_PORTAL && module !== PermissionModule.USERS && module !== PermissionModule.SETTINGS && module !== PermissionModule.LOOKUPS && module !== PermissionModule.SATISFACTION;
  if (role === UserRole.MEMBER) return ([PermissionModule.DASHBOARD, PermissionModule.PROJECTS, PermissionModule.TASKS, PermissionModule.KANBAN, PermissionModule.DAILY_LOGS, PermissionModule.SCHEDULE] as PermissionModule[]).includes(module);
  return role === UserRole.REQUESTER && module === PermissionModule.REQUESTER_PORTAL;
}
