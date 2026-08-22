import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { PermissionModule, UserRole } from '@prisma/client';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RequirePermission } from '../permissions/permissions.decorator';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { AuditLogsService } from './audit-logs.service';
import { ListAuditLogsQueryDto } from './dto/list-audit-logs-query.dto';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard)
export class AuditLogsController {
  constructor(private readonly auditLogs: AuditLogsService) {}

  @Get('entity/:entity/:entityId')
  findByEntity(@CurrentUser() user: AuthUser, @Param('entity') entity: string, @Param('entityId') entityId: string) {
    return this.auditLogs.findByEntity(user, entity, entityId);
  }

  @Get('export')
  @UseGuards(RolesGuard, PermissionsGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.MEMBER, UserRole.VIEWER)
  @RequirePermission(PermissionModule.USERS, 'view')
  export(@CurrentUser() user: AuthUser, @Query() query: ListAuditLogsQueryDto) {
    return this.auditLogs.exportCsv(user, query);
  }

  @Get()
  @UseGuards(RolesGuard, PermissionsGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.MEMBER, UserRole.VIEWER)
  @RequirePermission(PermissionModule.USERS, 'view')
  findAll(@CurrentUser() user: AuthUser, @Query() query: ListAuditLogsQueryDto) {
    return this.auditLogs.findAll(user, query);
  }
}
