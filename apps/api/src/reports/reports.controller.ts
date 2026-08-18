import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { PermissionModule, UserRole } from '@prisma/client';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RequirePermission } from '../permissions/permissions.decorator';
import { PermissionsGuard } from '../permissions/permissions.guard';
import {
  DailyLogReportQueryDto,
  ProjectReportQueryDto,
  ServiceOrderReportQueryDto,
  TaskReportQueryDto,
} from './dto/report-query.dto';
import { ReportsService } from './reports.service';

const reportRoles = [UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.MEMBER, UserRole.VIEWER];

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(...reportRoles)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('service-orders')
  @RequirePermission(PermissionModule.SERVICE_ORDERS)
  serviceOrders(@CurrentUser() user: AuthUser, @Query() query: ServiceOrderReportQueryDto) {
    return this.reports.serviceOrders(user, query);
  }

  @Get('projects')
  @RequirePermission(PermissionModule.PROJECTS)
  projects(@CurrentUser() user: AuthUser, @Query() query: ProjectReportQueryDto) {
    return this.reports.projects(user, query);
  }

  @Get('tasks')
  @RequirePermission(PermissionModule.TASKS)
  tasks(@CurrentUser() user: AuthUser, @Query() query: TaskReportQueryDto) {
    return this.reports.tasks(user, query);
  }

  @Get('daily-logs')
  @RequirePermission(PermissionModule.DAILY_LOGS)
  dailyLogs(@CurrentUser() user: AuthUser, @Query() query: DailyLogReportQueryDto) {
    return this.reports.dailyLogs(user, query);
  }
}
