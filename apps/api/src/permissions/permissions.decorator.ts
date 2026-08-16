import { SetMetadata } from '@nestjs/common';
import { PermissionModule } from '@prisma/client';
import type { PermissionAction } from './permissions.constants';
export const PERMISSION_KEY = 'requiredPermission';
export const RequirePermission = (module: PermissionModule, action: PermissionAction = 'view') => SetMetadata(PERMISSION_KEY, { module, action });
