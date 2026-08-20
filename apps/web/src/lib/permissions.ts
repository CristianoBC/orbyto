import type { PermissionModule, RolePermission, UserRole } from '@/types/auth';

export const APP_ROUTES: readonly { path: string; module: PermissionModule }[] = [
  { path: '/dashboard', module: 'DASHBOARD' },
  { path: '/service-orders', module: 'SERVICE_ORDERS' },
  { path: '/projects', module: 'PROJECTS' },
  { path: '/tasks', module: 'TASKS' },
  { path: '/schedule', module: 'SCHEDULE' },
  { path: '/daily-logs', module: 'DAILY_LOGS' },
  { path: '/users', module: 'USERS' },
  { path: '/settings', module: 'SETTINGS' },
  { path: '/lookups', module: 'LOOKUPS' },
  { path: '/satisfaction', module: 'SATISFACTION' },
];

export const REPORT_MODULES: readonly PermissionModule[] = ['SERVICE_ORDERS', 'PROJECTS', 'TASKS', 'DAILY_LOGS'];

export function hasReportsAccess(role: UserRole | undefined, permissions: RolePermission[]) {
  return role !== 'REQUESTER' && REPORT_MODULES.some((module) => hasPermission(role, permissions, module));
}

export function hasPermission(role: UserRole | undefined, permissions: RolePermission[], module: PermissionModule) {
  if (role === 'OWNER') return true;
  return Boolean(permissions.find((permission) => permission.module === module)?.canView);
}

export function getHomeRoute(role: UserRole, permissions: RolePermission[]) {
  if (role === 'REQUESTER') return '/requester/service-orders';
  return APP_ROUTES.find(({ module }) => hasPermission(role, permissions, module))?.path ?? null;
}

export function getRequiredModule(pathname: string) {
  if (pathname.startsWith('/audit-logs')) return 'USERS' as const;
  if (pathname.startsWith('/permissions')) return 'USERS' as const;
  return APP_ROUTES.find(({ path }) => pathname.startsWith(path))?.module;
}
