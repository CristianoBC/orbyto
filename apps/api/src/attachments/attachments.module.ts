import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { MailModule } from '../mail/mail.module';
import { AttachmentsController } from './attachments.controller';
import { AttachmentsService } from './attachments.service';
import { PermissionsModule } from '../permissions/permissions.module';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { extname } from 'node:path';
import { getAllowedUploadExtensions } from '../common/security.config';

const mimeByExtension: Record<string, string[]> = {
  '.pdf': ['application/pdf'], '.png': ['image/png'], '.jpg': ['image/jpeg'], '.jpeg': ['image/jpeg'],
  '.doc': ['application/msword', 'application/octet-stream'],
  '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip', 'application/octet-stream'],
  '.xls': ['application/vnd.ms-excel', 'application/octet-stream'],
  '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/zip', 'application/octet-stream'],
  '.txt': ['text/plain'], '.csv': ['text/csv', 'text/plain', 'application/vnd.ms-excel'],
};

@Module({
  imports: [
    NotificationsModule, MailModule, PermissionsModule,
    MulterModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const configured = Number(config.get<string>('MAX_UPLOAD_SIZE_MB') ?? 10);
        const maxMb = Number.isFinite(configured) && configured > 0 ? Math.min(configured, 50) : 10;
        const allowed = getAllowedUploadExtensions();
        return {
          limits: { files: 1, fileSize: Math.floor(maxMb * 1024 * 1024) },
          fileFilter: (_request, file, callback) => {
            const extension = extname(file.originalname).toLowerCase();
            const validMime = mimeByExtension[extension]?.includes(file.mimetype.toLowerCase());
            if (!allowed.has(extension) || !validMime) {
              callback(new BadRequestException('Tipo de arquivo não permitido. Envie PDF, imagem, documento, planilha, TXT ou CSV.'), false);
              return;
            }
            callback(null, true);
          },
        };
      },
    }),
  ],
  controllers: [AttachmentsController],
  providers: [AttachmentsService],
})
export class AttachmentsModule {}
