import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, Prisma, UserRole } from '@prisma/client';
import type { AuthUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { ListAuditLogsQueryDto } from './dto/list-audit-logs-query.dto';

const actorSelect = { id: true, name: true, email: true } satisfies Prisma.UserSelect;
const adminRoles: UserRole[] = [UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER];
const requesterActions: AuditAction[] = [AuditAction.CREATE, AuditAction.UPDATE, AuditAction.STATUS_CHANGE, AuditAction.COMMENT, AuditAction.ATTACHMENT];
const sensitiveKey = /password|token|secret|hash|authorization|cookie/i;
const criticalOperations = ['SYSTEM_SETTINGS_UPDATED', 'USER_PASSWORD_RESET', 'SATISFACTION_LOW_RATING_RECEIVED', 'SATISFACTION_FOLLOWUP_UPDATED'];
const criticalEntities = ['RolePermission', 'TenantSettings'];
const criticalStatuses = ['INACTIVE', 'CANCELED', 'COMPLETED', 'DONE'];

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: AuthUser, query: ListAuditLogsQueryDto) {
    const where = this.where(user.tenantId, query);
    const [items, total, byModule, criticalEvents, activeUsers, recent] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({ where, include: { user: { select: actorSelect } }, orderBy: { createdAt: 'desc' }, skip: (query.page - 1) * query.limit, take: query.limit }),
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.groupBy({ by: ['entity'], where, _count: { id: true }, orderBy: { _count: { id: 'desc' } } }),
      this.prisma.auditLog.count({ where: { AND: [where, this.criticalWhere()] } }),
      this.prisma.auditLog.groupBy({ by: ['userId'], where: { ...where, userId: { not: null } }, _count: { id: true }, orderBy: { _count: { id: 'desc' } }, take: 5 }),
      this.prisma.auditLog.findMany({ where: { AND: [where, this.criticalWhere()] }, include: { user: { select: actorSelect } }, orderBy: { createdAt: 'desc' }, take: 5 }),
    ]);
    const userIds = activeUsers.flatMap((row) => row.userId ? [row.userId] : []);
    const users = await this.prisma.user.findMany({ where: { tenantId: user.tenantId, id: { in: userIds } }, select: actorSelect });
    const userById = new Map(users.map((actor) => [actor.id, actor]));
    return {
      items: items.map((item) => this.present(item)), total, page: query.page, limit: query.limit, pages: Math.ceil(total / query.limit),
      summary: {
        totalEvents: total,
        criticalEvents,
        byModule: byModule.map((row) => ({ module: row.entity, total: (row._count as { id?: number } | undefined)?.id ?? 0 })),
        activeUsers: activeUsers.map((row) => ({ user: row.userId ? userById.get(row.userId) ?? null : null, total: (row._count as { id?: number } | undefined)?.id ?? 0 })),
        recentRelevant: recent.map((item) => this.present(item)),
      },
    };
  }

  async exportCsv(user: AuthUser, query: ListAuditLogsQueryDto) {
    const items = await this.prisma.auditLog.findMany({ where: this.where(user.tenantId, query), include: { user: { select: actorSelect } }, orderBy: { createdAt: 'desc' }, take: 10000 });
    return {
      filename: `auditoria-${new Date().toISOString().slice(0, 10)}.csv`,
      csv: ['Data,Usuário,E-mail,Evento,Recurso,Entidade,Resumo', ...items.map((raw) => {
        const item = this.present(raw);
        return [item.createdAt.toISOString(), item.user?.name ?? 'Sistema', item.user?.email ?? '', item.eventLabel, item.resourceLabel, item.entityId ?? '', item.summary].map(this.csvCell).join(',');
      })].join('\r\n'),
    };
  }

  private where(tenantId: string, query: ListAuditLogsQueryDto): Prisma.AuditLogWhereInput {
    const entity = query.entity ?? query.resource ?? query.module;
    const action = query.action ?? query.eventType;
    const start = query.startDate ?? query.dateFrom;
    const end = query.endDate ?? query.dateTo;
    const base: Prisma.AuditLogWhereInput = {
      tenantId, entity, entityId: query.entityId, action, userId: query.userId,
      createdAt: start || end ? { gte: start, lte: end } : undefined,
      OR: query.search ? [
        { entity: { contains: query.search, mode: 'insensitive' } },
        { entityId: { contains: query.search, mode: 'insensitive' } },
        { user: { is: { OR: [{ name: { contains: query.search, mode: 'insensitive' } }, { email: { contains: query.search, mode: 'insensitive' } }] } } },
      ] : undefined,
    };
    return query.criticalOnly ? { AND: [base, this.criticalWhere()] } : base;
  }

  private criticalWhere(): Prisma.AuditLogWhereInput {
    return { OR: [
      { entity: { in: criticalEntities } },
      { action: { in: [AuditAction.DELETE, AuditAction.CANCEL] } },
      { entity: 'User', action: AuditAction.CREATE },
      { entity: 'User', action: AuditAction.STATUS_CHANGE },
      ...criticalOperations.map((operation) => ({ metadata: { path: ['operation'], equals: operation } })),
      { action: AuditAction.SATISFACTION_LOW_RATING_RECEIVED },
      { action: AuditAction.SATISFACTION_FOLLOWUP_UPDATED },
      ...criticalStatuses.map((status) => ({ action: AuditAction.STATUS_CHANGE, metadata: { path: ['newStatus'], equals: status } })),
    ] };
  }

  private present<T extends { action: AuditAction; entity: string; entityId: string | null; metadata: unknown; user?: { id: string; name: string; email: string } | null }>(item: T) {
    const metadata = this.sanitize(item.metadata) as Record<string, unknown> | null;
    const operation = typeof metadata?.operation === 'string' ? metadata.operation : undefined;
    const criticalActions: AuditAction[] = [AuditAction.DELETE, AuditAction.CANCEL, AuditAction.SATISFACTION_LOW_RATING_RECEIVED, AuditAction.SATISFACTION_FOLLOWUP_UPDATED];
    const criticalUserActions: AuditAction[] = [AuditAction.CREATE, AuditAction.STATUS_CHANGE];
    const critical = criticalEntities.includes(item.entity) || criticalActions.includes(item.action) || (item.entity === 'User' && criticalUserActions.includes(item.action)) || Boolean(operation && criticalOperations.includes(operation)) || (item.action === AuditAction.STATUS_CHANGE && criticalStatuses.includes(String(metadata?.newStatus ?? '')));
    return { ...item, metadata, critical, eventLabel: this.eventLabel(item.action, operation), resourceLabel: this.resourceLabel(item.entity), summary: this.summary(item, metadata, operation) };
  }

  private eventLabel(action: AuditAction, operation?: string) {
    const operations: Record<string, string> = { SYSTEM_SETTINGS_UPDATED: 'Configurações do sistema alteradas', LOOKUP_CREATED: 'Cadastro auxiliar criado', SERVICE_ORDER_UPDATED: 'Ordem de Serviço atualizada', SATISFACTION_LOW_RATING_RECEIVED: 'Avaliação baixa recebida', SATISFACTION_FOLLOWUP_UPDATED: 'Tratativa de avaliação atualizada', NOTIFICATION_PREFERENCES_UPDATED: 'Preferências de notificação alteradas', USER_PASSWORD_RESET: 'Senha redefinida por administrador', USER_INVITED: 'Usuário convidado' };
    const actions: Record<string, string> = { CREATE: 'Criação', UPDATE: 'Atualização', DELETE: 'Exclusão', LOGIN: 'Login', LOGIN_FAILED: 'Tentativa de login recusada', LOGOUT: 'Logout', STATUS_CHANGE: 'Alteração de status', COMMENT: 'Comentário adicionado', ATTACHMENT: 'Anexo adicionado', ASSIGN: 'Atribuição', COMPLETE: 'Conclusão', CANCEL: 'Cancelamento', SATISFACTION_SUBMITTED: 'Avaliação recebida', SATISFACTION_LOW_RATING_RECEIVED: 'Avaliação baixa recebida', SATISFACTION_FOLLOWUP_UPDATED: 'Tratativa de avaliação atualizada' };
    return (operation && operations[operation]) || actions[action] || action;
  }

  private resourceLabel(entity: string) { return ({ ServiceOrder: 'Ordens de Serviço', ServiceOrderSatisfaction: 'Satisfação', Project: 'Projetos', Task: 'Tarefas', DailyLog: 'Registros diários', User: 'Usuários', RolePermission: 'Permissões', TenantSettings: 'Configurações', LookupItem: 'Cadastros auxiliares', UserNotificationPreference: 'Notificações' } as Record<string, string>)[entity] ?? entity; }
  private summary(item: { action: AuditAction; entity: string; user?: { name: string } | null }, metadata: Record<string, unknown> | null, operation?: string) {
    const actor = item.user?.name ?? 'Sistema';
    if (item.action === AuditAction.STATUS_CHANGE && metadata?.previousStatus && metadata?.newStatus) return `${actor} alterou o status de ${metadata.previousStatus} para ${metadata.newStatus}.`;
    return `${actor}: ${this.eventLabel(item.action, operation)} em ${this.resourceLabel(item.entity)}.`;
  }
  private csvCell(value: unknown) { const text = String(value ?? '').replace(/\r?\n/g, ' '); return `"${text.replace(/"/g, '""')}"`; }

  async findByEntity(user: AuthUser, rawEntity: string, entityId: string) {
    const entity = this.normalizeEntity(rawEntity); await this.ensureEntityAccess(user, entity, entityId);
    const projectTaskIds = entity === 'Project' ? await this.prisma.task.findMany({ where: { tenantId: user.tenantId, projectId: entityId }, select: { id: true } }).then((rows) => rows.map(({ id }) => id)) : [];
    const items = await this.prisma.auditLog.findMany({ where: { tenantId: user.tenantId, OR: [{ entity, entityId }, ...(entity === 'Project' ? [{ entity: 'Task', OR: [{ entityId: { in: projectTaskIds } }, { metadata: { path: ['projectId'], equals: entityId } }] }] : [])] }, include: { user: { select: actorSelect } }, orderBy: { createdAt: 'desc' }, take: 200 });
    return (user.role === UserRole.REQUESTER ? items.filter((item) => requesterActions.includes(item.action)) : items).map((item) => user.role === UserRole.REQUESTER ? { ...this.present(item), metadata: this.sanitize({ operation: (item.metadata as Record<string, unknown> | null)?.operation }) } : this.present(item));
  }
  private normalizeEntity(value: string) { const entity = ({ SERVICEORDER: 'ServiceOrder', PROJECT: 'Project', TASK: 'Task', DAILYLOG: 'DailyLog', USER: 'User' } as Record<string, string>)[value.replace(/[-_\s]/g, '').toUpperCase()]; if (!entity) throw new NotFoundException('Tipo de entidade não suportado.'); return entity; }
  private async ensureEntityAccess(user: AuthUser, entity: string, id: string) {
    if (entity === 'ServiceOrder') { const item = await this.prisma.serviceOrder.findFirst({ where: { id, tenantId: user.tenantId }, select: { requesterId: true, responsibleId: true } }); if (!item) throw new NotFoundException('Ordem de serviço não encontrada.'); if (!adminRoles.includes(user.role) && user.role !== UserRole.VIEWER && item.requesterId !== user.id && item.responsibleId !== user.id) throw new ForbiddenException('Você não pode visualizar este histórico.'); return; }
    if (entity === 'Project') { const item = await this.prisma.project.findFirst({ where: { id, tenantId: user.tenantId }, select: { ownerId: true, tasks: { where: { assigneeId: user.id }, select: { id: true }, take: 1 } } }); if (!item) throw new NotFoundException('Projeto não encontrado.'); if (!adminRoles.includes(user.role) && user.role !== UserRole.VIEWER && item.ownerId !== user.id && !item.tasks.length) throw new ForbiddenException('Você não pode visualizar este histórico.'); return; }
    if (entity === 'Task') { const item = await this.prisma.task.findFirst({ where: { id, tenantId: user.tenantId }, select: { assigneeId: true, project: { select: { ownerId: true } } } }); if (!item) throw new NotFoundException('Tarefa não encontrada.'); if (!adminRoles.includes(user.role) && user.role !== UserRole.VIEWER && item.assigneeId !== user.id && item.project.ownerId !== user.id) throw new ForbiddenException('Você não pode visualizar este histórico.'); return; }
    if (!adminRoles.includes(user.role)) throw new ForbiddenException('Você não pode visualizar este histórico.'); const exists = entity === 'User' ? await this.prisma.user.findFirst({ where: { id, tenantId: user.tenantId }, select: { id: true } }) : await this.prisma.dailyLog.findFirst({ where: { id, tenantId: user.tenantId }, select: { id: true } }); if (!exists) throw new NotFoundException('Entidade não encontrada.');
  }
  private sanitize(value: unknown): unknown { if (Array.isArray(value)) return value.map((item) => this.sanitize(item)); if (!value || typeof value !== 'object') return value; return Object.fromEntries(Object.entries(value).filter(([key]) => !sensitiveKey.test(key)).map(([key, entry]) => [key, this.sanitize(entry)])); }
}
