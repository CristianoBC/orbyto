import { Module } from '@nestjs/common';
import { PermissionsModule } from '../permissions/permissions.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationPreferencesModule } from '../notification-preferences/notification-preferences.module';

@Module({ imports: [PermissionsModule, NotificationPreferencesModule], controllers: [NotificationsController], providers: [NotificationsService], exports: [NotificationsService] })
export class NotificationsModule {}
