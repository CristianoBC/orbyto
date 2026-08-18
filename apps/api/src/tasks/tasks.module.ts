import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { MailModule } from '../mail/mail.module';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  imports: [NotificationsModule, MailModule],
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule {}
