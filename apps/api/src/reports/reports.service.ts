import { Injectable } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import type { AuthUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { getDeadlineInfo } from '../common/deadline';
import {
  DailyLogReportQueryDto,
  ProjectReportQueryDto,
  ServiceOrderReportQueryDto,
  TaskReportQueryDto,
} from './dto/report-query.dto';

const fullTenantRoles: UserRole[] = [
  UserRole.OWNER,
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.VIEWER,
];

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async serviceOrders(user: AuthUser, query: ServiceOrderReportQueryDto) {
    const access: Prisma.ServiceOrderWhereInput = fullTenantRoles.includes(user.role)
      ? {}
      : { OR: [{ requesterId: user.id }, { responsibleId: user.id }] };
    const items = await this.prisma.serviceOrder.findMany({
      where: {
        AND: [
          { tenantId: user.tenantId }, access,
          {
            status: query.status,
            priority: query.priority,
            requesterId: query.requesterId,
            responsibleId: query.responsibleId,
            unit: query.unit,
            category: query.category,
            system: query.system,
            createdAt: this.period(query.dateFrom, query.dateTo),
          },
        ],
      },
      select: {
        id: true, title: true, status: true, priority: true, category: true,
        system: true, unit: true, dueDate: true, createdAt: true, updatedAt: true,
        finishedAt: true,
        requester: { select: { id: true, name: true } },
        responsible: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    const enriched = items.map((item) => ({ ...item, ...getDeadlineInfo(item.dueDate, item.status, ['COMPLETED', 'CANCELED'], 3) }));
    const filtered = enriched.filter((item) => this.matchesFlags(item, item.status === 'COMPLETED', item.finishedAt, query));
    const completed = filtered.filter((item) => item.status === 'COMPLETED' && item.finishedAt);
    const completedOnTime = completed.filter((item) => !item.dueDate || item.finishedAt! <= item.dueDate).length;
    const completedLate = completed.length - completedOnTime;
    const averageServiceHours = completed.length
      ? Number((completed.reduce((sum, item) => sum + (item.finishedAt!.getTime() - item.createdAt.getTime()) / 3_600_000, 0) / completed.length).toFixed(2))
      : null;
    return this.response(filtered, query, {
      total: filtered.length, overdue: filtered.filter((item) => item.deadlineStatus === 'overdue').length,
      completed: completed.length, completedOnTime, completedLate, averageServiceHours,
    }, {
      status: this.group(filtered, (item) => item.status), priority: this.group(filtered, (item) => item.priority),
      category: this.group(filtered, (item) => item.category), unit: this.group(filtered, (item) => item.unit),
      system: this.group(filtered, (item) => item.system), requester: this.group(filtered, (item) => item.requester.name),
      responsible: this.group(filtered, (item) => item.responsible?.name),
    });
  }

  async projects(user: AuthUser, query: ProjectReportQueryDto) {
    const access: Prisma.ProjectWhereInput = fullTenantRoles.includes(user.role)
      ? {}
      : { OR: [{ ownerId: user.id }, { tasks: { some: { tenantId: user.tenantId, assigneeId: user.id } } }] };
    const items = await this.prisma.project.findMany({
      where: {
        AND: [
          { tenantId: user.tenantId }, access,
          {
            status: query.status, priority: query.priority,
            ownerId: query.responsibleId, unit: query.unit, type: query.projectType,
            createdAt: this.period(query.dateFrom, query.dateTo),
          },
        ],
      },
      select: {
        id: true, title: true, status: true, priority: true, area: true, unit: true, type: true,
        startDate: true, dueDate: true, finishedAt: true, createdAt: true,
        tasks: { select: { status: true } },
        owner: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    const enriched = items.map((item) => {
      const completedTasks = item.tasks.filter((task) => task.status === 'DONE').length;
      return { ...item, tasks: undefined, completionPercentage: item.tasks.length ? Math.round(completedTasks / item.tasks.length * 100) : 0, ...getDeadlineInfo(item.dueDate, item.finishedAt ? 'COMPLETED' : item.status, ['COMPLETED', 'CANCELED'], 7) };
    });
    const filtered = enriched.filter((item) => this.matchesFlags(item, item.status === 'COMPLETED', item.finishedAt, query));
    return this.response(filtered, query, {
      total: filtered.length, overdue: filtered.filter((item) => item.deadlineStatus === 'overdue').length,
      completed: filtered.filter((item) => item.status === 'COMPLETED').length,
      inProgress: filtered.filter((item) => item.status === 'IN_PROGRESS').length,
      averageCompletionPercentage: filtered.length ? Math.round(filtered.reduce((sum, item) => sum + item.completionPercentage, 0) / filtered.length) : 0,
    }, {
      status: this.group(filtered, (item) => item.status), type: this.group(filtered, (item) => item.type),
      unit: this.group(filtered, (item) => item.unit), responsible: this.group(filtered, (item) => item.owner.name),
    });
  }

  async tasks(user: AuthUser, query: TaskReportQueryDto) {
    const access: Prisma.TaskWhereInput = fullTenantRoles.includes(user.role)
      ? {}
      : { OR: [{ assigneeId: user.id }, { project: { ownerId: user.id, tenantId: user.tenantId } }] };
    const items = await this.prisma.task.findMany({
      where: {
        AND: [
          { tenantId: user.tenantId }, access,
          {
            status: query.status, priority: query.priority,
            assigneeId: query.assigneeId, projectId: query.projectId,
            createdAt: this.period(query.dateFrom, query.dateTo),
          },
        ],
      },
      select: {
        id: true, title: true, status: true, priority: true, dueDate: true,
        createdAt: true, updatedAt: true, finishedAt: true,
        project: { select: { id: true, title: true } },
        assignee: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    const enriched = items.map((item) => ({ ...item, ...getDeadlineInfo(item.dueDate, item.status, ['DONE', 'CANCELED'], 3) }));
    const filtered = enriched.filter((item) => this.matchesFlags(item, item.status === 'DONE', item.finishedAt, query));
    return this.response(filtered, query, {
      total: filtered.length, overdue: filtered.filter((item) => item.deadlineStatus === 'overdue').length,
      completed: filtered.filter((item) => item.status === 'DONE').length,
      pending: filtered.filter((item) => ['PLANNED', 'TODO'].includes(item.status)).length,
      inProgress: filtered.filter((item) => item.status === 'DOING').length,
    }, {
      status: this.group(filtered, (item) => item.status), responsible: this.group(filtered, (item) => item.assignee?.name),
      project: this.group(filtered, (item) => item.project.title),
    });
  }

  async dailyLogs(user: AuthUser, query: DailyLogReportQueryDto) {
    const access: Prisma.DailyLogWhereInput = fullTenantRoles.includes(user.role)
      ? {}
      : {
          OR: [
            { userId: user.id },
            { project: { tenantId: user.tenantId, ownerId: user.id } },
            { project: { tenantId: user.tenantId, tasks: { some: { tenantId: user.tenantId, assigneeId: user.id } } } },
          ],
        };
    const items = await this.prisma.dailyLog.findMany({
      where: {
        AND: [
          { tenantId: user.tenantId }, access,
          {
            status: query.status, userId: query.responsibleId,
            projectId: query.projectId,
            date: this.period(query.dateFrom, query.dateTo),
          },
        ],
      },
      select: {
        id: true, date: true, title: true, description: true, time: true,
        status: true, createdAt: true,
        user: { select: { id: true, name: true } },
        project: { select: { id: true, title: true } },
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });
    const rows = items.map(({ time, ...item }) => ({
      ...item,
      task: null,
      workedHours: time === null || Number.isNaN(Number(time)) ? null : Number(time),
    }));
    const totalHours = rows.reduce((sum, item) => sum + (item.workedHours ?? 0), 0);
    return this.response(rows, query, { total: rows.length, totalHours: Number(totalHours.toFixed(2)) }, {
      status: this.group(rows, (item) => item.status), user: this.group(rows, (item) => item.user.name),
      project: this.group(rows, (item) => item.project?.title),
      hoursByUser: this.group(rows, (item) => item.user.name, (item) => item.workedHours ?? 0),
      hoursByProject: this.group(rows, (item) => item.project?.title, (item) => item.workedHours ?? 0),
    });
  }

  private matchesFlags(item: { deadlineStatus: string; dueDate: Date | null }, completed: boolean, finishedAt: Date | null, query: { overdue?: boolean; completed?: boolean; late?: boolean }) {
    if (query.overdue && item.deadlineStatus !== 'overdue') return false;
    if (query.completed && !completed) return false;
    if (query.late && !(completed && item.dueDate && finishedAt && finishedAt > item.dueDate)) return false;
    return true;
  }

  private group<T>(items: T[], key: (item: T) => string | null | undefined, value: (item: T) => number = () => 1) {
    const totals = new Map<string, number>();
    items.forEach((item) => { const label = key(item) || 'Não informado'; totals.set(label, (totals.get(label) ?? 0) + value(item)); });
    return [...totals.entries()].map(([label, total]) => ({ label, total: Number(total.toFixed(2)) })).sort((a, b) => b.total - a.total);
  }

  private response<T>(items: T[], query: { page: number; limit: number }, summary: Record<string, number | null>, groupedData: Record<string, { label: string; total: number }[]>) {
    const start = (query.page - 1) * query.limit;
    return { summary, groupedData, rows: items.slice(start, start + query.limit), pagination: { page: query.page, limit: query.limit, total: items.length, pages: Math.max(1, Math.ceil(items.length / query.limit)) } };
  }

  private period(dateFrom?: Date, dateTo?: Date): Prisma.DateTimeFilter | undefined {
    if (!dateFrom && !dateTo) return undefined;
    return { gte: dateFrom, lte: dateTo };
  }
}
