import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { NotificationPreferencesModule } from '../notification-preferences/notification-preferences.module';

@Module({
  imports: [NotificationPreferencesModule],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
