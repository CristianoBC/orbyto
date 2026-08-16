import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { DailyLogsService } from './daily-logs.service';
import { CreateDailyLogDto } from './dto/create-daily-log.dto';
import { ListDailyLogsQueryDto } from './dto/list-daily-logs-query.dto';
import { UpdateDailyLogDto } from './dto/update-daily-log.dto';

@Controller('daily-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.MEMBER)
export class DailyLogsController {
  constructor(private readonly dailyLogsService: DailyLogsService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateDailyLogDto) {
    return this.dailyLogsService.create(user, dto);
  }

  @Get('my')
  findMy(@CurrentUser() user: AuthUser, @Query() query: ListDailyLogsQueryDto) {
    return this.dailyLogsService.findMy(user, query);
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
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateDailyLogDto,
  ) {
    return this.dailyLogsService.update(user, id, dto);
  }
}
