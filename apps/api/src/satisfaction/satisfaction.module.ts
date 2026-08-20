import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { SatisfactionController } from './satisfaction.controller';
import { SatisfactionService } from './satisfaction.service';

@Module({ imports: [NotificationsModule, MailModule, PermissionsModule], controllers: [SatisfactionController], providers: [SatisfactionService] })
export class SatisfactionModule {}
