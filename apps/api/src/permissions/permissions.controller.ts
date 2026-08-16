import { Body, Controller, Get, Param, ParseEnumPipe, Patch, UseGuards } from '@nestjs/common';
import { PermissionModule, UserRole } from '@prisma/client';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';
import { PermissionsService } from './permissions.service';
import { RequirePermission } from './permissions.decorator';
import { PermissionsGuard } from './permissions.guard';
@Controller('permissions') @UseGuards(JwtAuthGuard)
export class PermissionsController {
  constructor(private readonly permissions: PermissionsService) {}
  @Get('me') me(@CurrentUser() user: AuthUser) { return this.permissions.forRole(user.tenantId, user.role); }
  @Get() @UseGuards(RolesGuard, PermissionsGuard) @Roles(UserRole.OWNER, UserRole.ADMIN) @RequirePermission(PermissionModule.USERS, 'manage')
  all(@CurrentUser() user: AuthUser) { return this.permissions.all(user.tenantId); }
  @Get('roles/:role') @UseGuards(RolesGuard, PermissionsGuard) @Roles(UserRole.OWNER, UserRole.ADMIN) @RequirePermission(PermissionModule.USERS, 'manage')
  role(@CurrentUser() user: AuthUser, @Param('role', new ParseEnumPipe(UserRole)) role: UserRole) { return this.permissions.forRole(user.tenantId, role); }
  @Patch('roles/:role') @UseGuards(RolesGuard, PermissionsGuard) @Roles(UserRole.OWNER, UserRole.ADMIN) @RequirePermission(PermissionModule.USERS, 'manage')
  update(@CurrentUser() user: AuthUser, @Param('role', new ParseEnumPipe(UserRole)) role: UserRole, @Body() dto: UpdateRolePermissionsDto) { return this.permissions.update(user, role, dto); }
}
