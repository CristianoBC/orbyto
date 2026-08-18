import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { MailModule } from '../mail/mail.module';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ServiceOrdersController } from './service-orders.controller';
import { ServiceOrdersService } from './service-orders.service';

@Module({
  imports: [NotificationsModule, MailModule],
  controllers: [ServiceOrdersController],
  providers: [ServiceOrdersService, RolesGuard],
})
export class ServiceOrdersModule {}
