import { Module } from '@nestjs/common';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [ProjectsController],
  providers: [ProjectsService, RolesGuard],
})
export class ProjectsModule {}
