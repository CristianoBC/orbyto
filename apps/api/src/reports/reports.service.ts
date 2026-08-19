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
    return items.map((item) => ({ ...item, ...getDeadlineInfo(item.dueDate, item.status, ['COMPLETED', 'CANCELED'], 3) }));
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
            ownerId: query.responsibleId, unit: query.unit,
            createdAt: this.period(query.dateFrom, query.dateTo),
          },
        ],
      },
      select: {
        id: true, title: true, status: true, priority: true, area: true, unit: true,
        startDate: true, dueDate: true, finishedAt: true, createdAt: true,
        owner: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return items.map((item) => ({ ...item, ...getDeadlineInfo(item.dueDate, item.finishedAt ? 'COMPLETED' : item.status, ['COMPLETED', 'CANCELED'], 7) }));
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
        createdAt: true, updatedAt: true,
        project: { select: { id: true, title: true } },
        assignee: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return items.map((item) => ({ ...item, ...getDeadlineInfo(item.dueDate, item.status, ['DONE', 'CANCELED'], 3) }));
  }

  dailyLogs(user: AuthUser, query: DailyLogReportQueryDto) {
    const access: Prisma.DailyLogWhereInput = fullTenantRoles.includes(user.role)
      ? {}
      : {
          OR: [
            { userId: user.id },
            { project: { tenantId: user.tenantId, ownerId: user.id } },
            { project: { tenantId: user.tenantId, tasks: { some: { tenantId: user.tenantId, assigneeId: user.id } } } },
          ],
        };
    return this.prisma.dailyLog.findMany({
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
    }).then((items) => items.map(({ time, ...item }) => ({
      ...item,
      task: null,
      workedHours: time === null || Number.isNaN(Number(time)) ? null : Number(time),
    })));
  }

  private period(dateFrom?: Date, dateTo?: Date): Prisma.DateTimeFilter | undefined {
    if (!dateFrom && !dateTo) return undefined;
    return { gte: dateFrom, lte: dateTo };
  }
}
