import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PermissionModule } from '@prisma/client';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermission } from '../permissions/permissions.decorator';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { DailyLogsService } from './daily-logs.service';
import { CreateDailyLogDto } from './dto/create-daily-log.dto';
import { ListDailyLogsQueryDto } from './dto/list-daily-logs-query.dto';
import { UpdateDailyLogDto } from './dto/update-daily-log.dto';

@Controller('daily-logs')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission(PermissionModule.DAILY_LOGS)
export class DailyLogsController {
  constructor(private readonly dailyLogsService: DailyLogsService) {}

  @Post()
  @RequirePermission(PermissionModule.DAILY_LOGS, 'create')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateDailyLogDto) {
    return this.dailyLogsService.create(user, dto);
  }

  @Get('my')
  findMy(@CurrentUser() user: AuthUser, @Query() query: ListDailyLogsQueryDto) {
    return this.dailyLogsService.findMy(user, query);
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query() query: ListDailyLogsQueryDto) {
    return this.dailyLogsService.findAll(user.tenantId, query);
  }

  @Get('project/:projectId')
  findByProject(
    @CurrentUser() user: AuthUser,
    @Param('projectId') projectId: string,
    @Query() query: ListDailyLogsQueryDto,
  ) {
    return this.dailyLogsService.findByProject(user, projectId, query);
  }

  @Get('task/:taskId')
  findByTask(
    @CurrentUser() user: AuthUser,
    @Param('taskId') taskId: string,
    @Query() query: ListDailyLogsQueryDto,
  ) {
    return this.dailyLogsService.findByTask(user, taskId, query);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.dailyLogsService.findOne(user, id);
  }

  @Patch(':id')
  @RequirePermission(PermissionModule.DAILY_LOGS, 'edit')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateDailyLogDto,
  ) {
    return this.dailyLogsService.update(user, id, dto);
  }

  @Patch(':id/complete')
  @RequirePermission(PermissionModule.DAILY_LOGS, 'edit')
  complete(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.dailyLogsService.complete(user, id);
  }

  @Patch(':id/reopen')
  @RequirePermission(PermissionModule.DAILY_LOGS, 'edit')
  reopen(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.dailyLogsService.reopen(user, id);
  }

  @Delete(':id')
  @RequirePermission(PermissionModule.DAILY_LOGS, 'delete')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.dailyLogsService.remove(user, id);
  }
}
