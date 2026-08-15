import { Module } from '@nestjs/common';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ServiceOrdersController } from './service-orders.controller';
import { ServiceOrdersService } from './service-orders.service';

@Module({
  controllers: [ServiceOrdersController],
  providers: [ServiceOrdersService, RolesGuard],
})
export class ServiceOrdersModule {}
