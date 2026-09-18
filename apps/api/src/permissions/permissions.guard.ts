import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthUser } from '../auth/auth.types';
import { PERMISSION_KEY } from './permissions.decorator';
import type { PermissionAction } from './permissions.constants';
import { PermissionsService } from './permissions.service';
import { PermissionModule, UserRole } from '@prisma/client';
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly permissions: PermissionsService) {}
  async canActivate(context: ExecutionContext) {
    const required = this.reflector.getAllAndOverride<{ module: PermissionModule; action: PermissionAction }>(PERMISSION_KEY, [context.getHandler(), context.getClass()]);
    if (!required) return true;
    const user = context.switchToHttp().getRequest<{ user?: AuthUser }>().user;
    if (
      user?.role === UserRole.REQUESTER &&
      required.module === PermissionModule.SERVICE_ORDERS &&
      (required.action === 'view' || required.action === 'create')
    ) {
      return this.permissions.has(
        user,
        PermissionModule.REQUESTER_PORTAL,
        required.action,
      );
    }
    if (user && await this.permissions.has(user, required.module, required.action)) return true;
    throw new ForbiddenException('Seu perfil não possui permissão para esta ação.');
  }
}
