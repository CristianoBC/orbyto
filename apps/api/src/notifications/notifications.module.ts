import { Module } from '@nestjs/common';
import { PermissionsModule } from '../permissions/permissions.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({ imports: [PermissionsModule], controllers: [NotificationsController], providers: [NotificationsService], exports: [NotificationsService] })
export class NotificationsModule {}
