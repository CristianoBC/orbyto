import { ForbiddenException, Injectable } from '@nestjs/common';
import { AuditAction, NotificationEntity, NotificationType, PermissionModule, UserRole, UserStatus } from '@prisma/client';
import type { AuthUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { actionField, defaultEnabled, permissionModules, type PermissionAction } from './permissions.constants';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}
  async forRole(tenantId: string, role: UserRole) {
    const stored = await this.prisma.rolePermission.findMany({ where: { tenantId, role }, orderBy: { module: 'asc' } });
    const byModule = new Map(stored.map((item) => [item.module, item]));
    return permissionModules.map((module) => {
      if (role === UserRole.OWNER) return { module, canView: true, canCreate: true, canEdit: true, canDelete: true, canManage: true };
      if (role === UserRole.REQUESTER) {
        const enabled = module === PermissionModule.REQUESTER_PORTAL;
        return { module, canView: enabled, canCreate: enabled, canEdit: enabled, canDelete: false, canManage: false };
      }
      const item = byModule.get(module); const enabled = defaultEnabled(role, module);
      return { module, canView: item?.canView ?? enabled, canCreate: item?.canCreate ?? enabled, canEdit: item?.canEdit ?? enabled, canDelete: item?.canDelete ?? false, canManage: item?.canManage ?? false };
    });
  }
  async all(tenantId: string) {
    return Promise.all(Object.values(UserRole).map(async (role) => ({ role, permissions: await this.forRole(tenantId, role) })));
  }
  async has(user: AuthUser, module: PermissionModule, action: PermissionAction) {
    if (user.role === UserRole.OWNER) return true;
    const permissions = await this.forRole(user.tenantId, user.role);
    const permission = permissions.find((item) => item.module === module);
    return Boolean(
      permission?.[actionField[action]] ||
        (action === 'edit' && permission?.canManage),
    );
  }
  async update(actor: AuthUser, role: UserRole, dto: UpdateRolePermissionsDto) {
    if (role === UserRole.OWNER || role === UserRole.REQUESTER) throw new ForbiddenException('As permissões essenciais de OWNER e REQUESTER são protegidas.');
    if (actor.role === UserRole.ADMIN && role === UserRole.ADMIN) throw new ForbiddenException('Somente OWNER pode alterar permissões de ADMIN.');
    const modules = new Set(dto.permissions.map((item) => item.module));
    if (modules.size !== permissionModules.length) throw new ForbiddenException('Envie uma configuração para todos os módulos.');
    await this.prisma.$transaction(async (tx) => {
      for (const item of dto.permissions) await tx.rolePermission.upsert({ where: { tenantId_role_module: { tenantId: actor.tenantId, role, module: item.module } }, update: item, create: { tenantId: actor.tenantId, role, ...item } });
      await tx.auditLog.create({ data: { tenantId: actor.tenantId, userId: actor.id, action: AuditAction.UPDATE, entity: 'RolePermission', entityId: role, metadata: { role } } });
      const administrators = await tx.user.findMany({ where: { tenantId: actor.tenantId, status: UserStatus.ACTIVE, role: { in: [UserRole.OWNER, UserRole.ADMIN] }, id: { not: actor.id } }, select: { id: true } });
      if (administrators.length) await tx.notification.createMany({ data: administrators.map(({ id }) => ({ tenantId: actor.tenantId, userId: id, title: 'Permissões atualizadas', message: `As permissões do perfil ${role} foram alteradas por ${actor.name}.`, type: NotificationType.WARNING, entity: NotificationEntity.PERMISSION, entityId: role })) });
    });
    return this.forRole(actor.tenantId, role);
  }
}
