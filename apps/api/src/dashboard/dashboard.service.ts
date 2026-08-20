import { Injectable } from '@nestjs/common';
import { PermissionModule, Prisma, UserRole } from '@prisma/client';
import type { AuthUser } from '../auth/auth.types';
import { PermissionsService } from '../permissions/permissions.service';
import { PrismaService } from '../prisma/prisma.service';

type DashboardModuleKey = 'serviceOrders' | 'projects' | 'tasks' | 'dailyLogs';
type DashboardItem = {
  id: string;
  module: DashboardModuleKey;
  title: string;
  status?: string;
  dueDate?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  context?: string | null;
};

const DAY = 86_400_000;
const closedOrders = ['COMPLETED', 'CANCELED'];
const closedProjects = ['COMPLETED', 'CANCELED'];
const closedTasks = ['DONE', 'CANCELED'];

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionsService,
  ) {}

  async overview(user: AuthUser) {
    const rolePermissions = await this.permissions.forRole(user.tenantId, user.role);
    const allowed = (module: PermissionModule) =>
      user.role === UserRole.OWNER || Boolean(rolePermissions.find((item) => item.module === module)?.canView);
    const visibility = {
      serviceOrders: allowed(PermissionModule.SERVICE_ORDERS),
      projects: allowed(PermissionModule.PROJECTS),
      tasks: allowed(PermissionModule.TASKS),
      dailyLogs: allowed(PermissionModule.DAILY_LOGS),
    };

    const orders = visibility.serviceOrders ? await this.loadServiceOrders(user) : [] as Awaited<ReturnType<typeof this.loadServiceOrders>>;
    const projects = visibility.projects ? await this.loadProjects(user) : [] as Awaited<ReturnType<typeof this.loadProjects>>;
    const tasks = visibility.tasks ? await this.loadTasks(user) : [] as Awaited<ReturnType<typeof this.loadTasks>>;
    const logs = visibility.dailyLogs ? await this.loadDailyLogs(user) : [] as Awaited<ReturnType<typeof this.loadDailyLogs>>;
    const today = this.startOfToday();
    const recentLimit = new Date(today.getTime() - 7 * DAY);
    const attention: Array<DashboardItem & { deadline: 'overdue' | 'dueSoon'; severity: number }> = [];
    const upcoming: Array<DashboardItem & { deadline: 'dueSoon' }> = [];
    const movements: DashboardItem[] = [];

    for (const item of orders) {
      const value = this.item('serviceOrders', item);
      this.classifyDeadline(value, item.status, closedOrders, today, 3, attention, upcoming);
      movements.push(value);
    }
    for (const item of projects) {
      const value = this.item('projects', item);
      this.classifyDeadline(value, item.status, closedProjects, today, 7, attention, upcoming);
      movements.push(value);
    }
    for (const item of tasks) {
      const value = this.item('tasks', item, item.project.title);
      this.classifyDeadline(value, item.status, closedTasks, today, 3, attention, upcoming);
      movements.push(value);
    }
    for (const item of logs) movements.push({
      id: item.id, module: 'dailyLogs', title: item.title, createdAt: item.createdAt,
      updatedAt: item.updatedAt, context: item.project?.title ?? item.user.name,
    });

    return {
      visibility,
      metrics: {
        serviceOrders: visibility.serviceOrders ? {
          open: orders.filter((item) => !closedOrders.includes(item.status)).length,
          overdue: this.deadlineCount(orders, closedOrders, today, 'overdue', 3),
          dueSoon: this.deadlineCount(orders, closedOrders, today, 'dueSoon', 3),
        } : null,
        projects: visibility.projects ? {
          active: projects.filter((item) => item.status === 'IN_PROGRESS').length,
          overdue: this.deadlineCount(projects, closedProjects, today, 'overdue', 7),
        } : null,
        tasks: visibility.tasks ? {
          pending: tasks.filter((item) => ['PLANNED', 'TODO'].includes(item.status)).length,
          inProgress: tasks.filter((item) => item.status === 'DOING').length,
          overdue: this.deadlineCount(tasks, closedTasks, today, 'overdue', 3),
        } : null,
        dailyLogs: visibility.dailyLogs ? {
          recent: logs.filter((item) => item.date >= recentLimit).length,
        } : null,
      },
      attention: attention.sort((a, b) => b.severity - a.severity || this.time(a.dueDate) - this.time(b.dueDate)).slice(0, 12),
      upcoming: upcoming.sort((a, b) => this.time(a.dueDate) - this.time(b.dueDate)).slice(0, 12),
      movements: movements.sort((a, b) => this.time(b.updatedAt) - this.time(a.updatedAt)).slice(0, 12),
      statusSummary: {
        serviceOrders: visibility.serviceOrders ? this.statusCounts(orders) : null,
        projects: visibility.projects ? this.statusCounts(projects) : null,
        tasks: visibility.tasks ? this.statusCounts(tasks) : null,
      },
      generatedAt: new Date(),
    };
  }

  private loadServiceOrders(user: AuthUser) {
    return this.prisma.serviceOrder.findMany({
      where: this.serviceOrderScope(user),
      select: { id: true, title: true, status: true, dueDate: true, createdAt: true, updatedAt: true },
    });
  }

  private loadProjects(user: AuthUser) {
    return this.prisma.project.findMany({
      where: this.projectScope(user),
      select: { id: true, title: true, status: true, dueDate: true, createdAt: true, updatedAt: true },
    });
  }

  private loadTasks(user: AuthUser) {
    return this.prisma.task.findMany({
      where: this.taskScope(user),
      select: { id: true, title: true, status: true, dueDate: true, createdAt: true, updatedAt: true, project: { select: { title: true } } },
    });
  }

  private loadDailyLogs(user: AuthUser) {
    return this.prisma.dailyLog.findMany({
      where: this.dailyLogScope(user),
      select: { id: true, title: true, date: true, createdAt: true, updatedAt: true, project: { select: { title: true } }, user: { select: { name: true } } },
    });
  }

  private hasTenantWideAccess(user: AuthUser) {
    const roles: UserRole[] = [UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.VIEWER];
    return roles.includes(user.role);
  }

  private serviceOrderScope(user: AuthUser): Prisma.ServiceOrderWhereInput {
    return this.hasTenantWideAccess(user)
      ? { tenantId: user.tenantId }
      : { tenantId: user.tenantId, OR: [{ requesterId: user.id }, { responsibleId: user.id }] };
  }

  private projectScope(user: AuthUser): Prisma.ProjectWhereInput {
    return this.hasTenantWideAccess(user)
      ? { tenantId: user.tenantId }
      : { tenantId: user.tenantId, OR: [{ ownerId: user.id }, { tasks: { some: { tenantId: user.tenantId, assigneeId: user.id } } }] };
  }

  private taskScope(user: AuthUser): Prisma.TaskWhereInput {
    return this.hasTenantWideAccess(user) ? { tenantId: user.tenantId } : { tenantId: user.tenantId, assigneeId: user.id };
  }

  private dailyLogScope(user: AuthUser): Prisma.DailyLogWhereInput {
    return this.hasTenantWideAccess(user) ? { tenantId: user.tenantId } : { tenantId: user.tenantId, userId: user.id };
  }

  private item(module: DashboardModuleKey, item: { id: string; title: string; status: string; dueDate: Date | null; createdAt: Date; updatedAt: Date }, context?: string): DashboardItem {
    return { id: item.id, module, title: item.title, status: item.status, dueDate: item.dueDate, createdAt: item.createdAt, updatedAt: item.updatedAt, context };
  }

  private classifyDeadline(item: DashboardItem, status: string, closed: string[], today: Date, days: number, attention: Array<DashboardItem & { deadline: 'overdue' | 'dueSoon'; severity: number }>, upcoming: Array<DashboardItem & { deadline: 'dueSoon' }>) {
    if (!item.dueDate || closed.includes(status)) return;
    const difference = this.startOfDay(item.dueDate).getTime() - today.getTime();
    if (difference < 0) attention.push({ ...item, deadline: 'overdue', severity: 2 });
    else if (difference <= days * DAY) {
      attention.push({ ...item, deadline: 'dueSoon', severity: 1 });
      upcoming.push({ ...item, deadline: 'dueSoon' });
    }
  }

  private deadlineCount(items: Array<{ status: string; dueDate: Date | null }>, closed: string[], today: Date, kind: 'overdue' | 'dueSoon', days: number) {
    return items.filter((item) => {
      if (!item.dueDate || closed.includes(item.status)) return false;
      const difference = this.startOfDay(item.dueDate).getTime() - today.getTime();
      return kind === 'overdue' ? difference < 0 : difference >= 0 && difference <= days * DAY;
    }).length;
  }

  private statusCounts(items: Array<{ status: string }>) {
    return items.reduce<Record<string, number>>((result, item) => ({ ...result, [item.status]: (result[item.status] ?? 0) + 1 }), {});
  }

  private startOfToday() { return this.startOfDay(new Date()); }
  private startOfDay(value: Date) { return new Date(value.getFullYear(), value.getMonth(), value.getDate()); }
  private time(value?: Date | null) { return value?.getTime() ?? Number.MAX_SAFE_INTEGER; }
}
