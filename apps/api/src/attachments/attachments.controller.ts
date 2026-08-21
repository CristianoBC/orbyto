import {
  BadRequestException,
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

const maximumFileSize = 10 * 1024 * 1024;
const allowedExtensions = new Set([
  '.pdf',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.csv',
  '.txt',
]);

@Controller('attachments')
@UseGuards(JwtAuthGuard)
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Post('service-order/:serviceOrderId')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { files: 1, fileSize: maximumFileSize },
      fileFilter: (_request, file, callback) => {
        const extension = AttachmentsService.getFileExtension(file.originalname);

        if (!allowedExtensions.has(extension)) {
          callback(
            new BadRequestException(
              'Tipo de arquivo não permitido. Envie um documento ou imagem suportado.',
            ),
            false,
          );
          return;
        }

        callback(null, true);
      },
    }),
  )
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
  @UseInterceptors(FileInterceptor('file', { limits: { files: 1, fileSize: maximumFileSize }, fileFilter: (_request, file, callback) => { const extension = AttachmentsService.getFileExtension(file.originalname); callback(allowedExtensions.has(extension) ? null : new BadRequestException('Tipo de arquivo não permitido. Envie um documento ou imagem suportado.'), allowedExtensions.has(extension)); } }))
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
  @UseInterceptors(FileInterceptor('file', { limits: { files: 1, fileSize: maximumFileSize }, fileFilter: (_request, file, callback) => { const extension = AttachmentsService.getFileExtension(file.originalname); callback(allowedExtensions.has(extension) ? null : new BadRequestException('Tipo de arquivo não permitido. Envie um documento ou imagem suportado.'), allowedExtensions.has(extension)); } }))
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
