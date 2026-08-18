import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { DeadlineAlertsController } from './deadline-alerts.controller';
import { DeadlineAlertsService } from './deadline-alerts.service';

@Module({
  imports: [MailModule, NotificationsModule],
  controllers: [DeadlineAlertsController],
  providers: [DeadlineAlertsService],
})
export class DeadlineAlertsModule {}
