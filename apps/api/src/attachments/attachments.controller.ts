import {
  Controller,
  Get,
  Param,
  Post,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Express } from 'express';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AttachmentsService } from './attachments.service';
import { PermissionModule } from '@prisma/client';
import { RequirePermission } from '../permissions/permissions.decorator';
import { PermissionsGuard } from '../permissions/permissions.guard';

@Controller('attachments')
@UseGuards(JwtAuthGuard)
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Post('service-order/:serviceOrderId')
  @UseInterceptors(FileInterceptor('file'))
  uploadForServiceOrder(
    @CurrentUser() user: AuthUser,
    @Param('serviceOrderId') serviceOrderId: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.attachmentsService.uploadForServiceOrder(
      user,
      serviceOrderId,
      file,
    );
  }

  @Post('project/:projectId')
  @UseInterceptors(FileInterceptor('file'))
  uploadForProject(@CurrentUser() user: AuthUser, @Param('projectId') projectId: string, @UploadedFile() file?: Express.Multer.File) {
    return this.attachmentsService.uploadForProject(user, projectId, file);
  }

  @Get('project/:projectId')
  @UseGuards(PermissionsGuard)
  @RequirePermission(PermissionModule.PROJECTS, 'view')
  findByProject(@CurrentUser() user: AuthUser, @Param('projectId') projectId: string) {
    return this.attachmentsService.findByProject(user, projectId);
  }

  @Post('task/:taskId')
  @UseGuards(PermissionsGuard)
  @RequirePermission(PermissionModule.TASKS, 'edit')
  @UseInterceptors(FileInterceptor('file'))
  uploadForTask(@CurrentUser() user: AuthUser, @Param('taskId') taskId: string, @UploadedFile() file?: Express.Multer.File) {
    return this.attachmentsService.uploadForTask(user, taskId, file);
  }

  @Get('task/:taskId')
  @UseGuards(PermissionsGuard)
  @RequirePermission(PermissionModule.TASKS, 'view')
  findByTask(@CurrentUser() user: AuthUser, @Param('taskId') taskId: string) {
    return this.attachmentsService.findByTask(user, taskId);
  }

  @Get('service-order/:serviceOrderId')
  @UseGuards(PermissionsGuard)
  @RequirePermission(PermissionModule.SERVICE_ORDERS, 'view')
  findByServiceOrder(
    @CurrentUser() user: AuthUser,
    @Param('serviceOrderId') serviceOrderId: string,
  ) {
    return this.attachmentsService.findByServiceOrder(user, serviceOrderId);
  }

  @Get(':id/download')
  async download(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<StreamableFile> {
    return this.attachmentsService.download(user, id);
  }
}
