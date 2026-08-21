import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CreateTargetCommentDto } from './dto/create-target-comment.dto';
import { PermissionModule, RefType } from '@prisma/client';
import { RequirePermission } from '../permissions/permissions.decorator';
import { PermissionsGuard } from '../permissions/permissions.guard';

@Controller('comments')
@UseGuards(JwtAuthGuard)
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateCommentDto) {
    return this.commentsService.create(user, dto);
  }

  @Post('project/:projectId')
  createForProject(@CurrentUser() user: AuthUser, @Param('projectId') projectId: string, @Body() dto: CreateTargetCommentDto) {
    return this.commentsService.create(user, { refType: RefType.PROJECT, refId: projectId, text: dto.text });
  }

  @Get('project/:projectId')
  @UseGuards(PermissionsGuard)
  @RequirePermission(PermissionModule.PROJECTS, 'view')
  findByProject(@CurrentUser() user: AuthUser, @Param('projectId') projectId: string) {
    return this.commentsService.findByProject(user, projectId);
  }

  @Post('task/:taskId')
  @UseGuards(PermissionsGuard)
  @RequirePermission(PermissionModule.TASKS, 'edit')
  createForTask(@CurrentUser() user: AuthUser, @Param('taskId') taskId: string, @Body() dto: CreateTargetCommentDto) {
    return this.commentsService.create(user, { refType: RefType.TASK, refId: taskId, text: dto.text });
  }

  @Get('task/:taskId')
  @UseGuards(PermissionsGuard)
  @RequirePermission(PermissionModule.TASKS, 'view')
  findByTask(@CurrentUser() user: AuthUser, @Param('taskId') taskId: string) {
    return this.commentsService.findByTask(user, taskId);
  }

  @Get('service-order/:serviceOrderId')
  @UseGuards(PermissionsGuard)
  @RequirePermission(PermissionModule.SERVICE_ORDERS, 'view')
  findByServiceOrder(
    @CurrentUser() user: AuthUser,
    @Param('serviceOrderId') serviceOrderId: string,
  ) {
    return this.commentsService.findByServiceOrder(user, serviceOrderId);
  }
}
