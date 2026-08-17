import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, Prisma, UserRole } from '@prisma/client';
import type { AuthUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { ListAuditLogsQueryDto } from './dto/list-audit-logs-query.dto';

const actorSelect = { id: true, name: true, email: true } satisfies Prisma.UserSelect;
const adminRoles: UserRole[] = [UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER];
const requesterActions: AuditAction[] = [AuditAction.CREATE, AuditAction.UPDATE, AuditAction.STATUS_CHANGE, AuditAction.COMMENT, AuditAction.ATTACHMENT];
const sensitiveKey = /password|token|secret|hash|authorization|cookie/i;

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: AuthUser, query: ListAuditLogsQueryDto) {
    const where: Prisma.AuditLogWhereInput = {
      tenantId: user.tenantId,
      entity: query.entity,
      entityId: query.entityId,
      action: query.action,
      userId: query.userId,
      createdAt: query.dateFrom || query.dateTo ? { gte: query.dateFrom, lte: query.dateTo } : undefined,
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({ where, include: { user: { select: actorSelect } }, orderBy: { createdAt: 'desc' }, skip: (query.page - 1) * query.limit, take: query.limit }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { items: items.map((item) => this.safe(item)), total, page: query.page, limit: query.limit, pages: Math.ceil(total / query.limit) };
  }

  async findByEntity(user: AuthUser, rawEntity: string, entityId: string) {
    const entity = this.normalizeEntity(rawEntity);
    await this.ensureEntityAccess(user, entity, entityId);
    const projectTaskIds = entity === 'Project'
      ? await this.prisma.task.findMany({ where: { tenantId: user.tenantId, projectId: entityId }, select: { id: true } }).then((rows) => rows.map(({ id }) => id))
      : [];
    const where: Prisma.AuditLogWhereInput = {
      tenantId: user.tenantId,
      OR: [
        { entity, entityId },
        ...(entity === 'Project' ? [{ entity: 'Task', OR: [{ entityId: { in: projectTaskIds } }, { metadata: { path: ['projectId'], equals: entityId } }] }] : []),
      ],
    };
    const items = await this.prisma.auditLog.findMany({ where, include: { user: { select: actorSelect } }, orderBy: { createdAt: 'desc' }, take: 200 });
    const visible = user.role === UserRole.REQUESTER
      ? items.filter((item) => requesterActions.includes(item.action))
      : items;
    return visible.map((item) => this.safe(item, user.role === UserRole.REQUESTER));
  }

  private normalizeEntity(value: string) {
    const key = value.replace(/[-_\s]/g, '').toUpperCase();
    const entities: Record<string, string> = { SERVICEORDER: 'ServiceOrder', PROJECT: 'Project', TASK: 'Task', DAILYLOG: 'DailyLog', USER: 'User' };
    const entity = entities[key];
    if (!entity) throw new NotFoundException('Tipo de entidade não suportado.');
    return entity;
  }

  private async ensureEntityAccess(user: AuthUser, entity: string, id: string) {
    if (entity === 'ServiceOrder') {
      const item = await this.prisma.serviceOrder.findFirst({ where: { id, tenantId: user.tenantId }, select: { requesterId: true, responsibleId: true } });
      if (!item) throw new NotFoundException('Ordem de serviço não encontrada.');
      if (!adminRoles.includes(user.role) && user.role !== UserRole.VIEWER && item.requesterId !== user.id && item.responsibleId !== user.id) throw new ForbiddenException('Você não pode visualizar este histórico.');
      return;
    }
    if (entity === 'Project') {
      const item = await this.prisma.project.findFirst({ where: { id, tenantId: user.tenantId }, select: { ownerId: true, tasks: { where: { assigneeId: user.id }, select: { id: true }, take: 1 } } });
      if (!item) throw new NotFoundException('Projeto não encontrado.');
      if (!adminRoles.includes(user.role) && user.role !== UserRole.VIEWER && item.ownerId !== user.id && !item.tasks.length) throw new ForbiddenException('Você não pode visualizar este histórico.');
      return;
    }
    if (entity === 'Task') {
      const item = await this.prisma.task.findFirst({ where: { id, tenantId: user.tenantId }, select: { assigneeId: true, project: { select: { ownerId: true } } } });
      if (!item) throw new NotFoundException('Tarefa não encontrada.');
      if (!adminRoles.includes(user.role) && user.role !== UserRole.VIEWER && item.assigneeId !== user.id && item.project.ownerId !== user.id) throw new ForbiddenException('Você não pode visualizar este histórico.');
      return;
    }
    if (!adminRoles.includes(user.role)) throw new ForbiddenException('Você não pode visualizar este histórico.');
    const exists = entity === 'User'
      ? await this.prisma.user.findFirst({ where: { id, tenantId: user.tenantId }, select: { id: true } })
      : await this.prisma.dailyLog.findFirst({ where: { id, tenantId: user.tenantId }, select: { id: true } });
    if (!exists) throw new NotFoundException('Entidade não encontrada.');
  }

  private safe<T extends { metadata: unknown }>(item: T, requester = false) {
    return { ...item, metadata: requester ? this.sanitize({ operation: (item.metadata as Record<string, unknown> | null)?.operation }) : this.sanitize(item.metadata) };
  }

  private sanitize(value: unknown): unknown {
    if (Array.isArray(value)) return value.map((item) => this.sanitize(item));
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(Object.entries(value).filter(([key]) => !sensitiveKey.test(key)).map(([key, entry]) => [key, this.sanitize(entry)]));
  }
}
