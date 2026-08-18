import { Module } from '@nestjs/common';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [NotificationsModule, MailModule],
  controllers: [ProjectsController],
  providers: [ProjectsService, RolesGuard],
})
export class ProjectsModule {}
