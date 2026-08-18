import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { MailModule } from '../mail/mail.module';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';

@Module({
  imports: [NotificationsModule, MailModule],
  controllers: [CommentsController],
  providers: [CommentsService],
})
export class CommentsModule {}
